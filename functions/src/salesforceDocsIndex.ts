import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { GoogleAuth } from 'google-auth-library';

try {
  admin.app();
} catch {
  admin.initializeApp();
}

export const SALESFORCE_DOC_INDEX_PATH = 'salesforce-docs/index-v1.json';
export const SALESFORCE_DOC_INDEX_BUCKET = 'symposium-ai.firebasestorage.app';
const SALESFORCE_DOC_INDEX_VERSION = 1;
const MIN_REFRESH_DEVELOPER_DOC_RECORDS = 110;
const MIN_REFRESH_FULL_TEXT_RECORDS = 180;
const MAX_REFRESH_METADATA_ONLY_RATIO = 0.05;
const MAX_INDEX_SOURCE_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_INDEX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_SITEMAP_RECORDS_PER_TOPIC = 3;
const MAX_METADATA_ONLY_SITEMAP_RECORDS_PER_TOPIC = 0;
const FULL_TEXT_CONTENT_LENGTH_FLOOR = 300;
const MIN_SITEMAP_TOPIC_SCORE = 8;
const OFFICIAL_HOST_PATTERN = /(^|\.)salesforce\.com$/i;

export type SalesforceDocsContentQuality = 'full_text' | 'metadata_only';

interface SalesforceDocsSitemapSource {
  label: string;
  url: string;
  maxChildSitemaps: number;
  maxEntries: number;
}

interface SalesforceDocsSitemapEntry {
  url: string;
  lastModified?: string;
  sitemapUrl: string;
  sourceLabel: string;
}

interface OfficialDocContent {
  text: string;
  contentQuality: SalesforceDocsContentQuality;
  title?: string;
  apiVersion?: string;
  releaseLabel?: string;
  documentationVersion?: string;
  warnings?: string[];
}

export interface SalesforceDocsIndexTopic {
  id: string;
  label: string;
  query: string;
  category: string;
  keywords: string[];
  seedUrls: string[];
}

export interface SalesforceDocsIndexRecord {
  id: string;
  topicIds: string[];
  title: string;
  url: string;
  domain: string;
  sourceType: 'release_page' | 'release_notes' | 'developer_doc' | 'help_doc' | 'architect_doc' | 'official_doc';
  status: 'ga' | 'preview' | 'unknown';
  retrievedAt: string;
  responseHash: string;
  contentQuality: SalesforceDocsContentQuality;
  contentLength: number;
  excerpt: string;
  keywords: string[];
  warnings: string[];
  apiVersion?: string;
  releaseLabel?: string;
  documentationVersion?: string;
  lastModified?: string;
  discoverySource: 'seed' | 'sitemap';
  sitemapUrl?: string;
  sitemapScore?: number;
  confidenceImpact: 'supports' | 'unclear' | 'stale-risk';
}

export interface SalesforceDocsIndex {
  version: 1;
  generatedAt: string;
  sourcePolicy: {
    allowedHostPattern: '*.salesforce.com';
    storagePath: string;
  };
  topics: SalesforceDocsIndexTopic[];
  records: SalesforceDocsIndexRecord[];
  failures: Array<{
    topicId: string;
    url: string;
    error: string;
  }>;
  discovery?: {
    sitemapSources: string[];
    sitemapUrlCount: number;
    sitemapRecordLimitPerTopic: number;
  };
  warnings: string[];
}

export interface SalesforceDocsLookupTopicLike {
  id: string;
  label: string;
  query: string;
  category?: string;
  componentTypes?: string[];
  apiVersions?: string[];
  riskSignalIds?: string[];
}

export interface SalesforceDocsIndexEvidenceSource {
  id: string;
  topicId: string;
  title: string;
  url: string;
  domain: string;
  sourceType: SalesforceDocsIndexRecord['sourceType'];
  status: SalesforceDocsIndexRecord['status'];
  retrievedAt: string;
  responseHash: string;
  contentQuality: SalesforceDocsContentQuality;
  contentLength: number;
  excerpt: string;
  searchSnippet?: string;
  warnings: string[];
  apiVersion?: string;
  releaseLabel?: string;
  documentationVersion?: string;
  lastModified?: string;
  confidenceImpact: SalesforceDocsIndexRecord['confidenceImpact'];
}

export interface SalesforceDocsIndexLookupResult {
  sources: SalesforceDocsIndexEvidenceSource[];
  topicHits: string[];
  warnings: string[];
  indexSummary?: {
    status: 'hit' | 'miss' | 'unavailable' | 'stale';
    generatedAt?: string;
    storagePath: string;
    recordCount: number;
    developerDocCount?: number;
    fullTextRecordCount?: number;
    metadataOnlyRecordCount?: number;
    indexSourceCounts?: Record<string, number>;
    failedDomains?: Record<string, number>;
    topicCoverage?: Array<{
      topicId: string;
      status: 'hit' | 'miss' | 'unavailable' | 'stale' | 'blocked' | 'empty_shell' | 'no_official_source' | 'not_indexed';
      sourceCount: number;
      reason?: string;
    }>;
    missedTopics?: Array<{
      topicId: string;
      label?: string;
      reason: 'blocked' | 'not_indexed' | 'empty_shell' | 'no_official_source' | 'stale' | 'unavailable';
    }>;
    stalenessWarnings?: string[];
  };
}

