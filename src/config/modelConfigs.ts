import { resolveModelAlias } from './providers/modelRegistry';

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  contextLabel?: string | null; // Optional UI label when the provider publishes a friendly label or no numeric window
  maxOutputTokens?: number; // Maximum output tokens the model supports
  isDefault?: boolean;
  supportsVision?: boolean;
  supportsDocuments?: boolean; // Specifically for PDF/document support
  supportsFunctions?: boolean;
  supportsWebSearch?: boolean; // Model supports provider-backed live web search with citations
  supportsThinking?: boolean; // For reasoning models (O1/O3, DeepSeek-R1, etc.)
  requiresTemperature1?: boolean; // For GPT-5 and O1/O3 models
  useMaxCompletionTokens?: boolean; // For GPT-5 and reasoning models that use max_completion_tokens
  isDeprecated?: boolean; // Model is deprecated by provider
  supportsChatCompletions?: boolean; // False when known to require a non-chat endpoint the app does not route yet
  // Extended capability flags:
  supportsImageInput?: boolean; // Alias of supportsVision (explicit)
  supportsImageGeneration?: boolean; // Can generate images (e.g., gpt-image-1)
}

export interface ProviderModels {
  [providerId: string]: ModelConfig[];
}

// Updated May 2026 using verified live model IDs plus current provider docs.
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
      id: "claude-opus-4-8",
      name: "Claude Opus 4.8",
      description: "Latest Claude Opus model for complex reasoning, long-horizon agentic coding, and high-autonomy work",
      contextLength: 1048576,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
    },
    {
      id: "claude-opus-4-7",
      name: "Claude Opus 4.7",
      description: "Previous Claude Opus model for complex reasoning, agentic coding, and document-heavy workflows",
      contextLength: 1048576,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
      requiresTemperature1: true,
    },
    {
      id: "claude-opus-4-6",
      name: "Claude Opus 4.6",
      description: "Previous Claude Opus release for the hardest reasoning tasks",
      contextLength: 1048576,
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
      id: "gpt-5.5",
      name: "GPT-5.5",
      description: "Latest GPT-5.5 frontier model for complex professional work, agents, coding, and long-context document generation",
      contextLength: 1050000,
      maxOutputTokens: 128000,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
      supportsImageGeneration: false,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-5.5-pro",
      name: "GPT-5.5 Pro",
      description: "Higher-compute GPT-5.5 variant for the hardest reasoning and precision tasks",
      contextLength: 1050000,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
      supportsChatCompletions: false,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-5.4",
      name: "GPT-5.4",
      description: "Previous GPT-5.4 family API model",
      contextLength: 1050000,
      maxOutputTokens: 128000,
      isDefault: false,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-5.4-mini",
      name: "GPT-5.4 Mini",
      description: "Fast, lower-cost GPT-5.4-class model for high-volume workloads",
      contextLength: 400000,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
      requiresTemperature1: true,
      useMaxCompletionTokens: true,
    },
    {
      id: "gpt-5.4-nano",
      name: "GPT-5.4 Nano",
      description: "Cheapest GPT-5.4-class model for simple high-volume tasks",
      contextLength: 400000,
      maxOutputTokens: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
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
      supportsThinking: true,
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
      supportsWebSearch: true,
      supportsThinking: true,
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
      supportsWebSearch: true,
      supportsThinking: true,
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
      supportsWebSearch: true,
      supportsThinking: true,
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
      supportsWebSearch: true,
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
      supportsWebSearch: true,
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
      supportsWebSearch: true,
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
      id: "gpt-image-2",
      name: "GPT Image 2",
      description: "State-of-the-art OpenAI image generation and editing model",
      contextLength: 0,
      supportsImageInput: true,
      supportsImageGeneration: true,
    },
    {
      id: "gpt-image-1",
      name: "GPT Image 1",
      description: "Previous OpenAI image generation model",
      contextLength: 0,
      supportsImageInput: true,
      supportsImageGeneration: true,
    },
  ],
  google: [
    {
      id: "gemini-3.5-flash",
      name: "Gemini 3.5 Flash",
      description: "GA Gemini 3.5 model optimized for agentic tasks, coding, and fast multimodal chat",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
    },
    {
      id: "gemini-3.1-pro-preview",
      name: "Gemini 3.1 Pro Preview",
      description: "Preview Gemini flagship with advanced reasoning and multimodal",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
    },
    {
      id: "gemini-3-flash-preview",
      name: "Gemini 3 Flash Preview",
      description: "Previous Gemini 3 preview model retained for compatibility",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
    },
    {
      id: "gemini-3.1-flash-lite",
      name: "Gemini 3.1 Flash Lite",
      description: "GA cost-effective Gemini 3.1 model for high-volume lightweight chat",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
    },
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      description: "Previous-gen high-capability Gemini model",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description: "Previous-gen fast Gemini model",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
    },
    {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash-Lite",
      description: "Previous-gen cost-effective Gemini model",
      contextLength: 1048576,
      maxOutputTokens: 65536,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsWebSearch: true,
      supportsThinking: true,
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "Deprecated Gemini 2.0 model scheduled for shutdown by Google",
      contextLength: 1048576,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      isDeprecated: true,
    },
  ],
  perplexity: [
    {
      id: "sonar-pro",
      name: "Sonar Pro",
      description: "High-accuracy Perplexity search model with citations",
      contextLength: 200000,
      contextLabel: "Context unpublished",
      maxOutputTokens: 8000,
      isDefault: true,
      supportsWebSearch: true,
    },
    {
      id: "sonar",
      name: "Sonar",
      description: "Fast search model with real-time web access and citations",
      contextLength: 128000,
      contextLabel: "Context unpublished",
      maxOutputTokens: 8000,
      supportsWebSearch: true,
    },
    {
      id: "sonar-reasoning-pro",
      name: "Sonar Reasoning Pro",
      description: "Advanced reasoning with web search and citations",
      contextLength: 128000,
      contextLabel: "Context unpublished",
      maxOutputTokens: 8000,
      supportsWebSearch: true,
      supportsThinking: true,
    },
  ],
  mistral: [
    {
      id: "mistral-large-2512",
      name: "Mistral Large 3",
      description: "Latest flagship Mistral model with 256K context and multimodal capabilities",
      contextLength: 262144,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "mistral-medium-3-5",
      name: "Mistral Medium 3.5",
      description: "Frontier-class multimodal Mistral model optimized for agentic and coding workflows",
      contextLength: 262144,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "magistral-medium-2509",
      name: "Magistral Medium 1.2",
      description: "Frontier-class multimodal reasoning model from Mistral",
      contextLength: 131072,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "mistral-small-2603",
      name: "Mistral Small 4",
      description: "Current smaller Mistral model with vision and agentic capabilities",
      contextLength: 262144,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "codestral-2508",
      name: "Codestral",
      description: "Current coding-focused Mistral model",
      contextLength: 256000,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "pixtral-large-latest",
      name: "Pixtral Large",
      description: "Legacy vision-focused Mistral model",
      contextLength: 128000,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
      isDeprecated: true,
    },
  ],
  cohere: [
    {
      id: "command-a-plus-05-2026",
      name: "Command A+",
      description: "Cohere's current MoE flagship for reasoning, vision, multilingual translation, and tool-using chat",
      contextLength: 128000,
      contextLabel: "128K context",
      maxOutputTokens: 64000,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "command-a-reasoning-08-2025",
      name: "Command A Reasoning",
      description: "Current Cohere reasoning model with extended context",
      contextLength: 288768,
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
      contextLength: 128000,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "command-r7b-12-2024",
      name: "Command R7B",
      description: "Lower-cost Cohere chat model",
      contextLength: 132000,
      supportsDocuments: true,
      supportsFunctions: true,
    },
  ],
  deepseek: [
    {
      id: "deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
      description: "Fast, cost-effective DeepSeek V4 model with 1M context and dual thinking modes",
      contextLength: 1048576,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsThinking: true,
    },
    {
      id: "deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
      description: "Higher-capability DeepSeek V4 model for agentic coding and reasoning",
      contextLength: 1048576,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsThinking: true,
    },
    {
      id: "deepseek-chat",
      name: "DeepSeek Chat",
      description: "Legacy DeepSeek chat alias now routed by DeepSeek to V4 Flash non-thinking mode",
      contextLength: 128000,
      maxOutputTokens: 8000,
      supportsFunctions: true,
      isDeprecated: true,
    },
    {
      id: "deepseek-reasoner",
      name: "DeepSeek Reasoner",
      description: "Legacy DeepSeek reasoning alias now routed by DeepSeek to V4 Flash thinking mode",
      contextLength: 128000,
      maxOutputTokens: 64000,
      supportsThinking: true,
      isDeprecated: true,
    },
  ],
  grok: [
    {
      id: "grok-4.3",
      name: "Grok 4.3",
      description: "Current xAI flagship model for high-capability chat, vision, tool use, and reasoning",
      contextLength: 1000000,
      isDefault: true,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "grok-4.20-0309-non-reasoning",
      name: "Grok 4.20",
      description: "Current xAI default model for fast, high-capability chat and tool use",
      contextLength: 2000000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "grok-4.20-0309-reasoning",
      name: "Grok 4.20 Reasoning",
      description: "Reasoning variant of Grok 4.20 for harder planning and analysis tasks",
      contextLength: 2000000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "grok-4-1-fast-non-reasoning",
      name: "Grok 4.1 Fast",
      description: "Cost-efficient low-latency Grok 4.1 Fast model for high-volume chat and tool use",
      contextLength: 2000000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
    },
    {
      id: "grok-4-1-fast-reasoning",
      name: "Grok 4.1 Fast Reasoning",
      description: "Cost-efficient Grok 4.1 Fast reasoning variant for harder planning and analysis tasks",
      contextLength: 2000000,
      supportsVision: true,
      supportsImageInput: true,
      supportsDocuments: true,
      supportsFunctions: true,
      supportsThinking: true,
    },
    {
      id: "grok-4-0709",
      name: "Grok 4",
      description: "Previous Grok 4 flagship model from xAI",
      contextLength: 256000,
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
    {
      id: "grok-imagine-image-pro",
      name: "Grok Imagine Pro",
      description: "Higher-fidelity image generation and editing model from xAI",
      contextLength: 0,
      supportsImageInput: true,
      supportsImageGeneration: true,
    },
  ],
};

