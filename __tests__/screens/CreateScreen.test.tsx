/**
 * Tests for CreateScreen - Active image generation session screen
 * Note: Simplified tests due to component complexity
 */
import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import {
  getImageShareUti,
  loadBase64FromFileUri,
  persistImageUri,
} from '@/services/images/fileCache';
import * as Sharing from 'expo-sharing';
import { useVideoPlayer } from 'expo-video';
import CreateScreen from '@/screens/CreateScreen';

type MockRootState = {
  settings: {
    apiKeys: Record<string, string>;
  };
  create: {
    selectedStyle: string;
    selectedSize: string;
    selectedQuality: string;
    generationProgress: Record<string, string>;
    generationError?: string;
    isGenerating: boolean;
    gallery: Array<Record<string, unknown>>;
    galleryHydrated?: boolean;
    mediaGallery?: Array<Record<string, unknown>>;
    mediaGalleryHydrated?: boolean;
    mediaGeneration?: { video: null; audio: null };
    createActivity?: { status: string; hasUnseenActivity: boolean };
  };
};

// Mock dispatch and selector
const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
let mockRouteParams: Record<string, unknown>;

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: (state: MockRootState) => unknown) => mockUseSelector(selector),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: mockReplace,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('expo-media-library', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const ReactModule = jest.requireActual('react') as typeof import('react');
  const ReactNative = jest.requireActual('react-native') as typeof import('react-native');
  return {
    Ionicons: ({ name }: { name?: string }) => ReactModule.createElement(
      ReactNative.Text,
      { testID: `icon-${name}` },
      name
    ),
  };
});

jest.mock('@/components/molecules', () => {
  const ReactModule = jest.requireActual('react') as typeof import('react');
  const ReactNative = jest.requireActual('react-native') as typeof import('react-native');
  return {
    Typography: ({ children, testID }: { children: React.ReactNode; testID?: string }) =>
      ReactModule.createElement(ReactNative.Text, { testID }, children),
  };
});

jest.mock('@/components/organisms/chat/ImageRefinementModal', () => ({
  ImageRefinementModal: ({ visible, onRefine }: { visible: boolean; onRefine: (opts: { instructions: string; provider: string; modelId: string }) => void }) => {
    const ReactModule = jest.requireActual('react') as typeof import('react');
    const ReactNative = jest.requireActual('react-native') as typeof import('react-native');
    if (!visible) return null;
    return ReactModule.createElement(
      ReactNative.TouchableOpacity,
      {
        testID: 'refinement-submit',
        onPress: () => onRefine({ instructions: 'Add more detail', provider: 'openai', modelId: 'gpt-image-2' }),
      },
      ReactModule.createElement(ReactNative.Text, null, 'Submit Refinement')
    );
  },
}));

jest.mock('@/services/images/ImageService', () => ({
  ImageService: {
    generateImage: jest.fn().mockResolvedValue([{ url: 'file:///generated/image.png' }]),
  },
}));

jest.mock('@/services/APIKeyService', () => ({
  __esModule: true,
  default: {
    getKey: jest.fn().mockImplementation(async (provider: string) => `${provider}-key`),
  },
}));

jest.mock('@/config/create/stylePresets', () => ({
  buildEnhancedPrompt: (prompt: string) => prompt,
}));

jest.mock('@/config/create/sizeOptions', () => ({
  mapSizeToProvider: () => '1024x1024',
}));

jest.mock('@/config/imageGenerationModels', () => ({
  getImageInputModels: (provider: string) => {
    const modelsByProvider: Record<string, Array<{ id: string }>> = {
      openai: [{ id: 'gpt-image-2' }, { id: 'gpt-image-1-mini' }],
      google: [{ id: 'gemini-2.5-flash-image' }, { id: 'gemini-3-pro-image-preview' }],
      grok: [{ id: 'grok-imagine-image' }],
    };
    return modelsByProvider[provider] || [];
  },
  resolveImageModelId: (provider: string, modelId?: string) => {
    if (modelId) return modelId;
    const defaults: Record<string, string> = {
      openai: 'gpt-image-2',
      google: 'gemini-2.5-flash-image',
      grok: 'grok-imagine-image',
    };
    return defaults[provider];
  },
  supportsImageInput: (provider: string) => ['openai', 'google'].includes(provider),
  getImageProviderDisplayName: (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      google: 'Google',
      grok: 'Grok',
    };
    return names[provider] || provider;
  },
  getImageModelDisplayName: (_provider: string, modelId?: string) => modelId || 'Default Image Model',
}));

