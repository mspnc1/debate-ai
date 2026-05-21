import { AIProvider } from '../types';

/**
 * Centralized configuration for image generation models.
 * Single source of truth for model IDs, UX labels, capabilities, and transport strategy.
 */

export type ImageModelApiFamily =
  | 'openai-images'
  | 'google-gemini-image'
  | 'google-imagen'
  | 'xai-images';

export interface ImageModelConfig {
  id: string;
  displayName: string;
  providerDisplayName: string;
  shortProviderName: string;
  description: string;
  apiFamily: ImageModelApiFamily;
  supportsImageInput: boolean;
  sizes: string[];
  aspectRatios?: string[];
  resolutions?: string[];
  maxPromptLength?: number;
  supportsMultipleReferenceImages?: boolean;
  isDefault: boolean;
  isPreview?: boolean;
  isDeprecated?: boolean;
}

const OPENAI_IMAGE_SIZES = ['1024x1024', '1024x1536', '1536x1024'] as const;
const OPENAI_DALLE_SIZES = ['1024x1024', '1024x1792', '1792x1024'] as const;
const GOOGLE_STANDARD_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'] as const;
const GOOGLE_EXTENDED_ASPECT_RATIOS = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '2:3',
  '3:2',
  '4:5',
  '5:4',
  '21:9',
] as const;
const XAI_ASPECT_RATIOS = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '3:2',
  '2:3',
  '2:1',
  '1:2',
  '19.5:9',
  '9:19.5',
  '20:9',
  '9:20',
] as const;

const IMAGE_MODEL_ALIASES: Partial<Record<AIProvider, Record<string, string>>> = {
  openai: {
    'gpt-image-latest': 'gpt-image-2',
    'gpt-image-2-2026-04-21': 'gpt-image-2',
    'chatgpt-image-latest': 'gpt-image-2',
  },
  google: {
    'gemini-3-pro-image': 'gemini-3-pro-image-preview',
    'nano-banana-pro-preview': 'gemini-3-pro-image-preview',
  },
  grok: {
    'grok-2-image-1212': 'grok-imagine-image',
    'grok-image-latest': 'grok-imagine-image',
  },
};

function createImageModel(config: ImageModelConfig): ImageModelConfig {
  return {
    maxPromptLength: 4000,
    ...config,
  };
}

