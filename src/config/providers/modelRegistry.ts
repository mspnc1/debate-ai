import { ModelConfig } from '../modelConfigs';
import { ModelPricing } from '../modelPricing';

export interface ModelDefinition extends ModelConfig {
  pricing: ModelPricing;
  maxOutput: number;
  capabilities: {
    vision?: boolean;
    functions?: boolean;
    streaming: boolean;
    webSearch?: boolean;
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

// Model aliases for version management
export const MODEL_ALIASES: Record<string, string> = {
  // Claude aliases
  'claude-latest': 'claude-4-20250801',
  'claude-fast-latest': 'claude-4-fast-20250801',
  'claude-sonnet-latest': 'claude-3-5-sonnet-20241022',
  'claude-haiku-latest': 'claude-3-5-haiku-20241022',
  
  // OpenAI aliases
  'gpt-latest': 'gpt-5',
  'gpt-4o-latest': 'gpt-4o-2025',
  'gpt-4o-mini-latest': 'gpt-4o-mini-2025',
  'o1-latest': 'o1-2025',
  'o1-mini-latest': 'o1-mini-2025',
  
  // Google aliases
  'gemini-pro-latest': 'gemini-2.5-pro',
  'gemini-flash-latest': 'gemini-2.5-flash',
  'gemini-1.5-pro-latest': 'gemini-1.5-pro-002',
  'gemini-1.5-flash-latest': 'gemini-1.5-flash-002',
  
  // Grok aliases
  'grok-latest': 'grok-beta',
  'grok-vision-latest': 'grok-vision-beta',
  
  // Perplexity aliases
  'sonar-large-latest': 'llama-3.1-sonar-large-128k-online',
  'sonar-small-latest': 'llama-3.1-sonar-small-128k-online',
  'sonar-huge-latest': 'llama-3.1-sonar-huge-128k-online',
  
  // Mistral aliases
  'mistral-large-latest': 'mistral-large-2407',
  'mistral-small-latest': 'mistral-small-2402',
  'mixtral-8x7b-latest': 'mixtral-8x7b-32768',
  'mixtral-8x22b-latest': 'mixtral-8x22b-32768',
  
  // Cohere aliases
  'command-r-plus-latest': 'command-r-plus-08-2024',
  'command-r-latest': 'command-r-08-2024',
  'command-light-latest': 'command-light',
  
  // Together aliases
  'llama-405b-latest': 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
  'llama-70b-latest': 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
  'llama-8b-latest': 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  'qwen-72b-latest': 'Qwen/Qwen2.5-72B-Instruct-Turbo',
  
  // DeepSeek aliases
  'deepseek-chat-latest': 'deepseek-chat',
  'deepseek-coder-latest': 'deepseek-coder',
  'deepseek-reasoning-latest': 'deepseek-reasoning',
};

export const resolveModelAlias = (modelId: string): string => {
  return MODEL_ALIASES[modelId] || modelId;
};

// Helper function to get default model for a provider
export const getDefaultModel = (providerId: string): string => {
  // Return the model marked as isDefault: true for each provider
  const defaults: Record<string, string> = {
    claude: 'claude-4-20250801',
    openai: 'gpt-5',
    google: 'gemini-2.5-pro',
    grok: 'grok-beta',
    perplexity: 'llama-3.1-sonar-large-128k-online',
    mistral: 'mistral-large-2407',
    cohere: 'command-r-plus-08-2024',
    together: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    deepseek: 'deepseek-chat',
  };
  
  return defaults[providerId] || '';
};

// Helper function to get non-premium default model for free users
export const getFreeDefaultModel = (providerId: string): string => {
  const freeDefaults: Record<string, string> = {
    claude: 'claude-4-fast-20250801',
    openai: 'gpt-4o-mini-2025',
    google: 'gemini-2.5-flash',
    grok: 'grok-beta',
    perplexity: 'llama-3.1-sonar-small-128k-online',
    mistral: 'mistral-small-2402',
    cohere: 'command-r-08-2024',
    together: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    deepseek: 'deepseek-chat',
  };
  
  return freeDefaults[providerId] || getDefaultModel(providerId);
};

// Migration helper for existing sessions without model field
export const migrateAIConfig = (config: Partial<{ provider: string; model: string }> & Record<string, unknown>): typeof config & { model: string } => {
  if (!config.model && config.provider) {
    config.model = getDefaultModel(config.provider);
  }
  return config as typeof config & { model: string };
};