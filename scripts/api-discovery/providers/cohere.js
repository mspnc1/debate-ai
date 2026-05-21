const { safeGet, deriveCapsFromMetadata, mergeWithRegistry } = require('./common');

// Env var: COHERE_API_KEY

async function discoverCohere(env, registry) {
  const apiKey = env.COHERE_API_KEY;
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  let models = [];
  try {
    const data = await safeGet('https://api.cohere.com/v1/models', { headers });
    if (Array.isArray(data.models)) {
      models = data.models.map(m => ({
        id: m.name || m.id || m.model,
        name: m.display_name || m.name || m.id,
        contextLength: m.context_length || null,
        features: m.features || [],
        endpoints: m.endpoints || [],
        isDeprecated: m.is_deprecated === true,
        _raw: m,
      }));
    }
  } catch (_) {
    models = [
      { id: 'command-a-plus-05-2026', name: 'Command A+' },
      { id: 'command-a-reasoning-08-2025', name: 'Command A Reasoning' },
      { id: 'command-a-vision-07-2025', name: 'Command A Vision' },
      { id: 'command-r-08-2024', name: 'Command R' },
      { id: 'command-r7b-12-2024', name: 'Command R7B' },
    ];
  }

  const mapCaps = (m) => {
    const meta = require('./common').deriveCapsFromMetadata(m._raw);
    const features = (m._raw?.features || []);
    const endpoints = (m._raw?.endpoints || []);
    return {
      ...m,
      // Use actual API feature data instead of regex heuristics
      supportsVision: features.includes('vision'),
      supportsDocuments: endpoints.includes('chat') && !/(embed|rerank)/i.test(m.id),
      supportsImageGeneration: false,
      supportsVideoGeneration: false,
      supportsVoiceInput: false,
      supportsVoiceOutput: false,
      supportsRealtime: false,
      supportsImageInput: features.includes('vision'),
      supportsFunctions: features.includes('strict_tools'),
      supportsJsonMode: features.includes('json_mode'),
      ...Object.fromEntries(Object.entries(meta).filter(([,v])=>v===true)),
    };
  };

  const mapped = models.map(mapCaps);
  const merged = registry
    ? mapped.map(m => mergeWithRegistry('cohere', m, registry))
    : mapped;

  return { provider: 'cohere', models: merged };
}

module.exports = { discoverCohere };