export const IMAGE_MODELS: Partial<Record<AIProvider, ImageModelConfig[]>> = {
  openai: [
    createImageModel({
      id: 'gpt-image-2',
      displayName: 'GPT Image 2',
      providerDisplayName: 'ChatGPT (GPT Image 2)',
      shortProviderName: 'ChatGPT',
      description: 'State-of-the-art OpenAI image model for high-quality generation and native edits.',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      sizes: [...OPENAI_IMAGE_SIZES],
      isDefault: true,
    }),
    createImageModel({
      id: 'gpt-image-1.5',
      displayName: 'GPT Image 1.5',
      providerDisplayName: 'ChatGPT (GPT Image 1.5)',
      shortProviderName: 'ChatGPT',
      description: 'Previous OpenAI image model with native edits and strong prompt fidelity.',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      sizes: [...OPENAI_IMAGE_SIZES],
      isDefault: false,
    }),
    createImageModel({
      id: 'chatgpt-image-latest',
      displayName: 'ChatGPT Image Latest',
      providerDisplayName: 'ChatGPT (Image Latest)',
      shortProviderName: 'ChatGPT',
      description: 'Rolling alias for the newest ChatGPT image model when you want latest behavior without pinning a version.',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      sizes: [...OPENAI_IMAGE_SIZES],
      isDefault: false,
      isDeprecated: true,
    }),
    createImageModel({
      id: 'gpt-image-1',
      displayName: 'GPT Image 1',
      providerDisplayName: 'ChatGPT (GPT Image 1)',
      shortProviderName: 'ChatGPT',
      description: 'Earlier GPT Image generation model with native refinement and edits.',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      sizes: [...OPENAI_IMAGE_SIZES],
      isDefault: false,
    }),
    createImageModel({
      id: 'gpt-image-1-mini',
      displayName: 'GPT Image 1 Mini',
      providerDisplayName: 'ChatGPT (GPT Image 1 Mini)',
      shortProviderName: 'ChatGPT',
      description: 'Lighter GPT Image variant for faster, lower-cost generation and edits.',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      sizes: [...OPENAI_IMAGE_SIZES],
      isDefault: false,
    }),
    createImageModel({
      id: 'dall-e-3',
      displayName: 'DALL-E 3',
      providerDisplayName: 'ChatGPT (DALL-E 3)',
      shortProviderName: 'ChatGPT',
      description: 'Legacy OpenAI text-to-image model for single-pass generation without img2img edits.',
      apiFamily: 'openai-images',
      supportsImageInput: false,
      sizes: [...OPENAI_DALLE_SIZES],
      isDefault: false,
      isDeprecated: true,
    }),
  ],
  google: [
    createImageModel({
      id: 'gemini-2.5-flash-image',
      displayName: 'Gemini 2.5 Flash Image',
      providerDisplayName: 'Gemini (2.5 Flash Image)',
      shortProviderName: 'Gemini',
      description: 'Fast stable Gemini image model with native image refinement and aspect-ratio control.',
      apiFamily: 'google-gemini-image',
      supportsImageInput: true,
      sizes: [...GOOGLE_STANDARD_ASPECT_RATIOS],
      aspectRatios: [...GOOGLE_STANDARD_ASPECT_RATIOS],
      isDefault: true,
    }),
    createImageModel({
      id: 'gemini-3.1-flash-image-preview',
      displayName: 'Gemini 3.1 Flash Image Preview',
      providerDisplayName: 'Gemini (3.1 Flash Image Preview)',
      shortProviderName: 'Gemini',
      description: 'Preview Gemini image model with native edits, broader framing controls, and optional higher-resolution output.',
      apiFamily: 'google-gemini-image',
      supportsImageInput: true,
      sizes: [...GOOGLE_EXTENDED_ASPECT_RATIOS],
      aspectRatios: [...GOOGLE_EXTENDED_ASPECT_RATIOS],
      resolutions: ['0.5K', '1K', '2K'],
      isDefault: false,
      isPreview: true,
    }),
    createImageModel({
      id: 'gemini-3-pro-image-preview',
      displayName: 'Gemini 3 Pro Image Preview',
      providerDisplayName: 'Gemini (3 Pro Image Preview)',
      shortProviderName: 'Gemini',
      description: 'Highest-fidelity Gemini preview image model with native editing and high-resolution generation options.',
      apiFamily: 'google-gemini-image',
      supportsImageInput: true,
      sizes: [...GOOGLE_EXTENDED_ASPECT_RATIOS],
      aspectRatios: [...GOOGLE_EXTENDED_ASPECT_RATIOS],
      resolutions: ['1K', '2K', '4K'],
      isDefault: false,
      isPreview: true,
    }),
    createImageModel({
      id: 'imagen-4.0-fast-generate-001',
      displayName: 'Imagen 4 Fast',
      providerDisplayName: 'Gemini (Imagen 4 Fast)',
      shortProviderName: 'Gemini',
      description: 'Fast Imagen 4 generation model surfaced through Google’s media generation API.',
      apiFamily: 'google-imagen',
      supportsImageInput: false,
      sizes: [...GOOGLE_STANDARD_ASPECT_RATIOS],
      aspectRatios: [...GOOGLE_STANDARD_ASPECT_RATIOS],
      isDefault: false,
    }),
    createImageModel({
      id: 'imagen-4.0-generate-001',
      displayName: 'Imagen 4',
      providerDisplayName: 'Gemini (Imagen 4)',
      shortProviderName: 'Gemini',
      description: 'Balanced Imagen 4 text-to-image model for more specialized prompt rendering.',
      apiFamily: 'google-imagen',
      supportsImageInput: false,
      sizes: [...GOOGLE_STANDARD_ASPECT_RATIOS],
      aspectRatios: [...GOOGLE_STANDARD_ASPECT_RATIOS],
      isDefault: false,
    }),
    createImageModel({
      id: 'imagen-4.0-ultra-generate-001',
      displayName: 'Imagen 4 Ultra',
      providerDisplayName: 'Gemini (Imagen 4 Ultra)',
      shortProviderName: 'Gemini',
      description: 'Highest-quality Imagen 4 generation model for premium single-pass image output.',
      apiFamily: 'google-imagen',
      supportsImageInput: false,
      sizes: [...GOOGLE_STANDARD_ASPECT_RATIOS],
      aspectRatios: [...GOOGLE_STANDARD_ASPECT_RATIOS],
      isDefault: false,
    }),
  ],
  grok: [
    createImageModel({
      id: 'grok-imagine-image',
      displayName: 'Grok Imagine',
      providerDisplayName: 'Grok (Imagine)',
      shortProviderName: 'Grok',
      description: 'xAI image model with text-to-image generation, edits, and aspect-ratio controls.',
      apiFamily: 'xai-images',
      supportsImageInput: true,
      sizes: [...XAI_ASPECT_RATIOS],
      aspectRatios: [...XAI_ASPECT_RATIOS],
      resolutions: ['1K', '2K'],
      supportsMultipleReferenceImages: true,
      isDefault: true,
    }),
    createImageModel({
      id: 'grok-imagine-image-pro',
      displayName: 'Grok Imagine Pro',
      providerDisplayName: 'Grok (Imagine Pro)',
      shortProviderName: 'Grok',
      description: 'Higher-fidelity xAI image model with text-to-image generation, edits, and aspect-ratio controls.',
      apiFamily: 'xai-images',
      supportsImageInput: true,
      sizes: [...XAI_ASPECT_RATIOS],
      aspectRatios: [...XAI_ASPECT_RATIOS],
      resolutions: ['1K', '2K'],
      supportsMultipleReferenceImages: true,
      isDefault: false,
    }),
  ],
};

