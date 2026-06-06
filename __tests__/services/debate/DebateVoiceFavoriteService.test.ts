import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebateVoiceFavoriteService } from '@/services/debate/DebateVoiceFavoriteService';
import type { MediaProviderVoiceOption } from '@/types/media';

describe('DebateVoiceFavoriteService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('persists favorite voices in AsyncStorage', async () => {
    const voice: MediaProviderVoiceOption = {
      id: 'voice-host',
      name: 'Studio Host',
      voice_id: 'voice-host',
      category: 'premade',
      description: 'Clear host voice',
      previewUrl: 'https://example.com/host.mp3',
      labels: { accent: 'American' },
      sourceVoiceType: 'default',
    };

    await DebateVoiceFavoriteService.add(voice);

    await expect(DebateVoiceFavoriteService.listIds()).resolves.toEqual(['voice-host']);
    await expect(DebateVoiceFavoriteService.list()).resolves.toEqual([
      expect.objectContaining({
        id: 'voice-host',
        name: 'Studio Host',
        isBookmarked: true,
      }),
    ]);
  });

  it('tracks community source ids against the added library voice', async () => {
    const addedVoice: MediaProviderVoiceOption = {
      id: 'library-voice',
      name: 'Community Star',
      voice_id: 'library-voice',
      category: 'professional',
      sourceVoiceType: 'personal',
      isAddedByUser: true,
    };

    await DebateVoiceFavoriteService.add(addedVoice, ['shared-voice']);

    await expect(DebateVoiceFavoriteService.listIds()).resolves.toEqual(['library-voice', 'shared-voice']);

    await DebateVoiceFavoriteService.remove('shared-voice');

    await expect(DebateVoiceFavoriteService.list()).resolves.toEqual([]);
  });
});
