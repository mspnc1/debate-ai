export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  isPremium?: boolean;
  isDefault?: boolean;
  supportsVision?: boolean;
  supportsFunctions?: boolean;
}

export interface ProviderModels {
  [providerId: string]: ModelConfig[];
}

// Updated August 2025 - Current model offerings from each provider
export const AI_MODELS: ProviderModels = {
  claude: [
    {
      id: 'claude-opus-4-1',
      name: 'Claude Opus 4.1',
      description: 'Most capable flagship model with advanced reasoning',
      contextLength: 500000,
      isPremium: true,
      supportsVision: true,
    },
    {
      id: 'claude-sonnet-4',
      name: 'Claude Sonnet 4',
      description: 'Balanced model for complex tasks',
      contextLength: 400000,
      isDefault: true,
      supportsVision: true,
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Previous generation, still highly capable',
      contextLength: 200000,
      supportsVision: true,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      description: 'Fast and efficient for simple tasks',
      contextLength: 200000,
      supportsVision: true,
    },
  ],
  openai: [
    {
      id: 'gpt-5',
      name: 'GPT-5',
      description: 'Flagship model with excellent performance',
      contextLength: 256000,
      isDefault: true,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'gpt-5-pro',
      name: 'GPT-5 Pro',
      description: 'Most advanced model with unparalleled capabilities',
      contextLength: 512000,
      isPremium: true,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 Mini',
      description: 'Compact GPT-5 at 50% the cost',
      contextLength: 128000,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'gpt-5-nano',
      name: 'GPT-5 Nano',
      description: 'Ultra-fast, cost-effective for high volume',
      contextLength: 64000,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Previous generation multimodal model',
      contextLength: 128000,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Lightweight GPT-4o variant',
      contextLength: 128000,
      supportsVision: true,
      supportsFunctions: true,
    },
  ],
  google: [
    {
      id: 'gemini-2-5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Latest flagship model (pricing TBD)',
      contextLength: 2097152,
      isPremium: true,
      supportsVision: true,
    },
    {
      id: 'gemini-2-5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Fast and efficient latest generation (pricing TBD)',
      contextLength: 1048576,
      isDefault: true,
      supportsVision: true,
    },
    {
      id: 'gemini-2-0-flash',
      name: 'Gemini 2.0 Flash',
      description: 'Balanced speed and capability',
      contextLength: 1048576,
      supportsVision: true,
    },
    {
      id: 'gemini-1.5-pro-002',
      name: 'Gemini 1.5 Pro',
      description: 'Previous gen with 2M context',
      contextLength: 2097152,
      supportsVision: true,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Fast and efficient for simple tasks',
      contextLength: 1048576,
      supportsVision: true,
    },
  ],
};

export interface ModelParameters {
  temperature: number;
  maxTokens: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  seed?: number;
}

export const DEFAULT_PARAMETERS: ModelParameters = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export const PARAMETER_RANGES = {
  temperature: { min: 0, max: 2, step: 0.1, description: 'Controls randomness (0 = deterministic, 2 = very creative)' },
  maxTokens: { min: 1, max: 8192, step: 1, description: 'Maximum response length in tokens' },
  topP: { min: 0, max: 1, step: 0.01, description: 'Nucleus sampling threshold for token selection' },
  topK: { min: 1, max: 100, step: 1, description: 'Top-K sampling (Google models only)' },
  frequencyPenalty: { min: -2, max: 2, step: 0.1, description: 'Reduce repetition of tokens (OpenAI only)' },
  presencePenalty: { min: -2, max: 2, step: 0.1, description: 'Encourage topic diversity (OpenAI only)' },
};

export const PROVIDER_SUPPORTED_PARAMS: { [key: string]: (keyof ModelParameters)[] } = {
  claude: ['temperature', 'maxTokens', 'topP', 'stopSequences'],
  openai: ['temperature', 'maxTokens', 'topP', 'frequencyPenalty', 'presencePenalty', 'stopSequences', 'seed'],
  google: ['temperature', 'maxTokens', 'topP', 'topK', 'stopSequences'],
};