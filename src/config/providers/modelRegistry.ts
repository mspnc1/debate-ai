import type { ModelConfig } from '../modelConfigs';
import type { ModelPricing } from '../modelPricing';

export interface ModelDefinition extends ModelConfig {
  pricing: ModelPricing;
  maxOutput: number;
  capabilities: {
    vision?: boolean;
    functions?: boolean;
    streaming: boolean;
    webSearch?: boolean;
    imageInput?: boolean;
    documentInput?: boolean;
    imageGeneration?: boolean;
    voiceInput?: boolean;
    voiceOutput?: boolean;
    realtime?: boolean;
  };
  releaseDate?: string;
  deprecated?: boolean;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  company: string;
  models: ModelDefinition[];
  defaultModel: string;
  supportedParameters: string[];
  rateLimits: {
    rpm: number;  // Requests per minute
    tpm: number;  // Tokens per minute
    rpd?: number; // Requests per day
  };
}

// Model aliases for version management - Updated April 2026
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
  'gemini-latest': 'gemini-3-flash-preview',
  'gemini-pro-latest': 'gemini-3.1-pro-preview',
  'gemini-flash-latest': 'gemini-3-flash-preview',
  'gemini-3-latest': 'gemini-3-flash-preview',
  'gemini-3.1-latest': 'gemini-3.1-pro-preview',
  'gemini-2.5-latest': 'gemini-2.5-flash',

  // Grok aliases
  'grok-latest': 'grok-4.20-0309-non-reasoning',
  'grok-4-latest': 'grok-4.20-0309-non-reasoning',
  'grok-4.20': 'grok-4.20-0309-non-reasoning',
  'grok-4.20-non-reasoning': 'grok-4.20-0309-non-reasoning',
  'grok-4.20-reasoning': 'grok-4.20-0309-reasoning',
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
  'command-a-reasoning-latest': 'command-a-reasoning-08-2025',
  'command-a-vision-latest': 'command-a-vision-07-2025',
  'command-a-latest': 'command-a-03-2025',
  'command-a-translate-latest': 'command-a-translate-08-2025',
  'command-r-plus-latest': 'command-a-reasoning-08-2025',
  'command-r-latest': 'command-r-08-2024',
  'command-light-latest': 'command-r7b-12-2024',

  // Together aliases
  'llama-405b-latest': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'llama-70b-latest': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'llama-8b-latest': 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'qwen-72b-latest': 'Qwen/Qwen2.5-7B-Instruct-Turbo',

  // DeepSeek aliases
  'deepseek-chat': 'deepseek-v4-flash',
  'deepseek-reasoner': 'deepseek-v4-flash',
  'deepseek-chat-latest': 'deepseek-v4-flash',
  'deepseek-reasoner-latest': 'deepseek-v4-flash',
  'deepseek-latest': 'deepseek-v4-flash',
};

export const resolveModelAlias = (modelId: string): string => {
  return MODEL_ALIASES[modelId] || modelId;
};

// Helper function to get default model for a provider
// Updated April 2026 - defaults point at verified live model IDs
export const getDefaultModel = (providerId: string): string => {
  const defaults: Record<string, string> = {
    claude: 'claude-sonnet-4-6',
    openai: 'gpt-5.5',
    google: 'gemini-3-flash-preview',
    grok: 'grok-4.20-0309-non-reasoning',
    perplexity: 'sonar-pro',
    mistral: 'mistral-large-2512',
    cohere: 'command-a-reasoning-08-2025',
    together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    deepseek: 'deepseek-v4-flash',
  };

  return defaults[providerId] || '';
};

// Migration helper for existing sessions without model field
export const migrateAIConfig = (config: Partial<{ provider: string; model: string }> & Record<string, unknown>): typeof config & { model: string } => {
  if (!config.model && config.provider) {
    config.model = getDefaultModel(config.provider);
  }
  return config as typeof config & { model: string };
};
