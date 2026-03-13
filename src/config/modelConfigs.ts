import { resolveModelAlias } from './providers/modelRegistry';

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  maxOutputTokens?: number; // Maximum output tokens the model supports
  isDefault?: boolean;
  supportsVision?: boolean;
  supportsDocuments?: boolean; // Specifically for PDF/document support
  supportsFunctions?: boolean;
  supportsWebSearch?: boolean; // For Perplexity models with web search
  supportsThinking?: boolean; // For reasoning models (O1/O3, DeepSeek-R1, etc.)
  requiresTemperature1?: boolean; // For GPT-5 and O1/O3 models
  useMaxCompletionTokens?: boolean; // For GPT-5 and reasoning models that use max_completion_tokens
  isDeprecated?: boolean; // Model is deprecated by provider
  // Extended capability flags:
  supportsImageInput?: boolean; // Alias of supportsVision (explicit)
  supportsImageGeneration?: boolean; // Can generate images (e.g., gpt-image-1, dall-e-3)
}

export interface ProviderModels {
  [providerId: string]: ModelConfig[];
}

// Updated March 2026 using verified live model IDs plus current provider docs.
export const AI_MODELS: ProviderModels = {
  claude: [
    {
      id: "claude-sonnet-4-6",
      name: "Claude Sonnet 4.6",
      description: "Current balanced Claude model for production chat and coding",
      contextLength: 200000,
      maxOutputTokens: 64000,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-opus-4-6",
      name: "Claude Opus 4.6",
      description: "Current flagship Claude model for the hardest reasoning tasks",
      contextLength: 200000,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-opus-4-5-20251101",
      name: "Claude 4.5 Opus",
      description: "Previous flagship Claude release with strong reasoning depth",
      contextLength: 200000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-sonnet-4-5-20250929",
      name: "Claude 4.5 Sonnet",
      description: "Previous balanced Claude release for agents and coding",
      contextLength: 200000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-haiku-4-5-20251001",
      name: "Claude 4.5 Haiku",
      description: "Fast Claude option for lightweight chat workloads",
      contextLength: 200000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "claude-opus-4-1-20250805",
      name: "Claude 4.1 Opus",
      description: "Legacy Claude flagship kept for compatibility",
      contextLength: 200000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude 4 Sonnet",
      description: "Legacy Claude Sonnet release kept for compatibility",
      contextLength: 200000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-3-7-sonnet-20250219",
      name: "Claude 3.7 Sonnet",
      description: "Deprecated Claude release kept for compatibility with existing configurations",
      contextLength: 200000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
      isDeprecated: true,
    },
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      description: "Fast and cost-effective legacy option",
      contextLength: 200000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
  ],
  openai: [
    {
      id: "gpt-5.4",
      name: "GPT-5.4",
      description: "Latest GPT-5 family API model currently listed by OpenAI",
      contextLength: 400000,
      maxOutputTokens: 128000,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-5.2",
      name: "GPT-5.2",
      description: "Documented GPT-5.2 release with 400K context",
      contextLength: 400000,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-5",
      name: "GPT-5",
      description: "Primary GPT-5 production model",
      contextLength: 400000,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-5-mini",
      name: "GPT-5 Mini",
      description: "Lower-cost GPT-5 model for general chat and agents",
      contextLength: 400000,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-5-nano",
      name: "GPT-5 Nano",
      description: "Smallest GPT-5 model for high-volume lightweight tasks",
      contextLength: 400000,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-4.1",
      name: "GPT-4.1",
      description: "High-capability GPT-4.1 model with 1M context",
      contextLength: 1047576,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-4.1-mini",
      name: "GPT-4.1 Mini",
      description: "Fast, affordable small model for focused tasks",
      contextLength: 1047576,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-4.1-nano",
      name: "GPT-4.1 Nano",
      description: "Smallest GPT-4.1 model for cheap low-latency tasks",
      contextLength: 1047576,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      description: "Previous flagship multimodal model",
      contextLength: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      description: "Small, fast, affordable model from GPT-4o family",
      contextLength: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "o3",
      name: "O3",
      description: "Advanced reasoning model for complex problem-solving",
      contextLength: 200000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "o4-mini",
      name: "O4 Mini",
      description: "Compact reasoning model with image input support",
      contextLength: 200000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "o3-mini",
      name: "O3 Mini",
      description: "Smaller reasoning model, faster and more affordable",
      contextLength: 200000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "o1",
      name: "O1",
      description: "Flagship reasoning model from the O-series",
      contextLength: 200000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-image-1",
      name: "GPT Image 1",
      description: "OpenAI's latest image generation model",
      contextLength: 0,
      supportsImageInput: true,
      supportsImageGeneration: true,
    },
    {
      id: "dall-e-3",
      name: "DALL-E 3",
      description: "Image generation model",
      contextLength: 0,
      supportsImageGeneration: true,
    },
  ],
  google: [
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      description: "High-capability Gemini model for reasoning and multimodal work",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description: "Fast Gemini 2.5 model for general-purpose multimodal chat",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash-Lite",
      description: "Most cost-effective Gemini 2.5 model",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "Fast multimodal model",
      contextLength: 1048576,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
  ],
  perplexity: [
    {
      id: "sonar-pro",
      name: "Sonar Pro",
      description: "High-accuracy Perplexity search model with citations",
      contextLength: 200000,
      maxOutputTokens: 8000,
      isDefault: true,
      supportsWebSearch: true,
    },
    {
      id: "sonar",
      name: "Sonar",
      description: "Fast search model with real-time web access and citations",
      contextLength: 128000,
      maxOutputTokens: 8000,
      supportsWebSearch: true,
    },
    {
      id: "sonar-reasoning-pro",
      name: "Sonar Reasoning Pro",
      description: "Advanced reasoning with web search and citations",
      contextLength: 128000,
      maxOutputTokens: 8000,
      supportsWebSearch: true,
      supportsThinking: true,
    },
  ],
  mistral: [
    {
      id: "mistral-medium-latest",
      name: "Mistral Medium",
      description: "Balanced current Mistral model for general-purpose chat",
      contextLength: 131072,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
    },
    {
      id: "mistral-small-latest",
      name: "Mistral Small",
      description: "Enterprise-grade small model with vision",
      contextLength: 131072,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
    },
    {
      id: "codestral-latest",
      name: "Codestral",
      description: "Coding-focused Mistral model",
      contextLength: 128000,
      supportsFunctions: true,
    },
    {
      id: "pixtral-large-latest",
      name: "Pixtral Large",
      description: "Vision-focused Mistral model",
      contextLength: 131072,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
    },
  ],
  cohere: [
    {
      id: "command-a-reasoning-08-2025",
      name: "Command A Reasoning",
      description: "Current Cohere reasoning model with extended context",
      contextLength: 288768,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
      maxOutputTokens: 32000,
    },
    {
      id: "command-a-vision-07-2025",
      name: "Command A Vision",
      description: "Current Cohere multimodal model with image inputs",
      contextLength: 128000,
      maxOutputTokens: 8000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "command-r-08-2024",
      name: "Command R",
      description: "Stable retrieval-oriented Cohere chat model",
      contextLength: 132096,
      supportsFunctions: true,
    },
    {
      id: "command-r7b-12-2024",
      name: "Command R7B",
      description: "Lower-cost Cohere chat model",
      contextLength: 132000,
      supportsFunctions: true,
    },
  ],
  together: [
    {
      id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      name: "Llama 3.3 70B",
      description: "Current Together serverless default for high-capability general chat",
      contextLength: 131072,
      isDefault: true,
    },
    {
      id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      name: "Llama 3.1 8B",
      description: "Fast and lightweight",
      contextLength: 131072,
    },
    {
      id: "Qwen/Qwen2.5-7B-Instruct-Turbo",
      name: "Qwen 2.5 7B",
      description: "Fast multilingual Together serverless model",
      contextLength: 32768,
    },
  ],
  deepseek: [
    {
      id: "deepseek-chat",
      name: "DeepSeek Chat",
      description: "General-purpose DeepSeek chat model",
      contextLength: 128000,
      maxOutputTokens: 8000,
      isDefault: true,
      supportsFunctions: true,
    },
    {
      id: "deepseek-reasoner",
      name: "DeepSeek Reasoner",
      description: "DeepSeek reasoning model optimized for long-form thought",
      contextLength: 128000,
      maxOutputTokens: 64000,
      supportsThinking: true,
    },
  ],
  grok: [
    {
      id: "grok-4-0709",
      name: "Grok 4",
      description: "Current Grok flagship model from xAI",
      contextLength: 256000,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "grok-3",
      name: "Grok 3",
      description: "Previous flagship xAI model",
      contextLength: 131072,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
    },
    {
      id: "grok-3-mini",
      name: "Grok 3 Mini",
      description: "Lightweight reasoning model from xAI",
      contextLength: 131072,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "grok-imagine-image",
      name: "Grok Imagine",
      description: "Image generation model from xAI",
      contextLength: 0,
      supportsImageGeneration: true,
    },
  ],
};

