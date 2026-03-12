const { safeGet, mergeWithRegistry } = require('./common');

// Env var: DEEPSEEK_API_KEY

async function discoverDeepseek(env, registry) {
  const apiKey = env.DEEPSEEK_API_KEY;
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  let models = [];
  try {
    const data = await safeGet('https://api.deepseek.com/v1/models', { headers });
    if (Array.isArray(data.data)) {
      models = data.data.map(m => ({ id: m.id, name: m.id, _raw: m }));
    }
  } catch (_) {
    models = [
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder' },
    ];
  }

  const mapCaps = (m) => ({
    ...m,
    supportsVision: true,
    supportsDocuments: true,
    supportsImageGeneration: false,
    supportsVideoGeneration: false,
    supportsVoiceInput: false,
    supportsVoiceOutput: false,
    supportsRealtime: false,
    supportsImageInput: true,
  });

  const mapped = models.map(mapCaps);
  const merged = registry
    ? mapped.map(m => mergeWithRegistry('deepseek', m, registry))
    : mapped;

  return { provider: 'deepseek', models: merged };
}

module.exports = { discoverDeepseek };
