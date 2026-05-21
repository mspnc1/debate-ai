/**
 * Tests for CreateSetupScreen - Setup screen for AI image generation
 */
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils/renderWithProviders';

// Mock dispatch and selector
const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();
const mockUseFeatureAccess = jest.fn();
const mockNavigate = jest.fn();
const mockGetApiKey = jest.fn();
const mockListElevenLabsOptions = jest.fn();
let mockDynamicAISelectorProps: any;
let mockGradientButtonProps: any;

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: (state: any) => any) => mockUseSelector(selector),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
  useFocusEffect: (cb: () => (() => void) | void) => {
    const { useEffect } = require('react');
    useEffect(() => {
      const cleanup = cb();
      return cleanup;
    }, [cb]);
  },
}));

jest.mock('@/hooks/useGreeting', () => ({
  useGreeting: () => ({
    timeBasedGreeting: 'Create something',
    welcomeMessage: 'Pick your AI',
    greeting: {
      timeBasedGreeting: 'Create something',
      welcomeMessage: 'Pick your AI',
    },
  }),
}));

jest.mock('@/hooks/useFeatureAccess', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseFeatureAccess(...args),
  useFeatureAccess: (...args: unknown[]) => mockUseFeatureAccess(...args),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name),
  };
});

jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Slider = (props: any) => React.createElement(View, props);
  return { __esModule: true, default: Slider };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/organisms', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    Header: (props: any) =>
      React.createElement(
        View,
        { testID: 'header-container' },
        React.createElement(Text, { testID: 'header' }, props.title),
        props.rightElement
      ),
    HeaderActions: () => null,
    DynamicAISelector: (props: any) => {
      mockDynamicAISelectorProps = props;
      return React.createElement(Text, { testID: 'ai-selector' }, 'AI Selector');
    },
    ImageRefinementModal: () => null,
  };
});

let mockPromptHeroInputProps: any;
let mockAdvancedOptionsSectionProps: any;

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { Text, TextInput, TouchableOpacity, View } = require('react-native');
  return {
    Typography: ({ children, testID }: { children: React.ReactNode; testID?: string }) =>
      React.createElement(Text, { testID }, children),
    Badge: ({ label }: { label: string }) =>
      React.createElement(Text, { testID: `badge-${label}` }, label),
    GradientButton: (props: any) => {
      mockGradientButtonProps = props;
      return React.createElement(
        TouchableOpacity,
        { testID: 'gradient-button', onPress: props.onPress, disabled: props.disabled },
        React.createElement(Text, null, props.title)
      );
    },
    HeaderIcon: (props: any) =>
      React.createElement(TouchableOpacity, { testID: props.testID, onPress: props.onPress }),
    SectionHeader: (props: any) =>
      React.createElement(Text, { testID: 'section-header' }, props.title),
    SheetHeader: (props: any) =>
      React.createElement(
        View,
        { testID: 'sheet-header' },
        React.createElement(Text, null, props.title),
        React.createElement(TouchableOpacity, { testID: 'sheet-header-close', onPress: props.onClose })
      ),
    PromptHeroInput: (props: any) => {
      mockPromptHeroInputProps = props;
      return React.createElement(TextInput, {
        testID: props.testID || 'prompt-hero-input',
        value: props.value,
        onChangeText: props.onChangeText,
        placeholder: props.placeholder,
        maxLength: props.maxLength,
      });
    },
    AdvancedOptionsSection: (props: any) => {
      mockAdvancedOptionsSectionProps = props;
      return React.createElement(View, { testID: props.testID || 'advanced-options-section' },
        React.createElement(Text, null, 'Advanced Options')
      );
    },
    SegmentedControl: (props: any) =>
      React.createElement(View, { testID: 'segmented-control' },
        props.options.map((option: any) =>
          React.createElement(
            TouchableOpacity,
            {
              key: option.value,
              testID: `segment-${option.value}`,
              onPress: () => props.onChange(option.value),
            },
            React.createElement(Text, null, option.label)
          )
        )
      ),
  };
});

jest.mock('@/config/aiProviders', () => ({
  AI_PROVIDERS: [
    { id: 'openai', name: 'OpenAI', color: '#10A37F', enabled: true },
    { id: 'google', name: 'Google', color: '#4285F4', enabled: true },
    { id: 'grok', name: 'Grok', color: '#000000', enabled: true },
  ],
}));

