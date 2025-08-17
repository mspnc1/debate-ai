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
      id: 'claude-4-20250801',
      name: 'Claude 4',
      description: 'Latest flagship with enhanced reasoning',
      contextLength: 500000,
      isDefault: true,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'claude-4-fast-20250801',
      name: 'Claude 4 Fast',
      description: 'High-speed version with excellent capabilities',
      contextLength: 300000,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Previous generation, still very capable',
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
      description: 'Latest flagship model with advanced capabilities',
      contextLength: 256000,
      isDefault: true,
      supportsVision: true,
      supportsFunctions: true,
      isPremium: true,
    },
    {
      id: 'gpt-4o-2025',
      name: 'GPT-4o (2025)',
      description: 'Updated multimodal model',
      contextLength: 200000,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'gpt-4o-mini-2025',
      name: 'GPT-4o Mini (2025)',
      description: 'Efficient and cost-effective',
      contextLength: 128000,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'o1-2025',
      name: 'o1 (2025)',
      description: 'Advanced reasoning model',
      contextLength: 200000,
      isPremium: true,
    },
    {
      id: 'o1-mini-2025',
      name: 'o1 Mini (2025)',
      description: 'Fast reasoning model',
      contextLength: 128000,
    },
  ],
  google: [
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Latest flagship with enhanced multimodal capabilities',
      contextLength: 4194304,
      isDefault: true,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Ultra-fast with great performance',
      contextLength: 2097152,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'gemini-1.5-pro-002',
      name: 'Gemini 1.5 Pro',
      description: 'Previous generation with 2M context',
      contextLength: 2097152,
      supportsVision: true,
    },
    {
      id: 'gemini-1.5-flash-002',
      name: 'Gemini 1.5 Flash',
      description: 'Fast and efficient',
      contextLength: 1048576,
      supportsVision: true,
    },
  ],
  perplexity: [
    {
      id: 'llama-3.1-sonar-large-128k-online',
      name: 'Sonar Large Online',
      description: 'Most capable with real-time web search',
      contextLength: 127000,
      isDefault: true,
      isPremium: true,
    },
    {
      id: 'llama-3.1-sonar-small-128k-online',
      name: 'Sonar Small Online',
      description: 'Fast and efficient with web search',
      contextLength: 127000,
    },
    {
      id: 'llama-3.1-sonar-huge-128k-online',
      name: 'Sonar Huge Online',
      description: 'Maximum capability with web search',
      contextLength: 127000,
      isPremium: true,
    },
  ],
  mistral: [
    {
      id: 'mistral-large-2407',
      name: 'Mistral Large (2407)',
      description: 'Latest flagship with enhanced capabilities',
      contextLength: 128000,
      isDefault: true,
      isPremium: true,
      supportsFunctions: true,
    },
    {
      id: 'mistral-small-2402',
      name: 'Mistral Small',
      description: 'Fast and cost-effective',
      contextLength: 32768,
      supportsFunctions: true,
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      description: 'Open-source mixture of experts',
      contextLength: 32768,
      supportsFunctions: true,
    },
    {
      id: 'mixtral-8x22b-32768',
      name: 'Mixtral 8x22B',
      description: 'Larger mixture of experts model',
      contextLength: 32768,
      supportsFunctions: true,
    },
  ],
  cohere: [
    {
      id: 'command-r-plus-08-2024',
      name: 'Command R Plus',
      description: 'Most capable for RAG and search',
      contextLength: 128000,
      isDefault: true,
      isPremium: true,
      supportsFunctions: true,
    },
    {
      id: 'command-r-08-2024',
      name: 'Command R',
      description: 'Optimized for retrieval tasks',
      contextLength: 128000,
      supportsFunctions: true,
    },
    {
      id: 'command-light',
      name: 'Command Light',
      description: 'Fast and cost-effective',
      contextLength: 4096,
      supportsFunctions: true,
    },
  ],
  together: [
    {
      id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
      name: 'Llama 3.1 405B',
      description: 'Most capable open-source model',
      contextLength: 130000,
      isPremium: true,
    },
    {
      id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      name: 'Llama 3.1 70B',
      description: 'Powerful and efficient',
      contextLength: 130000,
      isDefault: true,
    },
    {
      id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      name: 'Llama 3.1 8B',
      description: 'Fast and lightweight',
      contextLength: 130000,
    },
    {
      id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
      name: 'Qwen 2.5 72B',
      description: 'Strong multilingual capabilities',
      contextLength: 32768,
    },
  ],
  deepseek: [
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      description: 'General purpose conversation',
      contextLength: 128000,
      isDefault: true,
    },
    {
      id: 'deepseek-coder',
      name: 'DeepSeek Coder',
      description: 'Optimized for code generation',
      contextLength: 128000,
      isPremium: true,
    },
    {
      id: 'deepseek-reasoning',
      name: 'DeepSeek Reasoning',
      description: 'Advanced reasoning capabilities',
      contextLength: 128000,
      isPremium: true,
    },
  ],
  grok: [
    {
      id: 'grok-beta',
      name: 'Grok (Beta)',
      description: 'Latest model with real-time X data access',
      contextLength: 128000,
      isDefault: true,
      supportsVision: true,
    },
    {
      id: 'grok-vision-beta',
      name: 'Grok Vision (Beta)',
      description: 'Specialized for image understanding',
      contextLength: 128000,
      supportsVision: true,
      isPremium: true,
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
  perplexity: ['temperature', 'maxTokens', 'topP', 'frequencyPenalty', 'presencePenalty'],
  mistral: ['temperature', 'maxTokens', 'topP', 'stopSequences', 'seed'],
  cohere: ['temperature', 'maxTokens', 'topP', 'topK', 'stopSequences'],
  together: ['temperature', 'maxTokens', 'topP', 'topK', 'frequencyPenalty', 'stopSequences'],
  deepseek: ['temperature', 'maxTokens', 'topP', 'frequencyPenalty', 'presencePenalty', 'stopSequences'],
  grok: ['temperature', 'maxTokens', 'topP', 'stopSequences', 'seed'],
};

// Helper function to get models for a specific provider
export const getProviderModels = (providerId: string): ModelConfig[] => {
  return AI_MODELS[providerId] || [];
};

// Helper function to get the default model for a provider
export const getProviderDefaultModel = (providerId: string): ModelConfig | undefined => {
  const models = getProviderModels(providerId);
  return models.find(model => model.isDefault) || models[0];
};

// Helper function to get a specific model by ID
export const getModelById = (providerId: string, modelId: string): ModelConfig | undefined => {
  const models = getProviderModels(providerId);
  return models.find(model => model.id === modelId);
};