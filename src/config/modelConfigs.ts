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

// Updated March 2026 — sourced from API discovery + known-models-registry.json
// Pricing sources cited in registry. Context lengths from API where available.
export const AI_MODELS: ProviderModels = {
  claude: [
    // 4.6 series (March 2026) — $15/$75 (Opus), $3/$15 (Sonnet)
    {
      id: "claude-opus-4-6-20260301",
      name: "Claude Opus 4.6",
      description:
        "Most capable Claude model for complex reasoning and analysis",
      contextLength: 200000,
      maxOutputTokens: 32000,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-sonnet-4-6-20260301",
      name: "Claude Sonnet 4.6",
      description: "High-performance model balancing capability and speed",
      contextLength: 200000,
      maxOutputTokens: 64000,
      isDefault: true,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    // 4.5 series — $15/$75 (Opus), $3/$15 (Sonnet), $0.80/$4 (Haiku)
    {
      id: "claude-opus-4-5-20251101",
      name: "Claude 4.5 Opus",
      description:
        "Premium model with maximum intelligence and practical performance",
      contextLength: 200000,
      maxOutputTokens: 32000,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-sonnet-4-5-20250929",
      name: "Claude 4.5 Sonnet",
      description: "Smart model for complex agents and coding",
      contextLength: 200000,
      maxOutputTokens: 64000,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-haiku-4-5-20251001",
      name: "Claude 4.5 Haiku",
      description: "Fastest model with near-frontier intelligence",
      contextLength: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    // Legacy (still available)
    {
      id: "claude-opus-4-1-20250805",
      name: "Claude 4.1 Opus",
      description: "Previous flagship with enhanced reasoning",
      contextLength: 200000,
      maxOutputTokens: 32000,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-4-sonnet-20250514",
      name: "Claude 4 Sonnet",
      description: "Balanced performance and speed",
      contextLength: 200000,
      maxOutputTokens: 64000,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-3-7-sonnet-20250219",
      name: "Claude 3.7 Sonnet",
      description: "Hybrid reasoning with rapid and deep thinking modes",
      contextLength: 200000,
      maxOutputTokens: 64000,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "claude-3-5-haiku-20241022",
      name: "Claude 3.5 Haiku",
      description: "Fast and cost-effective legacy option",
      contextLength: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
  ],
  openai: [
    // GPT-5.4 (March 2026) — pricing TBD, estimated ~$1.75/$14
    {
      id: "gpt-5.4",
      name: "GPT-5.4",
      description:
        "Latest flagship GPT model with state-of-the-art reasoning",
      contextLength: 272000,
      maxOutputTokens: 100000,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
      useMaxCompletionTokens: true,
    },
    // GPT-5.2 (December 2025) — $1.75/$14
    {
      id: "gpt-5.2",
      name: "GPT-5.2",
      description:
        "Most capable GPT model with enhanced reasoning and multimodal understanding",
      contextLength: 272000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
      useMaxCompletionTokens: true,
    },
    // GPT-4.1 (April 2025) — $2/$8 (full), $0.40/$1.60 (mini), $0.10/$0.40 (nano)
    {
      id: "gpt-4.1",
      name: "GPT-4.1",
      description:
        "Flagship GPT-4 model with improved coding and instruction following",
      contextLength: 1047576,
      maxOutputTokens: 32768,
      supportsVision: true,
      supportsImageInput: true,
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
      supportsFunctions: true,
      useMaxCompletionTokens: true,
    },
    // GPT-4o — $2.50/$10 (full), $0.15/$0.60 (mini)
    {
      id: "gpt-4o",
      name: "GPT-4o",
      description: "Previous flagship multimodal model",
      contextLength: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsImageInput: true,
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
      supportsFunctions: true,
    },
    // Reasoning models — O3: $2/$8, O4-mini: $1.10/$4.40, O3-mini: $1.10/$4.40
    {
      id: "o3",
      name: "O3",
      description: "Advanced reasoning model for complex problem-solving",
      contextLength: 200000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "o4-mini",
      name: "O4 Mini",
      description: "Latest compact reasoning model, successor to O3 Mini",
      contextLength: 200000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsImageInput: true,
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
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    // Image generation models
    {
      id: "gpt-image-1",
      name: "GPT Image 1",
      description: "OpenAI's latest image generation model",
      contextLength: 0,
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
    // Gemini 3 (preview) — pricing TBD
    {
      id: "gemini-3-pro-preview",
      name: "Gemini 3 Pro Preview",
      description: "Gemini 3 Pro Preview",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    // Gemini 2.5 (GA) — Pro: $1.25/$10, Flash: $0.15/$0.60, Flash-Lite: $0.075/$0.30
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      description: "Stable release (June 17th, 2025) of Gemini 2.5 Pro",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description:
        "Mid-size multimodal model with 1M context and thinking support",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      isDefault: true,
      supportsVision: true,
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
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    // Gemini 2.0 — Flash: $0.10/$0.40
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "Fast multimodal model",
      contextLength: 1048576,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
  ],
  perplexity: [
    // All Perplexity models include web search — Pro: $3/$15, Sonar: $1/$1
    {
      id: "sonar-pro",
      name: "Sonar Pro",
      description:
        "Advanced search model with comprehensive answers and citations",
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
    // Reasoning variants — Reasoning Pro: $2/$8, Reasoning: $1/$5
    {
      id: "sonar-reasoning-pro",
      name: "Sonar Reasoning Pro",
      description: "Advanced reasoning with web search and citations",
      contextLength: 128000,
      maxOutputTokens: 8000,
      supportsWebSearch: true,
      supportsThinking: true,
    },
    {
      id: "sonar-reasoning",
      name: "Sonar Reasoning",
      description: "Reasoning model with web search capabilities",
      contextLength: 128000,
      maxOutputTokens: 8000,
      supportsWebSearch: true,
      supportsThinking: true,
    },
  ],
  mistral: [
    // Mistral Medium (May 2025) — $0.40/$2, ctx from API: 131072
    {
      id: "mistral-medium-latest",
      name: "Mistral Medium",
      description:
        "Frontier-class multimodal model with improved capabilities",
      contextLength: 131072,
      isDefault: true,
      supportsVision: true,
      supportsFunctions: true,
    },
    // Mistral Small — $0.10/$0.30, ctx from API: 131072
    {
      id: "mistral-small-latest",
      name: "Mistral Small",
      description: "Enterprise-grade small model with vision",
      contextLength: 131072,
      supportsVision: true,
      supportsFunctions: true,
    },
    // Codestral — $0.30/$0.90, ctx from API: 256000
    {
      id: "codestral-latest",
      name: "Codestral",
      description: "Cutting-edge coding model with 256K context",
      contextLength: 256000,
      supportsFunctions: true,
    },
    // Pixtral Large — $2/$6 (vision via API caps)
    {
      id: "pixtral-large-latest",
      name: "Pixtral Large",
      description: "Advanced vision model",
      contextLength: 128000,
      supportsVision: true,
      supportsFunctions: true,
    },
  ],
  cohere: [
    // Command A Vision (July 2025) — $2.50/$10, ctx from API: 128000
    {
      id: "command-a-vision-07-2025",
      name: "Command A Vision",
      description: "Latest Cohere model with vision and tool use",
      contextLength: 128000,
      isDefault: true,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    // Command A Reasoning (August 2025) — ctx from API: 288768
    {
      id: "command-a-reasoning-08-2025",
      name: "Command A Reasoning",
      description: "Reasoning-focused model with extended context",
      contextLength: 288768,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    // Command R (August 2024) — $0.15/$0.60, ctx from API: 132096
    {
      id: "command-r-08-2024",
      name: "Command R",
      description: "Optimized for retrieval tasks",
      contextLength: 132096,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    // Command R7B (December 2024) — ctx from API: 132000
    {
      id: "command-r7b-12-2024",
      name: "Command R7B",
      description: "Efficient model for retrieval tasks",
      contextLength: 132000,
      supportsDocuments: true,
      supportsFunctions: true,
    },
  ],
  together: [
    {
      id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      name: "Llama 3.1 405B",
      description: "Most capable open-source model",
      contextLength: 130000,
    },
    {
      id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      name: "Llama 3.1 70B",
      description: "Powerful and efficient",
      contextLength: 130000,
      isDefault: true,
    },
    {
      id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      name: "Llama 3.1 8B",
      description: "Fast and lightweight",
      contextLength: 130000,
    },
    {
      id: "Qwen/Qwen2.5-72B-Instruct-Turbo",
      name: "Qwen 2.5 72B",
      description: "Strong multilingual capabilities",
      contextLength: 32768,
    },
  ],
  deepseek: [
    // DeepSeek Chat (V3) — $0.27/$1.10, ctx from registry: 64000
    {
      id: "deepseek-chat",
      name: "DeepSeek Chat (V3)",
      description: "General-purpose chat model with strong reasoning",
      contextLength: 64000,
      maxOutputTokens: 8192,
      isDefault: true,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    // DeepSeek Reasoner (R1) — $0.55/$2.19, ctx from registry: 64000
    {
      id: "deepseek-reasoner",
      name: "DeepSeek Reasoner (R1)",
      description: "Advanced reasoning model with chain-of-thought",
      contextLength: 64000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsDocuments: true,
      supportsThinking: true,
    },
  ],
  grok: [
    // Grok 4 (July 2025) — $3/$15, ctx from registry: 256000
    {
      id: "grok-4-0709",
      name: "Grok 4",
      description: "Most capable xAI model with advanced reasoning",
      contextLength: 256000,
      maxOutputTokens: 100000,
      isDefault: true,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    // Grok 3 — $3/$15, ctx from API: 131072
    {
      id: "grok-3",
      name: "Grok 3",
      description: "Previous flagship xAI model",
      contextLength: 131072,
      maxOutputTokens: 131072,
      supportsVision: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    // Grok 3 Mini — $0.30/$0.50, ctx from API: 131072
    {
      id: "grok-3-mini",
      name: "Grok 3 Mini",
      description: "Lightweight reasoning model from xAI",
      contextLength: 131072,
      maxOutputTokens: 131072,
      supportsFunctions: true,
      supportsThinking: true,
    },
    // Image generation
    {
      id: "grok-imagine-image",
      name: "Grok Imagine",
      description: "Image generation model from xAI",
      contextLength: 0,
      supportsImageGeneration: true,
    },
  ],
};

// Curated model IDs per provider (limit 4–5) to avoid overwhelming users in selectors.
export const CURATED_MODEL_IDS: { [providerId: string]: string[] } = {
  claude: [
    "claude-sonnet-4-6-20260301",
    "claude-opus-4-6-20260301",
    "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5-20251001",
  ],
  openai: ["gpt-5.4", "gpt-5.2", "gpt-4.1", "o3", "o4-mini", "gpt-image-1"],
  google: [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-3-pro-preview",
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
    "command-a-vision-07-2025",
    "command-a-reasoning-08-2025",
    "command-r-08-2024",
  ],
  together: [
    "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    "Qwen/Qwen2.5-72B-Instruct-Turbo",
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
  if (curated && curated.length) {
    // Preserve declaration order by filtering
    return all.filter((m) => curated.includes(m.id));
  }
  return all;
};

// Helper function to get the default model for a provider
export const getProviderDefaultModel = (
  providerId: string
): ModelConfig | undefined => {
  const models = getProviderModels(providerId);
  return models.find((model) => model.isDefault) || models[0];
};

// Helper function to get a specific model by ID
export const getModelById = (
  providerId: string,
  modelId: string
): ModelConfig | undefined => {
  const models = getProviderModels(providerId);
  return models.find((model) => model.id === modelId);
};
