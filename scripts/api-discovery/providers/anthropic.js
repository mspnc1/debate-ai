const { safeGet, deriveCapsFromMetadata, mergeWithRegistry } = require('./common');

// Env var: ANTHROPIC_API_KEY

async function discoverAnthropic(env, registry) {
  const apiKey = env.ANTHROPIC_API_KEY;
  const headers = apiKey
    ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    : { 'anthropic-version': '2023-06-01' };

  let models = [];
  try {
    // Some Anthropic deployments expose /v1/models; if not, this will 404 and we fall back.
    const data = await safeGet('https://api.anthropic.com/v1/models', { headers });
    if (Array.isArray(data.data)) {
      models = data.data.map(m => ({ id: m.id, name: m.display_name || m.id, _raw: m }));
    }
  } catch (_) {
    // Fallback to a minimal known set; update as needed during releases.
    models = [
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude 4.5 Haiku' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet' },
    ];
  }

  const registryModels = registry?.providers?.claude?.models || {};
  for (const [id, entry] of Object.entries(registryModels)) {
    if (entry?.verified !== true || entry?.includeInDiscovery !== true) {
      continue;
    }
    if (!models.some((model) => model.id === id)) {
      models.push({ id, name: entry.name || id });
    }
  }

  const mapCaps = (m) => {
    const meta = deriveCapsFromMetadata(m._raw);
    return {
      ...m,
      supportsVision: true,
      supportsDocuments: !/opus-20240229|haiku-20240307/.test(m.id),
      supportsImageGeneration: false,
      supportsVideoGeneration: false,
      supportsVoiceInput: false,
      supportsVoiceOutput: false,
      supportsRealtime: false,
      supportsImageInput: true,
      ...Object.fromEntries(Object.entries(meta).filter(([,v])=>v===true)),
    };
  };

  const mapped = models.map(mapCaps);
  const merged = registry
    ? mapped.map(m => mergeWithRegistry('claude', m, registry))
    : mapped;

  return { provider: 'claude', models: merged };
}

module.exports = { discoverAnthropic };
