/**
 * Shared provider/model registry metadata for callable function endpoints.
 *
 * Keep this aligned with the web client so callable and streaming paths resolve
 * aliases and defaults the same way.
 */

export const MODEL_ALIASES: Record<string, string> = {
  // Claude aliases
  'claude-latest': 'claude-sonnet-4-6',
  'claude-opus-latest': 'claude-opus-4-6',
  'claude-sonnet-latest': 'claude-sonnet-4-6',
  'claude-haiku-latest': 'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
  'claude-opus-4-5': 'claude-opus-4-5-20251101',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',

  // OpenAI aliases
  'gpt-latest': 'gpt-5.4',
  'gpt-5-latest': 'gpt-5.4',
  'gpt-5.2-latest': 'gpt-5.2',
  'gpt-5-mini-latest': 'gpt-5-mini',
  'gpt-5-nano-latest': 'gpt-5-nano',
  'gpt-4o-latest': 'gpt-4o',
  'o1-latest': 'o1',
  'o3-latest': 'o3',
  'o4-mini-latest': 'o4-mini',
  'o3-mini-latest': 'o3-mini',

  // Google aliases
  'gemini-latest': 'gemini-2.5-flash',
  'gemini-pro-latest': 'gemini-2.5-pro',
  'gemini-flash-latest': 'gemini-2.5-flash',
  'gemini-3-latest': 'gemini-2.5-pro',

  // Grok aliases
  'grok-latest': 'grok-4-0709',
  'grok-4-latest': 'grok-4-0709',
  'grok-3-latest': 'grok-3',
  'grok-vision-latest': 'grok-4-0709',

  // Perplexity aliases
  'sonar-latest': 'sonar-pro',
  'sonar-pro-latest': 'sonar-pro',

  // Mistral aliases
  'mistral-latest': 'mistral-medium-latest',

  // Cohere aliases
  'command-a-reasoning-latest': 'command-a-reasoning-08-2025',
  'command-a-vision-latest': 'command-a-vision-07-2025',
  'command-r-plus-latest': 'command-a-reasoning-08-2025',
  'command-r-latest': 'command-r-08-2024',
  'command-light-latest': 'command-r7b-12-2024',

  // Together aliases
  'llama-405b-latest': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'llama-70b-latest': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'llama-8b-latest': 'Qwen/Qwen2.5-7B-Instruct-Turbo',
  'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': 'Qwen/Qwen2.5-7B-Instruct-Turbo',
  'qwen-72b-latest': 'Qwen/Qwen2.5-7B-Instruct-Turbo',

  // DeepSeek aliases
  'deepseek-chat-latest': 'deepseek-chat',
  'deepseek-reasoner-latest': 'deepseek-reasoner',
};

export const DEFAULT_PROVIDER_MODELS: Record<string, string> = {
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-5.4',
  google: 'gemini-2.5-flash',
  perplexity: 'sonar-pro',
  mistral: 'mistral-medium-latest',
  cohere: 'command-a-reasoning-08-2025',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  deepseek: 'deepseek-chat',
  grok: 'grok-4-0709',
};

const MODELS_REQUIRING_TEMPERATURE_1 = new Set([
  'gpt-5.4',
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

  if (
    providerId === 'openai' &&
    resolvedModel &&
    MODELS_REQUIRING_TEMPERATURE_1.has(resolvedModel)
  ) {
    return 1;
  }

  return temperature;
}
