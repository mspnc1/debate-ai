export type ImageProviderId = 'openai' | 'google' | 'grok';

export type ImageModelApiFamily =
  | 'openai-images'
  | 'google-gemini-image'
  | 'google-imagen'
  | 'xai-images';

export interface ImageModelConfig {
  id: string;
  displayName: string;
  apiFamily: ImageModelApiFamily;
  supportsImageInput: boolean;
  isDefault: boolean;
  maxPromptLength?: number;
  isPreview?: boolean;
  isDeprecated?: boolean;
}

const IMAGE_MODEL_ALIASES: Partial<Record<ImageProviderId, Record<string, string>>> = {
  openai: {
    'gpt-image-latest': 'gpt-image-2',
    'chatgpt-image-latest': 'gpt-image-2',
  },
  google: {
    'gemini-3-pro-image': 'gemini-3-pro-image-preview',
  },
  grok: {
    'grok-2-image-1212': 'grok-imagine-image',
  },
};

function createImageModel(config: ImageModelConfig): ImageModelConfig {
  return {
    maxPromptLength: 4000,
    ...config,
  };
}

export const IMAGE_MODELS: Record<ImageProviderId, ImageModelConfig[]> = {
  openai: [
    createImageModel({
      id: 'gpt-image-2',
      displayName: 'GPT Image 2',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      isDefault: true,
    }),
    createImageModel({
      id: 'gpt-image-1.5',
      displayName: 'GPT Image 1.5',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      isDefault: false,
    }),
    createImageModel({
      id: 'chatgpt-image-latest',
      displayName: 'ChatGPT Image Latest',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      isDefault: false,
      isDeprecated: true,
    }),
    createImageModel({
      id: 'gpt-image-1',
      displayName: 'GPT Image 1',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      isDefault: false,
    }),
    createImageModel({
      id: 'gpt-image-1-mini',
      displayName: 'GPT Image 1 Mini',
      apiFamily: 'openai-images',
      supportsImageInput: true,
      isDefault: false,
    }),
    createImageModel({
      id: 'dall-e-3',
      displayName: 'DALL-E 3',
      apiFamily: 'openai-images',
      supportsImageInput: false,
      isDefault: false,
      isDeprecated: true,
    }),
  ],
  google: [
    createImageModel({
      id: 'gemini-2.5-flash-image',
      displayName: 'Gemini 2.5 Flash Image',
      apiFamily: 'google-gemini-image',
      supportsImageInput: true,
      isDefault: true,
    }),
    createImageModel({
      id: 'gemini-3.1-flash-image-preview',
      displayName: 'Gemini 3.1 Flash Image Preview',
      apiFamily: 'google-gemini-image',
      supportsImageInput: true,
      isDefault: false,
      isPreview: true,
    }),
    createImageModel({
      id: 'gemini-3-pro-image-preview',
      displayName: 'Gemini 3 Pro Image Preview',
      apiFamily: 'google-gemini-image',
      supportsImageInput: true,
      isDefault: false,
      isPreview: true,
    }),
    createImageModel({
      id: 'imagen-4.0-fast-generate-001',
      displayName: 'Imagen 4 Fast',
      apiFamily: 'google-imagen',
      supportsImageInput: false,
      isDefault: false,
    }),
    createImageModel({
      id: 'imagen-4.0-generate-001',
      displayName: 'Imagen 4',
      apiFamily: 'google-imagen',
      supportsImageInput: false,
      isDefault: false,
    }),
    createImageModel({
      id: 'imagen-4.0-ultra-generate-001',
      displayName: 'Imagen 4 Ultra',
      apiFamily: 'google-imagen',
      supportsImageInput: false,
      isDefault: false,
    }),
  ],
  grok: [
    createImageModel({
      id: 'grok-imagine-image',
      displayName: 'Grok Imagine',
      apiFamily: 'xai-images',
      supportsImageInput: true,
      isDefault: true,
    }),
  ],
};

export function isImageProvider(providerId: string): providerId is ImageProviderId {
  return providerId === 'openai' || providerId === 'google' || providerId === 'grok';
}

export function getImageModels(providerId: ImageProviderId): ImageModelConfig[] {
  return IMAGE_MODELS[providerId] || [];
}

export function getImageModelById(
  providerId: ImageProviderId,
  modelId: string
): ImageModelConfig | undefined {
  return getImageModels(providerId).find((model) => model.id === modelId);
}

export function getDefaultImageModel(providerId: ImageProviderId): ImageModelConfig | undefined {
  const models = getImageModels(providerId);
  return models.find((model) => model.isDefault) || models[0];
}

export function resolveImageModelId(
  providerId: ImageProviderId,
  modelId?: string
): string | undefined {
  const resolvedModelId = modelId
    ? IMAGE_MODEL_ALIASES[providerId]?.[modelId] || modelId
    : undefined;

  if (resolvedModelId) {
    const requestedModel = getImageModelById(providerId, resolvedModelId);
    if (requestedModel) {
      return requestedModel.id;
    }
  }

  return getDefaultImageModel(providerId)?.id;
}

export function getResolvedImageModel(
  providerId: ImageProviderId,
  modelId?: string
): ImageModelConfig | undefined {
  const resolvedModelId = resolveImageModelId(providerId, modelId);
  if (!resolvedModelId) return undefined;
  return getImageModelById(providerId, resolvedModelId);
}
