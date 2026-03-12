#!/usr/bin/env node
/**
 * Dev-only discovery tool.
 * Lists provider models and basic capabilities using keys from .env.local.
 * Outputs JSON under scripts/api-discovery/output and regenerates docs models.md.
 *
 * Note: Keep this script side-effect free on app configs; open a PR with suggested diffs.
 */

const fs = require('fs');
const path = require('path');
const { readEnvLocal, ensureDir, writeJson, writeModelsMd, loadRegistry } = require('./providers/common');
const { discoverOpenAI } = require('./providers/openai');
const { discoverAnthropic } = require('./providers/anthropic');
const { discoverGoogle } = require('./providers/google');
const { discoverPerplexity } = require('./providers/perplexity');
const { discoverMistral } = require('./providers/mistral');
const { discoverCohere } = require('./providers/cohere');
const { discoverTogether } = require('./providers/together');
const { discoverDeepseek } = require('./providers/deepseek');
const { discoverGrok } = require('./providers/grok');

const PROVIDERS = [
  { id: 'openai', fn: discoverOpenAI },
  { id: 'claude', fn: discoverAnthropic },
  { id: 'google', fn: discoverGoogle },
  { id: 'perplexity', fn: discoverPerplexity },
  { id: 'mistral', fn: discoverMistral },
  { id: 'cohere', fn: discoverCohere },
  { id: 'together', fn: discoverTogether },
  { id: 'deepseek', fn: discoverDeepseek },
  { id: 'grok', fn: discoverGrok },
];

(async () => {
  const env = readEnvLocal();
  const registry = loadRegistry();

  for (const p of PROVIDERS) {
    try {
      const result = await p.fn(env, registry);
      result.meta = { discoveredAt: new Date().toISOString() };
      writeJson(p.id, 'models', result);
      writeModelsMd(p.id, result.models || []);
      console.log(`[discover] ${p.id}: wrote outputs (${(result.models || []).length} models)`);
    } catch (e) {
      console.error(`[discover] ${p.id}: failed`, e.message);
    }
  }

  // After discovery completes, generate suggested TS fragments
  const generators = [
    ['generate-suggestions', 'suggestion generation'],
    ['generate-capability-suggestions', 'capability suggestion'],
    ['generate-curated-suggestions', 'curated suggestion'],
    ['generate-video-capability-suggestions', 'video capability suggestion'],
    ['generate-pr-bundle', 'PR bundle generation'],
    ['generate-shared-models-json', 'shared models JSON generation'],
  ];

  for (const [mod, label] of generators) {
    try {
      require(`./${mod}`);
    } catch (e) {
      console.error(`[discover] ${label} failed:`, e.message);
    }
  }
})();
