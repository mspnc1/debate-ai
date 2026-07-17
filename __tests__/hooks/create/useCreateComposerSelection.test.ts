import { act } from '@testing-library/react-native';
import { renderHookWithProviders } from '../../../test-utils/renderHookWithProviders';
import { useCreateComposerSelection } from '@/hooks/create/useCreateComposerSelection';
import CreateSelectionPersistenceService from '@/services/create/CreateSelectionPersistenceService';
import { getDefaultImageModel } from '@/config/imageGenerationModels';
import {
  ELEVENLABS_DEFAULT_SFX_MODEL,
  ELEVENLABS_DEFAULT_TTS_MODEL,
  RUNWAY_DEFAULT_VIDEO_MODEL,
} from '@/config/mediaProviders';
import type { RootState } from '@/store';
import type { CreateSelectionState } from '@/store/createSelectionSlice';
import type { CreateSelectionConfig } from '@/types/createSelection';

const mockUseFeatureAccess = jest.fn();

jest.mock('@/hooks/useFeatureAccess', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseFeatureAccess(...args),
  useFeatureAccess: (...args: unknown[]) => mockUseFeatureAccess(...args),
}));

jest.mock('@/services/create/CreateSelectionPersistenceService', () => {
  const service = { load: jest.fn(), save: jest.fn() };
  return {
    __esModule: true,
    CreateSelectionPersistenceService: service,
    default: service,
  };
});

