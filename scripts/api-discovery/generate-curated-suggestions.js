#!/usr/bin/env node
/**
 * Generate curated (default + recommended) ModelConfig suggestions per provider.
 *
 * Uses version-aware ranking so new model generations are picked up automatically
 * instead of being silently dropped by hardcoded regex lists.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
const MODEL_CONFIG_PATH = path.resolve(process.cwd(), 'src', 'config', 'modelConfigs.ts');

const PROVIDERS = ['openai','claude','google','perplexity','mistral','cohere','together','deepseek','grok'];

function readFileSafe(p){ try { return fs.readFileSync(p,'utf8'); } catch { return ''; } }
function load(provider){ const p = path.join(OUTPUT_DIR, `${provider}-models.json`); if (!fs.existsSync(p)) return null; return JSON.parse(fs.readFileSync(p,'utf8')); }
function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

/**
 * Extract a comparable version number from a model ID.
 * Returns [major, minor, patch] or null if no version found.
 * Examples:
 *   gemini-3.1-pro-preview  -> [3, 1, 0]
 *   gemini-2.5-flash         -> [2, 5, 0]
 *   gpt-5.4                  -> [5, 4, 0]
 *   claude-sonnet-4-6        -> [4, 6, 0]
 *   grok-4-0709              -> [4, 0, 0]
 */
function extractVersion(id) {
  // Try X.Y pattern first (gemini-3.1, gpt-5.4)
  let m = id.match(/(\d+)\.(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2]), 0];

  // Try X-Y where Y is a small number (claude-sonnet-4-6, but not grok-4-0709 date suffix)
  // Match provider-name-MAJOR-MINOR pattern
  m = id.match(/(\d+)-(\d{1})(?:-|$)/);
  if (m) return [parseInt(m[1]), parseInt(m[2]), 0];

  // Try standalone major version (grok-4, gemini-3)
  m = id.match(/(\d+)/);
  if (m) return [parseInt(m[1]), 0, 0];

  return null;
}

/**
 * Compare two version arrays. Returns positive if a > b, negative if a < b, 0 if equal.
 */
function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Classify a model into a "family" for grouping.
 * Models in the same family compete for slots; the highest version wins.
 */
function classifyFamily(provider, id) {
  const lower = id.toLowerCase();

  switch (provider) {
    case 'google': {
      if (/imagen/.test(lower)) return 'imagen';
      if (/image/.test(lower)) return 'gemini-image';
      // Classify by tier: pro, flash, flash-lite
      if (/flash-lite/.test(lower)) return 'gemini-flash-lite';
      if (/flash/.test(lower)) return 'gemini-flash';
      if (/pro/.test(lower)) return 'gemini-pro';
      return 'gemini-other';
    }
    case 'openai': {
      if (/dall-e/.test(lower)) return 'dalle';
      if (/gpt-image/.test(lower)) return 'gpt-image';
      if (/^o\d/.test(lower)) {
        if (/mini/.test(lower)) return 'o-mini';
        if (/pro/.test(lower)) return 'o-pro';
        return 'o-full';
      }
      if (/nano/.test(lower)) return 'gpt-nano';
      if (/mini/.test(lower)) return 'gpt-mini';
      return 'gpt-full';
    }
    case 'claude': {
      if (/opus/.test(lower)) return 'claude-opus';
      if (/sonnet/.test(lower)) return 'claude-sonnet';
      if (/haiku/.test(lower)) return 'claude-haiku';
      return 'claude-other';
    }
    case 'grok': {
      if (/imagine/.test(lower)) return 'grok-image';
      if (/mini/.test(lower)) return 'grok-mini';
      if (/fast/.test(lower)) return 'grok-fast';
      return 'grok-full';
    }
    case 'mistral': {
      if (/large/.test(lower)) return 'mistral-large';
      if (/medium/.test(lower)) return 'mistral-medium';
      if (/small/.test(lower)) return 'mistral-small';
      if (/codestral/.test(lower)) return 'codestral';
      if (/pixtral/.test(lower)) return 'pixtral';
      return 'mistral-other';
    }
    case 'cohere': {
      if (/reasoning/.test(lower)) return 'command-reasoning';
      if (/vision/.test(lower)) return 'command-vision';
      if (/r7b|light/.test(lower)) return 'command-light';
      if (/command-r/.test(lower)) return 'command-r';
      return 'cohere-other';
    }
    case 'perplexity': {
      if (/reasoning.*pro/.test(lower)) return 'sonar-reasoning-pro';
      if (/reasoning/.test(lower)) return 'sonar-reasoning';
      if (/pro/.test(lower)) return 'sonar-pro';
      return 'sonar';
    }
    case 'together': {
      if (/llama.*70b/i.test(lower)) return 'llama-70b';
      if (/llama.*8b/i.test(lower)) return 'llama-8b';
      if (/qwen/i.test(lower)) return 'qwen';
      return 'together-other';
    }
    case 'deepseek': {
      if (/reasoner/.test(lower)) return 'deepseek-reasoner';
      return 'deepseek-chat';
    }
    default:
      return lower;
  }
}

/**
 * Defines which families to include per provider and their priority order.
 * Families not listed here are excluded from curation.
 */