// Model IDs shown in selectors. Keep this aligned with the verified runtime catalog.
export const CURATED_MODEL_IDS: { [providerId: string]: string[] } = {
  claude: [
    "claude-sonnet-4-6",
    "claude-opus-4-8",
    "claude-opus-4-7",
    "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5-20251001",
  ],
  openai: [
    "gpt-5.5",
    "gpt-5.5-pro",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
  ],
  google: [
    "gemini-3.5-flash",
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
  ],
  perplexity: ["sonar-pro", "sonar", "sonar-reasoning-pro"],
  mistral: [
    "mistral-large-2512",
    "mistral-medium-3-5",
    "magistral-medium-2509",
    "mistral-small-2603",
    "codestral-2508",
  ],
  cohere: [
    "command-a-plus-05-2026",
    "command-a-reasoning-08-2025",
    "command-a-vision-07-2025",
    "command-r-08-2024",
    "command-r7b-12-2024",
  ],
  deepseek: ["deepseek-v4-flash", "deepseek-v4-pro"],
  grok: [
    "grok-4.3",
    "grok-4.20-0309-non-reasoning",
    "grok-4.20-0309-reasoning",
    "grok-4-1-fast-non-reasoning",
    "grok-3-mini",
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

const trimDecimal = (value: string): string =>
  value.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');

export const formatContextLength = (contextLength: number): string => {
  if (contextLength >= 1_000_000) {
    if (contextLength % (1024 * 1024) === 0) {
      return `${contextLength / (1024 * 1024)}M`;
    }
    return `${trimDecimal((contextLength / 1_000_000).toFixed(2))}M`;
  }

  if (contextLength >= 1_000) {
    if (contextLength % 1024 === 0) {
      return `${contextLength / 1024}K`;
    }
    return `${trimDecimal((contextLength / 1_000).toFixed(contextLength >= 100_000 ? 0 : 1))}K`;
  }

  return `${contextLength}`;
};

export const getModelContextLabel = (model: ModelConfig): string | null => {
  if (model.contextLabel !== undefined) {
    return model.contextLabel;
  }

  if (!model.contextLength) {
    return null;
  }

  return `${formatContextLength(model.contextLength)} context`;
};

// Helper function to get models for a specific provider
export const getProviderModels = (providerId: string): ModelConfig[] => {
  const all = AI_MODELS[providerId] || [];
  const curated = CURATED_MODEL_IDS[providerId];
  const visibleModels = curated && curated.length
    ? all.filter((m) => curated.includes(m.id))
    : all;
  return visibleModels.filter(
    (model) =>
      !model.isDeprecated &&
      !model.supportsImageGeneration &&
      model.supportsChatCompletions !== false
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
    const requestedModel = getModelById(providerId, modelId);
    if (
      requestedModel &&
      !requestedModel.isDeprecated &&
      !requestedModel.supportsImageGeneration &&
      requestedModel.supportsChatCompletions !== false
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
  const resolvedModelId = resolveModelAlias(modelId);
  return models.find((model) => model.id === resolvedModelId)
    || models.find((model) => model.id === modelId);
};
