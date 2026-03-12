const { safeGet, deriveCapsFromMetadata, mergeWithRegistry } = require('./common');

// Env var: GOOGLE_API_KEY (alias: GEMINI_API_KEY)

async function discoverGoogle(env, registry) {
  const key = env.GOOGLE_API_KEY || env.GEMINI_API_KEY;
  let models = [];
  try {
    const base = 'https://generativelanguage.googleapis.com/v1beta/models';
    const url = key ? `${base}?key=${encodeURIComponent(key)}` : base;
    const data = await safeGet(url);
    if (Array.isArray(data.models)) {
      models = data.models.map(m => {
        const id = m.name?.split('/').pop() || m.name || '';
        const methods = m.supportedGenerationMethods || m.generationMethods || [];
        const desc = m.description || '';
        const supportsImageGen = methods.includes('imageGeneration') || /image-generation|imagen/i.test(id + ' ' + desc);
        const supportsVideoGen = methods.includes('videoGeneration') || /video|veo/i.test(id + ' ' + desc);
        const supportsTTS = methods.includes('textToSpeech') || /tts|text to speech/i.test(desc);
        const supportsASR = methods.includes('speechToText') || /speech to text|asr/i.test(desc);
        const supportsRealtime = methods.includes('realtime') || /live|realtime/i.test(desc);
        const supportsChat = methods.includes('generateContent');
        return {
          id,
          name: m.displayName || m.name,
          description: desc || null,
          contextLength: m.inputTokenLimit || null,
          maxOutputTokens: m.outputTokenLimit || null,
          supportsThinking: m.thinking === true,
          temperatureRange: { default: m.temperature, max: m.maxTemperature },
          _raw: m,
          supportsImageGeneration: supportsImageGen,
          supportsVideoGeneration: supportsVideoGen,
          supportsVoiceOutput: supportsTTS,
          supportsVoiceInput: supportsASR,
          supportsRealtime,
          supportsFunctions: supportsChat,
        };
      });
    }
  } catch (_) {}

  const mapCaps = (m) => {
    const methods = m._raw?.supportedGenerationMethods || [];
    const supportsChat = methods.includes('generateContent');
    const meta = deriveCapsFromMetadata(m._raw);
    return {
      ...m,
      // Only mark vision/documents for models that support generateContent
      supportsVision: supportsChat,
      supportsDocuments: supportsChat,
      supportsImageInput: supportsChat,
      supportsImageGeneration: /imagen|image-generation/i.test(m.id) || m.supportsImageGeneration,
      supportsVideoGeneration: /video|veo/i.test(m.id) || m.supportsVideoGeneration,
      supportsVoiceInput: /speech|audio|asr/i.test(m.id) || m.supportsVoiceInput,
      supportsVoiceOutput: /tts|audio|speech/i.test(m.id) || m.supportsVoiceOutput,
      supportsRealtime: /live|realtime/i.test(m.id) || m.supportsRealtime,
      ...Object.fromEntries(Object.entries(meta).filter(([,v])=>v===true)),
    };
  };

  const mapped = models.map(mapCaps);
  const merged = registry
    ? mapped.map(m => mergeWithRegistry('google', m, registry))
    : mapped;

  return { provider: 'google', models: merged };
}

module.exports = { discoverGoogle };