jest.mock('@/config/create/stylePresets', () => ({
  STYLE_PRESETS: [
    { id: 'none', label: 'None', icon: 'close-circle-outline', promptSuffix: '' },
    { id: 'photo', label: 'Photo', icon: 'camera-outline', promptSuffix: 'Photorealistic' },
  ],
}));

jest.mock('@/config/create/sizeOptions', () => ({
  SIZE_OPTIONS: [
    { id: 'auto', label: 'Auto', icon: 'resize-outline', preview: 'Auto' },
    { id: 'square', label: 'Square', icon: 'square-outline', preview: '1:1' },
  ],
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
  supportsImageGeneration: (provider: string) => ['openai', 'google', 'grok'].includes(provider),
  supportsImageInput: (provider: string) => ['openai', 'google'].includes(provider),
  getImageProviderDisplayName: (provider: string) => {
    const names: Record<string, string> = { openai: 'OpenAI', google: 'Google', grok: 'Grok' };
    return names[provider] || provider;
  },
}));

jest.mock('@/utils/aiProviderAssets', () => ({
  getAIProviderIcon: () => ({ iconType: 'letter', icon: 'O' }),
}));

jest.mock('@/store/createSlice', () => ({
  setPrompt: jest.fn((prompt) => ({ type: 'create/setPrompt', payload: prompt })),
  setStyle: jest.fn((style) => ({ type: 'create/setStyle', payload: style })),
  setSize: jest.fn((size) => ({ type: 'create/setSize', payload: size })),
  setQuality: jest.fn((quality) => ({ type: 'create/setQuality', payload: quality })),
  setSelectedProviders: jest.fn((providers) => ({ type: 'create/setSelectedProviders', payload: providers })),
  setActiveCreateTab: jest.fn((tab) => ({ type: 'create/setActiveCreateTab', payload: tab })),
  markCreateActivitySeen: jest.fn(() => ({ type: 'create/markCreateActivitySeen' })),
  hydrateGallery: jest.fn(() => ({ type: 'create/hydrateGallery' })),
  hydrateMediaGallery: jest.fn(() => ({ type: 'create/hydrateMediaGallery' })),
  generateCreateVideo: jest.fn((payload) => ({ type: 'create/generateCreateVideo', payload, unwrap: jest.fn() })),
  generateCreateAudio: jest.fn((payload) => ({ type: 'create/generateCreateAudio', payload, unwrap: jest.fn() })),
  selectCreateState: (state: any) => state.create,
}));

jest.mock('@/services/APIKeyService', () => ({
  __esModule: true,
  default: {
    getKey: (...args: unknown[]) => mockGetApiKey(...args),
  },
}));

jest.mock('@/services/media/MediaGenerationService', () => ({
  __esModule: true,
  default: {
    listElevenLabsOptions: (...args: unknown[]) => mockListElevenLabsOptions(...args),
  },
}));

const CreateSetupScreen = require('@/screens/CreateSetupScreen').default;

