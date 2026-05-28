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
const mockGenerateCreateImages = jest.fn((payload) => ({
  type: 'create/generateCreateImages',
  payload,
  unwrap: jest.fn().mockResolvedValue({ ids: ['img_done'], entries: [], failedProviders: [] }),
}));
let mockGradientButtonProps: any;

type MockSelectorAI = {
  id: string;
  provider: string;
  name: string;
};

type MockDynamicAISelectorProps = {
  configuredAIs: MockSelectorAI[];
  hideAddAI?: boolean;
  hideStartButton?: boolean;
  hideHeaderTitle?: boolean;
  onToggleAI: (ai: MockSelectorAI) => void;
  onAddAI: () => void;
  getIsDisabled?: (ai: MockSelectorAI) => boolean;
};

let mockDynamicAISelectorProps: MockDynamicAISelectorProps | undefined;

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
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    Header: (props: any) =>
      React.createElement(
        View,
        { testID: 'header-container' },
        React.createElement(Text, { testID: 'header' }, props.title),
        props.rightElement
      ),
    HeaderActions: () => null,
    DynamicAISelector: (props: MockDynamicAISelectorProps) => {
      mockDynamicAISelectorProps = props;
      return React.createElement(
        View,
        { testID: 'dynamic-ai-selector' },
        props.configuredAIs.map((ai) =>
          React.createElement(
            TouchableOpacity,
            {
              key: ai.id,
              testID: `create-model-card-${ai.provider}`,
              disabled: props.getIsDisabled?.(ai),
              onPress: () => props.onToggleAI(ai),
            },
            React.createElement(Text, null, ai.name)
          )
        ),
        !props.hideAddAI
          ? React.createElement(
              TouchableOpacity,
              { testID: 'create-add-ai', onPress: props.onAddAI },
              React.createElement(Text, null, '+ Add AI')
            )
          : null
      );
    },
    ImageRefinementModal: () => null,
  };
});

jest.mock('@/components/organisms/common/AIAvatar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { AIAvatar: (props: any) => React.createElement(View, { testID: `ai-avatar-${props.providerId || ''}` }) };
});

let mockPromptHeroInputProps: any;

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
    InfoButton: (props: any) =>
      React.createElement(TouchableOpacity, { testID: props.testID || `info-${props.topicId}` }),
    CollapsibleCard: (props: any) =>
      React.createElement(
        View,
        { testID: props.testID },
        React.createElement(
          TouchableOpacity,
          { testID: props.testID ? `${props.testID}-toggle` : undefined, onPress: props.onToggle },
          React.createElement(Text, null, props.title)
        ),
        props.expanded
          ? React.createElement(View, { testID: props.testID ? `${props.testID}-content` : undefined }, props.children)
          : null
      ),
    ImageModelSelector: () =>
      React.createElement(View, { testID: 'image-model-selector' }),
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

const mockImageModels: Record<string, Array<Record<string, unknown>>> = {
  openai: [
    {
      id: 'gpt-image-2',
      displayName: 'GPT Image 2',
      supportsImageInput: true,
      supportsMultipleReferenceImages: true,
      maxImagesPerRequest: 4,
      maxReferenceImages: 5,
      qualityOptions: ['auto', 'low', 'medium', 'high'],
      outputFormats: ['png', 'jpeg', 'webp'],
      supportsOutputCompression: true,
      backgroundOptions: ['auto', 'opaque'],
      moderationOptions: ['auto', 'low'],
      resolutions: ['1K', '2K'],
    },
    {
      id: 'dall-e-3',
      displayName: 'DALL-E 3',
      supportsImageInput: false,
      maxImagesPerRequest: 1,
      maxReferenceImages: 0,
      qualityOptions: ['standard', 'hd'],
      outputFormats: ['png'],
      backgroundOptions: ['auto'],
      moderationOptions: ['auto'],
      resolutions: [],
    },
  ],
  google: [
    {
      id: 'gemini-2.5-flash-image',
      displayName: 'Gemini Flash Image',
      supportsImageInput: true,
      maxImagesPerRequest: 1,
      maxReferenceImages: 1,
      qualityOptions: ['auto'],
      outputFormats: ['png'],
      backgroundOptions: ['auto'],
      moderationOptions: ['auto'],
      resolutions: [],
    },
  ],
  grok: [
    {
      id: 'grok-imagine-image',
      displayName: 'Grok Imagine',
      supportsImageInput: true,
      supportsMultipleReferenceImages: true,
      maxImagesPerRequest: 10,
      maxReferenceImages: 3,
      qualityOptions: ['auto'],
      outputFormats: ['png'],
      backgroundOptions: ['auto'],
      moderationOptions: ['auto'],
      resolutions: ['1K', '2K'],
    },
  ],
};