jest.mock('@/services/images/fileCache', () => ({
  loadBase64FromFileUri: jest.fn().mockResolvedValue('base64encodedimage'),
  persistImageUri: jest.fn().mockImplementation(async (uri: string) => uri),
  getImageMimeType: jest.fn().mockReturnValue('image/png'),
  getImageShareUti: jest.fn().mockReturnValue('public.png'),
  isDocumentImageUri: jest.fn().mockReturnValue(false),
}));

// Mock useFeatureAccess hook
const mockUseFeatureAccess = jest.fn();
jest.mock('@/hooks/useFeatureAccess', () => ({
  __esModule: true,
  default: () => mockUseFeatureAccess(),
  useFeatureAccess: () => mockUseFeatureAccess(),
}));

jest.mock('@/store/createSlice', () => ({
  selectCreateState: (state: MockRootState) => state.create,
  selectGallery: (state: MockRootState) => state.create.gallery,
  selectIsGenerating: (state: MockRootState) => state.create.isGenerating,
  hydrateMediaGallery: jest.fn(() => ({ type: 'create/hydrateMediaGallery' })),
  markCreateActivitySeen: jest.fn(() => ({ type: 'create/markCreateActivitySeen' })),
  startGeneration: jest.fn((providers) => ({ type: 'create/startGeneration', payload: providers })),
  updateGenerationProgress: jest.fn((payload) => ({ type: 'create/updateGenerationProgress', payload })),
  completeGeneration: jest.fn(() => ({ type: 'create/completeGeneration' })),
  addToGalleryWithCleanup: jest.fn((entry) => ({ type: 'create/addToGalleryWithCleanup', payload: entry })),
  removeFromGalleryWithCleanup: jest.fn((id) => ({ type: 'create/removeFromGalleryWithCleanup', payload: id })),
  removeFromMediaGalleryWithCleanup: jest.fn((id) => ({ type: 'create/removeFromMediaGalleryWithCleanup', payload: id })),
  persistGallery: jest.fn((gallery) => ({ type: 'create/persistGallery', payload: gallery })),
  persistMediaGallery: jest.fn((gallery) => ({ type: 'create/persistMediaGallery', payload: gallery })),
  updateGalleryEntryUri: jest.fn((payload) => ({ type: 'create/updateGalleryEntryUri', payload })),
}));
const mockedSharing = Sharing as jest.Mocked<typeof Sharing>;
const mockedGetImageShareUti = getImageShareUti as jest.Mock;
const mockedLoadBase64FromFileUri = loadBase64FromFileUri as jest.Mock;
const mockedPersistImageUri = persistImageUri as jest.Mock;
const mockedUseVideoPlayer = useVideoPlayer as jest.Mock;

type MockVideoPlayer = {
  play: jest.Mock;
  pause: jest.Mock;
  replay: jest.Mock;
  currentTime: number;
  __emit: (eventName: string, payload?: unknown) => void;
};