describe('useCreateComposerSelection', () => {
  const mockSave = CreateSelectionPersistenceService.save as jest.MockedFunction<
    typeof CreateSelectionPersistenceService.save
  >;

  const openaiDefaultModel = getDefaultImageModel('openai')?.id as string;
  const googleDefaultModel = getDefaultImageModel('google')?.id as string;

  const configuredKey = { configured: true, maskedLabel: 'sk-…', updatedAt: 1 };

  const makeSelection = (
    overrides: Partial<CreateSelectionState> = {}
  ): CreateSelectionState => ({
    image: [],
    imageOptions: { style: 'none', size: 'auto', count: 1 },
    videoOptions: {
      modelId: RUNWAY_DEFAULT_VIDEO_MODEL,
      durationSeconds: 5,
      aspectRatio: '1280:720',
    },
    audioOptions: {
      operation: 'text_to_speech',
      ttsModelId: ELEVENLABS_DEFAULT_TTS_MODEL,
      sfxModelId: ELEVENLABS_DEFAULT_SFX_MODEL,
      voiceId: 'voice-1',
      outputFormat: 'mp3_44100_128',
      promptInfluence: 0.3,
    },
    attachments: { image: [], video: [], audio: [] },
    hydrated: true,
    ...overrides,
  });

  const makeState = (
    createSelection: CreateSelectionState,
    {
      apiKeys = { openai: configuredKey, google: configuredKey },
      verifiedProviders = ['openai', 'google'],
    }: {
      apiKeys?: Record<string, unknown>;
      verifiedProviders?: string[];
    } = {}
  ): Partial<RootState> =>
    ({
      settings: {
        theme: 'light',
        fontSize: 'medium',
        apiKeys,
        verifiedProviders,
        verificationTimestamps: {},
        verificationModels: {},
        expertMode: {},
        hasCompletedOnboarding: true,
      },
      createSelection,
    }) as unknown as Partial<RootState>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureAccess.mockReturnValue({ isDemo: false });
  });

  describe('image tab', () => {
    it('hides pills whose provider lacks a verified key, without deleting them', () => {
      const hidden: CreateSelectionConfig = { providerId: 'grok', modelId: 'anything' };
      const { result, store } = renderHookWithProviders(
        () => useCreateComposerSelection('image'),
        {
          preloadedState: makeState(
            makeSelection({
              image: [{ providerId: 'openai', modelId: openaiDefaultModel }, hidden],
            })
          ),
        }
      );

      expect(result.current.configs.map(c => c.providerId)).toEqual(['openai']);
      expect(result.current.configuredProviderIds).toEqual(['openai', 'google']);
      // Raw state keeps the hidden entry until the user next edits the lineup.
      expect(store.getState().createSelection.image).toHaveLength(2);
    });

    it('re-resolves stale model ids to the current catalog', () => {
      const { result } = renderHookWithProviders(
        () => useCreateComposerSelection('image'),
        {
          preloadedState: makeState(
            makeSelection({
              image: [{ providerId: 'openai', modelId: 'retired-model-id' }],
            })
          ),
        }
      );

      expect(result.current.configs[0].modelId).toBe(openaiDefaultModel);
    });

    it('adds a provider with its default model and persists the selection', () => {
      const { result, store } = renderHookWithProviders(
        () => useCreateComposerSelection('image'),
        { preloadedState: makeState(makeSelection()) }
      );

      act(() => {
        result.current.addProvider('google');
      });

      expect(store.getState().createSelection.image).toEqual([
        { providerId: 'google', modelId: googleDefaultModel },
      ]);
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          image: [{ providerId: 'google', modelId: googleDefaultModel }],
        })
      );
    });

    it('updates the raw entry behind a visible index when earlier pills are hidden', () => {
      const hidden: CreateSelectionConfig = { providerId: 'grok', modelId: 'anything' };
      const { result, store } = renderHookWithProviders(
        () => useCreateComposerSelection('image'),
        {
          preloadedState: makeState(
            makeSelection({
              image: [hidden, { providerId: 'openai', modelId: openaiDefaultModel }],
            })
          ),
        }
      );

      act(() => {
        result.current.updateConfig(0, { settings: { quality: 'hd' } });
      });

      const raw = store.getState().createSelection.image;
      expect(raw[0]).toEqual(hidden);
      expect(raw[1].settings).toEqual({ quality: 'hd' });

      act(() => {
        result.current.removeConfig(0);
      });
      expect(store.getState().createSelection.image).toEqual([hidden]);
    });

    it('builds the exact generateCreateImages selection maps', () => {
      const { result } = renderHookWithProviders(
        () => useCreateComposerSelection('image'),
        {
          preloadedState: makeState(
            makeSelection({
              image: [
                {
                  providerId: 'openai',
                  modelId: openaiDefaultModel,
                  settings: { quality: 'hd' },
                },
                { providerId: 'google', modelId: googleDefaultModel },
              ],
            })
          ),
        }
      );

      expect(result.current.imageSelectionMaps).toEqual({
        providers: ['openai', 'google'],
        selectedModels: {
          openai: openaiDefaultModel,
          google: googleDefaultModel,
        },
        modelSettings: {
          openai: { quality: 'hd' },
        },
      });
      expect(result.current.hasEnoughAIs).toBe(true);
    });

    it('does not persist selection changes made in demo mode', () => {
      mockUseFeatureAccess.mockReturnValue({ isDemo: true });
      const { result, store } = renderHookWithProviders(
        () => useCreateComposerSelection('image'),
        { preloadedState: makeState(makeSelection()) }
      );

      act(() => {
        result.current.addProvider('openai');
      });

      expect(store.getState().createSelection.image).toHaveLength(1);
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('video tab', () => {
    it('derives a single Runway pill from key presence and video options', () => {
      const { result } = renderHookWithProviders(
        () => useCreateComposerSelection('video'),
        {
          preloadedState: makeState(makeSelection(), {
            apiKeys: { runway: configuredKey },
          }),
        }
      );

      expect(result.current.configs).toEqual([
        { providerId: 'runway', modelId: RUNWAY_DEFAULT_VIDEO_MODEL },
      ]);
      expect(result.current.configuredProviderIds).toEqual(['runway']);
    });

    it('shows no pill without a Runway key', () => {
      const { result } = renderHookWithProviders(
        () => useCreateComposerSelection('video'),
        { preloadedState: makeState(makeSelection(), { apiKeys: {} }) }
      );

      expect(result.current.configs).toEqual([]);
      expect(result.current.hasEnoughAIs).toBe(false);
    });

    it('routes model updates into videoOptions', () => {
      const { result, store } = renderHookWithProviders(
        () => useCreateComposerSelection('video'),
        {
          preloadedState: makeState(makeSelection(), {
            apiKeys: { runway: configuredKey },
          }),
        }
      );

      act(() => {
        result.current.updateConfig(0, { modelId: 'gen4_turbo' });
      });

      expect(store.getState().createSelection.videoOptions.modelId).toBe('gen4_turbo');
    });
  });

  describe('audio tab', () => {
    it('derives the pill model from the active operation and routes updates per operation', () => {
      const { result, store } = renderHookWithProviders(
        () => useCreateComposerSelection('audio'),
        {
          preloadedState: makeState(
            makeSelection({
              audioOptions: {
                operation: 'sound_effect',
                ttsModelId: ELEVENLABS_DEFAULT_TTS_MODEL,
                sfxModelId: ELEVENLABS_DEFAULT_SFX_MODEL,
                voiceId: 'voice-1',
                outputFormat: 'mp3_44100_128',
                promptInfluence: 0.3,
              },
            }),
            { apiKeys: { elevenlabs: configuredKey } }
          ),
        }
      );

      expect(result.current.configs).toEqual([
        { providerId: 'elevenlabs', modelId: ELEVENLABS_DEFAULT_SFX_MODEL },
      ]);

      act(() => {
        result.current.updateConfig(0, { modelId: 'custom-sfx-model' });
      });

      const { audioOptions } = store.getState().createSelection;
      expect(audioOptions.sfxModelId).toBe('custom-sfx-model');
      expect(audioOptions.ttsModelId).toBe(ELEVENLABS_DEFAULT_TTS_MODEL);
    });
  });
});
