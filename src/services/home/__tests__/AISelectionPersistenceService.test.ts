import AsyncStorage from '@react-native-async-storage/async-storage';
import AISelectionPersistenceService from '../AISelectionPersistenceService';
import { AISelectionConfig } from '../../../types/aiSelection';

describe('AISelectionPersistenceService', () => {
  const config: AISelectionConfig = {
    providerId: 'claude',
    modelId: 'model-a',
    personalityId: 'default',
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns null when nothing is stored', async () => {
    await expect(AISelectionPersistenceService.load()).resolves.toBeNull();
  });

  it('round-trips a saved selection', async () => {
    const selection = { chat: [config], compare: [config, { ...config, modelId: 'model-b' }] };
    await AISelectionPersistenceService.save(selection);
    await expect(AISelectionPersistenceService.load()).resolves.toEqual(selection);
  });

  it('filters malformed entries on load', async () => {
    await AsyncStorage.setItem(
      '@ai_selection_v1',
      JSON.stringify({
        chat: [config, { providerId: '', modelId: 'x', personalityId: 'y' }, 'garbage', null],
        compare: 'not-an-array',
      })
    );
    await expect(AISelectionPersistenceService.load()).resolves.toEqual({
      chat: [config],
      compare: [],
    });
  });

  it('returns null for unparseable payloads', async () => {
    await AsyncStorage.setItem('@ai_selection_v1', '{not json');
    await expect(AISelectionPersistenceService.load()).resolves.toBeNull();
  });
});