describe('CreateScreen', () => {
  const mockGalleryImage = {
    id: 'img_1',
    uri: 'file:///test/image1.png',
    prompt: 'A beautiful sunset',
    originalPrompt: 'A beautiful sunset',
    provider: 'openai',
    model: 'gpt-image-1',
    style: 'none',
    size: 'auto',
    quality: 'standard',
    createdAt: Date.now(),
    isRefinement: false,
    isUploaded: false,
  };

  const baseState = {
    settings: {
      apiKeys: { openai: 'key-1', google: 'key-2' },
    },
    create: {
      selectedStyle: 'none',
      selectedSize: 'auto',
      selectedQuality: 'standard',
      generationProgress: {},
      generationError: undefined,
      isGenerating: false,
      gallery: [mockGalleryImage],
      galleryHydrated: true,
      mediaGallery: [],
      mediaGalleryHydrated: true,
      mediaGeneration: { video: null, audio: null },
      createActivity: { status: 'idle', hasUnseenActivity: false },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockReplace.mockClear();
    mockRouteParams = {
      providers: ['openai'],
      initialPrompt: 'A beautiful sunset',
    };
    mockUseSelector.mockImplementation((selector) => selector(baseState));
    // Default to non-demo mode
    mockUseFeatureAccess.mockReturnValue({
      isDemo: false,
      isPremium: true,
      isInTrial: false,
      membershipStatus: 'premium',
      canAccessLiveAI: true,
    });
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const { getByText } = renderWithProviders(<CreateScreen />);
      expect(getByText('Create')).toBeTruthy();
    });

    it('shows provider name', () => {
      const { getAllByText } = renderWithProviders(<CreateScreen />);
      expect(getAllByText('OpenAI').length).toBeGreaterThan(0);
    });
  });

  describe('gallery display', () => {
    it('shows empty state when no images', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            gallery: [],
            isGenerating: false,
          },
        })
      );

      const { getByText } = renderWithProviders(<CreateScreen />);
      expect(getByText('No generated media yet')).toBeTruthy();
    });

    it('selects a focused generated media item when Gallery is opened from completion', async () => {
      const audioEntry = {
        id: 'media_audio_focus',
        mediaType: 'audio',
        providerId: 'elevenlabs',
        modelId: 'eleven_multilingual_v2',
        operation: 'text_to_speech',
        prompt: 'A focused audio clip',
        uri: 'file:///test/focused-audio.mp3',
        mimeType: 'audio/mpeg',
        status: 'succeeded',
        createdAt: Date.now(),
      };
      mockRouteParams = { focusMediaId: audioEntry.id };
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            gallery: [],
            mediaGallery: [audioEntry],
          },
        })
      );

      const { getByText } = renderWithProviders(<CreateScreen />);

      await waitFor(() => {
        expect(getByText('Save')).toBeTruthy();
      });
    });

    it('hides selected video media actions while playback is active', async () => {
      const videoEntry = {
        id: 'media_video_1',
        mediaType: 'video',
        providerId: 'runway',
        modelId: 'gen4.5',
        operation: 'text_to_video',
        prompt: 'A test video',
        uri: 'file:///test/video.mp4',
        mimeType: 'video/mp4',
        durationSeconds: 5,
        status: 'ready',
        createdAt: Date.now(),
      };

      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            gallery: [],
            mediaGallery: [videoEntry],
          },
        })
      );

      const { getByLabelText, getByText, queryByText } = renderWithProviders(<CreateScreen />);

      fireEvent.press(getByLabelText('Video generated by runway'));
      expect(getByText('Save')).toBeTruthy();

      const player = mockedUseVideoPlayer.mock.results[0].value as MockVideoPlayer;

      act(() => {
        player.__emit('playingChange', { isPlaying: true });
      });

      await waitFor(() => {
        expect(queryByText('Save')).toBeNull();
      });

      act(() => {
        player.__emit('playingChange', { isPlaying: false });
      });

      await waitFor(() => {
        expect(getByText('Save')).toBeTruthy();
      });

      act(() => {
        player.__emit('playingChange', { isPlaying: true });
      });

      await waitFor(() => {
        expect(queryByText('Save')).toBeNull();
      });

      act(() => {
        player.__emit('playToEnd');
      });

      await waitFor(() => {
        expect(getByText('Save')).toBeTruthy();
      });
    });

    it('uses native video controls only while playback is inactive', async () => {
      const videoEntry = {
        id: 'media_video_controls',
        mediaType: 'video',
        providerId: 'runway',
        modelId: 'gen4.5',
        operation: 'text_to_video',
        prompt: 'A test video',
        uri: 'file:///test/video-controls.mp4',
        mimeType: 'video/mp4',
        durationSeconds: 5,
        status: 'ready',
        createdAt: Date.now(),
      };

      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            gallery: [],
            mediaGallery: [videoEntry],
          },
        })
      );

      const { getByLabelText, getByTestId } = renderWithProviders(<CreateScreen />);
      const player = mockedUseVideoPlayer.mock.results[0].value as MockVideoPlayer;
      const getVideoSurface = () => getByTestId('gallery-video-surface-media_video_controls');

      expect(getVideoSurface().props.nativeControls).toBe(true);
      expect(getVideoSurface().props.fullscreenOptions).toEqual({ enable: false });
      expect(getVideoSurface().props.showsTimecodes).toBe(false);
      expect(getVideoSurface().props.buttonOptions).toMatchObject({
        showBottomBar: false,
        showSeekBackward: false,
        showSeekForward: false,
        showSettings: false,
        showNext: false,
        showPrevious: false,
        showSubtitles: false,
      });

      act(() => {
        player.__emit('playingChange', { isPlaying: true });
      });

      await waitFor(() => {
        expect(getVideoSurface().props.nativeControls).toBe(false);
        expect(getByLabelText('Pause video')).toBeTruthy();
      });

      fireEvent.press(getByLabelText('Pause video'));
      expect(player.pause).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(getVideoSurface().props.nativeControls).toBe(true);
      });

      act(() => {
        player.__emit('playingChange', { isPlaying: true });
      });

      await waitFor(() => {
        expect(getVideoSurface().props.nativeControls).toBe(false);
      });

      act(() => {
        player.__emit('playToEnd');
      });

      await waitFor(() => {
        expect(getVideoSurface().props.nativeControls).toBe(true);
      });
    });
  });

  describe('refinement flow', () => {
    it('normalizes remote gallery images before starting refinement', async () => {
      mockedPersistImageUri.mockResolvedValueOnce('/documents/images/refine-source.png');
      mockedLoadBase64FromFileUri.mockResolvedValueOnce('remote-image-base64');

      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            gallery: [
              {
                ...mockGalleryImage,
                uri: 'https://example.com/generated.png',
                model: 'gpt-image-2',
              },
            ],
          },
        })
      );

      const { getByLabelText, getByText, getByTestId } = renderWithProviders(<CreateScreen />);

      fireEvent.press(getByLabelText('Image generated by OpenAI'));
      fireEvent.press(getByText('Refine'));
      fireEvent.press(getByTestId('refinement-submit'));

      await waitFor(() => {
        expect(mockedPersistImageUri).toHaveBeenCalledWith(
          'https://example.com/generated.png',
          { prefix: 'gallery' }
        );
        expect(mockedLoadBase64FromFileUri).toHaveBeenCalledWith('/documents/images/refine-source.png');
        expect(mockReplace).toHaveBeenCalledWith('CreateSession', expect.objectContaining({
          providers: ['openai'],
          selectedModels: { openai: 'gpt-image-2' },
          sourceImage: 'remote-image-base64',
        }));
      });
    });
  });

  describe('share flow', () => {
    it('shares the resolved local image with native sharing metadata', async () => {
      mockedPersistImageUri.mockResolvedValueOnce('file:///documents/images/shared.png');
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            gallery: [
              {
                ...mockGalleryImage,
                model: 'gpt-image-2',
              },
            ],
          },
        })
      );

      const { getByLabelText, getByText } = renderWithProviders(<CreateScreen />);

      fireEvent.press(getByLabelText('Image generated by OpenAI'));
      fireEvent.press(getByText('Share'));

      await waitFor(() => {
        expect(mockedSharing.shareAsync).toHaveBeenCalledWith(
          'file:///documents/images/shared.png',
          expect.objectContaining({
            mimeType: 'image/png',
            ...(Platform.OS === 'ios' ? { UTI: 'public.png' } : {}),
          })
        );
      });

      if (Platform.OS === 'ios') {
        expect(mockedGetImageShareUti).toHaveBeenCalledWith('file:///documents/images/shared.png');
      }
    });
  });

  describe('generation progress', () => {
    it('shows generation progress during generation', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            isGenerating: true,
            generationProgress: { openai: 'generating' },
          },
        })
      );

      const { getAllByText } = renderWithProviders(<CreateScreen />);
      expect(getAllByText('OpenAI').length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('shows error message when present', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            generationError: 'API rate limit exceeded',
          },
        })
      );

      const { getByText } = renderWithProviders(<CreateScreen />);
      expect(getByText('API rate limit exceeded')).toBeTruthy();
    });
  });

  describe('demo mode guards', () => {
    it('uses isDemo from useFeatureAccess hook', () => {
      // Verify that the component renders when isDemo is false
      mockUseFeatureAccess.mockReturnValue({
        isDemo: false,
        isPremium: true,
        isInTrial: false,
        membershipStatus: 'premium',
        canAccessLiveAI: true,
      });

      const { getByText } = renderWithProviders(<CreateScreen />);
      expect(getByText('Create')).toBeTruthy();
    });

    it('renders in demo mode without crashing', () => {
      mockUseFeatureAccess.mockReturnValue({
        isDemo: true,
        isPremium: false,
        isInTrial: false,
        membershipStatus: 'demo',
        canAccessLiveAI: false,
      });

      const { getByText } = renderWithProviders(<CreateScreen />);
      expect(getByText('Create')).toBeTruthy();
    });
  });
});
