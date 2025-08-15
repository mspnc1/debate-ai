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
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Most capable model with advanced reasoning',
      contextLength: 200000,
      isDefault: true,
      supportsVision: true,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      description: 'Fast and efficient for simple tasks',
      contextLength: 200000,
      supportsVision: true,
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      description: 'Previous flagship, still powerful',
      contextLength: 200000,
      isPremium: true,
      supportsVision: true,
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Latest multimodal flagship model',
      contextLength: 128000,
      isDefault: true,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Lightweight and cost-effective',
      contextLength: 128000,
      supportsVision: true,
      supportsFunctions: true,
    },
    {
      id: 'o1-preview',
      name: 'o1 Preview',
      description: 'Advanced reasoning model',
      contextLength: 128000,
      isPremium: true,
    },
    {
      id: 'o1-mini',
      name: 'o1 Mini',
      description: 'Fast reasoning model',
      contextLength: 128000,
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Fast and affordable',
      contextLength: 16385,
      supportsFunctions: true,
    },
  ],
  google: [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: 'Flagship with 2M context window',
      contextLength: 2097152,
      isDefault: true,
      supportsVision: true,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Fast and efficient for simple tasks',
      contextLength: 1048576,
      supportsVision: true,
    },
    {
      id: 'gemini-1.0-pro',
      name: 'Gemini 1.0 Pro',
      description: 'Stable previous generation',
      contextLength: 32768,
    },
  ],
  perplexity: [
    {
      id: 'sonar-pro',
      name: 'Sonar Pro',
      description: 'Most capable with web search',
      contextLength: 127000,
      isDefault: true,
      isPremium: true,
    },
    {
      id: 'sonar-medium',
      name: 'Sonar Medium',
      description: 'Balanced model with web search',
      contextLength: 127000,
    },
    {
      id: 'sonar-small',
      name: 'Sonar Small',
      description: 'Fast and efficient with web search',
      contextLength: 127000,
    },
  ],
  mistral: [
    {
      id: 'mistral-large',
      name: 'Mistral Large',
      description: 'Flagship model, excellent multilingual',
      contextLength: 128000,
      isDefault: true,
      isPremium: true,
    },
    {
      id: 'mistral-medium',
      name: 'Mistral Medium',
      description: 'Balanced performance and cost',
      contextLength: 32768,
    },
    {
      id: 'mistral-small',
      name: 'Mistral Small',
      description: 'Fast and cost-effective',
      contextLength: 32768,
    },
    {
      id: 'mixtral-8x7b',
      name: 'Mixtral 8x7B',
      description: 'Open-source mixture of experts',
      contextLength: 32768,
    },
  ],
  cohere: [
    {
      id: 'command-r-plus',
      name: 'Command R Plus',
      description: 'Most capable for RAG and search',
      contextLength: 128000,
      isDefault: true,
      isPremium: true,
    },
    {
      id: 'command-r',
      name: 'Command R',
      description: 'Optimized for retrieval tasks',
      contextLength: 128000,
    },
    {
      id: 'command',
      name: 'Command',
      description: 'General purpose model',
      contextLength: 4096,
    },
  ],
  together: [
    {
      id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
      name: 'Llama 3.1 405B',
      description: 'Most capable open-source model',
      contextLength: 130000,
      isDefault: true,
      isPremium: true,
    },
    {
      id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      name: 'Llama 3.1 70B',
      description: 'Powerful and efficient',
      contextLength: 130000,
    },
    {
      id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      name: 'Mixtral 8x7B',
      description: 'Fast mixture of experts',
      contextLength: 32768,
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
};