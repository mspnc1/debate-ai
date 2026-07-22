import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import {
  setAIPersonality,
  setAIModel,
  preserveTopic,
  clearPreservedTopic,
} from '@/store';
import { resolveProviderModelId } from '@/config/modelConfigs';
import type { AIConfig } from '@/types';
import type { RootState } from '@/store';
import type { FormatModalProps } from '@/components/organisms/debate/FormatModal';

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
let teamsCardProps: any;
let slotConfigSheetProps: any;
let providerPickerProps: any;
let formatModalProps: FormatModalProps | undefined;

jest.mock('@/components/organisms/debate/DebateTopicSelector', () => ({
  DebateTopicSelector: (props: any) => {
    topicSelectorProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms/debate/DebateTeamsCard', () => ({
  DebateTeamsCard: (props: any) => {
    teamsCardProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms/debate/DebateSlotConfigSheet', () => ({
  DebateSlotConfigSheet: (props: any) => {
    slotConfigSheetProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms/composer/ProviderPickerSheet', () => ({
  ProviderPickerSheet: (props: any) => {
    providerPickerProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms/common/AIAvatar', () => ({
  AIAvatar: () => null,
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
  FormatModal: (props: FormatModalProps) => {
    formatModalProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    Header: (props: any) =>
      React.createElement(
        View,
        { testID: 'header' },
        React.createElement(Text, null, props.title),
        props.rightElement ?? null
      ),
    HeaderActions: () => React.createElement(Text, null, 'actions'),
  };
});

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    Button: (props: any) => React.createElement(Text, { onPress: props.onPress }, props.title),
    GradientButton: (props: any) =>
      React.createElement(
        Text,
        {
          onPress: props.disabled ? undefined : props.onPress,
          accessibilityState: { disabled: !!props.disabled },
          testID: props.testID,
        },
        props.title
      ),
    Typography: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
    Card: ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children),
    HeaderIcon: ({ onPress, testID }: { onPress?: () => void; testID?: string }) =>
      React.createElement(Text, { onPress, testID }, 'icon'),
    InfoButton: ({ topicId }: { topicId: string }) =>
      React.createElement(Text, { testID: `info-button-${topicId}` }, 'info'),
    SegmentedControl: ({ options, onChange }: any) =>
      React.createElement(
        View,
        null,
        options.map((option: any) =>
          React.createElement(
            Text,
            { key: String(option.value), onPress: () => onChange(option.value) },
            option.label
          )
        )
      ),
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
const mockGetElevenLabsSubscription = jest.fn();
jest.mock('@/services/media/MediaGenerationService', () => ({
  __esModule: true,
  default: {
    listElevenLabsOptions: (...args: unknown[]) => mockListElevenLabsOptions(...args),
    getElevenLabsSubscription: (...args: unknown[]) => mockGetElevenLabsSubscription(...args),
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
  mockGetElevenLabsSubscription.mockReset();
  mockGetAPIKey.mockResolvedValue('eleven-key');
  mockGetElevenLabsSubscription.mockResolvedValue({
    characterCount: 100,
    characterLimit: 1000,
    remainingCredits: 900,
    overageAllowed: false,
  });
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
  teamsCardProps = undefined;
  slotConfigSheetProps = undefined;
  providerPickerProps = undefined;
  formatModalProps = undefined;
  recordPickerProps = undefined;
  demoPickerProps = undefined;
  Alert.alert = jest.fn();
});

const elevenLabsState = () => ({
  settings: {
    ...defaultState().settings,
    apiKeys: {
      ...defaultState().settings.apiKeys,
      elevenlabs: { configured: true, maskedLabel: 'key', updatedAt: 1 },
    },
    verifiedProviders: ['elevenlabs'],
  } as any,
});

describe('DebateSetupScreen', () => {
  const fillSlot = async (index: number, providerId: string) => {
    act(() => {
      teamsCardProps.onSlotPress(teamsCardProps.slots[index]);
    });
    await flush();
    expect(providerPickerProps.visible).toBe(true);
    act(() => {
      providerPickerProps.onSelectProvider(providerId);
    });
    await flush();
  };

  const setTopic = async (topic: string) => {
    act(() => {
      topicSelectorProps.onTopicSelect(topic);
    });
    await flush();
  };

  it('places the trial banner below the header surface', () => {
    const { renderResult } = renderScreen({ featureAccess: { isInTrial: true, trialDaysRemaining: 1 } });

    const testIds = collectTestIds(renderResult.toJSON());

    expect(renderResult.getByText('The Arena')).toBeTruthy();
    expect(testIds.indexOf('header')).toBeGreaterThanOrEqual(0);
    expect(testIds.indexOf('trial-banner')).toBeGreaterThanOrEqual(0);
    expect(testIds.indexOf('header')).toBeLessThan(testIds.indexOf('trial-banner'));
  });

  it('shows Oxford presets with a one-line summary that tracks selection', async () => {
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    expect(renderResult.getByText('1v1')).toBeTruthy();
    expect(renderResult.getByText('2v2')).toBeTruthy();
    expect(renderResult.getByText('2v2 + Q&A')).toBeTruthy();
    expect(renderResult.getByText(/1v1 Oxford/)).toBeTruthy();
    expect(renderResult.getByText(/6 speeches · 2 debaters · audience votes/)).toBeTruthy();

    fireEvent.press(renderResult.getByText('2v2'));
    await flush();

    expect(renderResult.getByText(/2v2 Oxford/)).toBeTruthy();
    expect(renderResult.getByText(/4 debaters/)).toBeTruthy();
    expect(teamsCardProps.totalCount).toBe(4);

    fireEvent.press(renderResult.getByText('2v2 + Q&A'));
    await flush();

    expect(renderResult.getByText(/2v2 \+ Q&A Oxford/)).toBeTruthy();
    expect(renderResult.getByText(/8 turns/)).toBeTruthy();
  });

  it('updates the summary for Lincoln-Douglas and Policy formats', async () => {
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    act(() => {
      formatModalProps!.onSelect('lincoln_douglas');
    });
    await flush();

    expect(renderResult.getByText('Lincoln-Douglas')).toBeTruthy();
    expect(renderResult.getByText(/Short LD/)).toBeTruthy();
    expect(renderResult.getByText(/5 turns · 2 debaters · 4 judge moments/)).toBeTruthy();

    fireEvent.press(renderResult.getByText('Standard'));
    await flush();

    expect(renderResult.getByText(/Standard LD/)).toBeTruthy();
    expect(renderResult.getByText(/9 turns · 2 debaters · 5 judge moments/)).toBeTruthy();

    act(() => {
      formatModalProps!.onSelect('policy');
    });
    await flush();

    expect(renderResult.getByText('Policy')).toBeTruthy();
    expect(renderResult.getByText(/16 turns/)).toBeTruthy();
  });

  it('fills empty slots through the provider picker', async () => {
    renderScreen({ featureAccess: { isDemo: false } });
    await setTopic('Climate Action');

    expect(teamsCardProps.slots).toHaveLength(2);
    expect(teamsCardProps.slots[0].ai).toBeNull();

    await fillSlot(0, 'claude');
    await fillSlot(1, 'openai');

    expect(teamsCardProps.slots[0].ai.provider).toBe('claude');
    expect(teamsCardProps.slots[1].ai.provider).toBe('openai');
    expect(teamsCardProps.filledCount).toBe(2);
    expect(providerPickerProps.visible).toBe(false);
  });

  it('adds same-provider debater slots with distinct slot ids and numbered names', async () => {
    renderScreen({ featureAccess: { isDemo: false } });
    await setTopic('Climate Action');

    await fillSlot(0, 'claude');
    await fillSlot(1, 'claude');

    const [first, second] = teamsCardProps.slots.map((slot: any) => slot.ai);
    expect(first.id).not.toEqual(second.id);
    expect(first.name).toBe('Claude 1');
    expect(second.name).toBe('Claude 2');
  });

  it('opens the slot config sheet for filled slots and applies model and personality changes', async () => {
    renderScreen({ featureAccess: { isDemo: false } });
    await setTopic('Climate Action');
    await fillSlot(0, 'claude');

    act(() => {
      teamsCardProps.onSlotPress(teamsCardProps.slots[0]);
    });
    await flush();

    expect(slotConfigSheetProps.visible).toBe(true);
    expect(slotConfigSheetProps.ai.provider).toBe('claude');
    expect(slotConfigSheetProps.slotLabel).toBe('Affirmative 1');

    const slotId = slotConfigSheetProps.ai.id;

    act(() => {
      slotConfigSheetProps.onChangeModel('claude-custom');
    });
    expect(mockDispatch).toHaveBeenCalledWith(setAIModel({
      aiId: slotId,
      modelId: resolveProviderModelId('claude', 'claude-custom') || 'claude-custom',
    }));

    act(() => {
      slotConfigSheetProps.onChangePersonality('friendly');
    });
    expect(mockDispatch).toHaveBeenCalledWith(setAIPersonality({ aiId: slotId, personalityId: 'friendly' }));
  });

  it('removes a debater and reopens the provider picker on change provider', async () => {
    renderScreen({ featureAccess: { isDemo: false } });
    await setTopic('Climate Action');
    await fillSlot(0, 'claude');

    act(() => {
      teamsCardProps.onSlotPress(teamsCardProps.slots[0]);
    });
    await flush();

    act(() => {
      slotConfigSheetProps.onChangeProvider();
    });
    await flush();
    expect(providerPickerProps.visible).toBe(true);

    act(() => {
      providerPickerProps.onSelectProvider('openai');
    });
    await flush();
    expect(teamsCardProps.slots[0].ai.provider).toBe('openai');

    act(() => {
      teamsCardProps.onSlotPress(teamsCardProps.slots[0]);
    });
    await flush();
    act(() => {
      slotConfigSheetProps.onRemove();
    });
    await flush();
    expect(teamsCardProps.slots[0].ai).toBeNull();
  });

  it('hides the personality row in demo mode', async () => {
    renderScreen({ featureAccess: { isDemo: true } });
    await setTopic('AI Ethics');
    await fillSlot(0, 'claude');

    act(() => {
      teamsCardProps.onSlotPress(teamsCardProps.slots[0]);
    });
    await flush();

    expect(slotConfigSheetProps.visible).toBe(true);
    expect(slotConfigSheetProps.personalityId).toBeUndefined();
  });

  it('blocks Start with a hint until motion and slots are complete', async () => {
    const { renderResult, navigation } = renderScreen({ featureAccess: { isDemo: false } });

    expect(renderResult.getByText('Choose a motion to debate.')).toBeTruthy();
    fireEvent.press(renderResult.getByTestId('start-debate-button'));
    expect(navigation.navigate).not.toHaveBeenCalled();

    await setTopic('Climate Action');
    expect(renderResult.getByText('Fill 2 more debater slots.')).toBeTruthy();

    await fillSlot(0, 'claude');
    expect(renderResult.getByText('Fill 1 more debater slot.')).toBeTruthy();

    await fillSlot(1, 'openai');
    expect(renderResult.queryByText(/debater slot/)).toBeNull();

    fireEvent.press(renderResult.getByTestId('start-debate-button'));
    expect(navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({
      topic: 'Climate Action',
      formatId: 'oxford',
      rounds: 3,
      civility: 3,
    }));
    expect(mockDispatch).toHaveBeenCalledWith(clearPreservedTopic());
  });

  it('passes intensity changes through to the debate', async () => {
    const { renderResult, navigation } = renderScreen({ featureAccess: { isDemo: false } });
    await setTopic('Climate Action');
    await fillSlot(0, 'claude');
    await fillSlot(1, 'openai');

    fireEvent.press(renderResult.getByText('Hostile'));
    await flush();

    fireEvent.press(renderResult.getByTestId('start-debate-button'));
    expect(navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({ civility: 5 }));
  });

  it('opens demo debate picker and navigates with selected sample', async () => {
    mockListDebateSamples.mockResolvedValue([{ id: 'sample-1', title: 'Sample', topic: 'AI Ethics' }]);
    mockFindDebateById.mockResolvedValue({ id: 'sample-1', title: 'Sample', topic: 'AI Ethics' });

    const { renderResult, navigation } = renderScreen({ featureAccess: { isDemo: true } });

    await setTopic('AI Ethics');
    await fillSlot(0, 'claude');
    await fillSlot(1, 'openai');

    await act(async () => {
      fireEvent.press(renderResult.getByTestId('start-debate-button'));
      await Promise.resolve();
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

    await setTopic('Climate Action');
    await fillSlot(0, 'claude');
    await fillSlot(1, 'openai');

    fireEvent.press(renderResult.getByTestId('start-debate-button'));
    await flush();

    expect(recordPickerProps.visible).toBe(true);

    await act(async () => {
      await recordPickerProps.onSelect({ type: 'new', id: 'record-1', topic: 'Custom Topic' });
    });

    expect(mockRecordController.startDebate).toHaveBeenCalledWith(expect.objectContaining({ id: 'record-1' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({ topic: 'Custom Topic' }));
  });

  it('hides voice controls without a verified ElevenLabs key', async () => {
    const { renderResult } = renderScreen({ featureAccess: { isDemo: false } });

    await setTopic('Climate Action');
    await fillSlot(0, 'claude');
    await fillSlot(1, 'openai');

    expect(renderResult.queryByText('Debate Voices')).toBeNull();
    expect(mockListElevenLabsOptions).not.toHaveBeenCalled();
    expect(slotConfigSheetProps.showVoice).toBe(false);
  });

  it('loads verified ElevenLabs voices and passes voice config to Debate', async () => {
    const { renderResult, navigation } = renderScreen({
      featureAccess: { isDemo: false },
      state: elevenLabsState(),
    });

    await setTopic('Climate Action');
    await fillSlot(0, 'claude');
    await fillSlot(1, 'openai');

    expect(renderResult.getByText('Debate Voices')).toBeTruthy();
    expect(mockListElevenLabsOptions).not.toHaveBeenCalled();

    // The first Off toggle is Debate Voices; the second is Podcast Mode.
    await act(async () => {
      fireEvent.press(renderResult.getAllByText('Off')[0]);
      await Promise.resolve();
    });
    await flush();

    expect(mockGetAPIKey).toHaveBeenCalledWith('elevenlabs');
    expect(mockListElevenLabsOptions).toHaveBeenCalledWith('eleven-key', expect.objectContaining({
      pageSize: 50,
      includeTotalCount: true,
      voiceType: 'non-community',
    }));
    expect(renderResult.getByText(/900 remaining/)).toBeTruthy();

    const [claudeDebater, openaiDebater] = teamsCardProps.slots.map((slot: any) => slot.ai);
    expect(teamsCardProps.slots[0].voiceLabel).toContain('Voice One');
    expect(teamsCardProps.slots[1].voiceLabel).toContain('Voice Two');

    fireEvent.press(renderResult.getByTestId('start-debate-button'));

    expect(navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({
      voiceConfig: {
        enabled: true,
        providerId: 'elevenlabs',
        ttsModelId: 'eleven_flash_v2_5',
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
      state: elevenLabsState(),
    });

    await setTopic('Climate Action');
    await fillSlot(0, 'claude');
    await fillSlot(1, 'openai');

    // Second Off toggle is Podcast Mode (first is Debate Voices).
    await act(async () => {
      fireEvent.press(renderResult.getAllByText('Off')[1]);
      await Promise.resolve();
    });
    await flush();

    fireEvent.press(renderResult.getByText('Add MC'));
    await flush();
    expect(providerPickerProps.visible).toBe(true);
    act(() => {
      providerPickerProps.onSelectProvider('google');
    });
    await flush();

    // MC voice still missing: Start stays blocked.
    expect(renderResult.getByText('Choose a voice for the podcast MC.')).toBeTruthy();
    fireEvent.press(renderResult.getByTestId('start-debate-button'));
    expect(navigation.navigate).not.toHaveBeenCalledWith('Debate', expect.anything());

    fireEvent.press(renderResult.getByTestId('debate-podcast-mc-row'));
    await flush();
    expect(slotConfigSheetProps.slotLabel).toBe('Podcast MC');
    expect(slotConfigSheetProps.personalityId).toBeUndefined();
    act(() => {
      slotConfigSheetProps.onSelectVoice({ id: 'voice-host', name: 'Host Voice' });
    });
    await flush();

    fireEvent.press(renderResult.getByText('Multilingual'));
    await flush();

    fireEvent.press(renderResult.getByTestId('start-debate-button'));

    expect(navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({
      voiceConfig: expect.objectContaining({
        ttsModelId: 'eleven_multilingual_v2',
        podcast: {
          enabled: true,
          scriptMode: 'byok_ai',
          outputMode: 'playlist',
          mc: expect.objectContaining({
            provider: 'google',
            model: expect.any(String),
          }),
          mcVoice: { voiceId: 'voice-host', voiceName: 'Host Voice' },
        },
      }),
    }));
  });

  it('blocks Start when podcast mode has no voices available for debaters', async () => {
    mockListElevenLabsOptions.mockResolvedValue({
      success: true,
      providerId: 'elevenlabs',
      voices: [],
    });

    const { renderResult, navigation } = renderScreen({
      featureAccess: { isDemo: false },
      state: elevenLabsState(),
    });

    await setTopic('Climate Action');
    await fillSlot(0, 'claude');
    await fillSlot(1, 'openai');

    await act(async () => {
      fireEvent.press(renderResult.getAllByText('Off')[1]);
      await Promise.resolve();
    });
    await flush();

    fireEvent.press(renderResult.getByText('Add MC'));
    await flush();
    act(() => {
      providerPickerProps.onSelectProvider('google');
    });
    await flush();

    fireEvent.press(renderResult.getByTestId('debate-podcast-mc-row'));
    await flush();
    act(() => {
      slotConfigSheetProps.onSelectVoice({ id: 'voice-host', name: 'Host Voice' });
    });
    await flush();

    expect(renderResult.getByText('Choose a voice for every debater.')).toBeTruthy();
    fireEvent.press(renderResult.getByTestId('start-debate-button'));
    expect(navigation.navigate).not.toHaveBeenCalledWith('Debate', expect.anything());
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

    expect(topicSelectorProps.selectedTopic).toBe('');
    expect(topicSelectorProps.customTopic).toBe('');
    expect(topicSelectorProps.topicMode).toBe('preset');
    expect(mockDispatch).toHaveBeenCalledWith(clearPreservedTopic());
  });

  it('keeps Oxford preset changes after returning from a completed debate', async () => {
    const { renderResult } = renderScreen({
      featureAccess: { isDemo: false },
      route: {
        resetDebateSetup: true,
        resetKey: 'reset-1',
      },
    });

    await flush();

    fireEvent.press(renderResult.getByText('2v2'));
    await flush();

    expect(renderResult.getByText(/2v2 Oxford/)).toBeTruthy();
    expect(renderResult.getByText(/4 debaters/)).toBeTruthy();

    fireEvent.press(renderResult.getByText('2v2 + Q&A'));
    await flush();

    expect(renderResult.getByText(/2v2 \+ Q&A Oxford/)).toBeTruthy();
    expect(renderResult.getByText(/8 turns/)).toBeTruthy();
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

    fireEvent.press(secondRender.renderResult.getByTestId('start-debate-button'));
    expect(mockDispatch).toHaveBeenCalledWith(clearPreservedTopic());
    expect(secondRender.navigation.navigate).toHaveBeenCalledWith('Debate', expect.objectContaining({ topic: 'Prefilled' }));
  });

  it('navigates to Stats from the header action', () => {
    const { renderResult, navigation } = renderScreen({ featureAccess: { isDemo: false } });

    fireEvent.press(renderResult.getByTestId('debate-stats-header-button'));
    expect(navigation.navigate).toHaveBeenCalledWith('Stats');
  });
});
