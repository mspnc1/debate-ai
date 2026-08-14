const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
  canonicalizeUrl,
  inferSalesforceDocumentationStatus,
  officialDocRetrievalPlan,
  buildBm25CorpusStats,
  bm25ChunkScore,
  refreshCoverageError,
  selectionIsAliasRouted,
} = require('../lib/salesforceDocsIndex');

describe('selectionIsAliasRouted', () => {
  it('routes only when a selected record belongs to an aliased indexed topic', () => {
    const aliasIds = ['apex-governor-limits', 'soql-query-selectivity'];
    assert.equal(
      selectionIsAliasRouted([{ topicIds: ['flow-fault-paths'] }, { topicIds: ['apex-governor-limits'] }], aliasIds),
      true
    );
    assert.equal(
      selectionIsAliasRouted([{ topicIds: ['flow-fault-paths'] }, { topicIds: ['lightning-security'] }], aliasIds),
      false,
      'token-scavenged selections must not count as alias-routed'
    );
    assert.equal(selectionIsAliasRouted([], aliasIds), false);
  });
});

describe('canonicalizeUrl', () => {
  it('strips tracking params but preserves real params starting with d/n', () => {
    const canonical = canonicalizeUrl(
      'https://developer.salesforce.com/page?docId=abc&deliverable=apexcode&utm_source=x&d=70130000000sdFc&nc=1&cmpid=7&trkid=9&mc_eid=4'
    );
    const url = new URL(canonical);
    assert.equal(url.searchParams.get('docId'), 'abc');
    assert.equal(url.searchParams.get('deliverable'), 'apexcode');
    for (const stripped of ['utm_source', 'd', 'nc', 'cmpid', 'trkid', 'mc_eid']) {
      assert.equal(url.searchParams.get(stripped), null, `expected ${stripped} to be stripped`);
    }
  });

  it('clears fragments and lowercases the host', () => {
    const canonical = canonicalizeUrl('https://Developer.Salesforce.com/docs/page.htm#section-3');
    assert.equal(canonical, 'https://developer.salesforce.com/docs/page.htm');
  });

  it('rejects non-official and non-https URLs', () => {
    assert.equal(canonicalizeUrl('https://example.com/docs'), null);
    assert.equal(canonicalizeUrl('https://salesforce.com.evil.example/docs'), null);
    assert.equal(canonicalizeUrl('http://developer.salesforce.com/docs/page.htm'), null);
  });
});

describe('inferSalesforceDocumentationStatus', () => {
  it('flags genuine preview language', () => {
    assert.equal(
      inferSalesforceDocumentationStatus('This feature is currently in beta and subject to change.'),
      'preview'
    );
    assert.equal(
      inferSalesforceDocumentationStatus('Available as a Developer Preview in scratch orgs.'),
      'preview'
    );
    assert.equal(
      inferSalesforceDocumentationStatus(
        "These features are in pilot and don't become generally available unless Salesforce announces otherwise."
      ),
      'preview'
    );
  });

  it('does not flag GA pages that carry safe-harbor boilerplate as preview', () => {
    const gaPageWithSafeHarbor = [
      "Salesforce Winter '26 Release Notes. This feature is generally available in all editions.",
      'This document contains forward-looking statements about unreleased services or features that',
      "don't become generally available on time or at all.",
      'Customers should make purchase decisions based on features that are currently available.',
    ].join(' ');
    assert.equal(inferSalesforceDocumentationStatus(gaPageWithSafeHarbor), 'ga');
  });

  it('classifies GA and neutral text', () => {
    assert.equal(inferSalesforceDocumentationStatus('This feature is generally available.'), 'ga');
    assert.equal(inferSalesforceDocumentationStatus('Use SOQL to query records in Apex.'), 'unknown');
  });
});

describe('officialDocRetrievalPlan', () => {
  const atlasUrl = 'https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm';
  const releaseNotesUrl = 'https://help.salesforce.com/s/articleView?id=release-notes.rn_apex.htm&language=en_US&type=5';
  const helpArticleUrl = 'https://help.salesforce.com/s/articleView?id=sf.flow_concepts.htm&type=5';

  it('routes atlas developer docs through the JSON API', () => {
    assert.equal(officialDocRetrievalPlan(atlasUrl), 'developer_api');
    assert.equal(officialDocRetrievalPlan(atlasUrl, { allowRendering: false }), 'developer_api');
  });

  it('renders release-notes help articles only when rendering is allowed', () => {
    assert.equal(officialDocRetrievalPlan(releaseNotesUrl), 'rendered_help');
    assert.equal(officialDocRetrievalPlan(releaseNotesUrl, { allowRendering: false }), 'help_metadata');
  });

  it('serves other help articles as metadata and everything else as raw HTML', () => {
    assert.equal(officialDocRetrievalPlan(helpArticleUrl), 'help_metadata');
    assert.equal(
      officialDocRetrievalPlan('https://developer.salesforce.com/docs/platform/lwc/guide/apex-security.html'),
      'raw_html'
    );
    assert.equal(
      officialDocRetrievalPlan('https://architect.salesforce.com/decision-guides/trigger-automation'),
      'raw_html'
    );
  });
});