const SALESFORCE_DOC_TOPICS: SalesforceDocsIndexTopic[] = [
  {
    id: 'salesforce-release-updates',
    label: 'Salesforce release updates and current release notes',
    query: 'Salesforce release updates current release notes Spring Summer Winter',
    category: 'release',
    keywords: ['release', 'release notes', 'current release', 'spring', 'summer', 'winter'],
    seedUrls: [
      'https://www.salesforce.com/releases',
    ],
  },
  {
    id: 'apex-governor-limits',
    label: 'Apex governor limits and bulkification',
    query: 'Apex governor limits SOQL DML loops bulkification best practices',
    category: 'apex',
    keywords: ['apex', 'governor limits', 'soql', 'dml', 'bulkification', 'bulkify'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_limits_tips.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_triggers_bestpract.htm',
    ],
  },
  {
    id: 'apex-sharing-security',
    label: 'Apex sharing and record access enforcement',
    query: 'Apex with sharing without sharing inherited sharing record access security',
    category: 'security',
    keywords: ['apex', 'sharing', 'with sharing', 'without sharing', 'inherited sharing', 'record access'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_keywords_sharing.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_security_sharing_rules.htm',
    ],
  },
  {
    id: 'apex-crud-fls-user-mode',
    label: 'Apex CRUD/FLS enforcement and user-mode data operations',
    query: 'Apex CRUD FLS user mode data operations stripInaccessible WITH SECURITY_ENFORCED Salesforce',
    category: 'security',
    keywords: ['apex', 'crud', 'fls', 'user mode', 'stripinaccessible', 'with security enforced', 'object permissions', 'field permissions'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_enforce_usermode.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_with_security_stripInaccessible.htm',
      'https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html',
    ],
  },
  {
    id: 'apex-async-processing',
    label: 'Asynchronous Apex, Queueable Apex, and Batch Apex',
    query: 'Asynchronous Apex Queueable Apex Batch Apex future scheduled limits Salesforce',
    category: 'apex',
    keywords: ['apex', 'async', 'asynchronous apex', 'queueable', 'batch apex', 'future', 'scheduled apex'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_async_overview.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_queueing_jobs.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_batch_interface.htm',
    ],
  },
  {
    id: 'soql-query-selectivity',
    label: 'SOQL selectivity, query plans, and large data volumes',
    query: 'SOQL selectivity query plan large data volumes Query Plan tool Salesforce',
    category: 'apex',
    keywords: ['soql', 'query plan', 'selectivity', 'large data volumes', 'where clause', 'query optimizer'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/langCon_apex_SOQL.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/langCon_apex_SOQL_VLSQ.htm',
      'https://developer.salesforce.com/docs/platform/code-builder/guide/retrieve-query-plans.html',
    ],
  },
  {
    id: 'apex-testing',
    label: 'Apex testing data isolation and assertions',
    query: 'Apex testing seeAllData false assertions best practices Salesforce',
    category: 'testing',
    keywords: ['apex', 'test', 'testing', 'seealldata', 'assertions', 'test data'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_testing_seealldata_using.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_testing_best_practices.htm',
    ],
  },
  {
    id: 'flow-fault-paths',
    label: 'Flow fault paths and error handling',
    query: 'Salesforce Flow fault paths error handling record triggered flow',
    category: 'flow',
    keywords: ['flow', 'fault path', 'fault connector', 'error handling', 'record triggered flow'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_visual_workflow.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flowdefinition.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flowsettings.htm',
    ],
  },
  {
    id: 'flow-order-recursion',
    label: 'Flow automation order and recursion control',
    query: 'Salesforce Flow order of execution recursion record updates autolaunched flow',
    category: 'flow',
    keywords: ['flow', 'order of execution', 'recursion', 'record updates', 'autolaunched flow'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_visual_workflow.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flowsettings.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_triggers_order_of_execution.htm',
    ],
  },
  {
    id: 'flow-tests-debugging',
    label: 'Flow tests, debugging, and runtime error handling',
    query: 'Salesforce Flow tests debug flow error emails fault path troubleshooting',
    category: 'flow',
    keywords: ['flow', 'flow tests', 'debug flow', 'error handling', 'fault path', 'troubleshooting'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flowtest.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_visual_workflow.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flowdefinition.htm',
    ],
  },
  {
    id: 'permissions-least-privilege',
    label: 'Permission set and profile least privilege',
    query: 'Salesforce permission sets profiles ModifyAllData ViewAllData least privilege',
    category: 'permissions',
    keywords: ['permission set', 'profile', 'modify all data', 'view all data', 'least privilege', 'object permissions'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_profile.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_permissionset.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_custompermission.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_permissionsetgroup.htm',
    ],
  },
  {
    id: 'field-level-security-object-permissions',
    label: 'Field-level security and object permission metadata',
    query: 'Salesforce field level security object permissions profile permission set Metadata API',
    category: 'permissions',
    keywords: ['field-level security', 'field permissions', 'object permissions', 'profile', 'permission set', 'crud', 'fls'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_profile.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_permissionset.htm',
      'https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html',
    ],
  },
  {
    id: 'sharing-model-rules',
    label: 'Org sharing model, sharing rules, and record visibility',
    query: 'Salesforce sharing model organization-wide defaults sharing rules role hierarchy Metadata API',
    category: 'security',
    keywords: ['sharing rules', 'sharing model', 'organization-wide defaults', 'owd', 'role hierarchy', 'record visibility'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_sharingrules.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_security_sharing_rules.htm',
    ],
  },
  {
    id: 'lightning-security',
    label: 'Lightning component DOM and security guidance',
    query: 'Lightning Web Components manual DOM innerHTML security Salesforce',
    category: 'lightning',
    keywords: ['lwc', 'lightning', 'manual dom', 'innerhtml', 'lightning web security', 'sanitize'],
    seedUrls: [
      'https://developer.salesforce.com/docs/platform/lwc/guide/create-components-dom-work.html',
      'https://developer.salesforce.com/docs/platform/lightning-components-security/guide/lws-sanitize.html',
      'https://developer.salesforce.com/docs/platform/lwc/guide/reference-directives.html',
    ],
  },
  {
    id: 'lightning-record-pages-layouts',
    label: 'Lightning record pages, layouts, and component exposure',
    query: 'Salesforce Lightning record pages FlexiPage layouts LWC targets metadata',
    category: 'lightning',
    keywords: ['lightning record page', 'flexipage', 'layout', 'lwc targets', 'record context', 'quick action'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flexipage.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_layouts.htm',
      'https://developer.salesforce.com/docs/platform/lwc/guide/reference-configuration-tags.html',
      'https://developer.salesforce.com/docs/platform/lwc/guide/use-record-context.html',
    ],
  },
  {
    id: 'metadata-api-versioning',
    label: 'Metadata API and component API versioning',
    query: 'Salesforce Metadata API API version support release notes',
    category: 'metadata_api',
    keywords: ['metadata api', 'api version', 'package xml', 'release notes'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_intro.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_support_policy.htm',
    ],
  },
  {
    id: 'metadata-deploy-retrieve-source-format',
    label: 'Metadata API deploy, retrieve, and source package boundaries',
    query: 'Salesforce Metadata API deploy retrieve package xml source format deployment',
    category: 'deployment',
    keywords: ['metadata api', 'deploy', 'retrieve', 'package xml', 'source format', 'deployment'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_retrieve.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_intro.htm',
    ],
  },
  {
    id: 'object-field-modeling',
    label: 'Custom object and field metadata modeling',
    query: 'Salesforce CustomObject CustomField metadata field types relationships object model',
    category: 'metadata_api',
    keywords: ['customobject', 'customfield', 'object model', 'field types', 'relationships', 'metadata'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/customobject.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/customfield.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_custom_objects.htm',
    ],
  },
  {
    id: 'validation-rules-formulas',
    label: 'Validation rules and formula behavior',
    query: 'Salesforce validation rules formulas error condition formula metadata Tooling API',
    category: 'metadata_api',
    keywords: ['validation rule', 'validationrule', 'formula', 'error condition formula', 'field validation'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/tooling_api_objects_validationrule.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/customfield.htm',
    ],
  },
  {
    id: 'custom-metadata-types',
    label: 'Custom metadata types and deployable configuration',
    query: 'Salesforce custom metadata types CustomMetadata Metadata API Apex deployable configuration',
    category: 'metadata_api',
    keywords: ['custom metadata', 'custommetadata', 'custom metadata types', 'deployable configuration', 'metadata relationship'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_custommetadatatypes.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_custommetadata.htm',
    ],
  },
  {
    id: 'record-types-picklists',
    label: 'Record types and picklist metadata',
    query: 'Salesforce record types picklist values value sets Metadata API',
    category: 'metadata_api',
    keywords: ['record type', 'recordtype', 'picklist', 'value set', 'business process'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_recordtype.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_globalvalueset.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_standardvalueset.htm',
    ],
  },
  {
    id: 'reports-dashboards-metadata',
    label: 'Report and dashboard metadata',
    query: 'Salesforce Report Dashboard Metadata API folders report types dashboards',
    category: 'metadata_api',
    keywords: ['report', 'dashboard', 'metadata api', 'folder', 'report type'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_report.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_dashboard.htm',
    ],
  },
  {
    id: 'workflow-approval-processes',
    label: 'Workflow rules and approval process metadata',
    query: 'Salesforce Workflow ApprovalProcess metadata approval process workflow rules',
    category: 'metadata_api',
    keywords: ['workflow', 'approval process', 'approvalprocess', 'workflow rule', 'metadata'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_workflow.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_approvalprocess.htm',
    ],
  },
  {
    id: 'connected-app-oauth',
    label: 'Connected apps, OAuth settings, and scopes',
    query: 'Salesforce ConnectedApp OAuth scopes callback URL metadata security',
    category: 'integration',
    keywords: ['connected app', 'connectedapp', 'oauth', 'scopes', 'callback url', 'consumer key'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_connectedapp.htm',
    ],
  },
  {
    id: 'named-credentials-external-credentials',
    label: 'Named credentials and external credentials for callouts',
    query: 'Salesforce named credentials external credentials Apex callouts OAuth packaging principals',
    category: 'integration',
    keywords: ['named credential', 'external credential', 'callout', 'oauth', 'principal', 'user external credentials'],
    seedUrls: [
      'https://developer.salesforce.com/docs/platform/named-credentials/guide/get-started.html',
      'https://developer.salesforce.com/docs/platform/named-credentials/guide/nc-oauth-dev-guide.html',
      'https://developer.salesforce.com/docs/platform/named-credentials/guide/nc-package-credentials.html',
    ],
  },
  {
    id: 'platform-events-pubsub',
    label: 'Platform events, event bus, and Pub/Sub API',
    query: 'Salesforce platform events event bus Pub/Sub API publish subscribe allocations Apex',
    category: 'integration',
    keywords: ['platform events', 'event bus', 'pub/sub api', 'publish', 'subscribe', 'change data capture'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.platform_events.meta/platform_events/platform_events_intro.htm',
      'https://developer.salesforce.com/docs/platform/pub-sub-api/guide/intro.html',
      'https://developer.salesforce.com/docs/platform/pub-sub-api/guide/allocations.html',
    ],
  },
  {
    id: 'duplicate-matching-rules',
    label: 'Duplicate rules and matching rules',
    query: 'Salesforce DuplicateRule MatchingRule metadata duplicate management matching rules',
    category: 'metadata_api',
    keywords: ['duplicate rule', 'duplicaterule', 'matching rule', 'matchingrule', 'duplicate management'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_duplicaterule.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_matchingrule.htm',
    ],
  },
  {
    id: 'sales-cloud-admin-setup',
    label: 'Sales Cloud admin setup and data model',
    query: 'Sales Cloud setup data model accounts contacts leads opportunities campaigns forecasts territories',
    category: 'sales_cloud',
    keywords: ['sales cloud', 'account', 'contact', 'lead', 'opportunity', 'campaign', 'forecast', 'territory', 'sales process'],
    seedUrls: [
      'https://developer.salesforce.com/docs/platform/data-models/guide/sales-cloud-overview.html',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contact.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunity.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_campaign.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunitylineitem.htm',
    ],
  },
  {
    id: 'service-cloud-admin-setup',
    label: 'Service Cloud admin setup and case model',
    query: 'Service Cloud setup data model cases entitlements milestones knowledge queues routing',
    category: 'service_cloud',
    keywords: ['service cloud', 'case', 'entitlement', 'milestone', 'knowledge', 'queue', 'routing', 'support process'],
    seedUrls: [
      'https://developer.salesforce.com/docs/platform/data-models/guide/service-cloud-overview.html',
      'https://developer.salesforce.com/docs/platform/data-models/guide/case.html',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_case.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_entitlement.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_knowledge__kav.htm',
    ],
  },
  {
    id: 'data-cloud-development',
    label: 'Data Cloud development and object model',
    query: 'Salesforce Data Cloud development data lake objects data model objects DMO DLO',
    category: 'data_cloud',
    keywords: ['data cloud', 'data lake object', 'dlo', 'data model object', 'dmo', 'calculated insight', 'unified individual'],
    seedUrls: [
      'https://developer.salesforce.com/docs/data/data-cloud-dev/guide/get-started.htm',
      'https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-object-model.html',
      'https://developer.salesforce.com/docs/data/data-cloud-ref/guide/c360dm-datamodelobjects.html',
    ],
  },
  {
    id: 'data-cloud-ingestion-query',
    label: 'Data Cloud ingestion, extraction, and metadata APIs',
    query: 'Salesforce Data Cloud ingestion API query extract metadata API data streams',
    category: 'data_cloud',
    keywords: ['data cloud', 'ingest', 'ingestion api', 'extract api', 'metadata api', 'data stream', 'query'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.c360a_api.meta/c360a_api/c360a_api_ingest_data.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.c360a_api.meta/c360a_api/c360a_api_extract_data.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.c360a_api.meta/c360a_api/c360a_api_metadata_api.htm',
    ],
  },
  {
    id: 'data-cloud-identity-modeling',
    label: 'Data Cloud identity resolution and data modeling',
    query: 'Salesforce Data Cloud identity resolution data model unified individual data model objects',
    category: 'data_cloud',
    keywords: ['data cloud', 'identity resolution', 'unified individual', 'data model', 'data model object', 'profile'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.c360a_api.meta/c360a_api/c360dm_model_data.htm',
      'https://developer.salesforce.com/docs/data/data-cloud-dev/guide/dc-object-model.html',
      'https://developer.salesforce.com/docs/data/data-cloud-ref/guide/c360dm-datamodelobjects.html',
    ],
  },
  {
    id: 'revenue-cloud-data-model',
    label: 'Revenue Cloud product, pricing, quote, and order model',
    query: 'Revenue Cloud product catalog pricing quote order contract data model Salesforce',
    category: 'revenue_cloud',
    keywords: ['revenue cloud', 'product catalog', 'pricing', 'quote', 'quote line item', 'order', 'contract', 'price book'],
    seedUrls: [
      'https://developer.salesforce.com/docs/platform/data-models/guide/revenue-cloud-category.html',
      'https://developer.salesforce.com/docs/platform/data-models/guide/product-catalog-mgmt.html',
      'https://developer.salesforce.com/docs/platform/data-models/guide/product-pricing.html',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_product2.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_pricebook2.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_quote.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_quotelineitem.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_order.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_orderitem.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contract.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_asset.htm',
    ],
  },
  {
    id: 'revenue-cloud-cpq-industries',
    label: 'Revenue Cloud CPQ and Industries Communications data model',
    query: 'Salesforce Revenue Cloud CPQ Industries CME product catalog pricing quote order',
    category: 'revenue_cloud',
    keywords: ['revenue cloud', 'cpq', 'industries', 'communications cloud', 'cme', 'quote', 'order capture', 'product catalog'],
    seedUrls: [
      'https://developer.salesforce.com/docs/industries/cme/guide/introduction.html',
      'https://developer.salesforce.com/docs/industries/cme/guide/get-started.html',
      'https://developer.salesforce.com/docs/platform/data-models/guide/revenue-cloud-category.html',
      'https://developer.salesforce.com/docs/platform/data-models/guide/product-catalog-mgmt.html',
    ],
  },
  {
    id: 'marketing-cloud-engagement-apis',
    label: 'Marketing Cloud Engagement APIs and object model',
    query: 'Marketing Cloud Engagement REST SOAP API DataExtension Subscriber Journey Content API',
    category: 'marketing_cloud',
    keywords: ['marketing cloud', 'engagement', 'rest api', 'soap api', 'data extension', 'subscriber', 'journey', 'content api'],
    seedUrls: [
      'https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/apis-overview.html',
      'https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/rest-api-overview.html',
      'https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/content-api',
      'https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/soap_web_service_objects.html',
      'https://developer.salesforce.com/docs/marketing/marketing-cloud/references',
    ],
  },
  {
    id: 'marketing-cloud-growth-development',
    label: 'Marketing Cloud Growth administration and object model',
    query: 'Marketing Cloud Growth administration setup objects Salesforce developer guide',
    category: 'marketing_cloud',
    keywords: ['marketing cloud growth', 'campaign', 'segment', 'activation', 'object model', 'administration'],
    seedUrls: [
      'https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/guide/mc-getting-started.html',
      'https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/guide/mc-administration.html',
      'https://developer.salesforce.com/docs/marketing/marketing-cloud-growth/guide/mc-manage-objects.html',
    ],
  },
  {
    id: 'standard-object-reference-sales-service',
    label: 'Standard object reference for Sales and Service Cloud',
    query: 'Salesforce standard object reference Account Contact Lead Opportunity Case Task Event User Product Quote Order Contract Asset',
    category: 'object_reference',
    keywords: ['standard object', 'object reference', 'account', 'contact', 'lead', 'opportunity', 'case', 'task', 'event', 'user', 'product', 'quote', 'order'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contact.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunity.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_case.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_task.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_event.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_user.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_product2.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_pricebook2.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_quote.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_order.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_contract.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_asset.htm',
    ],
  },
  {
    id: 'metadata-api-type-reference',
    label: 'Metadata API type reference and coverage matrix',
    query: 'Salesforce Metadata API all metadata types metadata coverage CustomObject Flow Profile PermissionSet FlexiPage Layout',
    category: 'metadata_api',
    keywords: ['metadata api', 'metadata types', 'metadata coverage', 'customobject', 'customfield', 'flow', 'profile', 'permissionset', 'flexipage', 'layout'],
    seedUrls: [
      'https://developer.salesforce.com/docs/success/metadata-coverage-report/references/metadata-types/v66.0/metadata-types.html',
      'https://developer.salesforce.com/docs/metadata-coverage',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_intro.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/customobject.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/customfield.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_profile.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_permissionset.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flexipage.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_layouts.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_customapplication.htm',
    ],
  },
  {
    id: 'flow-metadata-edge-cases',
    label: 'Flow metadata edge cases, tests, and runtime settings',
    query: 'Salesforce Flow Metadata API FlowDefinition FlowSettings FlowTest record triggered autolaunched subflow edge cases',
    category: 'flow',
    keywords: ['flow', 'flowdefinition', 'flowsettings', 'flowtest', 'record triggered flow', 'autolaunched flow', 'subflow', 'fault path'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_visual_workflow.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flowdefinition.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flowsettings.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_flowtest.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_triggers_order_of_execution.htm',
    ],
  },
  {
    id: 'emailmessage-object-reference',
    label: 'EmailMessage object reference and supported fields',
    query: 'EmailMessage object reference fields Salesforce API ReplyToEmailMessageId ThreadIdentifier RelatedToId Headers',
    category: 'object_reference',
    keywords: ['emailmessage', 'email message', 'replytoemailmessageid', 'threadidentifier', 'relatedtoid', 'headers', 'object reference'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_emailmessage.htm',
    ],
  },
  {
    id: 'emailmessage-threading-fields',
    label: 'EmailMessage threading fields and header behavior',
    query: 'EmailMessage ReplyToEmailMessageId ThreadIdentifier Headers Salesforce object reference',
    category: 'object_reference',
    keywords: ['emailmessage', 'replytoemailmessageid', 'threadidentifier', 'headers', 'message identifier', 'threading'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_emailmessage.htm',
    ],
  },
  {
    id: 'email-to-salesforce',
    label: 'Email-to-Salesforce behavior and enablement',
    query: 'Email-to-Salesforce setup behavior active Salesforce developer documentation',
    category: 'integration',
    keywords: ['email to salesforce', 'email-to-salesforce', 'emailservicesaddress', 'emailservicesfunction', 'active', 'setup'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_email_inbound.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_emailmessage.htm',
    ],
  },
  {
    id: 'enhanced-email-activity-capture',
    label: 'Enhanced Email and Einstein Activity Capture behavior',
    query: 'Enhanced Email Einstein Activity Capture EmailMessage Salesforce developer documentation',
    category: 'integration',
    keywords: ['enhanced email', 'einstein activity capture', 'emailmessage', 'activity capture', 'logged as email messages'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_emailmessage.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_task.htm',
    ],
  },
  {
    id: 'outlook-email-integration',
    label: 'Outlook/Gmail integration email logging behavior',
    query: 'Salesforce Outlook Gmail integration email logging Enhanced Email',
    category: 'integration',
    keywords: ['outlook integration', 'gmail integration', 'email logging', 'send through external email services', 'office 365'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_emailmessage.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_task.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_event.htm',
    ],
  },
  {
    id: 'email-services',
    label: 'Email Services and inbound email Apex behavior',
    query: 'Salesforce Email Services inbound email Apex EmailServicesFunction Messaging.InboundEmail',
    category: 'apex',
    keywords: ['email services', 'emailservicesfunction', 'emailservicesaddress', 'inboundemail', 'inbound envelope', 'messaging.inboundemail'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_classes_email_inbound.htm',
    ],
  },
  {
    id: 'activity-task-relationships',
    label: 'Activity, Task, and email relationship fields',
    query: 'Salesforce Task Activity EmailMessage RelatedToId WhatId WhoId object reference',
    category: 'object_reference',
    keywords: ['task', 'activity', 'whatid', 'whoid', 'relatedtoid', 'emailmessage', 'relationship fields'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_task.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_emailmessage.htm',
    ],
  },
  {
    id: 'email-templates',
    label: 'Email template body and merge field behavior',
    query: 'Salesforce EmailTemplate Body HtmlValue merge fields object reference',
    category: 'object_reference',
    keywords: ['emailtemplate', 'email template', 'htmlvalue', 'body', 'merge fields'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_emailtemplate.htm',
    ],
  },
  {
    id: 'apex-email-apis',
    label: 'Apex outbound email APIs',
    query: 'Apex Messaging.SingleEmailMessage sendEmail Salesforce',
    category: 'apex',
    keywords: ['messaging.singleemailmessage', 'sendemail', 'apex email', 'single email message', 'mass email message'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_classes_email_outbound_single.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_classes_email_outbound_messaging.htm',
    ],
  },
];

