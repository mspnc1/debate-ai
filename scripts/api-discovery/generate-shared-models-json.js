#!/usr/bin/env node
/**
 * Generates a platform-agnostic, fully-enriched JSON file consumable by both
 * mobile and web apps. Reads all per-provider discovery JSON outputs and the
 * known-models-registry.json, then produces output/models.json.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
const REGISTRY_PATH = path.join(__dirname, 'known-models-registry.json');

const PROVIDERS = ['openai', 'claude', 'google', 'perplexity', 'mistral', 'cohere', 'deepseek', 'grok'];

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function cleanModel(m) {
  // Strip internal fields for shared output
  const {
    _raw, _source, temperatureRange, features, endpoints, aliases,
    ...clean
  } = m;

  // Build capabilities object
  const capabilities = {
    vision: Boolean(clean.supportsVision),
    documents: Boolean(clean.supportsDocuments),
    imageInput: Boolean(clean.supportsImageInput),
    imageGeneration: Boolean(clean.supportsImageGeneration),
    videoGeneration: Boolean(clean.supportsVideoGeneration),
    voiceInput: Boolean(clean.supportsVoiceInput),
    voiceOutput: Boolean(clean.supportsVoiceOutput),
    realtime: Boolean(clean.supportsRealtime),
    functions: Boolean(clean.supportsFunctions),
    webSearch: Boolean(clean.supportsWebSearch),
    thinking: Boolean(clean.supportsThinking),
    jsonMode: Boolean(clean.supportsJsonMode),
  };

  return {
    id: clean.id,
    name: clean.name || clean.id,
    description: clean.description || null,
    contextLength: clean.contextLength || null,
    maxOutputTokens: clean.maxOutputTokens || null,
    pricing: clean.pricing || null,
    capabilities,
    isDeprecated: Boolean(clean.isDeprecated),
    _source: _source || 'api',
  };
}

(function main() {
  const registry = loadJson(REGISTRY_PATH) || {};
  const output = {
    generatedAt: new Date().toISOString(),
    providers: {},
  };

  for (const provider of PROVIDERS) {
    const discovery = loadJson(path.join(OUTPUT_DIR, `${provider}-models.json`));
    if (!discovery || !Array.isArray(discovery.models)) continue;

    const pricingSource = registry?.providers?.[provider]?.pricingSource || null;

    output.providers[provider] = {
      pricingSource,
      models: discovery.models.map(cleanModel),
    };
  }

  const outPath = path.join(OUTPUT_DIR, 'models.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`[shared] Wrote shared models JSON -> ${path.relative(process.cwd(), outPath)}`);
})();