describe('BM25 chunk scoring', () => {
  function statsWith(totalChunks, avgChunkLength) {
    return { totalChunks, avgChunkLength, dfByToken: new Map() };
  }

  it('computes corpus stats in one pass over index chunks', () => {
    const index = {
      records: [
        { textChunks: [{ text: 'a'.repeat(100), contentLength: 100 }, { text: 'b'.repeat(300), contentLength: 300 }] },
        { textChunks: [{ text: 'c'.repeat(200), contentLength: 200 }] },
        {},
      ],
    };
    const stats = buildBm25CorpusStats(index);
    assert.equal(stats.totalChunks, 3);
    assert.equal(stats.avgChunkLength, 200);
    assert.equal(stats.dfByToken.size, 0);
  });

  it('weights rare tokens above common tokens', () => {
    const stats = statsWith(100, 100);
    const text = 'apex governor limits apply to synchronous transactions';
    const rare = bm25ChunkScore(text, text.length, ['governor'], stats, () => 2);
    const common = bm25ChunkScore(text, text.length, ['governor'], stats, () => 90);
    assert.ok(rare > common, `expected rare-token score ${rare} > common-token score ${common}`);
  });

  it('saturates term frequency', () => {
    const stats = statsWith(100, 60);
    const once = 'governor limits apply here in this transaction context and elsewhere';
    const fourTimes = 'governor governor governor governor limits apply in transaction context';
    const scoreOnce = bm25ChunkScore(once, once.length, ['governor'], stats, () => 5);
    const scoreFour = bm25ChunkScore(fourTimes, fourTimes.length, ['governor'], stats, () => 5);
    assert.ok(scoreFour > scoreOnce, 'more occurrences must score higher');
    assert.ok(scoreFour < scoreOnce * 4, 'term frequency must saturate, not scale linearly');
  });

  it('normalizes for chunk length', () => {
    const stats = statsWith(100, 100);
    const shortText = 'governor limits';
    const longText = `governor limits ${'padding '.repeat(60)}`;
    const shortScore = bm25ChunkScore(shortText, 50, ['governor'], stats, () => 5);
    const longScore = bm25ChunkScore(longText, 400, ['governor'], stats, () => 5);
    assert.ok(shortScore > longScore, 'same tf in a shorter chunk must score higher');
  });

  it('returns 0 on an empty corpus', () => {
    assert.equal(bm25ChunkScore('governor', 8, ['governor'], statsWith(0, 0), () => 0), 0);
  });
});

describe('refreshCoverageError', () => {
  function makeRecord(overrides = {}) {
    return {
      id: 'r',
      topicIds: ['apex-governor-limits'],
      title: 'Doc',
      url: 'https://developer.salesforce.com/docs/page.htm',
      domain: 'developer.salesforce.com',
      sourceType: 'developer_doc',
      status: 'ga',
      retrievedAt: new Date().toISOString(),
      responseHash: 'hash',
      contentQuality: 'full_text',
      contentLength: 1000,
      excerpt: 'excerpt',
      keywords: [],
      warnings: [],
      discoverySource: 'seed',
      confidenceImpact: 'supports',
      ...overrides,
    };
  }

  function makeIndex(records) {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      sourcePolicy: { allowedHostPattern: '*.salesforce.com', storagePath: 'salesforce-docs/index-v1.json' },
      topics: [],
      records,
      failures: [],
      warnings: [],
    };
  }

  const passingRecords = [
    ...Array.from({ length: 120 }, (_, i) => makeRecord({ id: `dev-${i}` })),
    ...Array.from({ length: 12 }, (_, i) => makeRecord({
      id: `pdf-${i}`,
      domain: 'resources.docs.salesforce.com',
      sourceType: 'pdf_guide',
      sourceFormat: 'pdf',
    })),
  ];

  it('accepts an index meeting all gates', () => {
    assert.equal(refreshCoverageError(makeIndex(passingRecords)), null);
  });

  it('rejects too few developer.salesforce.com records', () => {
    const records = passingRecords.map((record, i) =>
      i < 60 ? { ...record, domain: 'help.salesforce.com' } : record
    );
    assert.match(refreshCoverageError(makeIndex(records)), /developer\.salesforce\.com/);
  });

  it('rejects too few full-text records', () => {
    const records = passingRecords.map((record) => ({ ...record, contentLength: 100 }));
    assert.match(refreshCoverageError(makeIndex(records)), /full-text/);
  });

  it('rejects too few PDF records', () => {
    const records = passingRecords.map((record) =>
      record.sourceFormat === 'pdf' && record.id !== 'pdf-0' ? { ...record, sourceFormat: 'html' } : record
    );
    assert.match(refreshCoverageError(makeIndex(records)), /PDF record/);
  });

  it('rejects a metadata-only ratio above the ceiling', () => {
    const records = [
      ...passingRecords,
      ...Array.from({ length: 8 }, (_, i) => makeRecord({
        id: `meta-${i}`,
        contentQuality: 'metadata_only',
        contentLength: 120,
      })),
    ];
    assert.match(refreshCoverageError(makeIndex(records)), /metadata-only ratio/);
  });
});
