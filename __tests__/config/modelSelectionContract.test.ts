import {
  AI_MODELS,
  getProviderDefaultModel,
  getProviderModels,
  resolveProviderModelId,
} from '@/config/modelConfigs';
import { getDefaultModel } from '@/config/providers/modelRegistry';

describe('Model selection contract', () => {
  const providerIds = Object.keys(AI_MODELS);

  it.each(providerIds)('only exposes non-deprecated selectable models for %s', (providerId) => {
    const models = getProviderModels(providerId);

    expect(models.length).toBeGreaterThan(0);
    expect(models.length).toBeLessThanOrEqual(5);
    expect(models.every((model) => model.isDeprecated !== true)).toBe(true);
    expect(models.every((model) => model.supportsImageGeneration !== true)).toBe(true);
  });

  it.each(providerIds)('keeps provider defaults aligned for %s', (providerId) => {
    expect(getProviderDefaultModel(providerId)?.id).toBe(getDefaultModel(providerId));
    expect(resolveProviderModelId(providerId, getDefaultModel(providerId))).toBe(getDefaultModel(providerId));
  });

  it('resolves aliases before validating provider ownership', () => {
    expect(resolveProviderModelId('claude', 'claude-latest')).toBe('claude-sonnet-4-6');
    expect(resolveProviderModelId('openai', 'gpt-latest')).toBe('gpt-5.4');
    expect(resolveProviderModelId('google', 'gemini-pro-latest')).toBe('gemini-2.5-pro');
  });

  it('falls back to provider default for deprecated, invalid, or cross-provider models', () => {
    expect(resolveProviderModelId('claude', 'claude-3-7-sonnet-20250219')).toBe('claude-sonnet-4-6');
    expect(resolveProviderModelId('claude', 'gpt-5')).toBe('claude-sonnet-4-6');
    expect(resolveProviderModelId('openai', 'not-a-real-model')).toBe('gpt-5.4');
  });

  it('rejects image-generation models in text-mode resolution', () => {
    expect(resolveProviderModelId('openai', 'gpt-image-1')).toBe('gpt-5.4');
    expect(resolveProviderModelId('openai', 'dall-e-3')).toBe('gpt-5.4');
    expect(resolveProviderModelId('grok', 'grok-imagine-image')).toBe('grok-4-0709');
  });
});
