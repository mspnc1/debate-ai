#!/usr/bin/env node
/**
 * Generate curated (default + recommended) ModelConfig suggestions per provider.
 * Aims to keep the selectable list maintainable.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'output');
const MODEL_CONFIG_PATH = path.resolve(process.cwd(), 'src', 'config', 'modelConfigs.ts');

const PROVIDERS = ['openai','claude','google','perplexity','mistral','cohere','together','deepseek','grok'];

function readFileSafe(p){ try { return fs.readFileSync(p,'utf8'); } catch { return ''; } }
function load(provider){ const p = path.join(OUTPUT_DIR, `${provider}-models.json`); if (!fs.existsSync(p)) return null; return JSON.parse(fs.readFileSync(p,'utf8')); }
function ensureDir(p){ if (!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function pickCurated(provider, models){
  // Exclude embeddings, rerankers, pure TTS/ASR, moderation, legacy instruct, deprecated
  const exclude = (m)=>{
    const id=(m.id||'').toLowerCase();
    if (m.isDeprecated) return true;
    return /(embed|embedding|rerank|moderation|babbage|davinci|tts|audio|asr|transcribe|instruct)/.test(id);
  };
  models = models.filter(m=>!exclude(m));
  const id = (m)=>m.id||'';
  const byRegexList = (regexes)=>{
    const out=[]; for(const r of regexes){ const m=models.find(x=>r.test(id(x))); if(m && !out.includes(m)) out.push(m); }
    return out.filter(Boolean);
  };
  switch(provider){
    case 'openai':
      return byRegexList([
        /gpt-5\b|gpt-5-mini/i,
        /gpt-4\.1\b|gpt-4\.1-mini/i,
        /gpt-4o\b(?!-mini)/i,
        /gpt-4o-mini\b/i,
        /o3\b|o3-mini\b/i,
        /o1-pro\b|o1-mini\b/i,
        /gpt-image-1|dall-e-3/i,
      ]);
    case 'claude':
      return byRegexList([
        /claude-opus-4-6|claude-sonnet-4-6/i,
        /claude-opus-4-5|claude-sonnet-4-5/i,
        /claude-4[^-]*-opus|4\.1-opus/i,
        /claude-4[^-]*-sonnet|3\.7-sonnet/i,
      ]);
    case 'google':
      return byRegexList([/gemini-2\.5-pro/i, /gemini-2\.5-flash(?!-lite)/i, /gemini-2\.5-flash-lite/i, /imagen|image-generation/i]);
    case 'perplexity':
      return byRegexList([/sonar-pro/i, /sonar$/i, /sonar-reasoning-pro/i, /sonar-reasoning$/i]);
    case 'mistral':
      return byRegexList([/mistral-large-latest/i, /mistral-medium-latest/i, /pixtral.*latest/i]);
    case 'cohere':
      return byRegexList([/command-a-vision/i, /command-a-03/i, /command-r-plus/i, /command-r(?!-plus)/i]);
    case 'together':
      return byRegexList([/Llama-3\.1-70B|Meta-Llama-3\.1-70B/i, /Meta-Llama-3\.1-8B/i, /Qwen2\.5-72B|Qwen2\.5.*72B/i]);
    case 'deepseek':
      return byRegexList([/deepseek-reasoner/i, /deepseek-chat/i]);
    case 'grok':
      return byRegexList([/grok-4/i, /grok-3(?!-mini|-fast)/i, /grok-3-fast/i, /grok-3-mini(?!-fast)/i]);
    default:
      return models.slice(0,3);
  }
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
    const missing = curated.filter(m=>!existing.has(m.id));
    const entries = missing.map((m, idx)=>genTsEntry(m,{isDefault: idx===0}));
    const out = writeFrag(provider, entries);
    console.log(`[curate] ${provider}: wrote ${entries.length} curated -> ${path.relative(process.cwd(), out)}`);
  }
})();
