import React from 'react';
import { Alert, ScrollView } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import {
  setAIPersonality,
  setAIModel,
  setGlobalStreaming,
  setStreamingSpeed,
  preserveTopic,
  clearPreservedTopic,
} from '@/store';
import { setProviderStreamingPreference } from '@/store/streamingSlice';
import { resolveProviderModelId } from '@/config/modelConfigs';
import type { AIConfig } from '@/types';
import type { RootState } from '@/store';

const baseAIs: AIConfig[] = [
  { id: 'claude', provider: 'claude', name: 'Claude', model: 'claude-3-opus' },
  { id: 'openai', provider: 'openai', name: 'GPT-4', model: 'gpt-4-turbo' },
  { id: 'google', provider: 'google', name: 'Gemini', model: 'gemini-1.5' },
];

const mockDispatch = jest.fn();
let currentState: RootState;
const mockUseSelector = jest.fn();
const mockFeatureAccess = jest.fn();

const defaultState = (): RootState => ({
  settings: {
    apiKeys: { claude: 'key-1', openai: 'key-2', google: 'key-3' },
    expertMode: {},
    recordModeEnabled: false,
    theme: 'light',
    fontSize: 'medium',
    verifiedProviders: [],
    verificationTimestamps: {},
    verificationModels: {},
    hasCompletedOnboarding: true,
  } as any,
  chat: {
    aiPersonalities: {},
    selectedModels: {},
    currentSession: null,
    sessions: [],
    typingAIs: [],
    isLoading: false,
  },
  debateStats: {
    preservedTopic: '',
    preservedTopicMode: 'preset',
  } as any,
  streaming: {
    globalStreamingEnabled: false,
    streamingSpeed: 'natural',
    streamingPreferences: {},
    providerVerificationErrors: {},
  } as any,
  user: { currentUser: null, isAuthenticated: false, uiMode: 'simple' },
  navigation: {} as any,
  compare: {} as any,
  auth: {} as any,
  services: {} as any,
});

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: (state: RootState) => any) => mockUseSelector(selector),
  };
});

jest.mock('expo-apple-authentication', () => ({}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSigninButton: () => null,
}));
jest.mock('expo-device', () => ({}));
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
}));
jest.mock('expo-blur', () => ({
  BlurView: ({ children }: { children?: React.ReactNode }) => children ?? null,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
}));
jest.mock('react-native-view-shot', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/hooks/debate', () => ({
  usePreDebateValidation: () => ({
    isReady: true,
    checkReadiness: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
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
    timeBasedGreeting: 'Ready to debate',
    welcomeMessage: 'Pick your topic',
    greeting: {
      timeBasedGreeting: 'Ready to debate',
      welcomeMessage: 'Pick your topic',
    },
  }),
}));

jest.mock('@/hooks/useFeatureAccess', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockFeatureAccess(...args),
  useFeatureAccess: (...args: unknown[]) => mockFeatureAccess(...args),
}));

jest.mock('@/components/molecules/subscription/TrialBanner', () => ({
  TrialBanner: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'trial-banner' }, 'trial-banner');
  },
}));

jest.mock('@/components/molecules/subscription/DemoBanner', () => ({
  DemoBanner: () => {
    return null;
  },
  __esModule: true,
  default: () => {
    return null;
  },
}));

let topicSelectorProps: any;
let aiSelectorProps: any;
let personalitySelectorProps: any;
let stepIndicatorProps: any;

