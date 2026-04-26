/**
 * Shared provider/model registry metadata for callable function endpoints.
 *
 * Keep this aligned with the web client so callable and streaming paths resolve
 * aliases and defaults the same way.
 */

export const MODEL_ALIASES: Record<string, string> = {
  // Claude aliases
  'claude-latest': 'claude-sonnet-4-6',
  'claude-opus-latest': 'claude-opus-4-7',
  'claude-sonnet-latest': 'claude-sonnet-4-6',
  'claude-haiku-latest': 'claude-haiku-4-5-20251001',
  'claude-opus-4-7-20260301': 'claude-opus-4-7',
  'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
  'claude-opus-4-5': 'claude-opus-4-5-20251101',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',

  // OpenAI aliases
  'gpt-latest': 'gpt-5.5',
  'gpt-5-latest': 'gpt-5.5',
  'gpt-5.5-latest': 'gpt-5.5',
  'gpt-5.2-latest': 'gpt-5.2',
  'gpt-5-mini-latest': 'gpt-5.4-mini',
  'gpt-5-nano-latest': 'gpt-5.4-nano',
  'gpt-5.4-mini-latest': 'gpt-5.4-mini',
  'gpt-5.4-nano-latest': 'gpt-5.4-nano',
  'gpt-4o-latest': 'gpt-4o',
  'o1-latest': 'o1',
  'o3-latest': 'o3',
  'o4-mini-latest': 'o4-mini',
  'o3-mini-latest': 'o3-mini',

  // Google aliases
  'gemini-latest': 'gemini-3-flash-preview',
  'gemini-3-latest': 'gemini-3-flash-preview',
  'gemini-3.1-latest': 'gemini-3.1-pro-preview',
  'gemini-2.5-latest': 'gemini-2.5-flash',

  // Grok aliases
  'grok-latest': 'grok-4.20-0309-non-reasoning',
  'grok-4-latest': 'grok-4.20-0309-non-reasoning',
  'grok-4.20': 'grok-4.20-0309-non-reasoning',
  'grok-3-latest': 'grok-3',
  'grok-vision-latest': 'grok-4.20-0309-non-reasoning',

  // Perplexity aliases
  'sonar-latest': 'sonar-pro',
  'sonar-pro-latest': 'sonar-pro',
  'sonar-reasoning-latest': 'sonar-reasoning-pro',
  'sonar-reasoning': 'sonar-reasoning-pro',
  'sonar-research-latest': 'sonar-deep-research',

  // Mistral aliases
  'mistral-latest': 'mistral-large-2512',
  'devstral-medium-2512': 'devstral-2512',
  'magistral-latest': 'mistral-small-2603',

  // Cohere aliases
  'command-a-reasoning-latest': 'command-a-reasoning-08-2025',
  'command-a-vision-latest': 'command-a-vision-07-2025',
  'command-a-latest': 'command-a-03-2025',
  'command-a-translate-latest': 'command-a-translate-08-2025',
  'command-r-plus-latest': 'command-a-reasoning-08-2025',
  'command-r-latest': 'command-r-08-2024',
  'command-light-latest': 'command-r7b-12-2024',

  // Together aliases
  'together-latest': 'deepseek-ai/DeepSeek-V3.1',
  'llama-405b-latest': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'llama-70b-latest': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'llama-8b-latest': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'qwen-72b-latest': 'deepseek-ai/DeepSeek-V3.1',
  'qwen-latest': 'deepseek-ai/DeepSeek-V3.1',
  'kimi-latest': 'deepseek-ai/DeepSeek-V3.1',
  'minimax-latest': 'deepseek-ai/DeepSeek-V3.1',

  // DeepSeek aliases
  'deepseek-chat': 'deepseek-v4-flash',
  'deepseek-reasoner': 'deepseek-v4-flash',
  'deepseek-chat-latest': 'deepseek-v4-flash',
  'deepseek-reasoner-latest': 'deepseek-v4-flash',
  'deepseek-latest': 'deepseek-v4-flash',
};

export const DEFAULT_PROVIDER_MODELS: Record<string, string> = {
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-5.5',
  google: 'gemini-3-flash-preview',
  perplexity: 'sonar-pro',
  mistral: 'mistral-large-2512',
  cohere: 'command-a-reasoning-08-2025',
  together: 'deepseek-ai/DeepSeek-V3.1',
  deepseek: 'deepseek-v4-flash',
  grok: 'grok-4.20-0309-non-reasoning',
};

const MODELS_REQUIRING_TEMPERATURE_1 = new Set([
  'claude-opus-4-7',
  'gpt-5.5',
  'gpt-5.5-pro',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.4-nano',
  'gpt-5.2',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'o1',
  'o3',
  'o3-mini',
  'o4-mini',
]);

export function resolveModelAlias(modelId: string): string {
  return MODEL_ALIASES[modelId] || modelId;
}

export function getDefaultModel(providerId: string): string {
  return DEFAULT_PROVIDER_MODELS[providerId] || '';
}

export function resolveProviderModelId(providerId: string, modelId?: string): string {
  if (modelId) {
    return resolveModelAlias(modelId);
  }
  return getDefaultModel(providerId);
}

export function normalizeProviderTemperature(
  providerId: string,
  modelId: string | undefined,
  temperature: number | undefined
): number | undefined {
  const resolvedModel = modelId ? resolveModelAlias(modelId) : getDefaultModel(providerId);

  if (resolvedModel && MODELS_REQUIRING_TEMPERATURE_1.has(resolvedModel)) {
    return 1;
  }

  return temperature;
}