// Model IDs shown in selectors. Keep this aligned with the verified runtime catalog.
export const CURATED_MODEL_IDS: { [providerId: string]: string[] } = {
  claude: [
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-5-20251101",
    "claude-3-7-sonnet-20250219",
  ],
  openai: [
    "gpt-5.4",
    "gpt-5-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    "o3",
  ],
  google: [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ],
  perplexity: ["sonar-pro", "sonar", "sonar-reasoning-pro"],
  mistral: [
    "mistral-medium-latest",
    "mistral-small-latest",
    "codestral-latest",
    "pixtral-large-latest",
  ],
  cohere: [
    "command-a-reasoning-08-2025",
    "command-a-vision-07-2025",
    "command-r-08-2024",
    "command-r7b-12-2024",
  ],
  together: [
    "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "Qwen/Qwen2.5-7B-Instruct-Turbo",
  ],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  grok: ["grok-4-0709", "grok-3", "grok-3-mini", "grok-imagine-image"],
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
  temperature: {
    min: 0,
    max: 2,
    step: 0.1,
    description:
      "Controls randomness (0 = deterministic, 2 = very creative)",
  },
  maxTokens: {
    min: 1,
    max: 8192,
    step: 1,
    description: "Maximum response length in tokens",
  },
  topP: {
    min: 0,
    max: 1,
    step: 0.01,
    description: "Nucleus sampling threshold for token selection",
  },
  topK: {
    min: 1,
    max: 100,
    step: 1,
    description: "Top-K sampling (Google models only)",
  },
  frequencyPenalty: {
    min: -2,
    max: 2,
    step: 0.1,
    description: "Reduce repetition of tokens (OpenAI only)",
  },
  presencePenalty: {
    min: -2,
    max: 2,
    step: 0.1,
    description: "Encourage topic diversity (OpenAI only)",
  },
};