jest.mock('@/components/organisms/debate/DebateTopicSelector', () => ({
  DebateTopicSelector: (props: any) => {
    topicSelectorProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms/debate/DebateAISelector', () => ({
  DebateAISelector: (props: any) => {
    aiSelectorProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms/debate/DebatePersonalitySelector', () => ({
  DebatePersonalitySelector: (props: any) => {
    personalitySelectorProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms/debate/DebateStepIndicator', () => ({
  DebateStepIndicator: (props: any) => {
    stepIndicatorProps = props;
    return null;
  },
}));

let recordPickerProps: any;
jest.mock('@/components/organisms/demo/DebateRecordPickerModal', () => ({
  DebateRecordPickerModal: (props: any) => {
    recordPickerProps = props;
    return null;
  },
}));

let demoPickerProps: any;
jest.mock('@/components/organisms/demo/DemoDebatePickerModal', () => ({
  DemoDebatePickerModal: (props: any) => {
    demoPickerProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms/debate/FormatModal', () => ({
  FormatModal: () => null,
}));

jest.mock('@/components/organisms', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Header: (props: any) => React.createElement(Text, { testID: 'header' }, props.title),
    HeaderActions: () => React.createElement(Text, null, 'actions'),
  };
});

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    Button: (props: any) => React.createElement(Text, { onPress: props.onPress }, props.title),
    GradientButton: (props: any) => React.createElement(Text, { onPress: props.onPress }, props.title),
    Typography: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
    Card: ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children),
    HeaderIcon: ({ onPress, children }: { onPress?: () => void; children?: React.ReactNode }) =>
      React.createElement(Text, { onPress }, children ?? 'icon'),
    InfoButton: ({ topicId }: { topicId: string }) =>
      React.createElement(Text, { testID: `info-button-${topicId}` }, 'info'),
  };
});

jest.mock('@/services/debate/TopicService', () => ({
  TopicService: {
    generateRandomTopicString: jest.fn(() => 'Surprise Topic'),
  },
}));

const mockListDebateSamples = jest.fn();
const mockFindDebateById = jest.fn();
jest.mock('@/services/demo/DemoContentService', () => ({
  DemoContentService: {
    listDebateSamples: (...args: unknown[]) => mockListDebateSamples(...args),
    findDebateById: (...args: unknown[]) => mockFindDebateById(...args),
  },
  __esModule: true,
  default: {
    listDebateSamples: (...args: unknown[]) => mockListDebateSamples(...args),
    findDebateById: (...args: unknown[]) => mockFindDebateById(...args),
  },
}));

const mockGetAPIKey = jest.fn();
jest.mock('@/services/APIKeyService', () => ({
  __esModule: true,
  default: {
    getKey: (...args: unknown[]) => mockGetAPIKey(...args),
  },
}));

const mockListElevenLabsOptions = jest.fn();
jest.mock('@/services/media/MediaGenerationService', () => ({
  __esModule: true,
  default: {
    listElevenLabsOptions: (...args: unknown[]) => mockListElevenLabsOptions(...args),
  },
}));

const mockRecordController = {
  startDebate: jest.fn(),
};
jest.mock('@/services/demo/RecordController', () => ({
  RecordController: mockRecordController,
}));

const DebateSetupScreen = require('@/screens/DebateSetupScreen').default;

const collectTestIds = (node: any, ids: string[] = []): string[] => {
  if (!node) return ids;
  if (Array.isArray(node)) {
    node.forEach((child) => collectTestIds(child, ids));
    return ids;
  }
  if (node.props?.testID) {
    ids.push(node.props.testID);
  }
  node.children?.forEach((child: any) => collectTestIds(child, ids));
  return ids;
};

const renderScreen = (options: {
  featureAccess?: Record<string, unknown>;
  route?: Record<string, unknown>;
  state?: Partial<RootState>;
} = {}) => {
  const { featureAccess, route, state } = options;
  currentState = {
    ...defaultState(),
    ...(state ? state : {}),
  } as RootState;

  mockUseSelector.mockImplementation((selector) => selector(currentState));
  mockFeatureAccess.mockReturnValue({ isDemo: false, isPremium: false, isInTrial: false, ...featureAccess });

  const navigation = {
    navigate: jest.fn(),
  };

  const renderResult = renderWithProviders(
    <DebateSetupScreen navigation={navigation as any} route={{ params: { ...route } } as any} />
  );

  return {
    renderResult,
    navigation,
  };
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockListDebateSamples.mockReset();
  mockFindDebateById.mockReset();
  mockGetAPIKey.mockReset();
  mockListElevenLabsOptions.mockReset();
  mockGetAPIKey.mockResolvedValue('eleven-key');
  mockListElevenLabsOptions.mockResolvedValue({
    success: true,
    providerId: 'elevenlabs',
    voices: [
      { id: 'voice-1', name: 'Voice One', description: 'Warm' },
      { id: 'voice-2', name: 'Voice Two', description: 'Clear' },
    ],
  });
  mockRecordController.startDebate.mockReset();
  topicSelectorProps = undefined;
  aiSelectorProps = undefined;
  personalitySelectorProps = undefined;
  recordPickerProps = undefined;
  demoPickerProps = undefined;
  demoBannerProps = undefined;
  Alert.alert = jest.fn();
});

