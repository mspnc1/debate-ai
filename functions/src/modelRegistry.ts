/**
 * Shared provider/model registry metadata for callable function endpoints.
 *
 * Keep this aligned with the web client so callable and streaming paths resolve
 * aliases and defaults the same way.
 */

export const MODEL_ALIASES: Record<string, string> = {
  // Claude aliases
  'claude-latest': 'claude-sonnet-4-6',
  'claude-fable-latest': 'claude-fable-5',
  'claude-opus-latest': 'claude-opus-4-8',
  'claude-sonnet-latest': 'claude-sonnet-4-6',
  'claude-haiku-latest': 'claude-haiku-4-5-20251001',
  'claude-opus-4-8-20260520': 'claude-opus-4-8',
  'claude-opus-4-7-20260301': 'claude-opus-4-7',
  'claude-sonnet-4-5': 'claude-sonnet-4-5-20250929',
  'claude-opus-4-5': 'claude-opus-4-5-20251101',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',

  // OpenAI aliases
  'gpt-latest': 'gpt-5.5',
  'gpt-5-latest': 'gpt-5.5',
  'gpt-5.5-latest': 'gpt-5.5',
  'gpt-5.5-2026-04-23': 'gpt-5.5',
  'gpt-5.5-pro-latest': 'gpt-5.5-pro',
  'gpt-5.5-pro-2026-04-23': 'gpt-5.5-pro',
  'gpt-5.2-latest': 'gpt-5.2',
  'gpt-5-mini-latest': 'gpt-5.4-mini',
  'gpt-5-nano-latest': 'gpt-5.4-nano',
  'gpt-5.4-mini-latest': 'gpt-5.4-mini',
  'gpt-5.4-mini-2026-03-17': 'gpt-5.4-mini',
  'gpt-5.4-nano-latest': 'gpt-5.4-nano',
  'gpt-5.4-nano-2026-03-17': 'gpt-5.4-nano',
  'gpt-4o-latest': 'gpt-4o',
  'o1-latest': 'o1',
  'o3-latest': 'o3',
  'o4-mini-latest': 'o4-mini',
  'o3-mini-latest': 'o3-mini',

  // Google aliases
  'gemini-latest': 'gemini-3.5-flash',
  'gemini-pro-latest': 'gemini-pro-latest',
  'gemini-flash-latest': 'gemini-flash-latest',
  'gemini-flash-lite-latest': 'gemini-flash-lite-latest',
  'gemini-3-latest': 'gemini-3.5-flash',
  'gemini-3.5-latest': 'gemini-3.5-flash',
  'gemini-3.1-latest': 'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-latest': 'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview': 'gemini-3.1-flash-lite',
  'gemini-2.5-latest': 'gemini-2.5-flash',

  // Grok aliases
  'grok-latest': 'grok-4.3',
  'grok-4-latest': 'grok-4.3',
  'grok-4.3-latest': 'grok-4.3',
  'grok-4.20': 'grok-4.20-0309-non-reasoning',
  'grok-4.20-non-reasoning': 'grok-4.20-0309-non-reasoning',
  'grok-4.20-reasoning': 'grok-4.20-0309-reasoning',
  'grok-build-latest': 'grok-build-0.1',
  'grok-coding-latest': 'grok-build-0.1',
  'grok-fast-latest': 'grok-4-1-fast-non-reasoning',
  'grok-4.1-fast': 'grok-4-1-fast-non-reasoning',
  'grok-4-1-fast': 'grok-4-1-fast-non-reasoning',
  'grok-4-1-fast-reasoning-latest': 'grok-4-1-fast-reasoning',
  'grok-4-1-fast-non-reasoning-latest': 'grok-4-1-fast-non-reasoning',
  'grok-3-latest': 'grok-3',
  'grok-vision-latest': 'grok-4.20-0309-non-reasoning',
  'grok-image-latest': 'grok-imagine-image',

  // Perplexity aliases
  'sonar-latest': 'sonar-pro',
  'sonar-pro-latest': 'sonar-pro',
  'sonar-reasoning-latest': 'sonar-reasoning-pro',
  'sonar-reasoning': 'sonar-reasoning-pro',
  'sonar-research-latest': 'sonar-deep-research',

  // Mistral aliases
  'mistral-latest': 'mistral-large-2512',
  'mistral-large-latest': 'mistral-large-2512',
  'mistral-small-latest': 'mistral-small-2603',
  'devstral-medium-2512': 'devstral-2512',
  'magistral-latest': 'magistral-medium-2509',
  'magistral-medium-latest': 'magistral-medium-2509',
  'codestral-latest': 'codestral-2508',

  // Cohere aliases
  'command-a-plus-latest': 'command-a-plus-05-2026',
  'command-a-plus': 'command-a-plus-05-2026',
  'command-a-reasoning-latest': 'command-a-reasoning-08-2025',
  'command-a-vision-latest': 'command-a-vision-07-2025',
  'command-a-latest': 'command-a-plus-05-2026',
  'command-a-translate-latest': 'command-a-translate-08-2025',
  'command-r-plus-latest': 'command-a-reasoning-08-2025',
  'command-r-latest': 'command-r-08-2024',
  'command-light-latest': 'command-r7b-12-2024',

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
  google: 'gemini-3.5-flash',
  perplexity: 'sonar-pro',
  mistral: 'mistral-large-2512',
  cohere: 'command-a-reasoning-08-2025',
  deepseek: 'deepseek-v4-flash',
  grok: 'grok-4.3',
  moonshot: 'kimi-k3',
  zai: 'glm-5.2',
};