export const PROVIDER_SUPPORTED_PARAMS: {
  [key: string]: (keyof ModelParameters)[];
} = {
  claude: ["temperature", "maxTokens", "topP", "stopSequences"],
  openai: [
    "temperature",
    "maxTokens",
    "topP",
    "frequencyPenalty",
    "presencePenalty",
    "stopSequences",
    "seed",
  ],
  google: ["temperature", "maxTokens", "topP", "topK", "stopSequences"],
  perplexity: [
    "temperature",
    "maxTokens",
    "topP",
    "frequencyPenalty",
    "presencePenalty",
  ],
  mistral: ["temperature", "maxTokens", "topP", "stopSequences", "seed"],
  cohere: ["temperature", "maxTokens", "topP", "topK", "stopSequences"],
  together: [
    "temperature",
    "maxTokens",
    "topP",
    "topK",
    "frequencyPenalty",
    "stopSequences",
  ],
  deepseek: [
    "temperature",
    "maxTokens",
    "topP",
    "frequencyPenalty",
    "presencePenalty",
    "stopSequences",
  ],
  grok: ["temperature", "maxTokens", "topP", "stopSequences", "seed"],
};

// Helper function to get models for a specific provider
export const getProviderModels = (providerId: string): ModelConfig[] => {
  const all = AI_MODELS[providerId] || [];
  const curated = CURATED_MODEL_IDS[providerId];
  const visibleModels = curated && curated.length
    ? all.filter((m) => curated.includes(m.id))
    : all;
  return visibleModels.filter(
    (model) => !model.isDeprecated && !model.supportsImageGeneration
  );
};

// Helper function to get the default model for a provider
export const getProviderDefaultModel = (
  providerId: string
): ModelConfig | undefined => {
  const models = getProviderModels(providerId);
  return models.find((model) => model.isDefault) || models[0];
};

export const resolveProviderModelId = (
  providerId: string,
  modelId?: string
): string | undefined => {
  if (modelId) {
    const requestedModel = getModelById(providerId, resolveModelAlias(modelId));
    if (
      requestedModel &&
      !requestedModel.isDeprecated &&
      !requestedModel.supportsImageGeneration
    ) {
      return requestedModel.id;
    }
  }

  return getProviderDefaultModel(providerId)?.id;
};

// Helper function to get a specific model by ID
export const getModelById = (
  providerId: string,
  modelId: string
): ModelConfig | undefined => {
  const models = AI_MODELS[providerId] || [];
  return models.find((model) => model.id === modelId);
};