const PROVIDER_FAMILIES = {
  openai: ['gpt-full', 'gpt-mini', 'gpt-nano', 'o-full', 'o-mini', 'gpt-image'],
  claude: ['claude-opus', 'claude-sonnet', 'claude-haiku'],
  google: ['gemini-pro', 'gemini-flash', 'gemini-flash-lite', 'imagen'],
  perplexity: ['sonar-pro', 'sonar', 'sonar-reasoning-pro', 'sonar-reasoning'],
  mistral: ['mistral-large', 'mistral-medium', 'mistral-small', 'codestral', 'pixtral'],
  cohere: ['command-reasoning', 'command-vision', 'command-r', 'command-light'],
  together: ['llama-70b', 'llama-8b', 'qwen'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  grok: ['grok-full', 'grok-mini', 'grok-fast'],
};

function pickCurated(provider, models) {
  // Exclude embeddings, rerankers, pure TTS/ASR, moderation, legacy instruct, deprecated
  const exclude = (m) => {
    const id = (m.id || '').toLowerCase();
    if (m.isDeprecated) return true;
    // Exclude non-chat models
    if (/(embed|embedding|rerank|moderation|babbage|davinci|tts|audio|asr|transcribe|instruct|computer-use|deep-research|robotics)/.test(id)) return true;
    // Exclude date-suffixed duplicates when a non-dated version exists (e.g., gpt-4.1-2025-04-14 when gpt-4.1 exists)
    if (/\d{4}-\d{2}-\d{2}$/.test(id)) {
      const base = id.replace(/-\d{4}-\d{2}-\d{2}$/, '');
      if (models.some(other => other.id.toLowerCase() === base)) return true;
    }
    // Exclude -customtools variants
    if (/customtools/.test(id)) return true;
    return false;
  };

  const filtered = models.filter(m => !exclude(m));

  // Group by family
  const families = new Map();
  for (const m of filtered) {
    const family = classifyFamily(provider, m.id);
    if (!families.has(family)) families.set(family, []);
    families.get(family).push(m);
  }

  // For each family, pick the highest-versioned model
  for (const [family, members] of families) {
    members.sort((a, b) => {
      const va = extractVersion(a.id);
      const vb = extractVersion(b.id);
      if (va && vb) return compareVersions(vb, va); // Descending
      if (va) return -1;
      if (vb) return 1;
      return 0;
    });
  }

  // Select families according to provider config
  const allowedFamilies = PROVIDER_FAMILIES[provider] || Array.from(families.keys()).slice(0, 5);
  const result = [];

  for (const family of allowedFamilies) {
    const members = families.get(family);
    if (!members || !members.length) continue;
    // Take the top (highest version) model from each family
    result.push(members[0]);
  }

  return result;
}

function parseExistingIdsForProvider(source, provider){
  const re = new RegExp(`\\n\\s*${provider}:\\s*\\[(.*?)\\n\\s*\\],`, 's');
  const m = source.match(re);
  if(!m) return new Set();
  const block=m[1]; const idRe=/id:\s*'([^']+)'/g; const ids=new Set(); let mm; while((mm=idRe.exec(block))) ids.add(mm[1]); return ids;
}

function genTsEntry(m,{isDefault=false}={}){
  const caps=[];
  if(m.supportsVision) caps.push('supportsVision: true');
  if(m.supportsDocuments) caps.push('supportsDocuments: true');
  if(m.supportsImageInput) caps.push('supportsImageInput: true');
  if(m.supportsImageGeneration) caps.push('supportsImageGeneration: true');
  if(m.supportsVideoGeneration) caps.push('supportsVideoGeneration: true');
  if(m.supportsRealtime) caps.push('supportsRealtime: true');
  if(m.supportsVoiceInput) caps.push('supportsVoiceInput: true');
  if(m.supportsVoiceOutput) caps.push('supportsVoiceOutput: true');
  if(m.supportsFunctions) caps.push('supportsFunctions: true');
  if(m.supportsWebSearch) caps.push('supportsWebSearch: true');
  if(m.supportsThinking) caps.push('supportsThinking: true');
  if(m.requiresTemperature1) caps.push('requiresTemperature1: true');
  if(m.useMaxCompletionTokens) caps.push('useMaxCompletionTokens: true');
  if(isDefault) caps.push('isDefault: true');
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
      name: '${esc(name || '')}',
      description: '${esc(desc || '')}',
      contextLength: ${ctx},${extra}${capsStr}    },`;
}

function writeFrag(provider, entries){
  ensureDir(OUTPUT_DIR);
  const out = path.join(OUTPUT_DIR, `curated-modelConfigs-${provider}.tsfrag`);
  if(!entries.length){ fs.writeFileSync(out, `// ${provider}: no curated entries`); return out; }
  const header = `// Curated ModelConfig entries for AI_MODELS['${provider}'] (default + recommended)\n`;
  fs.writeFileSync(out, header + entries.join('\n') + '\n');
  return out;
}

(function main(){
  const source = readFileSafe(MODEL_CONFIG_PATH);
  for(const provider of PROVIDERS){
    const data = load(provider); if(!data) continue;
    const models = data.models || [];
    const curated = pickCurated(provider, models);
    if(!curated.length){ writeFrag(provider, []); continue; }
    const existing = parseExistingIdsForProvider(source, provider);
    // Write ALL curated entries (not just missing), so the output shows the full recommended set
    const allEntries = curated.map((m, idx) => genTsEntry(m, {isDefault: idx === 0}));
    const missingCount = curated.filter(m => !existing.has(m.id)).length;
    const out = writeFrag(provider, allEntries);
    console.log(`[curate] ${provider}: ${curated.length} curated (${missingCount} new) -> ${path.relative(process.cwd(), out)}`);
  }
})();
