import {
  createDefaultAISelectionConfig,
  toAIConfig,
  fromAIConfig,
  validateAISelectionConfigs,
  buildSessionMaps,
} from '../aiSelection';
import { AISelectionConfig } from '../../types/aiSelection';
import { getProviderDefaultModel, getProviderModels } from '../../config/modelConfigs';

describe('aiSelection utils', () => {
  const claudeDefaultModel = getProviderDefaultModel('claude')?.id as string;
  const keyedProviders = { claude: 'sk-ant-test', openai: 'sk-test' };

  const makeConfig = (overrides: Partial<AISelectionConfig> = {}): AISelectionConfig => ({
    providerId: 'claude',
    modelId: claudeDefaultModel,
    personalityId: 'default',
    ...overrides,
  });

  describe('createDefaultAISelectionConfig', () => {
    it('seeds the provider default model and default personality', () => {
      const config = createDefaultAISelectionConfig('claude');
      expect(config).toEqual({
        providerId: 'claude',
        modelId: claudeDefaultModel,
        personalityId: 'default',
      });
    });

    it('prefers the expert-mode default model when enabled', () => {
      const alternateModel = getProviderModels('claude').find(m => m.id !== claudeDefaultModel);
      expect(alternateModel).toBeDefined();
      const config = createDefaultAISelectionConfig('claude', {
        expertMode: { claude: { enabled: true, selectedModel: alternateModel!.id } },
      });
      expect(config?.modelId).toBe(alternateModel!.id);
    });

    it('ignores expert-mode models when disabled', () => {
      const alternateModel = getProviderModels('claude').find(m => m.id !== claudeDefaultModel);
      const config = createDefaultAISelectionConfig('claude', {
        expertMode: { claude: { enabled: false, selectedModel: alternateModel!.id } },
      });
      expect(config?.modelId).toBe(claudeDefaultModel);
    });

    it('returns null for unknown providers', () => {
      expect(createDefaultAISelectionConfig('not-a-provider')).toBeNull();
    });
  });

  describe('toAIConfig', () => {
    it('produces a session AIConfig with the selected model and personality', () => {
      const ai = toAIConfig(makeConfig({ personalityId: 'brody' }));
      expect(ai).toMatchObject({
        id: 'claude',
        provider: 'claude',
        model: claudeDefaultModel,
        personality: 'brody',
      });
    });

    it('falls back to the default personality when unknown', () => {
      const ai = toAIConfig(makeConfig({ personalityId: 'not-a-personality' }));
      expect(ai?.personality).toBe('default');
    });

    it('falls back to the provider default for retired models', () => {
      const ai = toAIConfig(makeConfig({ modelId: 'retired-model-id' }));
      expect(ai?.model).toBe(claudeDefaultModel);
    });

    it('returns null for unknown providers', () => {
      expect(toAIConfig(makeConfig({ providerId: 'not-a-provider' }))).toBeNull();
    });
  });

  describe('fromAIConfig', () => {
    it('round-trips through toAIConfig', () => {
      const original = makeConfig({ personalityId: 'brody' });
      const ai = toAIConfig(original);
      expect(ai).not.toBeNull();
      expect(fromAIConfig(ai!)).toEqual(original);
    });
  });

  describe('validateAISelectionConfigs', () => {
    it('drops configs whose provider has no API key', () => {
      const configs = [makeConfig(), makeConfig({ providerId: 'mistral', modelId: 'anything' })];
      const valid = validateAISelectionConfigs(configs, keyedProviders);
      expect(valid.map(c => c.providerId)).toEqual(['claude']);
    });

    it('re-resolves retired model ids to the provider default', () => {
      const valid = validateAISelectionConfigs([makeConfig({ modelId: 'retired-model-id' })], keyedProviders);
      expect(valid[0].modelId).toBe(claudeDefaultModel);
    });

    it('falls unknown personalities back to default', () => {
      const valid = validateAISelectionConfigs(
        [makeConfig({ personalityId: 'not-a-personality' })],
        keyedProviders
      );
      expect(valid[0].personalityId).toBe('default');
    });

    it('restricts to demo-allowed providers in demo mode', () => {
      const configs = [makeConfig(), makeConfig({ providerId: 'mistral' })];
      const valid = validateAISelectionConfigs(configs, {}, { isDemo: true });
      expect(valid.map(c => c.providerId)).toEqual(['claude']);
    });
  });

  describe('buildSessionMaps', () => {
    it('keys personalities and models by provider id', () => {
      const configs = [
        makeConfig({ personalityId: 'brody' }),
        makeConfig({ providerId: 'openai', modelId: 'gpt-test', personalityId: 'default' }),
      ];
      expect(buildSessionMaps(configs)).toEqual({
        personalities: { claude: 'brody', openai: 'default' },
        models: { claude: claudeDefaultModel, openai: 'gpt-test' },
      });
    });
  });
});