describe('CreateSetupScreen', () => {
  const baseState = {
    settings: {
      apiKeys: { openai: 'key-1', google: 'key-2', grok: 'key-3' },
      verifiedProviders: ['openai', 'google', 'grok'],
    },
    create: {
      selectedProviders: [],
      currentPrompt: '',
      selectedStyle: 'none',
      selectedSize: 'auto',
      selectedQuality: 'standard',
      gallery: [],
      galleryHydrated: true,
      mediaGallery: [],
      mediaGalleryHydrated: true,
      mediaGeneration: { video: null, audio: null },
      activeTab: 'image',
      createActivity: { status: 'idle', hasUnseenActivity: false },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    mockNavigate.mockClear();
    mockDynamicAISelectorProps = undefined;
    mockGradientButtonProps = undefined;
    mockPromptHeroInputProps = undefined;
    mockAdvancedOptionsSectionProps = undefined;
    mockDispatch.mockImplementation((action) => action);
    mockUseSelector.mockImplementation((selector) => selector(baseState));
    mockUseFeatureAccess.mockReturnValue({ membershipStatus: 'premium', isDemo: false, isPremium: true });
    mockGetApiKey.mockResolvedValue('eleven-key');
    mockListElevenLabsOptions.mockResolvedValue({
      voices: [
        { id: 'voice_a', name: 'Narrator A', description: 'Warm narration' },
        { id: 'voice_b', name: 'Narrator B', description: 'Bright narration' },
      ],
      voiceHasMore: false,
      voiceNextPageToken: null,
      voiceTotalCount: 2,
      models: [
        {
          id: 'eleven_v3',
          label: 'Eleven v3',
          description: 'Expressive TTS model',
          mediaType: 'audio',
          operations: ['text_to_speech'],
        },
        {
          id: 'eleven_multilingual_v2',
          label: 'Multilingual v2',
          description: 'Default high-quality TTS model',
          mediaType: 'audio',
          operations: ['text_to_speech'],
        },
        {
          id: 'eleven_text_to_sound_v2',
          label: 'Text to Sound v2',
          description: 'Default sound effects model',
          mediaType: 'audio',
          operations: ['sound_effect'],
        },
      ],
    });
  });

  describe('rendering', () => {
    it('renders header with correct title', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('header')).toBeTruthy();
    });

    it('renders AI selector', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('ai-selector')).toBeTruthy();
    });

    it('renders generate button', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('gradient-button')).toBeTruthy();
    });

    it('renders PromptHeroInput', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('create-prompt-input')).toBeTruthy();
    });

    it('renders AdvancedOptionsSection', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('create-advanced-options')).toBeTruthy();
    });
  });

  describe('demo mode gating', () => {
    it('shows upgrade gate for demo users', () => {
      mockUseFeatureAccess.mockReturnValue({ membershipStatus: 'demo', isDemo: true, isPremium: false });
      const { getByText } = renderWithProviders(<CreateSetupScreen />);
      expect(getByText('Create Mode')).toBeTruthy();
      expect(getByText('Upgrade to Premium')).toBeTruthy();
    });

    it('allows trial users to access (trial = premium access)', () => {
      mockUseFeatureAccess.mockReturnValue({ membershipStatus: 'trial', isDemo: false, isPremium: true });
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('ai-selector')).toBeTruthy();
    });

    it('allows premium users to access', () => {
      mockUseFeatureAccess.mockReturnValue({ membershipStatus: 'premium', isDemo: false, isPremium: true });
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('ai-selector')).toBeTruthy();
    });
  });

  describe('AI provider selection', () => {
    it('passes correct props to DynamicAISelector', () => {
      renderWithProviders(<CreateSetupScreen />);
      expect(mockDynamicAISelectorProps).toBeDefined();
      expect(mockDynamicAISelectorProps.maxAIs).toBe(3);
      expect(mockDynamicAISelectorProps.getBadge).toBeUndefined();
    });

    it('keeps the image refinement explainer text visible', () => {
      const { getByText, getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('badge-img2img')).toBeTruthy();
      expect(getByText('Supports image refinement')).toBeTruthy();
    });
  });

  describe('PromptHeroInput integration', () => {
    it('passes correct props to PromptHeroInput', () => {
      renderWithProviders(<CreateSetupScreen />);
      expect(mockPromptHeroInputProps).toBeDefined();
      expect(mockPromptHeroInputProps.maxLength).toBe(4000);
      expect(mockPromptHeroInputProps.value).toBe('');
    });

    it('passes current prompt value to PromptHeroInput', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: { ...baseState.create, currentPrompt: 'Test prompt' },
        })
      );

      renderWithProviders(<CreateSetupScreen />);
      expect(mockPromptHeroInputProps.value).toBe('Test prompt');
    });

    it('dispatches setPrompt when text changes', () => {
      renderWithProviders(<CreateSetupScreen />);
      mockPromptHeroInputProps.onChangeText('New prompt');
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'create/setPrompt', payload: 'New prompt' });
    });
  });

  describe('AdvancedOptionsSection integration', () => {
    it('passes correct props to AdvancedOptionsSection', () => {
      renderWithProviders(<CreateSetupScreen />);
      expect(mockAdvancedOptionsSectionProps).toBeDefined();
      expect(mockAdvancedOptionsSectionProps.selectedSize).toBe('auto');
      expect(mockAdvancedOptionsSectionProps.selectedQuality).toBe('standard');
    });

    it('passes updated size to AdvancedOptionsSection', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: { ...baseState.create, selectedSize: 'square' },
        })
      );

      renderWithProviders(<CreateSetupScreen />);
      expect(mockAdvancedOptionsSectionProps.selectedSize).toBe('square');
    });

    it('passes updated quality to AdvancedOptionsSection', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: { ...baseState.create, selectedQuality: 'hd' },
        })
      );

      renderWithProviders(<CreateSetupScreen />);
      expect(mockAdvancedOptionsSectionProps.selectedQuality).toBe('hd');
    });

    it('dispatches setSize when size changes', () => {
      renderWithProviders(<CreateSetupScreen />);
      mockAdvancedOptionsSectionProps.onSizeChange('portrait');
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'create/setSize', payload: 'portrait' });
    });

    it('dispatches setQuality when quality changes', () => {
      renderWithProviders(<CreateSetupScreen />);
      mockAdvancedOptionsSectionProps.onQualityChange('hd');
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'create/setQuality', payload: 'hd' });
    });
  });

  describe('generation', () => {
    it('disables generate button when no prompt', () => {
      renderWithProviders(<CreateSetupScreen />);
      expect(mockGradientButtonProps.disabled).toBe(true);
    });

    it('enables generate button when prompt and providers are set', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            currentPrompt: 'A beautiful sunset',
            selectedProviders: ['openai'],
          },
        })
      );

      renderWithProviders(<CreateSetupScreen />);
      expect(mockGradientButtonProps.disabled).toBe(false);
    });

    it('navigates to CreateSession on generate', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            currentPrompt: 'A beautiful sunset',
            selectedProviders: ['openai', 'google'],
          },
        })
      );

      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      fireEvent.press(getByTestId('gradient-button'));

      expect(mockNavigate).toHaveBeenCalledWith('CreateSession', {
        providers: ['openai', 'google'],
        selectedModels: {
          openai: 'gpt-image-2',
          google: 'gemini-2.5-flash-image',
        },
        initialPrompt: 'A beautiful sunset',
      });
    });
  });

  describe('media generation rail', () => {
    it('keeps audio model and format controls collapsed by default', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            activeTab: 'audio',
          },
        })
      );

      const { getByTestId, queryByTestId } = renderWithProviders(<CreateSetupScreen />);

      expect(getByTestId('create-audio-voice-selector')).toBeTruthy();
      expect(getByTestId('create-audio-settings-toggle')).toBeTruthy();
      expect(queryByTestId('create-audio-model-grid')).toBeNull();
      expect(queryByTestId('create-audio-format-grid')).toBeNull();
      expect(queryByTestId('create-audio-model-selector')).toBeNull();
      expect(queryByTestId('create-audio-format-selector')).toBeNull();
    });

    it('opens audio settings and updates model and format through picker rows', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            activeTab: 'audio',
          },
        })
      );

      const { getByTestId, getByText, queryByTestId } = renderWithProviders(<CreateSetupScreen />);

      fireEvent.press(getByTestId('create-audio-settings-toggle'));
      expect(getByTestId('create-audio-settings-content')).toBeTruthy();
      expect(getByTestId('create-audio-model-selector')).toBeTruthy();
      expect(getByTestId('create-audio-format-selector')).toBeTruthy();

      fireEvent.press(getByTestId('create-audio-model-selector'));
      expect(getByText('Select Model')).toBeTruthy();
      fireEvent.press(getByTestId('create-audio-picker-option-eleven_v3'));
      expect(queryByTestId('create-audio-picker-modal')).toBeNull();
      expect(getByText('Eleven v3')).toBeTruthy();

      fireEvent.press(getByTestId('create-audio-format-selector'));
      expect(getByText('Select Format')).toBeTruthy();
      fireEvent.press(getByTestId('create-audio-picker-option-wav_44100'));
      expect(queryByTestId('create-audio-picker-modal')).toBeNull();
      expect(getByText('WAV 44.1 kHz')).toBeTruthy();
    });

    it('selects a loaded ElevenLabs voice from the compact voice picker', async () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          settings: {
            ...baseState.settings,
            apiKeys: { ...baseState.settings.apiKeys, elevenlabs: 'eleven-key' },
          },
          create: {
            ...baseState.create,
            activeTab: 'audio',
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      await waitFor(() => expect(getByText('Narrator A')).toBeTruthy());
      fireEvent.press(getByTestId('create-audio-voice-selector'));
      fireEvent.press(getByTestId('create-audio-picker-option-voice_b'));

      expect(getByText('Narrator B')).toBeTruthy();
    });

    it('does not truncate the loaded ElevenLabs voice list to the first twelve voices', async () => {
      mockListElevenLabsOptions.mockResolvedValueOnce({
        voices: Array.from({ length: 14 }, (_, index) => ({
          id: `voice_${index + 1}`,
          name: `Voice ${index + 1}`,
          description: `Voice option ${index + 1}`,
        })),
        voiceHasMore: false,
        voiceNextPageToken: null,
        voiceTotalCount: 14,
        models: [],
      });
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          settings: {
            ...baseState.settings,
            apiKeys: { ...baseState.settings.apiKeys, elevenlabs: 'eleven-key' },
          },
          create: {
            ...baseState.create,
            activeTab: 'audio',
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      await waitFor(() => expect(getByText('Voice 1')).toBeTruthy());
      fireEvent.press(getByTestId('create-audio-voice-selector'));
      fireEvent.changeText(getByTestId('create-audio-voice-search-input'), 'Voice 14');

      expect(getByText('Voice 14')).toBeTruthy();
    });

    it('loads the next ElevenLabs voice page from the picker', async () => {
      mockListElevenLabsOptions
        .mockResolvedValueOnce({
          voices: [{ id: 'voice_a', name: 'Narrator A', description: 'Warm narration' }],
          voiceHasMore: true,
          voiceNextPageToken: 'next-page',
          voiceTotalCount: 2,
          models: [],
        })
        .mockResolvedValueOnce({
          voices: [{ id: 'voice_c', name: 'Narrator C', description: 'Low narration' }],
          voiceHasMore: false,
          voiceNextPageToken: null,
          voiceTotalCount: 2,
          models: [],
        });
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          settings: {
            ...baseState.settings,
            apiKeys: { ...baseState.settings.apiKeys, elevenlabs: 'eleven-key' },
          },
          create: {
            ...baseState.create,
            activeTab: 'audio',
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      await waitFor(() => expect(getByText('Narrator A')).toBeTruthy());
      fireEvent.press(getByTestId('create-audio-voice-selector'));
      fireEvent.press(getByTestId('create-audio-load-more-voices'));

      await waitFor(() => expect(getByText('Narrator C')).toBeTruthy());
      expect(mockListElevenLabsOptions).toHaveBeenLastCalledWith('eleven-key', expect.objectContaining({
        nextPageToken: 'next-page',
      }));
    });

    it('keeps sound effect controls inside audio settings', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            activeTab: 'audio',
          },
        })
      );

      const { getByTestId, getByText, queryByTestId } = renderWithProviders(<CreateSetupScreen />);

      fireEvent.press(getByTestId('segment-sound_effect'));
      expect(queryByTestId('create-audio-voice-selector')).toBeNull();
      expect(queryByTestId('create-audio-duration-slider')).toBeNull();

      fireEvent.press(getByTestId('create-audio-settings-toggle'));
      fireEvent(getByTestId('create-audio-duration-slider'), 'valueChange', 5);
      fireEvent(getByTestId('create-audio-influence-slider'), 'valueChange', 3);

      expect(getByText('10s')).toBeTruthy();
      expect(getByText('Influence 0.7')).toBeTruthy();
    });

    it('dispatches the existing audio generation payload after picker selections', async () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          settings: {
            ...baseState.settings,
            apiKeys: { ...baseState.settings.apiKeys, elevenlabs: 'eleven-key' },
          },
          create: {
            ...baseState.create,
            activeTab: 'audio',
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      await waitFor(() => expect(getByText('Narrator A')).toBeTruthy());
      fireEvent.changeText(getByTestId('create-audio-prompt-input'), 'Read this line');

      fireEvent.press(getByTestId('create-audio-settings-toggle'));
      fireEvent.press(getByTestId('create-audio-model-selector'));
      fireEvent.press(getByTestId('create-audio-picker-option-eleven_v3'));
      fireEvent.press(getByTestId('create-audio-format-selector'));
      fireEvent.press(getByTestId('create-audio-picker-option-wav_44100'));

      fireEvent.press(getByTestId('gradient-button'));

      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: 'create/generateCreateAudio',
        payload: {
          prompt: 'Read this line',
          operation: 'text_to_speech',
          modelId: 'eleven_v3',
          voiceId: 'voice_a',
          outputFormat: 'wav_44100',
          durationSeconds: undefined,
          promptInfluence: undefined,
        },
      }));
    });

    it('shows the sticky video running rail from media generation state', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          settings: {
            ...baseState.settings,
            apiKeys: { ...baseState.settings.apiKeys, runway: 'runway-key' },
            verifiedProviders: [...baseState.settings.verifiedProviders, 'runway'],
          },
          create: {
            ...baseState.create,
            activeTab: 'video',
            mediaGeneration: {
              video: {
                id: 'media_running',
                mediaType: 'video',
                providerId: 'runway',
                operation: 'text_to_video',
                modelId: 'gen4.5',
                prompt: 'A city timelapse',
                status: 'running',
                phase: 'rendering',
                startedAt: Date.now(),
                message: 'Rendering video...',
              },
              audio: null,
            },
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      expect(getByTestId('create-video-rail')).toBeTruthy();
      expect(getByTestId('create-video-status')).toBeTruthy();
      expect(getByText('Rendering video...')).toBeTruthy();
      expect(getByText('Generating Video...')).toBeTruthy();
    });

    it('shows a video completion CTA that opens Gallery focused on the result', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          settings: {
            ...baseState.settings,
            apiKeys: { ...baseState.settings.apiKeys, runway: 'runway-key' },
            verifiedProviders: [...baseState.settings.verifiedProviders, 'runway'],
          },
          create: {
            ...baseState.create,
            activeTab: 'video',
            mediaGeneration: { video: null, audio: null },
            lastMediaGenerationResult: {
              id: 'media_video_done',
              mediaType: 'video',
              status: 'succeeded',
              message: 'Video generation complete.',
              completedAt: Date.now(),
            },
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      expect(getByText('Video generation complete.')).toBeTruthy();
      fireEvent.press(getByTestId('create-video-gallery-cta'));

      expect(mockNavigate).toHaveBeenCalledWith('CreateSession', { focusMediaId: 'media_video_done' });
    });

    it('uses the same sticky rail pattern for audio completion', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            activeTab: 'audio',
            mediaGeneration: { video: null, audio: null },
            lastMediaGenerationResult: {
              id: 'media_audio_done',
              mediaType: 'audio',
              status: 'succeeded',
              message: 'Audio generation complete.',
              completedAt: Date.now(),
            },
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      expect(getByTestId('create-audio-rail')).toBeTruthy();
      expect(getByText('Audio generation complete.')).toBeTruthy();
      fireEvent.press(getByTestId('create-audio-gallery-cta'));

      expect(mockNavigate).toHaveBeenCalledWith('CreateSession', { focusMediaId: 'media_audio_done' });
    });

    it('maps the video duration slider index to allowed duration values', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          settings: {
            ...baseState.settings,
            apiKeys: { ...baseState.settings.apiKeys, runway: 'runway-key' },
            verifiedProviders: [...baseState.settings.verifiedProviders, 'runway'],
          },
          create: {
            ...baseState.create,
            activeTab: 'video',
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      fireEvent(getByTestId('create-video-duration-slider'), 'valueChange', 8);

      expect(getByText('10s')).toBeTruthy();
    });
  });

  describe('gallery hydration', () => {
    it('dispatches hydrateGallery on mount when not hydrated', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: { ...baseState.create, galleryHydrated: false },
        })
      );

      renderWithProviders(<CreateSetupScreen />);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'create/hydrateGallery' });
    });

    it('does NOT dispatch hydrateGallery in demo mode', () => {
      mockUseFeatureAccess.mockReturnValue({ membershipStatus: 'demo', isDemo: true, isPremium: false });
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: { ...baseState.create, galleryHydrated: false },
        })
      );

      renderWithProviders(<CreateSetupScreen />);
      expect(mockDispatch).not.toHaveBeenCalledWith({ type: 'create/hydrateGallery' });
    });
  });

  describe('gallery access', () => {
    it('navigates to CreateSession when gallery button is pressed (premium user)', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: { ...baseState.create, gallery: [{ id: '1' }] },
        })
      );

      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      fireEvent.press(getByTestId('header-gallery-button'));

      expect(mockNavigate).toHaveBeenCalledWith('CreateSession', {});
    });

    // Note: Demo users now see the upgrade gate before reaching the gallery button,
    // so gallery-specific demo tests are no longer applicable
  });
});