const MODELS_REQUIRING_TEMPERATURE_1 = new Set([
  'claude-opus-4-8',
  'claude-opus-4-7',
  // GPT-5.6 GA rejects any temperature except the default 1 (live-verified
  // 2026-07-23: "'temperature' does not support 0.7 with this model"). A model
  // missing from this set 400s on EVERY proxied request, because buildRequest
  // always injects a 0.7 default — same trap as claude-sonnet-5 (2026-07-22).
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
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

const MODELS_DEPRECATING_TEMPERATURE = new Set([
  'claude-fable-5',
  'claude-sonnet-5',
]);

const MODELS_UNSUPPORTED_CHAT_COMPLETIONS = new Set([
  'gpt-5.5-pro',
]);

// GPT-5.6 GA on /v1/chat/completions cannot combine function tools with its
// default reasoning: "Function tools with reasoning_effort are not supported
// for gpt-5.6-sol in /v1/chat/completions. To use function tools, use
// /v1/responses or set reasoning_effort to 'none'." (live-verified
// 2026-07-24; with effort 'none' all three models emit correct tool calls).
// Proper long-term fix is a Responses API migration.
const MODELS_REQUIRING_REASONING_EFFORT_NONE_FOR_TOOLS = new Set([
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
]);

export function requiresReasoningEffortNoneForTools(modelId: string | undefined): boolean {
  if (!modelId) return false;
  return MODELS_REQUIRING_REASONING_EFFORT_NONE_FOR_TOOLS.has(resolveModelAlias(modelId));
}

export function resolveModelAlias(modelId: string): string {
  return MODEL_ALIASES[modelId] || modelId;
}

export function getDefaultModel(providerId: string): string {
  return DEFAULT_PROVIDER_MODELS[providerId] || '';
}

export function resolveProviderModelId(providerId: string, modelId?: string): string {
  if (modelId) {
    const resolvedModel = resolveModelAlias(modelId);
    if (
      providerId === 'openai' &&
      MODELS_UNSUPPORTED_CHAT_COMPLETIONS.has(resolvedModel)
    ) {
      return getDefaultModel(providerId);
    }
    return resolvedModel;
  }
  return getDefaultModel(providerId);
}

export function normalizeProviderTemperature(
  providerId: string,
  modelId: string | undefined,
  temperature: number | undefined
): number | undefined {
  const resolvedModel = modelId ? resolveModelAlias(modelId) : getDefaultModel(providerId);

  if (resolvedModel && MODELS_DEPRECATING_TEMPERATURE.has(resolvedModel)) {
    return undefined;
  }

  if (resolvedModel && MODELS_REQUIRING_TEMPERATURE_1.has(resolvedModel)) {
    return 1;
  }

  return temperature;
}
