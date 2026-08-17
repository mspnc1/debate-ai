#!/usr/bin/env node
// Verify every SALESFORCE_DOC_TOPICS seed URL and SALESFORCE_DOC_PDF_SOURCES
// PDF is actually retrievable, using the same extraction paths the index build
// uses (dev-docs JSON API, rendered help articles, raw HTML). Run after `npm
// run build` and before any PR that touches the topic or PDF lists:
//
//   npm --prefix functions run build && node functions/scripts/salesforce-docs-verify-seeds.mjs
//
// Exits non-zero listing every dead source. Rendering requires local Chrome.

import { createRequire } from 'node:module';
import { execFile as execFileCallback } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

// CI parity: the index build runs with the curl fallback enabled because
// Salesforce's edge 403s Node fetch (undici TLS fingerprint) while allowing
// curl. Without these, every source looks dead from a local machine.
process.env.SALESFORCE_DOCS_ALLOW_CURL_FETCH = process.env.SALESFORCE_DOCS_ALLOW_CURL_FETCH || '1';
process.env.SALESFORCE_DOCS_ALLOW_CURL_PDF_FETCH = process.env.SALESFORCE_DOCS_ALLOW_CURL_PDF_FETCH || '1';

const require = createRequire(import.meta.url);
const {
  SALESFORCE_DOC_TOPICS,
  SALESFORCE_DOC_PDF_SOURCES,
  SALESFORCE_DOC_TOPIC_ALIASES,
  fetchOfficialDocContent,
  closeSalesforceHelpBrowser,
} = require('../lib/salesforceDocsIndex');

// Sequential with spacing on purpose: bursts trip Akamai's IP cool-down and
// then EVERYTHING 403s for a while (observed 2026-08-17).
const CONCURRENCY = 1;
const INTER_REQUEST_DELAY_MS = 750;
const MIN_TEXT_CHARS = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      results[index] = await tasks[index]();
      await sleep(INTER_REQUEST_DELAY_MS);
    }
  }));
  return results;
}

async function main() {
  const seedTasks = [];
  const seenSeeds = new Set();
  for (const topic of SALESFORCE_DOC_TOPICS) {
    for (const seedUrl of topic.seedUrls) {
      if (seenSeeds.has(seedUrl)) continue;
      seenSeeds.add(seedUrl);
      seedTasks.push(async () => {
        try {
          const content = await fetchOfficialDocContent(seedUrl, { fetchTimeoutMs: 30000, maxAttempts: 2 });
          const ok = content.text.length >= MIN_TEXT_CHARS || content.contentQuality === 'metadata_only';
          return {
            topicId: topic.id,
            url: seedUrl,
            ok,
            detail: `${content.contentQuality} ${content.text.length} chars${content.title ? ` :: ${content.title.slice(0, 60)}` : ''}`,
          };
        } catch (error) {
          return { topicId: topic.id, url: seedUrl, ok: false, detail: error?.message || 'fetch failed' };
        }
      });
    }
  }

  const pdfTasks = SALESFORCE_DOC_PDF_SOURCES.map((source) => async () => {
    try {
      const { stdout } = await execFile('curl', ['-sIL', '--fail', '--max-time', '30', source.url], {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      });
      const contentLength = stdout.match(/^content-length:\s*(\d+)/im)?.[1];
      return {
        topicId: source.id,
        url: source.url,
        ok: true,
        detail: `HEAD ok${contentLength ? ` ${contentLength}b` : ''}`,
      };
    } catch (error) {
      return { topicId: source.id, url: source.url, ok: false, detail: error?.message || 'HEAD failed' };
    }
  });

  console.log(`[verify-seeds] Checking ${seedTasks.length} unique seed URL(s) and ${pdfTasks.length} PDF source(s)...`);
  const results = await runPool([...seedTasks, ...pdfTasks], CONCURRENCY);

  const aliasFailures = [];
  const topicIds = new Set(SALESFORCE_DOC_TOPICS.map((topic) => topic.id));
  for (const [alias, targets] of Object.entries(SALESFORCE_DOC_TOPIC_ALIASES)) {
    for (const target of targets) {
      if (!topicIds.has(target)) aliasFailures.push(`alias ${alias} -> missing topic ${target}`);
    }
  }
  for (const source of SALESFORCE_DOC_PDF_SOURCES) {
    for (const topicId of source.topicIds) {
      if (!topicIds.has(topicId)) aliasFailures.push(`pdf ${source.id} -> missing topic ${topicId}`);
    }
  }

  const failures = results.filter((result) => !result.ok);
  const metadataOnly = results.filter((result) => result.ok && /^metadata_only/.test(result.detail));
  console.log(`[verify-seeds] OK: ${results.length - failures.length}/${results.length} (${metadataOnly.length} metadata-only)`);
  for (const result of metadataOnly) {
    console.log(`  metadata-only: [${result.topicId}] ${result.url}`);
  }
  if (failures.length > 0 || aliasFailures.length > 0) {
    console.error(`[verify-seeds] DEAD SOURCES (${failures.length}):`);
    for (const failure of failures) {
      console.error(`  [${failure.topicId}] ${failure.url} :: ${failure.detail}`);
    }
    for (const aliasFailure of aliasFailures) {
      console.error(`  ${aliasFailure}`);
    }
    process.exitCode = 1;
  }
}

main().finally(() => closeSalesforceHelpBrowser());