describe('DebateSetupScreen', () => {
  const selectDebaterSlot = async (index: number, ai: AIConfig) => {
    act(() => {
      aiSelectorProps.onRequestDebaterSlot(index);
    });
    await flush();
    act(() => {
      aiSelectorProps.onSelectProvider(ai);
    });
    await flush();
  };

  it('places the trial banner below the header surface', () => {
    const { renderResult } = renderScreen({ featureAccess: { isInTrial: true, trialDaysRemaining: 1 } });

    const testIds = collectTestIds(renderResult.toJSON());

    expect(testIds.indexOf('header')).toBeGreaterThanOrEqual(0);
    expect(testIds.indexOf('trial-banner')).toBeGreaterThanOrEqual(0);
    expect(testIds.indexOf('header')).toBeLessThan(testIds.indexOf('trial-banner'));
  });

  it('shows Oxford preset labels and audience checkpoint labels', () => {
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    expect(renderResult.getByText('1v1')).toBeTruthy();
    expect(renderResult.getByText('2v2')).toBeTruthy();
    expect(renderResult.getByText('2v2 + Q&A')).toBeTruthy();
    expect(renderResult.getByText('6 speeches · opening + final audience vote · 1v1 · audience vote')).toBeTruthy();
    expect(renderResult.getByText('Audience checkpoints')).toBeTruthy();
    expect(renderResult.getByText('Opening stance')).toBeTruthy();
    expect(renderResult.getByText('Final vote')).toBeTruthy();

    fireEvent.press(renderResult.getByText('2v2'));

    expect(renderResult.getByText('6 speeches · opening + final audience vote · 2v2 teams · audience vote')).toBeTruthy();
    expect(renderResult.queryByText('3 rebuttal rounds')).toBeNull();
    expect(renderResult.queryByText('First Rebuttals')).toBeNull();

    fireEvent.press(renderResult.getByText('2v2 + Q&A'));

    expect(renderResult.getByText('8 turns · opening + audience questions + final vote · 2v2 teams')).toBeTruthy();
    expect(renderResult.getByText('Audience questions')).toBeTruthy();
    expect(renderResult.queryByText('4 rebuttal rounds')).toBeNull();
    expect(renderResult.queryByText('Final Rebuttals')).toBeNull();
    expect(renderResult.queryByText('Choose format and preset')).toBeNull();
    expect(renderResult.queryByText('Oxford-style motion debate with opening speeches, floor debate, and closing speeches')).toBeNull();
    expect(renderResult.queryByText('Affirmative: Opening Statement → Negative: Opening Statement → Affirmative: Rebuttal → Negative: Rebuttal → Affirmative: Closing Statement → Negative: Closing Statement')).toBeNull();
  });

  it('progresses from topic to AI step with valid selection', async () => {
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    expect(topicSelectorProps).toBeDefined();
    act(() => {
      topicSelectorProps.onTopicSelect('Climate Action');
    });

    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    expect(aiSelectorProps).toBeDefined();
    expect(stepIndicatorProps.currentStep).toBe('ai');
  });

  it('resets scroll position when moving from topic to debater setup', async () => {
    jest.useFakeTimers();
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    act(() => {
      topicSelectorProps.onTopicSelect('Climate Action');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(stepIndicatorProps.currentStep).toBe('ai');
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 0, animated: false });

    scrollToSpy.mockRestore();
    jest.useRealTimers();
  });

  it('returns to the Debate Teams anchor after filling a debater slot', async () => {
    jest.useFakeTimers();
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    act(() => {
      topicSelectorProps.onTopicSelect('Climate Action');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    scrollToSpy.mockClear();

    fireEvent.scroll(renderResult.UNSAFE_getByType(ScrollView), {
      nativeEvent: { contentOffset: { y: 820 } },
    });

    act(() => {
      aiSelectorProps.onTeamGridLayout(640);
      aiSelectorProps.onProviderSelectorLayout(1200);
      aiSelectorProps.onRequestDebaterSlot(0);
    });
    await flush();
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ y: 1184, animated: true });
    scrollToSpy.mockClear();

    const claudeConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'claude');
    act(() => {
      aiSelectorProps.onSelectProvider(claudeConfig);
    });
    await flush();
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ y: 820, animated: true });

    scrollToSpy.mockRestore();
    jest.useRealTimers();
  });

  it('adds same-provider debater slots and keeps streaming preferences provider-scoped', async () => {
    const { renderResult } = renderScreen({
      featureAccess: { isDemo: false },
      state: {
        streaming: {
          ...defaultState().streaming,
          globalStreamingEnabled: true,
          streamingSpeed: 'natural',
          streamingPreferences: {
            claude: { enabled: true },
            openai: { enabled: true },
          },
        } as any,
      },
    });

    act(() => {
      topicSelectorProps.onTopicSelect('Climate Action');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    const claudeConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'claude');
    await selectDebaterSlot(0, claudeConfig);
    await selectDebaterSlot(1, claudeConfig);

    expect(aiSelectorProps.selectedAIs).toHaveLength(2);
    expect(aiSelectorProps.selectedAIs.map((ai: AIConfig) => ai.provider)).toEqual(['claude', 'claude']);
    expect(aiSelectorProps.selectedAIs[0].id).not.toEqual(aiSelectorProps.selectedAIs[1].id);

    const firstDebaterId = aiSelectorProps.selectedAIs[0].id;

    act(() => {
      aiSelectorProps.onPersonalityChange(firstDebaterId, 'friendly');
    });
    expect(mockDispatch).toHaveBeenCalledWith(setAIPersonality({ aiId: firstDebaterId, personalityId: 'friendly' }));

    await act(async () => {
      await aiSelectorProps.onModelChange(firstDebaterId, 'claude-custom');
    });
    expect(mockDispatch).toHaveBeenCalledWith(setAIModel({
      aiId: firstDebaterId,
      modelId: resolveProviderModelId('claude', 'claude-custom') || 'claude-custom',
    }));

    fireEvent.press(renderResult.getByText('Streaming: On'));
    expect(mockDispatch).toHaveBeenCalledWith(setGlobalStreaming(false));

    fireEvent.press(renderResult.getByText('Speed: Natural'));
    expect(mockDispatch).toHaveBeenCalledWith(setStreamingSpeed('slow'));

    const providerToggle = renderResult.getAllByText('Streaming On')[0];
    fireEvent.press(providerToggle);
    expect(mockDispatch).toHaveBeenCalledWith(setProviderStreamingPreference({ providerId: 'claude', enabled: false }));
  });

  it('resets scroll position when moving from debaters to personality setup', async () => {
    const scrollToSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    act(() => {
      topicSelectorProps.onTopicSelect('Climate Action');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    const claudeConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'claude');
    const openaiConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'openai');
    await selectDebaterSlot(0, claudeConfig);
    await selectDebaterSlot(1, openaiConfig);

    await act(async () => {
      await aiSelectorProps.onNext();
    });
    await flush();

    expect(stepIndicatorProps.currentStep).toBe('personality');
    expect(personalitySelectorProps).toBeDefined();
    expect(scrollToSpy).toHaveBeenCalledWith({ y: 0, animated: false });

    scrollToSpy.mockRestore();
  });

  it('opens demo debate picker and navigates with selected sample', async () => {
    mockListDebateSamples.mockResolvedValue([{ id: 'sample-1', title: 'Sample', topic: 'AI Ethics' }]);
    mockFindDebateById.mockResolvedValue({ id: 'sample-1', title: 'Sample', topic: 'AI Ethics' });

    const { renderResult, navigation } = renderScreen({ featureAccess: { isDemo: true } });

    act(() => {
      topicSelectorProps.onTopicSelect('AI Ethics');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    const claudeConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'claude');
    const openaiConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'openai');

    await selectDebaterSlot(0, claudeConfig);
    await selectDebaterSlot(1, openaiConfig);
    await act(async () => {
      await aiSelectorProps.onNext();
    });

    expect(mockListDebateSamples).toHaveBeenCalledWith(expect.arrayContaining(['claude', 'openai']), 'default');
    expect(demoPickerProps.visible).toBe(true);

    await act(async () => {
      await demoPickerProps.onSelect({ id: 'sample-1', title: 'Sample', topic: 'AI Ethics' });
    });

    expect(mockFindDebateById).toHaveBeenCalledWith('sample-1');
    expect(navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({
      demoDebateId: 'sample-1',
      topic: 'AI Ethics',
    }));
  });

  it('uses record picker when record mode enabled before navigation', async () => {
    const { renderResult, navigation } = renderScreen({
      featureAccess: { isDemo: false, isPremium: true },
      state: {
        settings: {
          ...defaultState().settings,
          recordModeEnabled: true,
        } as any,
      },
    });

    act(() => {
      topicSelectorProps.onTopicSelect('Climate Action');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    const claudeConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'claude');
    const openaiConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'openai');
    await selectDebaterSlot(0, claudeConfig);
    await selectDebaterSlot(1, openaiConfig);

    act(() => {
      aiSelectorProps.onNext();
    });
    await flush();

    expect(personalitySelectorProps).toBeDefined();

    await act(async () => {
      await personalitySelectorProps.onStartDebate();
    });

    expect(recordPickerProps.visible).toBe(true);

    await act(async () => {
      await recordPickerProps.onSelect({ type: 'new', id: 'record-1', topic: 'Custom Topic' });
    });

    expect(mockRecordController.startDebate).toHaveBeenCalledWith(expect.objectContaining({ id: 'record-1' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({ topic: 'Custom Topic' }));
  });

  it('hides voiced debate controls without a verified ElevenLabs key', async () => {
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    act(() => {
      topicSelectorProps.onTopicSelect('Climate Action');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    const claudeConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'claude');
    const openaiConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'openai');
    await selectDebaterSlot(0, claudeConfig);
    await selectDebaterSlot(1, openaiConfig);
    await act(async () => {
      await aiSelectorProps.onNext();
    });
    await flush();

    expect(personalitySelectorProps.voiceConfigAvailable).toBe(false);
    expect(mockListElevenLabsOptions).not.toHaveBeenCalled();
  });

  it('loads verified ElevenLabs voices and passes voice config to Debate', async () => {
    const { renderResult, navigation } = renderScreen({
      featureAccess: { isDemo: false },
      state: {
        settings: {
          ...defaultState().settings,
          apiKeys: {
            ...defaultState().settings.apiKeys,
            elevenlabs: { configured: true, maskedLabel: 'key', updatedAt: 1 },
          },
          verifiedProviders: ['elevenlabs'],
        } as any,
      },
    });

    act(() => {
      topicSelectorProps.onTopicSelect('Climate Action');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    const claudeConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'claude');
    const openaiConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'openai');
    await selectDebaterSlot(0, claudeConfig);
    await selectDebaterSlot(1, openaiConfig);

    const [claudeDebater, openaiDebater] = aiSelectorProps.selectedAIs;

    await act(async () => {
      await aiSelectorProps.onNext();
    });
    await flush();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetAPIKey).toHaveBeenCalledWith('elevenlabs');
    expect(mockListElevenLabsOptions).toHaveBeenCalledWith('eleven-key', expect.objectContaining({
      pageSize: 100,
      includeTotalCount: true,
    }));
    expect(personalitySelectorProps.voiceConfigAvailable).toBe(true);
    expect(personalitySelectorProps.voiceOptions).toHaveLength(2);

    act(() => {
      personalitySelectorProps.onToggleVoiceEnabled(true);
    });
    await flush();

    await act(async () => {
      await personalitySelectorProps.onStartDebate();
    });

    expect(navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({
      voiceConfig: {
        enabled: true,
        providerId: 'elevenlabs',
        debaterVoices: {
          [claudeDebater.id]: { voiceId: 'voice-1', voiceName: 'Voice One' },
          [openaiDebater.id]: { voiceId: 'voice-2', voiceName: 'Voice Two' },
        },
      },
    }));
  });

  it('passes podcast MC provider, model, and voice config to Debate', async () => {
    const { renderResult, navigation } = renderScreen({
      featureAccess: { isDemo: false },
      state: {
        settings: {
          ...defaultState().settings,
          apiKeys: {
            ...defaultState().settings.apiKeys,
            elevenlabs: { configured: true, maskedLabel: 'key', updatedAt: 1 },
          },
          verifiedProviders: ['elevenlabs'],
        } as any,
      },
    });

    act(() => {
      topicSelectorProps.onTopicSelect('Climate Action');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    const claudeConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'claude');
    const openaiConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'openai');
    const googleConfig = aiSelectorProps.configuredAIs.find((ai: AIConfig) => ai.id === 'google');
    await selectDebaterSlot(0, claudeConfig);
    await selectDebaterSlot(1, openaiConfig);

    act(() => {
      aiSelectorProps.onTogglePodcastMode(true);
    });
    await flush();
    act(() => {
      aiSelectorProps.onRequestPodcastMC();
    });
    await flush();
    act(() => {
      aiSelectorProps.onSelectProvider(googleConfig);
    });
    await flush();
    await flush();

    await act(async () => {
      await aiSelectorProps.onNext();
    });
    await flush();
    await flush();

    expect(personalitySelectorProps.podcastModeEnabled).toBe(true);
    expect(personalitySelectorProps.podcastMC.provider).toBe('google');
    expect(personalitySelectorProps.podcastMCVoice).toEqual({ voiceId: 'voice-1', voiceName: 'Voice One' });

    await act(async () => {
      await personalitySelectorProps.onStartDebate();
    });

    expect(navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({
      voiceConfig: expect.objectContaining({
        podcast: {
          enabled: true,
          scriptMode: 'byok_ai',
          outputMode: 'playlist',
          mc: expect.objectContaining({
            provider: 'google',
            model: expect.any(String),
          }),
          mcVoice: { voiceId: 'voice-1', voiceName: 'Voice One' },
        },
      }),
    }));
  });

  it('shows alerts when missing selections', async () => {
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    expect(Alert.alert).toHaveBeenCalledWith('Select a Motion', expect.any(String));

    (Alert.alert as jest.Mock).mockClear();
    act(() => {
      topicSelectorProps.onTopicSelect('Prepared Topic');
    });
    await flush();
    fireEvent.press(renderResult.getByText('Next: Choose Debaters →'));
    await flush();

    await act(async () => {
      await aiSelectorProps.onNext();
    });
    expect(Alert.alert).toHaveBeenCalledWith('Fill 2 Slots', expect.any(String));
  });

  it('resets setup state when returning from a completed debate', async () => {
    renderScreen({
      featureAccess: { isDemo: false },
      route: {
        resetDebateSetup: true,
        resetKey: 'reset-1',
      },
      state: {
        debateStats: {
          preservedTopic: 'Old Motion',
          preservedTopicMode: 'custom',
        } as any,
      },
    });

    await flush();

    expect(stepIndicatorProps.currentStep).toBe('topic');
    expect(topicSelectorProps.selectedTopic).toBe('');
    expect(topicSelectorProps.customTopic).toBe('');
    expect(topicSelectorProps.topicMode).toBe('preset');
    expect(mockDispatch).toHaveBeenCalledWith(clearPreservedTopic());
  });

  it('preserves topic on unmount and clears when starting debate', async () => {
    const firstRender = renderScreen({
      featureAccess: { isDemo: false },
      state: {
        debateStats: {
          preservedTopic: '',
          preservedTopicMode: 'preset',
        } as any,
      },
    });

    act(() => {
      topicSelectorProps.onTopicModeChange('custom');
      topicSelectorProps.onCustomTopicChange('Custom Motion');
    });
    await flush();

    firstRender.renderResult.unmount();
    expect(mockDispatch).toHaveBeenCalledWith(preserveTopic({ topic: 'Custom Motion', mode: 'custom' }));

    jest.clearAllMocks();
    const secondRender = renderScreen({
      featureAccess: { isDemo: false },
      route: { preselectedAIs: baseAIs.slice(0, 2), prefilledTopic: 'Prefilled' },
    });
    await flush();
    fireEvent.press(secondRender.renderResult.getByText('Next: Choose Debaters →'));
    await flush();
    await act(async () => {
      await aiSelectorProps.onNext();
    });
    await flush();
    await act(async () => {
      await personalitySelectorProps.onStartDebate();
    });
    expect(mockDispatch).toHaveBeenCalledWith(clearPreservedTopic());
    expect(secondRender.navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({ topic: 'Prefilled' }));
  });
});
