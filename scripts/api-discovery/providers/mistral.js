const { safeGet, deriveCapsFromMetadata, mergeWithRegistry } = require('./common');

// Env var: MISTRAL_API_KEY

async function discoverMistral(env, registry) {
  const apiKey = env.MISTRAL_API_KEY;
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  let models = [];
  try {
    const data = await safeGet('https://api.mistral.ai/v1/models', { headers });
    if (Array.isArray(data.data)) {
      models = data.data.map(m => ({
        id: m.id,
        name: m.name || m.id,
        description: m.description || null,
        contextLength: m.max_context_length || null,
        supportsFunctions: m.capabilities?.function_calling === true,
        supportsVision: m.capabilities?.vision === true,
        supportsImageInput: m.capabilities?.vision === true,
        isDeprecated: m.deprecation != null,
        aliases: m.aliases || [],
        _raw: m,
      }));
    }
  } catch (_) {}

  const mapCaps = (m) => {
    const meta = deriveCapsFromMetadata(m._raw);
    const caps = m._raw?.capabilities || {};
    return {
      ...m,
      // Use actual API capability data instead of regex
      supportsVision: caps.vision === true,
      supportsDocuments: caps.completion_chat === true && !/embed|rerank/i.test(m.id),
      supportsImageGeneration: /pixtral-image|image-gen/i.test(m.id),
      supportsVideoGeneration: /video|vid/i.test(m.id),
      supportsVoiceInput: caps.audio_transcription === true,
      supportsVoiceOutput: caps.audio === true,
      supportsRealtime: false,
      supportsImageInput: caps.vision === true,
      supportsFunctions: caps.function_calling === true,
      ...Object.fromEntries(Object.entries(meta).filter(([,v])=>v===true)),
    };
  };

  const mapped = models.map(mapCaps);
  const merged = registry
    ? mapped.map(m => mergeWithRegistry('mistral', m, registry))
    : mapped;

  return { provider: 'mistral', models: merged };
}

module.exports = { discoverMistral };
