import type { AIProvider } from '@/types';
import {
  getDefaultImageInputModel,
  getImageInputModels,
  getImageModelApiFamily,
  getImageModelDisplayName,
  getImageModels,
  getImageProviderDisplayName,
  resolveImageModelId,
  supportsImageInput,
} from '@/config/imageGenerationModels';

describe('Image generation model config', () => {
  const providers: AIProvider[] = ['openai', 'google', 'grok'];

  it.each(providers)('exposes at least one image model for %s', (provider) => {
    expect(getImageModels(provider).length).toBeGreaterThan(0);
  });

  it('resolves defaults and explicit model selections safely', () => {
    expect(resolveImageModelId('openai')).toBe('gpt-image-1.5');
    expect(resolveImageModelId('openai', 'dall-e-3')).toBe('dall-e-3');
    expect(resolveImageModelId('openai', 'gpt-5.4')).toBe('gpt-image-1.5');
    expect(resolveImageModelId('google', 'imagen-4.0-generate-001')).toBe('imagen-4.0-generate-001');
  });

  it('exposes model-aware labels and capabilities', () => {
    expect(getImageProviderDisplayName('openai')).toBe('ChatGPT');
    expect(getImageProviderDisplayName('openai', {
      includeModel: true,
      modelId: 'dall-e-3',
    })).toBe('ChatGPT (DALL-E 3)');
    expect(getImageModelDisplayName('openai', 'dall-e-3')).toBe('DALL-E 3');
    expect(supportsImageInput('openai', 'gpt-image-1.5')).toBe(true);
    expect(supportsImageInput('openai', 'dall-e-3')).toBe(false);
    expect(supportsImageInput('google', 'imagen-4.0-generate-001')).toBe(false);
    expect(supportsImageInput('grok', 'grok-imagine-image')).toBe(true);
  });

  it('surfaces only refinement-capable models for model-aware img2img flows', () => {
    expect(getImageInputModels('openai').map((model) => model.id)).toEqual(expect.arrayContaining([
      'gpt-image-1.5',
      'chatgpt-image-latest',
      'gpt-image-1',
      'gpt-image-1-mini',
    ]));
    expect(getImageInputModels('openai').map((model) => model.id)).not.toContain('dall-e-3');
    expect(getDefaultImageInputModel('google')?.id).toBe('gemini-2.5-flash-image');
  });

  it('groups models by transport family for scalable routing', () => {
    expect(getImageModelApiFamily('openai', 'gpt-image-1-mini')).toBe('openai-images');
    expect(getImageModelApiFamily('google', 'gemini-3-pro-image-preview')).toBe('google-gemini-image');
    expect(getImageModelApiFamily('google', 'imagen-4.0-fast-generate-001')).toBe('google-imagen');
    expect(getImageModelApiFamily('grok', 'grok-imagine-image')).toBe('xai-images');
  });

  it('expands provider offerings beyond the original minimal registry', () => {
    expect(getImageModels('openai').map((model) => model.id)).toEqual(expect.arrayContaining([
      'gpt-image-1.5',
      'chatgpt-image-latest',
      'gpt-image-1',
      'gpt-image-1-mini',
      'dall-e-3',
    ]));
    expect(getImageModels('google').map((model) => model.id)).toEqual(expect.arrayContaining([
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image-preview',
      'gemini-3-pro-image-preview',
      'imagen-4.0-fast-generate-001',
      'imagen-4.0-generate-001',
      'imagen-4.0-ultra-generate-001',
    ]));
  });
});
