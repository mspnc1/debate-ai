#!/usr/bin/env node
/**
 * Reads discovery JSON outputs and current src/config/modelConfigs.ts,
 * then generates suggested TypeScript fragments to add missing models per provider.
 *
 * Output files: scripts/api-discovery/output/suggested-modelConfigs-{provider}.tsfrag
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
const MODEL_CONFIG_PATH = path.resolve(process.cwd(), 'src', 'config', 'modelConfigs.ts');

const PROVIDERS = [
  'openai',
  'claude',
  'google',
  'perplexity',
  'mistral',
  'cohere',
  'deepseek',
  'grok',
];

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function parseExistingIdsForProvider(source, provider) {
  const re = new RegExp(`\\n\\s*${provider}:\\s*\\[(.*?)\\n\\s*\\],`, 's');
  const m = source.match(re);
  if (!m) return new Set();
  const block = m[1];
  const idRe = /id:\s*['"]([^'"]+)['"]/g;
  const ids = new Set();
  let mm;
  while ((mm = idRe.exec(block))) ids.add(mm[1]);
  return ids;
}

function loadDiscovery(provider) {
  const p = path.join(OUTPUT_DIR, `${provider}-models.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function safeBool(v) { return Boolean(v); }

function genTsEntry(m) {
  const caps = [];
  if (safeBool(m.supportsVision)) caps.push('supportsVision: true');
  if (safeBool(m.supportsDocuments)) caps.push('supportsDocuments: true');
  if (safeBool(m.supportsImageInput)) caps.push('supportsImageInput: true');
  if (safeBool(m.supportsImageGeneration)) caps.push('supportsImageGeneration: true');
  if (safeBool(m.supportsVideoGeneration)) caps.push('supportsVideoGeneration: true');
  if (safeBool(m.supportsRealtime)) caps.push('supportsRealtime: true');
  if (safeBool(m.supportsVoiceInput)) caps.push('supportsVoiceInput: true');
  if (safeBool(m.supportsVoiceOutput)) caps.push('supportsVoiceOutput: true');
  if (safeBool(m.supportsFunctions)) caps.push('supportsFunctions: true');
  if (safeBool(m.supportsWebSearch)) caps.push('supportsWebSearch: true');
  if (safeBool(m.supportsThinking)) caps.push('supportsThinking: true');
  if (safeBool(m.requiresTemperature1)) caps.push('requiresTemperature1: true');
  if (safeBool(m.useMaxCompletionTokens)) caps.push('useMaxCompletionTokens: true');
  if (safeBool(m.isDeprecated)) caps.push('isDeprecated: true');
  const capsStr = caps.length ? `\n      ${caps.join(',\n      ')},\n` : '\n';
  const name = m.name && m.name !== m.id ? m.name : m.id;
  const desc = m.description || 'No description available';
  const ctx = m.contextLength || 128000;
  const source = m._source || 'api';

  let extra = '';
  if (m.maxOutputTokens) extra += `\n      maxOutputTokens: ${m.maxOutputTokens},`;
  if (m.pricing && m.pricing.inputPer1M != null) {
    extra += ` // Pricing: $${m.pricing.inputPer1M}/1M in, $${m.pricing.outputPer1M}/1M out [${source}]`;
  }

  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `{
      id: '${esc(m.id)}',
      name: '${esc(name)}',
      description: '${esc(desc)}',
      contextLength: ${ctx},${extra}${capsStr}    },`;
}

function writeTsFrag(provider, entries) {
  const outPath = path.join(OUTPUT_DIR, `suggested-modelConfigs-${provider}.tsfrag`);
  if (!entries.length) {
    fs.writeFileSync(outPath, `// ${provider}: no new models discovered relative to src/config/modelConfigs.ts`);
    return outPath;
  }
  const header = `// Insert the following ModelConfig entries into AI_MODELS['${provider}'] array\n`;
  fs.writeFileSync(outPath, header + entries.join('\n') + '\n');
  return outPath;
}

(function main() {
  const source = readFileSafe(MODEL_CONFIG_PATH);
  if (!source) {
    console.error('[suggest] Could not read modelConfigs.ts');
    process.exit(1);
  }
  for (const provider of PROVIDERS) {
    const discovered = loadDiscovery(provider);
    if (!discovered || !Array.isArray(discovered.models)) continue;
    const existing = parseExistingIdsForProvider(source, provider);
    const missing = discovered.models.filter(m => !existing.has(m.id));
    const entries = missing.map(genTsEntry);
    const p = writeTsFrag(provider, entries);
    console.log(`[suggest] ${provider}: wrote ${entries.length} entries -> ${path.relative(process.cwd(), p)}`);
  }
})();
