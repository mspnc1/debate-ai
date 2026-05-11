#!/usr/bin/env node

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const {
  SALESFORCE_DOC_INDEX_BUCKET,
  buildSalesforceDocsIndexNow,
  writeSalesforceDocsIndex,
} = require('../lib/salesforceDocsIndex');

function parseArgs(argv) {
  const options = {
    out: path.join(os.tmpdir(), 'salesforce-docs-index-v1.json'),
    upload: false,
    uploadMode: 'google-auth',
    maxFailures: null,
    minDeveloperRecords: 0,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--out') {
      if (!next) throw new Error('--out requires a file path');
      options.out = next;
      i += 1;
    } else if (arg === '--upload') {
      options.upload = true;
    } else if (arg === '--no-upload') {
      options.upload = false;
    } else if (arg === '--upload-mode') {
      if (!next || !['google-auth', 'gcloud'].includes(next)) {
        throw new Error('--upload-mode must be google-auth or gcloud');
      }
      options.uploadMode = next;
      i += 1;
    } else if (arg === '--max-failures') {
      if (!next) throw new Error('--max-failures requires a number');
      options.maxFailures = Number(next);
      i += 1;
    } else if (arg === '--min-developer-records') {
      if (!next) throw new Error('--min-developer-records requires a number');
      options.minDeveloperRecords = Number(next);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.maxFailures !== null && !Number.isInteger(options.maxFailures)) {
    throw new Error('--max-failures must be an integer');
  }
  if (!Number.isInteger(options.minDeveloperRecords)) {
    throw new Error('--min-developer-records must be an integer');
  }

  return options;
}

function printHelp() {
  console.log(`
Build the official Salesforce docs index outside Firebase Functions.

Usage:
  npm --prefix functions run salesforce-docs:index -- [options]

Options:
  --out <path>                    Write generated JSON to this path.
  --upload                        Upload the generated index to Firebase Storage.
  --no-upload                     Generate locally without uploading. Default.
  --upload-mode <mode>            Upload with google-auth or gcloud. Default: google-auth.
  --max-failures <number>         Fail if fetch failures exceed this count.
  --min-developer-records <num>   Fail if fewer developer.salesforce.com records are indexed.
  -h, --help                      Show this help.

Authentication for --upload:
  google-auth: Use Google Application Default Credentials locally, or
  google-github-actions/auth with Workload Identity Federation in CI.
  gcloud: Use the active gcloud CLI account.
`);
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function summarizeIndex(index) {
  const developerRecords = index.records.filter((record) => record.domain === 'developer.salesforce.com');
  const failureDomains = countBy(index.failures, (failure) => {
    try {
      return new URL(failure.url).hostname;
    } catch {
      return 'invalid-url';
    }
  });

  return {
    generatedAt: index.generatedAt,
    recordCount: index.records.length,
    failureCount: index.failures.length,
    developerRecordCount: developerRecords.length,
    sourceTypeCounts: countBy(index.records, (record) => record.sourceType),
    statusCounts: countBy(index.records, (record) => record.status),
    failureDomains,
    storagePath: index.sourcePolicy.storagePath,
  };
}

function uploadWithGcloud(outputPath, storagePath) {
  const destination = `gs://${SALESFORCE_DOC_INDEX_BUCKET}/${storagePath}`;
  execFileSync('gcloud', ['storage', 'cp', outputPath, destination], { stdio: 'inherit' });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  console.log('[salesforce-docs-index] Building official Salesforce docs index...');
  const index = await buildSalesforceDocsIndexNow();
  const summary = summarizeIndex(index);

  await fs.mkdir(path.dirname(path.resolve(options.out)), { recursive: true });
  await fs.writeFile(options.out, `${JSON.stringify(index, null, 2)}\n`, 'utf-8');

  console.log('[salesforce-docs-index] Summary:');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`[salesforce-docs-index] Wrote ${options.out}`);

  if (index.failures.length > 0) {
    console.log('[salesforce-docs-index] Failures:');
    for (const failure of index.failures) {
      console.log(`- ${failure.topicId}: ${failure.url} (${failure.error})`);
    }
  }

  if (summary.developerRecordCount < options.minDeveloperRecords) {
    throw new Error(
      `Indexed ${summary.developerRecordCount} developer.salesforce.com record(s), below required minimum ${options.minDeveloperRecords}.`,
    );
  }

  if (options.maxFailures !== null && index.failures.length > options.maxFailures) {
    throw new Error(`Index has ${index.failures.length} failure(s), above allowed maximum ${options.maxFailures}.`);
  }

  if (options.upload) {
    console.log('[salesforce-docs-index] Uploading index to Firebase Storage...');
    if (options.uploadMode === 'gcloud') {
      uploadWithGcloud(options.out, index.sourcePolicy.storagePath);
    } else {
      await writeSalesforceDocsIndex(index);
    }
    console.log(`[salesforce-docs-index] Uploaded ${index.sourcePolicy.storagePath}`);
  } else {
    console.log('[salesforce-docs-index] Upload skipped.');
  }
}

main().catch((error) => {
  console.error('[salesforce-docs-index] Failed:', error?.message || error);
  process.exitCode = 1;
});