jest.mock('@/config/imageGenerationModels', () => ({
  getImageInputModels: (provider: string) => (mockImageModels[provider] || []).filter((model) => model.supportsImageInput),
  getResolvedImageModel: (provider: string, modelId?: string) => {
    const resolvedId = modelId || ({
      openai: 'gpt-image-2',
      google: 'gemini-2.5-flash-image',
      grok: 'grok-imagine-image',
    } as Record<string, string>)[provider];
    return (mockImageModels[provider] || []).find((model) => model.id === resolvedId);
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
  supportsImageInput: (provider: string, modelId?: string) => {
    const resolvedId = modelId || ({
      openai: 'gpt-image-2',
      google: 'gemini-2.5-flash-image',
      grok: 'grok-imagine-image',
    } as Record<string, string>)[provider];
    return Boolean((mockImageModels[provider] || []).find((model) => model.id === resolvedId)?.supportsImageInput);
  },
  getImageProviderDisplayName: (provider: string) => {
    const names: Record<string, string> = { openai: 'OpenAI', google: 'Google', grok: 'Grok' };
    return names[provider] || provider;
  },
}));

jest.mock('@/utils/aiProviderAssets', () => ({
  getAIProviderIcon: () => ({ iconType: 'letter', icon: 'O' }),
}));

jest.mock('@/store/createSlice', () => ({
  generateCreateImages: (payload: unknown) => mockGenerateCreateImages(payload),
  setPrompt: jest.fn((prompt) => ({ type: 'create/setPrompt', payload: prompt })),
  setStyle: jest.fn((style) => ({ type: 'create/setStyle', payload: style })),
  setSize: jest.fn((size) => ({ type: 'create/setSize', payload: size })),
  setImageCount: jest.fn((count) => ({ type: 'create/setImageCount', payload: count })),
  setImageModelSetting: jest.fn((payload) => ({ type: 'create/setImageModelSetting', payload })),
  setSelectedModel: jest.fn((payload) => ({ type: 'create/setSelectedModel', payload })),
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
      selectedModels: {},
      currentPrompt: '',
      selectedStyle: 'none',
      selectedSize: 'auto',
      selectedImageCount: 1,
      imageModelSettings: {},
      gallery: [],
      galleryHydrated: true,
      mediaGallery: [],
      mediaGalleryHydrated: true,
      imageGeneration: null,
      mediaGeneration: { video: null, audio: null },
      lastImageGenerationResult: undefined,
      activeTab: 'image',
      createActivity: { status: 'idle', hasUnseenActivity: false },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    mockNavigate.mockClear();
    mockGradientButtonProps = undefined;
    mockDynamicAISelectorProps = undefined;
    mockPromptHeroInputProps = undefined;
    mockGenerateCreateImages.mockClear();
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

    it('renders the shared provider selector grid', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('dynamic-ai-selector')).toBeTruthy();
      expect(getByTestId('create-model-card-openai')).toBeTruthy();
      expect(mockDynamicAISelectorProps).toEqual(expect.objectContaining({
        hideStartButton: true,
        hideHeaderTitle: true,
      }));
    });

    it('renders generate button', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('gradient-button')).toBeTruthy();
    });

    it('renders PromptHeroInput', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('create-prompt-input')).toBeTruthy();
    });

    it('renders a prompt-first layout (prompt, mode toggle, provider grid) without inline output sections', () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<CreateSetupScreen />);

      expect(getByTestId('create-prompt-input')).toBeTruthy();
      expect(getByTestId('segment-refine')).toBeTruthy();
      expect(getByTestId('create-model-card-openai')).toBeTruthy();
      // Output controls live in the settings sheet, not inline.
      expect(queryByTestId('create-image-count-slider')).toBeNull();
      expect(queryByTestId('create-advanced-options')).toBeNull();
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
      expect(getByTestId('create-model-card-openai')).toBeTruthy();
    });

    it('allows premium users to access', () => {
      mockUseFeatureAccess.mockReturnValue({ membershipStatus: 'premium', isDemo: false, isPremium: true });
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('create-model-card-openai')).toBeTruthy();
    });
  });

  describe('AI provider selection', () => {
    it('renders a card for each configured provider', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      expect(getByTestId('create-model-card-openai')).toBeTruthy();
      expect(getByTestId('create-model-card-google')).toBeTruthy();
      expect(getByTestId('create-model-card-grok')).toBeTruthy();
    });

    it('toggles provider selection when a card is pressed', () => {
      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      fireEvent.press(getByTestId('create-model-card-openai'));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'create/setSelectedProviders',
        payload: ['openai'],
      });
    });

    it('shows the per-model capability summary inside the settings sheet', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            selectedProviders: ['openai'],
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);
      fireEvent.press(getByTestId('create-open-settings'));
      expect(getByTestId('create-settings-sheet')).toBeTruthy();
      expect(getByTestId('create-model-settings-openai')).toBeTruthy();
      expect(getByText(/Can edit images and use references/)).toBeTruthy();
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

  describe('Image Studio controls', () => {
    it('switches Refine mode into explicit source and instruction controls', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            selectedProviders: ['openai'],
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      fireEvent.press(getByTestId('segment-refine'));

      expect(getByText('Source Image')).toBeTruthy();
      expect(mockPromptHeroInputProps.placeholder).toContain('Change the lighting');
      expect(getByText('Add an image to refine')).toBeTruthy();
    });

    it('shows adaptive OpenAI output controls inside the settings sheet', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            selectedProviders: ['openai'],
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      fireEvent.press(getByTestId('create-open-settings'));
      expect(getByTestId('create-image-count-slider')).toBeTruthy();
      expect(getByText('JPEG')).toBeTruthy();
      expect(getByText('Less restrictive')).toBeTruthy();
    });

    it('hides count and shows the text-only note for single-image text-only models', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            selectedProviders: ['openai'],
            selectedModels: { openai: 'dall-e-3' },
          },
        })
      );

      const { getByTestId, queryByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      fireEvent.press(getByTestId('create-open-settings'));
      expect(queryByTestId('create-image-count-slider')).toBeNull();
      expect(getByText(/Creates from text prompts only/)).toBeTruthy();
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

    it('dispatches image generation from the setup rail with model and output settings', async () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            currentPrompt: 'A beautiful sunset',
            selectedProviders: ['openai', 'google'],
            selectedModels: {
              openai: 'gpt-image-2',
              google: 'gemini-2.5-flash-image',
            },
            selectedImageCount: 2,
            imageModelSettings: {
              openai: {
                quality: 'auto',
                resolution: '1K',
                outputFormat: 'jpeg',
                outputCompression: 80,
                background: 'auto',
                moderation: 'low',
              },
            },
          },
        })
      );

      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);
      fireEvent.press(getByTestId('gradient-button'));

      expect(mockGenerateCreateImages).toHaveBeenCalledWith(expect.objectContaining({
        prompt: 'A beautiful sunset',
        providers: ['openai', 'google'],
        selectedModels: {
          openai: 'gpt-image-2',
          google: 'gemini-2.5-flash-image',
        },
        imageCount: 2,
        modelSettings: {
          openai: {
            quality: 'auto',
            resolution: '1K',
            outputFormat: 'jpeg',
            outputCompression: 80,
            background: 'auto',
            moderation: 'low',
          },
        },
        sourceImages: [],
      }));
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'create/setPrompt', payload: '' });
        expect(mockNavigate).toHaveBeenCalledWith('CreateSession', { focusAssetId: 'img_done', galleryTab: 'image' });
      });
    });
  });

  describe('image generation rail', () => {
    it('shows running state from shared image generation state', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            currentPrompt: 'A beautiful sunset',
            selectedProviders: ['openai'],
            imageGeneration: {
              id: 'image_running',
              providers: ['openai'],
              prompt: 'A beautiful sunset',
              status: 'running',
              phase: 'generating',
              startedAt: Date.now(),
              message: 'Generating with openai...',
            },
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      expect(getByTestId('create-image-rail')).toBeTruthy();
      expect(getByTestId('create-image-status')).toBeTruthy();
      expect(getByText('Generating with openai...')).toBeTruthy();
      expect(getByText('Generating Images...')).toBeTruthy();
    });

    it('shows failed state from the shared image generation result', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            selectedProviders: ['openai'],
            lastImageGenerationResult: {
              ids: [],
              status: 'failed',
              message: 'openai: bad request',
              completedAt: Date.now(),
            },
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      expect(getByTestId('create-image-status')).toBeTruthy();
      expect(getByText('openai: bad request')).toBeTruthy();
      expect(getByText('Retry Images')).toBeTruthy();
    });

    it('opens Gallery from the completed image CTA focused on a single result', () => {
      mockUseSelector.mockImplementation((selector) =>
        selector({
          ...baseState,
          create: {
            ...baseState.create,
            selectedProviders: ['openai'],
            lastImageGenerationResult: {
              ids: ['img_done'],
              status: 'succeeded',
              message: 'Image generation complete.',
              completedAt: Date.now(),
            },
          },
        })
      );

      const { getByTestId, getByText } = renderWithProviders(<CreateSetupScreen />);

      expect(getByText('Image generation complete.')).toBeTruthy();
      fireEvent.press(getByTestId('create-image-gallery-cta'));

      expect(mockNavigate).toHaveBeenCalledWith('CreateSession', { focusAssetId: 'img_done', galleryTab: 'image' });
    });
  });

  describe('media generation rail', () => {
    it('keeps audio settings in a closed sheet by default', () => {
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
      expect(getByTestId('create-open-settings')).toBeTruthy();
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

      fireEvent.press(getByTestId('create-open-settings'));
      expect(getByTestId('create-settings-sheet')).toBeTruthy();
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

      fireEvent.press(getByTestId('create-open-settings'));
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
      await waitFor(() => {
        expect(getByTestId('create-audio-prompt-input').props.value).toBe('Read this line');
      });

      fireEvent.press(getByTestId('create-open-settings'));
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

    it('clears the audio prompt after successful generation', async () => {
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

      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);

      fireEvent.changeText(getByTestId('create-audio-prompt-input'), 'Read this line');
      await waitFor(() => {
        expect(getByTestId('create-audio-prompt-input').props.value).toBe('Read this line');
      });
      fireEvent.press(getByTestId('gradient-button'));

      await waitFor(() => {
        expect(getByTestId('create-audio-prompt-input').props.value).toBe('');
      });
    });

    it('clears the video prompt after successful generation', async () => {
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

      const { getByTestId } = renderWithProviders(<CreateSetupScreen />);

      fireEvent.changeText(getByTestId('create-video-prompt-input'), 'A city timelapse');
      await waitFor(() => {
        expect(getByTestId('create-video-prompt-input').props.value).toBe('A city timelapse');
      });
      fireEvent.press(getByTestId('gradient-button'));

      await waitFor(() => {
        expect(getByTestId('create-video-prompt-input').props.value).toBe('');
      });
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

      fireEvent.press(getByTestId('create-open-settings'));
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