export function getImageModels(provider: AIProvider): ImageModelConfig[] {
  return IMAGE_MODELS[provider] || [];
}

export function getImageInputModels(provider: AIProvider): ImageModelConfig[] {
  return getImageModels(provider).filter((model) => model.supportsImageInput);
}

/**
 * Get the default image model for a provider
 */
export function getDefaultImageModel(provider: AIProvider): ImageModelConfig | undefined {
  const models = getImageModels(provider);
  if (!models || models.length === 0) return undefined;
  return models.find(m => m.isDefault) || models[0];
}

export function getDefaultImageInputModel(provider: AIProvider): ImageModelConfig | undefined {
  const models = getImageInputModels(provider);
  if (models.length === 0) return undefined;
  return models.find((model) => model.isDefault) || models[0];
}

/**
 * Get display name for image generation provider
 * @param provider - The AI provider
 * @param includeModel - Whether to include model ID in the name
 */
export function getImageProviderDisplayName(
  provider: AIProvider,
  options?: { includeModel?: boolean; modelId?: string }
): string {
  const model = getResolvedImageModel(provider, options?.modelId);
  if (!model) return provider;

  if (options?.includeModel) {
    return model.providerDisplayName;
  }
  return model.shortProviderName;
}

export function getImageModelDisplayName(
  provider: AIProvider,
  modelId?: string
): string {
  return getResolvedImageModel(provider, modelId)?.displayName || provider;
}

export function getImageModelApiFamily(
  provider: AIProvider,
  modelId?: string
): ImageModelApiFamily | undefined {
  return getResolvedImageModel(provider, modelId)?.apiFamily;
}

/**
 * Get image model by ID
 */
export function getImageModelById(provider: AIProvider, modelId: string): ImageModelConfig | undefined {
  return getImageModels(provider).find(m => m.id === modelId);
}

export function resolveImageModelId(
  provider: AIProvider,
  modelId?: string
): string | undefined {
  const resolvedModelId = modelId
    ? IMAGE_MODEL_ALIASES[provider]?.[modelId] || modelId
    : undefined;

  if (modelId) {
    const requestedModel = getImageModelById(provider, resolvedModelId || modelId);
    if (requestedModel) {
      return requestedModel.id;
    }
  }

  return getDefaultImageModel(provider)?.id;
}

export function getResolvedImageModel(
  provider: AIProvider,
  modelId?: string
): ImageModelConfig | undefined {
  const resolvedModelId = resolveImageModelId(provider, modelId);
  if (!resolvedModelId) return undefined;
  return getImageModelById(provider, resolvedModelId);
}

/**
 * Check if a provider supports image generation
 */
export function supportsImageGeneration(provider: AIProvider): boolean {
  const models = getImageModels(provider);
  return models.length > 0;
}

export function getImageGenerationCapabilities(provider: AIProvider): {
  supported: boolean;
  supportsImageInput: boolean;
  models: string[];
  sizes: string[];
  maxPromptLength?: number;
} {
  const models = getImageModels(provider);
  if (models.length === 0) {
    return {
      supported: false,
      supportsImageInput: false,
      models: [],
      sizes: [],
    };
  }

  const defaultModel = getDefaultImageModel(provider);

  return {
    supported: true,
    supportsImageInput: defaultModel?.supportsImageInput ?? false,
    models: models.map((model) => model.id),
    sizes: Array.from(new Set(models.flatMap((model) => model.sizes))),
    maxPromptLength: Math.max(...models.map((model) => model.maxPromptLength || 0)),
  };
}

/**
 * Check if a provider supports img2img (image refinement)
 */
export function supportsImageInput(provider: AIProvider, modelId?: string): boolean {
  const model = getResolvedImageModel(provider, modelId);
  return model?.supportsImageInput ?? false;
}