const SALESFORCE_DOC_SITEMAP_SOURCES: SalesforceDocsSitemapSource[] = [
  {
    label: 'Salesforce Developer Docs sitemap',
    url: 'https://developer.salesforce.com/sitemap.xml',
    maxChildSitemaps: 4,
    maxEntries: 2500,
  },
  {
    label: 'Salesforce Architect sitemap',
    url: 'https://architect.salesforce.com/sitemap.xml',
    maxChildSitemaps: 4,
    maxEntries: 4000,
  },
];

const storageAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/devstorage.read_write'],
});

async function getStorageAccessToken(): Promise<string> {
  const client = await storageAuth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  const accessToken = typeof accessTokenResponse === 'string'
    ? accessTokenResponse
    : accessTokenResponse?.token;
  if (!accessToken) {
    throw new Error('Unable to acquire a Google Cloud Storage access token for Salesforce docs index storage.');
  }
  return accessToken;
}

async function authorizedStorageFetch(url: string, init: RequestInit): Promise<Response> {
  const accessToken = await getStorageAccessToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(url, { ...init, headers });
}

function storageBucketPath(): string {
  return encodeURIComponent(SALESFORCE_DOC_INDEX_BUCKET);
}

function storageObjectPath(): string {
  return encodeURIComponent(SALESFORCE_DOC_INDEX_PATH);
}

