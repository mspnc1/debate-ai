import { AIProvider } from '../types';
import { getImageGenerationCapabilities } from './imageGenerationModels';

export interface ProviderCapabilities {
  imageGeneration?: {
    supported: boolean;
    supportsImageInput?: boolean;  // img2img capability for round-robin
    models?: string[];
    sizes?: string[];
    maxPromptLength?: number;
  };
  videoGeneration?: {
    supported: boolean;
    models?: string[];
    resolutions?: string[];
    maxPromptLength?: number;
  };
}

export function getProviderCapabilities(provider: AIProvider): ProviderCapabilities {
  const imageGeneration = getImageGenerationCapabilities(provider);

  switch (provider) {
    case 'openai':
    case 'google':
    case 'grok':
      return {
        imageGeneration,
        videoGeneration: { supported: false },
      };
    default:
      return { imageGeneration: { supported: false } };
  }
}
