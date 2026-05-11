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

const SALESFORCE_DOC_INDEX_PATH = 'salesforce-docs/index-v1.json';
const SALESFORCE_DOC_INDEX_BUCKET = 'symposium-ai.firebasestorage.app';
const SALESFORCE_DOC_INDEX_VERSION = 1;
const MAX_INDEX_SOURCE_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_INDEX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_SITEMAP_CHILDREN_PER_SOURCE = 60;
const MAX_SITEMAP_ENTRIES_PER_SOURCE = 15000;
const MAX_SITEMAP_RECORDS_PER_TOPIC = 4;
const MIN_SITEMAP_TOPIC_SCORE = 8;
const OFFICIAL_HOST_PATTERN = /(^|\.)salesforce\.com$/i;

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
      'https://help.salesforce.com/s/articleView?id=release-notes.salesforce_release_notes.htm&language=en_US&type=5',
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
      'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_code_best_practices.htm',
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
      'https://developer.salesforce.com/docs/platform/salesforce-code-analyzer/guide/usewithsharingondatabaseoperation-rule.html',
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
      'https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements_actions_update_records.htm&type=5',
      'https://help.salesforce.com/s/articleView?id=sf.flow_ref_elements.htm&type=5',
    ],
  },
  {
    id: 'flow-order-recursion',
    label: 'Flow automation order and recursion control',
    query: 'Salesforce Flow order of execution recursion record updates autolaunched flow',
    category: 'flow',
    keywords: ['flow', 'order of execution', 'recursion', 'record updates', 'autolaunched flow'],
    seedUrls: [
      'https://help.salesforce.com/s/articleView?id=sf.process_troubleshoot_flow_errors.htm&type=5',
      'https://help.salesforce.com/s/articleView?id=sf.flow_considerations_design.htm&type=5',
    ],
  },
  {
    id: 'permissions-least-privilege',
    label: 'Permission set and profile least privilege',
    query: 'Salesforce permission sets profiles ModifyAllData ViewAllData least privilege',
    category: 'permissions',
    keywords: ['permission set', 'profile', 'modify all data', 'view all data', 'least privilege', 'object permissions'],
    seedUrls: [
      'https://help.salesforce.com/s/articleView?id=sf.perm_sets_overview.htm&type=5',
      'https://help.salesforce.com/s/articleView?id=sf.admin_userperms.htm&type=5',
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
    id: 'metadata-api-versioning',
    label: 'Metadata API and component API versioning',
    query: 'Salesforce Metadata API API version support release notes',
    category: 'metadata_api',
    keywords: ['metadata api', 'api version', 'package xml', 'release notes'],
    seedUrls: [
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_intro.htm',
      'https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_versions.htm',
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
    label: 'Salesforce Help release notes sitemap',
    url: 'https://help.salesforce.com/apex/Help_SiteMapIndexExternal?producttype=release-notes',
    maxChildSitemaps: 20,
    maxEntries: 8000,
  },
  {
    label: 'Salesforce Help platform sitemap',
    url: 'https://help.salesforce.com/apex/Help_SiteMapIndexExternal?producttype=platform',
    maxChildSitemaps: MAX_SITEMAP_CHILDREN_PER_SOURCE,
    maxEntries: MAX_SITEMAP_ENTRIES_PER_SOURCE,
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

async function writeSalesforceDocsIndex(index: SalesforceDocsIndex): Promise<void> {
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

async function fetchText(url: string, timeoutMs = 20000): Promise<string> {
  if (!isOfficialSalesforceUrl(url)) {
    throw new Error(`URL is not an allowed official Salesforce URL: ${url}`);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SymposiumAI/1.0 SalesforceDocsIndex (+https://www.symposiumai.app)',
        'Accept': 'text/html, text/plain, application/xhtml+xml, */*',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
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
  const developerContent = await fetchDeveloperDocsContent(url);
  if (developerContent) return developerContent;

  const helpArticleMetadata = buildHelpArticleMetadata(url);
  if (helpArticleMetadata) return helpArticleMetadata;

  const text = await fetchText(url);
  const normalized = stripHtmlTags(text);
  if (normalized.length < 80) {
    throw new Error(`Fetched content was too short (${normalized.length} chars)`);
  }
  return {
    text: normalized.slice(0, 120000),
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

export async function refreshSalesforceDocsIndexNow(): Promise<SalesforceDocsIndex> {
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
      .sort((a, b) => b.score - a.score || a.entry.url.localeCompare(b.entry.url))
      .slice(0, MAX_SITEMAP_RECORDS_PER_TOPIC);

    for (const { entry, score } of scoredEntries) {
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
      } catch (error: any) {
        failures.push({
          topicId: topic.id,
          url: entry.url,
          error: error?.message || 'Unknown sitemap-discovered fetch failure',
        });
      }
    }
  }

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
    ].filter(Boolean),
  };

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