export async function writeSalesforceDocsIndex(index: SalesforceDocsIndex): Promise<void> {
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${storageBucketPath()}/o?uploadType=media&name=${storageObjectPath()}`;
  const response = await authorizedStorageFetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(index, null, 2),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to write Salesforce docs index to Cloud Storage (${response.status}): ${errorText}`);
  }
}

async function readSalesforceDocsIndexText(): Promise<string | null> {
  const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${storageBucketPath()}/o/${storageObjectPath()}?alt=media`;
  const response = await authorizedStorageFetch(downloadUrl, { method: 'GET' });
  if (response.status === 404) return null;
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to read Salesforce docs index from Cloud Storage (${response.status}): ${errorText}`);
  }
  return response.text();
}

function isOfficialSalesforceUrl(urlValue: string): boolean {
  try {
    const url = new URL(urlValue);
    return url.protocol === 'https:' && OFFICIAL_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}

function canonicalizeUrl(urlValue: string): string | null {
  try {
    const url = new URL(urlValue);
    if (!isOfficialSalesforceUrl(url.toString())) return null;
    url.hash = '';
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^(utm_|cmpid|d|nc|trk|mc_)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return null;
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#38;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHtmlTitle(html: string): string | undefined {
  const navTitle = html.match(/<meta\s+name=["']nav-title["']\s+content=["']([^"']+)["']/i)?.[1];
  if (navTitle) return decodeXmlEntities(navTitle).trim().slice(0, 180);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? decodeXmlEntities(stripHtmlTags(title)).trim().slice(0, 180) : undefined;
}

function normalizeForMatch(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  return decoded
    .toLowerCase()
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTagValue(block: string, tagName: string): string | undefined {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match?.[1] ? decodeXmlEntities(match[1]).trim() : undefined;
}

function isEligibleSitemapDocumentationUrl(urlValue: string): boolean {
  const url = new URL(urlValue);
  if (url.hostname === 'developer.salesforce.com') {
    return url.pathname.startsWith('/docs/');
  }
  if (url.hostname === 'architect.salesforce.com') {
    return !['/', '/connect', '/homepage'].includes(url.pathname);
  }
  return true;
}

function parseSitemapIndexUrls(xml: string): string[] {
  return Array.from(xml.matchAll(/<sitemap\b[\s\S]*?<\/sitemap>/gi))
    .map((match) => extractTagValue(match[0], 'loc'))
    .filter((urlValue): urlValue is string => Boolean(urlValue))
    .map((urlValue) => canonicalizeUrl(urlValue))
    .filter((urlValue): urlValue is string => Boolean(urlValue));
}

function parseSitemapEntries(xml: string, sitemapUrl: string, sourceLabel: string): SalesforceDocsSitemapEntry[] {
  return Array.from(xml.matchAll(/<url\b[\s\S]*?<\/url>/gi))
    .map((match) => {
      const urlValue = extractTagValue(match[0], 'loc');
      if (!urlValue) return null;
      const canonicalUrl = canonicalizeUrl(urlValue);
      if (!canonicalUrl) return null;
      if (!isEligibleSitemapDocumentationUrl(canonicalUrl)) return null;
      const entry: SalesforceDocsSitemapEntry = {
        url: canonicalUrl,
        sitemapUrl,
        sourceLabel,
      };
      const lastModified = extractTagValue(match[0], 'lastmod');
      if (lastModified) entry.lastModified = lastModified;
      return entry;
    })
    .filter((entry): entry is SalesforceDocsSitemapEntry => Boolean(entry));
}

function extractTitle(text: string, fallback: string): string {
  const heading = text.match(/^\s*#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 180);
  const firstSentence = text.split(/[.!?]\s+/)[0]?.trim();
  return firstSentence && firstSentence.length >= 8 ? firstSentence.slice(0, 180) : fallback;
}

function humanizeSalesforceDocId(id: string): string {
  return id
    .replace(/^(release-notes|platform|sf)\./i, '')
    .replace(/\.htm$/i, '')
    .replace(/^rn_\d+_/i, '')
    .replace(/^rn_/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildHelpArticleMetadata(urlValue: string): OfficialDocContent | null {
  const url = new URL(urlValue);
  if (url.hostname !== 'help.salesforce.com' || !url.pathname.includes('/articleView')) return null;
  const articleId = url.searchParams.get('id');
  if (!articleId) return null;
  const release = url.searchParams.get('release') || undefined;
  const title = humanizeSalesforceDocId(articleId);
  return {
    text: [
      `Official Salesforce Help article: ${title}.`,
      `Article id: ${articleId}.`,
      release ? `Release parameter: ${release}.` : '',
      `Canonical URL: ${url.toString()}.`,
    ].filter(Boolean).join(' '),
    contentQuality: 'metadata_only',
    title,
    documentationVersion: release,
    releaseLabel: release ? `Salesforce release ${release}` : undefined,
    warnings: [
      'Salesforce Help article was indexed from official URL and sitemap metadata; rendered article body was not extracted server-side.',
    ],
  };
}

function inferSourceType(urlValue: string): SalesforceDocsIndexRecord['sourceType'] {
  const url = new URL(urlValue);
  if (url.hostname === 'www.salesforce.com' || url.pathname.includes('/releases')) return 'release_page';
  if (url.hostname === 'help.salesforce.com' && url.pathname.includes('release-notes')) return 'release_notes';
  if (url.hostname === 'developer.salesforce.com') return 'developer_doc';
  if (url.hostname === 'help.salesforce.com') return 'help_doc';
  if (url.hostname === 'architect.salesforce.com') return 'architect_doc';
  return 'official_doc';
}

function inferStatus(text: string): SalesforceDocsIndexRecord['status'] {
  if (/release is in preview|beta|pilot|developer preview|do not become generally available|don't become generally available|can't guarantee general availability/i.test(text)) {
    return 'preview';
  }
  if (/generally available|\bGA\b|current release|latest release/i.test(text)) {
    return 'ga';
  }
  return 'unknown';
}

function sourceWarnings(text: string, status: SalesforceDocsIndexRecord['status']): string[] {
  const warnings: string[] = [];
  if (status === 'preview') {
    warnings.push('Source contains preview, beta, pilot, or not-yet-GA language; recommendations must be confidence-downgraded.');
  }
  if (/links point to material from the previous release|previous-release documentation|previous release/i.test(text)) {
    warnings.push('Source warns that linked documentation may point to previous-release material.');
  }
  return warnings;
}

function excerptFor(text: string, topic: SalesforceDocsIndexTopic): string {
  const terms = [...topic.keywords, ...topic.query.split(/[^a-z0-9]+/i)]
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 4);
  const lower = text.toLowerCase();
  const index = terms
    .map((term) => lower.indexOf(term))
    .filter((position) => position >= 0)
    .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, index - 220);
  return `${start > 0 ? '...' : ''}${text.slice(start, start + 700)}${start + 700 < text.length ? '...' : ''}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  if (!isOfficialSalesforceUrl(url)) {
    throw new Error(`URL is not an allowed official Salesforce URL: ${url}`);
  }
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html, text/plain, application/xhtml+xml, application/json, */*',
          'User-Agent': 'SymposiumAI-SalesforceDocsIndexer/1.0 (+https://app.symposiumai.app)',
        },
      });
      if (response.ok) {
        return await response.text();
      }
      lastError = new Error(`HTTP ${response.status}`);
      if (![403, 429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
        throw lastError;
      }
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(error?.message || 'Unknown fetch failure');
      if (attempt === 2) throw lastError;
    } finally {
      clearTimeout(timeout);
    }
    await sleep(750 * (attempt + 1));
  }
  throw lastError || new Error('Unknown fetch failure');
}

async function fetchOfficialJson<T>(url: string): Promise<T> {
  const text = await fetchText(url);
  return JSON.parse(text) as T;
}

function parseDeveloperDocsReference(urlValue: string): { docId: string; deliverable: string; contentDocumentId: string } | null {
  try {
    const url = new URL(urlValue);
    if (url.hostname !== 'developer.salesforce.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'docs' || parts.length < 4) return null;
    if (!parts[1].startsWith('atlas.')) return null;
    return {
      docId: parts[1],
      deliverable: parts[2],
      contentDocumentId: parts.slice(3).join('/'),
    };
  } catch {
    return null;
  }
}

async function fetchDeveloperDocsContent(urlValue: string): Promise<OfficialDocContent | null> {
  const reference = parseDeveloperDocsReference(urlValue);
  if (!reference) return null;

  type DeveloperDocumentResponse = {
    content?: string;
    content_document_id?: string;
    deliverable?: string;
    title?: string;
    doc_title?: string;
    version?: {
      version_text?: string;
      release_version?: string;
      doc_version?: string;
    };
  };

  type DeveloperContentResponse = {
    content?: string;
    title?: string;
  };

  const documentUrl = `https://developer.salesforce.com/docs/get_document/${encodeURIComponent(reference.docId)}`;
  const document = await fetchOfficialJson<DeveloperDocumentResponse>(documentUrl);
  const documentVersion = document.version?.doc_version;
  const releaseLabel = document.version?.version_text;
  const apiVersion = document.version?.release_version;
  const expectedContentId = reference.contentDocumentId.replace(/\.htm$/i, '');
  const rootContentId = document.content_document_id?.replace(/\.htm$/i, '');

  let title = document.title || document.doc_title;
  let html = rootContentId === expectedContentId ? document.content : undefined;

  if (!html) {
    const deliverable = document.deliverable || reference.deliverable;
    if (!documentVersion) {
      throw new Error(`Developer docs API did not return a documentation version for ${reference.docId}`);
    }
    const contentUrl = [
      'https://developer.salesforce.com/docs/get_document_content',
      encodeURIComponent(deliverable),
      encodeURIComponent(reference.contentDocumentId),
      'en-us',
      encodeURIComponent(documentVersion),
    ].join('/');
    const content = await fetchOfficialJson<DeveloperContentResponse>(contentUrl);
    html = content.content;
    title = content.title || title;
  }

  const text = stripHtmlTags(html || '');
  if (text.length < 80) {
    throw new Error(`Developer docs API content was too short (${text.length} chars)`);
  }

  return {
    text: text.slice(0, 120000),
    contentQuality: 'full_text',
    title,
    apiVersion,
    releaseLabel,
    documentationVersion: documentVersion,
    warnings: releaseLabel && /preview|beta|pilot/i.test(releaseLabel)
      ? [`Developer documentation version is ${releaseLabel}; preview content must be confidence-downgraded.`]
      : [],
  };
}

async function fetchOfficialDoc(url: string): Promise<OfficialDocContent> {
  let developerDocsApiError: string | undefined;
  try {
    const developerContent = await fetchDeveloperDocsContent(url);
    if (developerContent) return developerContent;
  } catch (error: any) {
    developerDocsApiError = error?.message || 'Unknown developer docs API failure';
  }

  const helpArticleMetadata = buildHelpArticleMetadata(url);
  if (helpArticleMetadata) return helpArticleMetadata;

  const html = await fetchText(url);
  const normalized = stripHtmlTags(html);
  if (normalized.length < 80) {
    throw new Error(`Fetched content was too short (${normalized.length} chars)`);
  }
  return {
    text: normalized.slice(0, 120000),
    contentQuality: 'full_text',
    title: extractHtmlTitle(html),
    warnings: developerDocsApiError
      ? [`Developer docs JSON endpoint failed (${developerDocsApiError}); indexed rendered official HTML fallback.`]
      : [],
  };
}

async function fetchSitemapXml(url: string): Promise<string> {
  const xml = await fetchText(url, 30000);
  if (!/<loc\b/i.test(xml)) {
    throw new Error('Sitemap response did not contain any loc entries');
  }
  return xml;
}

async function collectSitemapEntries(
  source: SalesforceDocsSitemapSource,
  failures: SalesforceDocsIndex['failures'],
): Promise<SalesforceDocsSitemapEntry[]> {
  const entries: SalesforceDocsSitemapEntry[] = [];
  try {
    const rootXml = await fetchSitemapXml(source.url);
    const childSitemaps = parseSitemapIndexUrls(rootXml).slice(0, source.maxChildSitemaps);
    if (childSitemaps.length === 0) {
      return parseSitemapEntries(rootXml, source.url, source.label).slice(0, source.maxEntries);
    }

    for (const childUrl of childSitemaps) {
      if (entries.length >= source.maxEntries) break;
      try {
        const childXml = await fetchSitemapXml(childUrl);
        entries.push(...parseSitemapEntries(childXml, childUrl, source.label));
      } catch (error: any) {
        failures.push({
          topicId: 'sitemap-discovery',
          url: childUrl,
          error: error?.message || 'Unknown sitemap fetch failure',
        });
      }
    }
  } catch (error: any) {
    failures.push({
      topicId: 'sitemap-discovery',
      url: source.url,
      error: error?.message || 'Unknown sitemap fetch failure',
    });
  }
  return entries.slice(0, source.maxEntries);
}

async function discoverSitemapEntries(failures: SalesforceDocsIndex['failures']): Promise<SalesforceDocsSitemapEntry[]> {
  const entries: SalesforceDocsSitemapEntry[] = [];
  const seen = new Set<string>();
  for (const source of SALESFORCE_DOC_SITEMAP_SOURCES) {
    const sourceEntries = await collectSitemapEntries(source, failures);
    for (const entry of sourceEntries) {
      if (seen.has(entry.url)) continue;
      seen.add(entry.url);
      entries.push(entry);
    }
  }
  return entries;
}

function scoreSitemapEntryForTopic(entry: SalesforceDocsSitemapEntry, topic: SalesforceDocsIndexTopic): number {
  let score = 0;
  const url = new URL(entry.url);
  const idParam = url.searchParams.get('id') || '';
  const releaseParam = url.searchParams.get('release') || '';
  const haystack = normalizeForMatch(`${url.hostname} ${url.pathname} ${idParam} ${releaseParam} ${entry.sourceLabel}`);
  const category = normalizeForMatch(topic.category);

  if (category && haystack.includes(category)) score += 5;
  if (topic.id.startsWith('apex-') && haystack.includes('apex')) score += 10;
  if (topic.id.startsWith('flow-') && /(flow|process|automation|record triggered)/.test(haystack)) score += 10;
  if (topic.id.includes('permissions') && /(permission|profile|userperm|security)/.test(haystack)) score += 10;
  if (topic.id.includes('lightning') && /(lwc|lightning|security|dom)/.test(haystack)) score += 10;
  if (topic.id.includes('metadata') && /(metadata|api|version|package)/.test(haystack)) score += 10;
  if (topic.id.includes('release') && /(release notes|release notes|rn |release)/.test(haystack)) score += 12;
  if (topic.id.includes('sales-cloud') && /(sales cloud|sales|account|contact|lead|opportunity|campaign|forecast|territory)/.test(haystack)) score += 14;
  if (topic.id.includes('service-cloud') && /(service cloud|service|case|entitlement|milestone|knowledge|queue|routing)/.test(haystack)) score += 14;
  if (topic.id.includes('data-cloud') && /(data cloud|c360|customer 360|data model|dmo|dlo|ingest|extract|identity)/.test(haystack)) score += 14;
  if (topic.id.includes('revenue-cloud') && /(revenue cloud|cpq|quote|order|product|price|catalog|contract|asset|industries|cme)/.test(haystack)) score += 14;
  if (topic.id.includes('marketing-cloud') && /(marketing cloud|engagement|growth|dataextension|subscriber|journey|content api|soap|rest)/.test(haystack)) score += 14;
  if (topic.id === 'standard-object-reference-sales-service' && /(object reference|sforce api objects|account|contact|lead|opportunity|case|task|event|quote|order)/.test(haystack)) score += 16;
  if (topic.id === 'metadata-api-type-reference' && /(metadata coverage|metadata types|api meta|customobject|customfield|flow|profile|permissionset|layout|flexipage)/.test(haystack)) score += 16;
  if (topic.id === 'flow-metadata-edge-cases' && /(flow|visual workflow|flowdefinition|flowsettings|flowtest|record triggered|autolaunched|subflow)/.test(haystack)) score += 16;
  if (/(email|emailmessage|activity|task|outlook|gmail)/.test(topic.id) && /(email|emailmessage|emailmessageid|activity|task|outlook|gmail|emailservices)/.test(haystack)) score += 14;
  if (topic.category === 'object_reference' && /(object reference|sforce api objects|object_reference)/.test(haystack)) score += 12;
  if (topic.category === 'integration' && /(setup|integration|emailadmin|outlook|gmail|activity capture)/.test(haystack)) score += 8;

  for (const keyword of topic.keywords) {
    const normalizedKeyword = normalizeForMatch(keyword);
    if (!normalizedKeyword || normalizedKeyword.length < 4) continue;
    if (haystack.includes(normalizedKeyword)) {
      score += normalizedKeyword.includes(' ') ? 8 : 4;
    }
  }

  for (const token of topic.query.split(/[^a-z0-9]+/i)) {
    const normalizedToken = normalizeForMatch(token);
    if (normalizedToken.length >= 5 && haystack.includes(normalizedToken)) score += 1;
  }

  if (entry.lastModified) {
    const ageMs = Date.now() - Date.parse(entry.lastModified);
    if (Number.isFinite(ageMs) && ageMs < MAX_INDEX_SOURCE_AGE_MS) score += 2;
  }

  return score;
}

function isMetadataOnlyUrl(urlValue: string): boolean {
  try {
    const url = new URL(urlValue);
    return url.hostname === 'help.salesforce.com' && url.pathname.includes('/articleView');
  } catch {
    return false;
  }
}

function contentQualityForRecord(record: SalesforceDocsIndexRecord): SalesforceDocsContentQuality {
  return record.contentQuality || (record.contentLength >= FULL_TEXT_CONTENT_LENGTH_FLOOR ? 'full_text' : 'metadata_only');
}

function isFullTextRecord(record: SalesforceDocsIndexRecord): boolean {
  return contentQualityForRecord(record) === 'full_text' && record.contentLength >= FULL_TEXT_CONTENT_LENGTH_FLOOR;
}

function topicRecords(records: SalesforceDocsIndexRecord[], topicId: string): SalesforceDocsIndexRecord[] {
  return records.filter((record) => record.topicIds.includes(topicId));
}

function shouldFetchSitemapEntryForTopic(
  entry: SalesforceDocsSitemapEntry,
  topic: SalesforceDocsIndexTopic,
  records: SalesforceDocsIndexRecord[],
): boolean {
  if (!isMetadataOnlyUrl(entry.url)) return true;
  const recordsForTopic = topicRecords(records, topic.id);
  const metadataOnlyRecordsForTopic = recordsForTopic.filter((record) => contentQualityForRecord(record) === 'metadata_only').length;
  const fullTextRecordsForTopic = recordsForTopic.filter(isFullTextRecord).length;
  if (metadataOnlyRecordsForTopic >= MAX_METADATA_ONLY_SITEMAP_RECORDS_PER_TOPIC) return false;
  return fullTextRecordsForTopic === 0 || recordsForTopic.length < 2;
}

async function buildRecord(
  topic: SalesforceDocsIndexTopic,
  rawUrl: string,
  retrievedAt: string,
  index: number,
  discovery: {
    source: 'seed' | 'sitemap';
    lastModified?: string;
    sitemapUrl?: string;
    sitemapScore?: number;
  } = { source: 'seed' },
): Promise<SalesforceDocsIndexRecord> {
  const url = canonicalizeUrl(rawUrl);
  if (!url) {
    throw new Error(`URL is not an allowed official Salesforce URL: ${rawUrl}`);
  }
  const content = await fetchOfficialDoc(url);
  const text = content.text;
  const status = inferStatus(`${text} ${content.releaseLabel || ''}`);
  const warnings = [...sourceWarnings(`${text} ${content.releaseLabel || ''}`, status), ...(content.warnings || [])];
  return {
    id: `sf-doc-index-${index}`,
    topicIds: [topic.id],
    title: content.title || extractTitle(text, topic.label),
    url,
    domain: new URL(url).hostname,
    sourceType: inferSourceType(url),
    status,
    retrievedAt,
    responseHash: crypto.createHash('sha256').update(text).digest('hex'),
    contentQuality: content.contentQuality,
    contentLength: text.length,
    excerpt: excerptFor(text, topic),
    keywords: topic.keywords,
    warnings,
    apiVersion: content.apiVersion,
    releaseLabel: content.releaseLabel,
    documentationVersion: content.documentationVersion,
    lastModified: discovery.lastModified,
    discoverySource: discovery.source,
    sitemapUrl: discovery.sitemapUrl,
    sitemapScore: discovery.sitemapScore,
    confidenceImpact: status === 'preview' || warnings.some((warning) => /previous|stale/i.test(warning))
      ? 'stale-risk'
      : status === 'ga'
        ? 'supports'
        : 'unclear',
  };
}

export async function buildSalesforceDocsIndexNow(): Promise<SalesforceDocsIndex> {
  const generatedAt = new Date().toISOString();
  const records: SalesforceDocsIndexRecord[] = [];
  const failures: SalesforceDocsIndex['failures'] = [];
  const seenUrls = new Set<string>();

  for (const topic of SALESFORCE_DOC_TOPICS) {
    for (const rawUrl of topic.seedUrls) {
      const canonicalUrl = canonicalizeUrl(rawUrl);
      if (!canonicalUrl) {
        failures.push({ topicId: topic.id, url: rawUrl, error: 'URL is not an allowed official Salesforce URL.' });
        continue;
      }

      const existingRecord = records.find((record) => record.url === canonicalUrl);
      if (existingRecord) {
        existingRecord.topicIds = Array.from(new Set([...existingRecord.topicIds, topic.id]));
        existingRecord.keywords = Array.from(new Set([...existingRecord.keywords, ...topic.keywords]));
        continue;
      }
      if (seenUrls.has(canonicalUrl)) continue;
      seenUrls.add(canonicalUrl);

      try {
        records.push(await buildRecord(topic, canonicalUrl, generatedAt, records.length + 1));
      } catch (error: any) {
        failures.push({
          topicId: topic.id,
          url: canonicalUrl,
          error: error?.message || 'Unknown fetch failure',
        });
      }
    }
  }

  const sitemapEntries = await discoverSitemapEntries(failures);
  for (const topic of SALESFORCE_DOC_TOPICS) {
    const scoredEntries = sitemapEntries
      .map((entry) => ({ entry, score: scoreSitemapEntryForTopic(entry, topic) }))
      .filter(({ score }) => score >= MIN_SITEMAP_TOPIC_SCORE)
      .sort((a, b) => b.score - a.score || a.entry.url.localeCompare(b.entry.url));

    let topicSitemapRecordCount = 0;
    for (const { entry, score } of scoredEntries) {
      if (topicSitemapRecordCount >= MAX_SITEMAP_RECORDS_PER_TOPIC) break;
      if (!shouldFetchSitemapEntryForTopic(entry, topic, records)) continue;
      const existingRecord = records.find((record) => record.url === entry.url);
      if (existingRecord) {
        existingRecord.topicIds = Array.from(new Set([...existingRecord.topicIds, topic.id]));
        existingRecord.keywords = Array.from(new Set([...existingRecord.keywords, ...topic.keywords]));
        continue;
      }
      if (seenUrls.has(entry.url)) continue;
      seenUrls.add(entry.url);

      try {
        records.push(await buildRecord(topic, entry.url, generatedAt, records.length + 1, {
          source: 'sitemap',
          lastModified: entry.lastModified,
          sitemapUrl: entry.sitemapUrl,
          sitemapScore: score,
        }));
        topicSitemapRecordCount += 1;
      } catch (error: any) {
        failures.push({
          topicId: topic.id,
          url: entry.url,
          error: error?.message || 'Unknown sitemap-discovered fetch failure',
        });
      }
    }
  }

  const fullTextRecords = records.filter(isFullTextRecord).length;
  const metadataOnlyRecords = records.filter((record) => contentQualityForRecord(record) === 'metadata_only').length;

  const index: SalesforceDocsIndex = {
    version: SALESFORCE_DOC_INDEX_VERSION,
    generatedAt,
    sourcePolicy: {
      allowedHostPattern: '*.salesforce.com',
      storagePath: SALESFORCE_DOC_INDEX_PATH,
    },
    topics: SALESFORCE_DOC_TOPICS,
    records,
    failures,
    discovery: {
      sitemapSources: SALESFORCE_DOC_SITEMAP_SOURCES.map((source) => source.url),
      sitemapUrlCount: sitemapEntries.length,
      sitemapRecordLimitPerTopic: MAX_SITEMAP_RECORDS_PER_TOPIC,
    },
    warnings: [
      records.length === 0 ? 'No official Salesforce documentation records were fetched.' : '',
      failures.length > 0 ? `${failures.length} official Salesforce documentation seed URL(s) failed to fetch.` : '',
      sitemapEntries.length === 0 ? 'Salesforce documentation sitemap discovery returned no official URLs.' : '',
      metadataOnlyRecords > 0 ? `${metadataOnlyRecords} official Salesforce documentation record(s) are metadata-only Help Center references without extracted article body text.` : '',
      fullTextRecords < MIN_REFRESH_FULL_TEXT_RECORDS ? `Only ${fullTextRecords} full-text documentation record(s) met the quality floor.` : '',
    ].filter(Boolean),
  };

  return index;
}

function developerDocRecordCount(index: SalesforceDocsIndex): number {
  return index.records.filter((record) => record.domain === 'developer.salesforce.com').length;
}

function fullTextRecordCount(index: SalesforceDocsIndex): number {
  return index.records.filter(isFullTextRecord).length;
}

function metadataOnlyRecordCount(index: SalesforceDocsIndex): number {
  return index.records.filter((record) => contentQualityForRecord(record) === 'metadata_only').length;
}

function metadataOnlyRatio(index: SalesforceDocsIndex): number {
  if (index.records.length === 0) return 0;
  return metadataOnlyRecordCount(index) / index.records.length;
}

function countRecordsBySourceType(index: SalesforceDocsIndex): Record<string, number> {
  return index.records.reduce((acc, record) => {
    acc[record.sourceType] = (acc[record.sourceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function countFailuresByDomain(index: SalesforceDocsIndex): Record<string, number> {
  return index.failures.reduce((acc, failure) => {
    let domain = 'unknown';
    try {
      domain = new URL(failure.url).hostname;
    } catch {
      domain = 'invalid-url';
    }
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function refreshCoverageError(index: SalesforceDocsIndex): string | null {
  const developerRecords = developerDocRecordCount(index);
  if (developerRecords < MIN_REFRESH_DEVELOPER_DOC_RECORDS) {
    return [
      `Salesforce docs index refresh produced ${developerRecords} developer.salesforce.com record(s),`,
      `below required minimum ${MIN_REFRESH_DEVELOPER_DOC_RECORDS}; keeping the previous index.`,
    ].join(' ');
  }

  const fullTextRecords = fullTextRecordCount(index);
  if (fullTextRecords < MIN_REFRESH_FULL_TEXT_RECORDS) {
    return [
      `Salesforce docs index refresh produced ${fullTextRecords} full-text record(s),`,
      `below required minimum ${MIN_REFRESH_FULL_TEXT_RECORDS}; keeping the previous index.`,
    ].join(' ');
  }

  const ratio = metadataOnlyRatio(index);
  if (ratio > MAX_REFRESH_METADATA_ONLY_RATIO) {
    return [
      `Salesforce docs index refresh produced a metadata-only ratio of ${ratio.toFixed(2)},`,
      `above allowed maximum ${MAX_REFRESH_METADATA_ONLY_RATIO}; keeping the previous index.`,
    ].join(' ');
  }

  return null;
}

export async function refreshSalesforceDocsIndexNow(): Promise<SalesforceDocsIndex> {
  const index = await buildSalesforceDocsIndexNow();
  const coverageError = refreshCoverageError(index);
  if (coverageError) {
    throw new Error(coverageError);
  }
  await writeSalesforceDocsIndex(index);
  return index;
}

export async function readSalesforceDocsIndex(): Promise<SalesforceDocsIndex | null> {
  try {
    const indexText = await readSalesforceDocsIndexText();
    if (!indexText) return null;
    const parsed = JSON.parse(indexText) as SalesforceDocsIndex;
    return parsed && parsed.version === SALESFORCE_DOC_INDEX_VERSION ? parsed : null;
  } catch (error) {
    console.warn('[salesforceDocsIndex] Failed to read Salesforce docs index:', error);
    return null;
  }
}

function tokensForTopic(topic: SalesforceDocsLookupTopicLike): string[] {
  return Array.from(new Set([
    topic.id,
    topic.label,
    topic.query,
    ...(topic.componentTypes || []),
    ...(topic.apiVersions || []),
    ...(topic.riskSignalIds || []),
  ].join(' ').toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3)));
}

function scoreRecordForTopic(record: SalesforceDocsIndexRecord, topic: SalesforceDocsLookupTopicLike, tokens: string[]): number {
  let score = 0;
  if (record.topicIds.includes(topic.id)) score += 100;
  const haystack = [
    record.title,
    record.url,
    record.excerpt,
    record.keywords.join(' '),
    record.topicIds.join(' '),
  ].join(' ').toLowerCase();
  for (const token of tokens) {
    if (haystack.includes(token)) score += 2;
  }
  for (const riskSignalId of topic.riskSignalIds || []) {
    if (riskSignalId.includes('apex') && record.topicIds.some((id) => id.startsWith('apex-'))) score += 8;
    if (riskSignalId.includes('flow') && record.topicIds.some((id) => id.startsWith('flow-'))) score += 8;
    if (riskSignalId.includes('permissions') && record.topicIds.includes('permissions-least-privilege')) score += 8;
    if (riskSignalId.includes('lightning') && record.topicIds.includes('lightning-security')) score += 8;
  }
  return score;
}

export async function lookupSalesforceDocsIndex(
  topics: SalesforceDocsLookupTopicLike[],
  options: { generatedAt: string; maxResultsPerTopic: number },
): Promise<SalesforceDocsIndexLookupResult> {
  const index = await readSalesforceDocsIndex();
  if (!index) {
    return {
      sources: [],
      topicHits: [],
      warnings: [`Salesforce documentation index is unavailable at ${SALESFORCE_DOC_INDEX_PATH}; falling back to live official-source lookup.`],
      indexSummary: {
        status: 'unavailable',
        storagePath: SALESFORCE_DOC_INDEX_PATH,
        recordCount: 0,
        topicCoverage: topics.map((topic) => ({
          topicId: topic.id,
          status: 'unavailable',
          sourceCount: 0,
          reason: 'Salesforce documentation index was unavailable.',
        })),
        missedTopics: topics.map((topic) => ({
          topicId: topic.id,
          label: topic.label,
          reason: 'unavailable',
        })),
        stalenessWarnings: [],
      },
    };
  }

  const indexAgeMs = Date.now() - Date.parse(index.generatedAt);
  const warnings = [...index.warnings];
  if (Number.isFinite(indexAgeMs) && indexAgeMs > MAX_INDEX_AGE_MS) {
    warnings.push(`Salesforce documentation index is older than ${Math.round(MAX_INDEX_AGE_MS / (24 * 60 * 60 * 1000))} days; live verification is recommended.`);
  }

  const sources: SalesforceDocsIndexEvidenceSource[] = [];
  const topicHits = new Set<string>();
  const topicSourceCounts = new Map<string, number>();
  const seenSourceKeys = new Set<string>();

  for (const topic of topics) {
    const tokens = tokensForTopic(topic);
    const scored = index.records
      .map((record) => ({ record, score: scoreRecordForTopic(record, topic, tokens) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title))
      .slice(0, options.maxResultsPerTopic);

    if (scored.length === 0) continue;
    topicHits.add(topic.id);
    topicSourceCounts.set(topic.id, scored.length);

    for (const item of scored) {
      const sourceKey = `${topic.id}:${item.record.url}`;
      if (seenSourceKeys.has(sourceKey)) continue;
      seenSourceKeys.add(sourceKey);

      const sourceAgeMs = Date.now() - Date.parse(item.record.retrievedAt);
      const sourceWarnings = [
        ...item.record.warnings,
        `Source came from cached official Salesforce docs index generated ${index.generatedAt}.`,
        Number.isFinite(sourceAgeMs) && sourceAgeMs > MAX_INDEX_SOURCE_AGE_MS
          ? 'Cached source is older than 90 days; confidence should be downgraded unless live verification succeeds.'
          : '',
      ].filter(Boolean);

      sources.push({
        id: `sf-doc-cache-${sources.length + 1}`,
        topicId: topic.id,
        title: item.record.title,
        url: item.record.url,
        domain: item.record.domain,
        sourceType: item.record.sourceType,
        status: item.record.status,
        retrievedAt: item.record.retrievedAt,
        responseHash: item.record.responseHash,
        contentQuality: contentQualityForRecord(item.record),
        contentLength: item.record.contentLength,
        excerpt: item.record.excerpt,
        searchSnippet: `Cached official Salesforce documentation index match (score ${item.score}).`,
        warnings: sourceWarnings,
        apiVersion: item.record.apiVersion,
        releaseLabel: item.record.releaseLabel,
        documentationVersion: item.record.documentationVersion,
        lastModified: item.record.lastModified,
        confidenceImpact: sourceWarnings.some((warning) => /older than|stale|preview|previous/i.test(warning))
          ? 'stale-risk'
          : item.record.confidenceImpact,
      });
    }
  }

  return {
    sources,
    topicHits: Array.from(topicHits),
    warnings,
    indexSummary: {
      status: sources.length > 0
        ? (Number.isFinite(indexAgeMs) && indexAgeMs > MAX_INDEX_AGE_MS ? 'stale' : 'hit')
        : 'miss',
      generatedAt: index.generatedAt,
      storagePath: SALESFORCE_DOC_INDEX_PATH,
      recordCount: index.records.length,
      developerDocCount: developerDocRecordCount(index),
      fullTextRecordCount: fullTextRecordCount(index),
      metadataOnlyRecordCount: metadataOnlyRecordCount(index),
      indexSourceCounts: countRecordsBySourceType(index),
      failedDomains: countFailuresByDomain(index),
      topicCoverage: topics.map((topic) => {
        const sourceCount = topicSourceCounts.get(topic.id) || 0;
        const stale = sourceCount > 0 && Number.isFinite(indexAgeMs) && indexAgeMs > MAX_INDEX_AGE_MS;
        return {
          topicId: topic.id,
          status: sourceCount > 0 ? (stale ? 'stale' as const : 'hit' as const) : 'miss' as const,
          sourceCount,
          reason: sourceCount > 0
            ? undefined
            : 'No cached official Salesforce documentation source matched this topic.',
        };
      }),
      missedTopics: topics
        .filter((topic) => !topicHits.has(topic.id))
        .map((topic) => ({
          topicId: topic.id,
          label: topic.label,
          reason: index.topics.some((indexedTopic) => indexedTopic.id === topic.id)
            ? 'no_official_source' as const
            : 'not_indexed' as const,
        })),
      stalenessWarnings: warnings.filter((warning) => /older than|stale|previous/i.test(warning)),
    },
  };
}

export const refreshSalesforceDocsIndex = onCall(
  {
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to refresh Salesforce docs index');
    }
    const token = request.auth.token as Record<string, unknown>;
    if (token.admin !== true && token.developer !== true) {
      throw new HttpsError('permission-denied', 'Only administrators can refresh Salesforce docs index');
    }
    const index = await refreshSalesforceDocsIndexNow();
    return {
      success: true,
      generatedAt: index.generatedAt,
      storagePath: SALESFORCE_DOC_INDEX_PATH,
      recordCount: index.records.length,
      failureCount: index.failures.length,
      warnings: index.warnings,
    };
  }
);

export const scheduledSalesforceDocsIndexRefresh = onSchedule(
  {
    schedule: 'every 24 hours',
    timeoutSeconds: 540,
    memory: '1GiB',
  },
  async () => {
    try {
      const index = await refreshSalesforceDocsIndexNow();
      console.log('[salesforceDocsIndex] Refreshed Salesforce docs index', {
        generatedAt: index.generatedAt,
        recordCount: index.records.length,
        failureCount: index.failures.length,
      });
    } catch (error: any) {
      if (typeof error?.message === 'string' && error.message.includes('keeping the previous index')) {
        console.warn('[salesforceDocsIndex] Scheduled refresh skipped', {
          message: error.message,
        });
        return;
      }
      console.error('[salesforceDocsIndex] Scheduled refresh failed', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      throw error;
    }
  }
);
