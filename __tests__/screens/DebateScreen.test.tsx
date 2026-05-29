import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { createAppStore, showSheet } from '@/store';
import type { AI, Message } from '@/types';
import { getPresetForFormat } from '@/config/debate/formats';
import type { DebateSessionHeaderProps } from '@/components/organisms/debate/DebateSessionHeader';
import type { AudienceQuestionsModalProps } from '@/components/organisms/debate/AudienceQuestionsModal';

// Mock ErrorService
const mockHandleWithToast = jest.fn();
const mockShowInfo = jest.fn();
const mockShowWarning = jest.fn();
const mockShowSuccess = jest.fn();

jest.mock('@/services/errors/ErrorService', () => ({
  ErrorService: {
    handleWithToast: (...args: unknown[]) => mockHandleWithToast(...args),
    showInfo: (...args: unknown[]) => mockShowInfo(...args),
    showWarning: (...args: unknown[]) => mockShowWarning(...args),
    showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
  },
}));

const baseAIs: AI[] = [
  { id: 'left', provider: 'anthropic', name: 'Claude', model: 'claude-3-opus', color: '#000' },
  { id: 'right', provider: 'openai', name: 'GPT-4', model: 'gpt-4-turbo', color: '#000' },
];

const mockFeatureAccess = jest.fn();
const mockUseDebateSession = jest.fn();
const mockUseDebateFlow = jest.fn();
const mockUseDebateVoting = jest.fn();
const mockUseTopicSelection = jest.fn();
const mockUseDebateMessages = jest.fn();
const mockUseDebateVoiceGeneration = jest.fn();
const mockCompileDebateVoicePack = jest.fn();

let mockHeaderProps: any;
let mockTopicSelectorProps: any;
let mockDebateMessageListProps: any;
let mockVotingInterfaceProps: any;
let mockAudienceQuestionsModalProps: AudienceQuestionsModalProps | undefined;
let mockScoreDisplayProps: any;
let mockDebateSessionHeaderProps: DebateSessionHeaderProps | undefined;
let mockDemoBannerProps: any;
let mockDemoSamplesBarProps: any;
let mockVictoryProps: any;
let mockTranscriptModalProps: any;

const mockStreamingService = {
  cancelAllStreams: jest.fn(),
};

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
  MaterialCommunityIcons: () => null,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/hooks/useFeatureAccess', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockFeatureAccess(...args),
  useFeatureAccess: (...args: unknown[]) => mockFeatureAccess(...args),
}));

jest.mock('@/hooks/debate', () => ({
  useDebateSession: (...args: unknown[]) => mockUseDebateSession(...args),
  useDebateFlow: (...args: unknown[]) => mockUseDebateFlow(...args),
  useDebateVoting: (...args: unknown[]) => mockUseDebateVoting(...args),
  useTopicSelection: (...args: unknown[]) => mockUseTopicSelection(...args),
  useDebateMessages: (...args: unknown[]) => mockUseDebateMessages(...args),
  useDebateVoiceGeneration: (...args: unknown[]) => mockUseDebateVoiceGeneration(...args),
}));

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Typography: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
  };
});

jest.mock('@/components/organisms', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    Header: (props: any) => {
      mockHeaderProps = props;
      return React.createElement(View, null, React.createElement(Text, { testID: 'header-title' }, props.title));
    },
    HeaderActions: () => React.createElement(Text, { testID: 'header-actions' }, 'actions'),
    TopicSelector: (props: any) => {
      mockTopicSelectorProps = props;
      return React.createElement(Text, { testID: 'topic-selector', onPress: () => props.onStartDebate?.() }, 'Topic Selector');
    },
    DebateMessageList: (props: any) => {
      mockDebateMessageListProps = props;
      return React.createElement(Text, { testID: 'debate-message-list' }, `messages:${props.messages?.length ?? 0}`);
    },
    DebateSessionHeader: (props: DebateSessionHeaderProps) => {
      mockDebateSessionHeaderProps = props;
      return React.createElement(Text, { testID: 'debate-session-header' }, 'session-header');
    },
    VotingInterface: (props: any) => {
      mockVotingInterfaceProps = props;
      return React.createElement(Text, { testID: 'voting-interface', onPress: () => props.onVote?.('left') }, 'voting');
    },
    AudienceQuestionsModal: (props: AudienceQuestionsModalProps) => {
      mockAudienceQuestionsModalProps = props;
      return React.createElement(Text, { testID: 'audience-questions-modal', onPress: () => props.onSubmit?.({ aff: 'Aff?', neg: 'Neg?' }) }, props.visible ? 'audience-questions-visible' : 'audience-questions-hidden');
    },
    ScoreDisplay: (props: any) => {
      mockScoreDisplayProps = props;
      return React.createElement(Text, { testID: 'score-display' }, 'scores');
    },
  };
});

jest.mock('@/components/organisms/debate/VictoryCelebration', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    VictoryCelebration: (props: any) => {
      mockVictoryProps = props;
      return React.createElement(Text, { testID: 'victory', onPress: props.onViewTranscript }, 'victory');
    },
  };
});

jest.mock('@/components/organisms/debate/TranscriptModal', () => ({
  TranscriptModal: (props: any) => {
    mockTranscriptModalProps = props;
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'transcript-modal' }, props.visible ? 'visible' : 'hidden');
  },
}));

jest.mock('@/components/organisms/demo/DebateRecordPickerModal', () => ({
  DebateRecordPickerModal: () => null,
}));

jest.mock('@/components/molecules/subscription/DemoBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    DemoBanner: (props: any) => {
      mockDemoBannerProps = props;
      return React.createElement(Text, { testID: 'demo-banner', onPress: props.onPress }, 'demo-banner');
    },
    __esModule: true,
    default: (props: any) => {
      mockDemoBannerProps = props;
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, { testID: 'demo-banner', onPress: props.onPress }, 'demo-banner');
    },
  };
});

jest.mock('@/components/organisms/demo/DemoSamplesBar', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    DemoSamplesBar: (props: any) => {
      mockDemoSamplesBarProps = props;
      return React.createElement(Text, { testID: 'demo-samples', onPress: () => props.onSelect?.(props.samples?.[0]?.id) }, props.label || 'samples');
    },
  };
});

jest.mock('@/services/demo/DemoContentService', () => ({
  DemoContentService: {
    findDebateById: jest.fn().mockResolvedValue(null),
    listDebateSamples: jest.fn().mockResolvedValue([]),
    getDebateSampleForProviders: jest.fn().mockResolvedValue(null),
  },
  __esModule: true,
  default: {
    findDebateById: jest.fn().mockResolvedValue(null),
    listDebateSamples: jest.fn().mockResolvedValue([]),
    getDebateSampleForProviders: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('@/services/demo/DemoPlaybackRouter', () => ({
  primeDebate: jest.fn(),
}));

jest.mock('@/services/demo/RecordController', () => ({
  RecordController: {
    isActive: jest.fn().mockReturnValue(false),
    startDebate: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('@/services/demo/AppendToPackService', () => ({
  __esModule: true,
  default: {
    append: jest.fn().mockResolvedValue({ ok: true }),
  },
}));

jest.mock('@/services/debate/debateAudioCompileService', () => ({
  __esModule: true,
  default: {
    compileDebateVoicePack: (...args: unknown[]) => mockCompileDebateVoicePack(...args),
  },
}));

jest.mock('@/hooks/usePersonality', () => ({
  usePersonality: () => ({
    isLoading: false,
    settings: { customizations: {}, lastSyncedAt: 0, version: 1 },
    getPersonality: jest.fn().mockReturnValue(null),
    getAllPersonalities: jest.fn().mockReturnValue([]),
    isCustomized: jest.fn().mockReturnValue(false),
    getCustomization: jest.fn().mockReturnValue(null),
    updateCustomization: jest.fn(),
    updateTone: jest.fn(),
    updateDebateProfile: jest.fn(),
    updateModelParameters: jest.fn(),
    toggleCustomization: jest.fn(),
    resetToDefaults: jest.fn(),
    resetAll: jest.fn(),
    reload: jest.fn(),
  }),
  usePersonalityById: () => null,
}));

jest.mock('@/services/streaming/StreamingService', () => ({
  getStreamingService: () => mockStreamingService,
}));

const DebateScreen = require('@/screens/DebateScreen').default;
const DemoContentService = require('@/services/demo/DemoContentService').DemoContentService;
const { primeDebate } = require('@/services/demo/DemoPlaybackRouter');

beforeEach(() => {
  jest.clearAllMocks();
  mockStreamingService.cancelAllStreams.mockClear();
  mockHeaderProps = undefined;
  mockTopicSelectorProps = undefined;
  mockDebateMessageListProps = undefined;
  mockVotingInterfaceProps = undefined;
  mockAudienceQuestionsModalProps = undefined;
  mockScoreDisplayProps = undefined;
  mockDebateSessionHeaderProps = undefined;
  mockDemoBannerProps = undefined;
  mockDemoSamplesBarProps = undefined;
  mockVictoryProps = undefined;
  mockTranscriptModalProps = undefined;
  Alert.alert = jest.fn();
});

const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const createSessionState = (overrides: Record<string, unknown> = {}) => ({
  session: null,
  orchestrator: null,
  isInitialized: false,
  initializeSession: jest.fn().mockResolvedValue(undefined),
  resetSession: jest.fn(),
  hydrateSessionFromSnapshot: jest.fn().mockResolvedValue(undefined),
  error: null,
  ...overrides,
});

const createFlowState = (overrides: Record<string, unknown> = {}) => ({
  startDebate: jest.fn().mockResolvedValue(undefined),
  continueDebate: jest.fn(),
  submitAudienceQuestions: jest.fn(),
  continuation: null,
  audienceQuestionsPrompt: null,
  isDebateActive: false,
  isDebateEnded: false,
  currentMessageIndex: 0,
  totalMessages: 0,
  error: null,
  ...overrides,
});

const createVotingState = (overrides: Record<string, unknown> = {}) => ({
  isVoting: false,
  isOverallVote: false,
  isFinalVote: false,
  voteKind: 'checkpoint',
  audienceVoteStage: undefined,
  audienceResult: undefined,
  votingRound: 1,
  scores: null,
  voteRecords: [],
  getVotingPrompt: jest.fn().mockReturnValue('Vote now'),
  getVoteCriterion: jest.fn().mockReturnValue('Opening Statements: choose who gave the clearer motion framing.'),
  recordVote: jest.fn().mockResolvedValue(undefined),
  error: null,
  ...overrides,
});

const createTopicSelectionState = (overrides: Record<string, unknown> = {}) => ({
  finalTopic: '',
  selectedTopic: null,
  setTopic: jest.fn(),
  resetTopic: jest.fn(),
  ...overrides,
});

const createMessagesState = (overrides: Record<string, unknown> = {}) => ({
  messages: [],
  typingAIs: [],
  addHostMessage: jest.fn(),
  ...overrides,
});

type RenderOptions = {
  session?: Record<string, unknown>;
  flow?: Record<string, unknown>;
  voting?: Record<string, unknown>;
  topicSelection?: Record<string, unknown>;
  messages?: Record<string, unknown>;
  featureAccess?: Record<string, unknown>;
  routeParams?: Record<string, unknown>;
  store?: ReturnType<typeof createAppStore>;
};

const renderScreen = (options: RenderOptions = {}) => {
  const {
    session: sessionOverrides,
    flow: flowOverrides,
    voting: votingOverrides,
    topicSelection: topicOverrides,
    messages: messagesOverrides,
    featureAccess,
    routeParams,
    store,
  } = options;

  const sessionState = createSessionState(sessionOverrides);
  const flowState = createFlowState(flowOverrides);
  const votingState = createVotingState(votingOverrides);
  const topicSelectionState = createTopicSelectionState(topicOverrides);
  const messagesState = createMessagesState(messagesOverrides);

  mockUseDebateSession.mockReturnValue(sessionState);
  mockUseDebateFlow.mockReturnValue(flowState);
  mockUseDebateVoting.mockReturnValue(votingState);
  mockUseTopicSelection.mockReturnValue(topicSelectionState);
  mockUseDebateMessages.mockReturnValue(messagesState);
  mockUseDebateVoiceGeneration.mockReturnValue({
    canRetryAudio: false,
    retryMessageAudio: jest.fn(),
  });
  mockFeatureAccess.mockReturnValue({ isDemo: false, ...featureAccess });

  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  };

  const defaultRoute = {
    params: {
      selectedAIs: baseAIs,
      ...routeParams,
    },
  } as any;

  const storeToUse = store ?? createAppStore();

  const renderResult = renderWithProviders(
    <DebateScreen navigation={navigation as any} route={defaultRoute} />,
    { store: storeToUse }
  );

  return {
    renderResult,
    navigation,
    sessionState,
    flowState,
    votingState,
    topicSelectionState,
    messagesState,
    store: renderResult.store,
  };
};

describe('DebateScreen', () => {
  it('shows loading state while orchestrator initializes', async () => {
    renderScreen({
      session: { orchestrator: null, isInitialized: false },
      routeParams: { topic: 'Climate Policy' },
    });

    await flushMicrotasks();

    expect(mockHeaderProps.title).toContain('Climate Policy');
    expect(mockDebateMessageListProps).toBeUndefined();
  });

  it('renders topic selector and demo banner in demo mode when no topic selected', async () => {
    renderScreen({
      featureAccess: { isDemo: true },
      topicSelection: { finalTopic: '' },
    });

    await flushMicrotasks();

    expect(mockTopicSelectorProps).toBeDefined();
    expect(mockDemoBannerProps).toBeDefined();
  });

  it('auto starts debate when initial topic provided', async () => {
    jest.useFakeTimers();
    const initializeSession = jest.fn().mockResolvedValue(undefined);
    const startDebate = jest.fn().mockResolvedValue(undefined);
    const addHostMessage = jest.fn();

    renderScreen({
      session: { orchestrator: {}, initializeSession, isInitialized: false },
      flow: { startDebate },
      messages: { addHostMessage },
      routeParams: { topic: 'AI Safety' },
    });

    await flushMicrotasks();

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    await flushMicrotasks();

    expect(initializeSession).toHaveBeenCalledWith(
      'AI Safety',
      baseAIs,
      expect.any(Object),
      expect.objectContaining({ formatId: 'oxford' })
    );
    expect(addHostMessage).toHaveBeenCalledWith(expect.stringContaining('opening audience stance'));
    expect(startDebate).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('displays messages, voting, and scores when debate is active', async () => {
    const recordVote = jest.fn().mockResolvedValue(undefined);
    const preset = getPresetForFormat('lincoln_douglas', 'standard');
    const voteRecords = [{
      round: 1,
      winnerId: 'left',
      winnerName: 'Claude',
      votingLabel: 'Value constructives',
      criterion: 'Value constructives: choose who better established and defended their value, criterion, definitions, and contentions.',
      timestamp: 100,
    }];

    renderScreen({
      flow: { isDebateActive: true, currentMessageIndex: 2, currentTurnLabel: 'Cross-Examination (CX) · answering' },
      messages: {
        messages: [
          { id: 'm1', sender: 'Host', senderType: 'ai', content: 'Opening', timestamp: 1 } as Message,
        ],
      },
      session: { isInitialized: true, session: { topic: 'Topic', preset }, orchestrator: {} },
      routeParams: { formatId: 'lincoln_douglas' },
      voting: {
        isVoting: true,
        scores: {
          left: { name: 'Claude', roundWins: 1, roundsWon: [1], isOverallWinner: false },
          right: { name: 'GPT-4', roundWins: 0, roundsWon: [], isOverallWinner: false },
        },
        voteRecords,
        getVoteCriterion: jest.fn().mockReturnValue('Value constructives: choose who better established and defended their value, criterion, definitions, and contentions.'),
        recordVote,
      },
    });

    await flushMicrotasks();

    expect(mockDebateMessageListProps.messages).toHaveLength(1);
    expect(mockDebateSessionHeaderProps).toBeDefined();
    expect(mockDebateSessionHeaderProps?.timelineMessages).toHaveLength(preset.messages.length);
    expect(mockDebateSessionHeaderProps?.currentMessageIndex).toBe(2);
    expect(mockDebateSessionHeaderProps?.currentTurnLabel).toBe('Cross-Examination (CX) · answering');
    expect(mockDebateSessionHeaderProps?.activeSideLabel).toBe('Affirmative · answers');
    expect(mockDebateSessionHeaderProps?.presetLabel).toContain('Lincoln-Douglas');
    expect(mockDebateSessionHeaderProps?.teams[0].participants[0].name).toBe('Claude');
    expect(mockDebateSessionHeaderProps?.teams[1].participants[0].name).toBe('GPT-4');
    expect(mockHeaderProps).toBeUndefined();
    expect(mockVotingInterfaceProps).toBeDefined();
    expect(mockVotingInterfaceProps.voteCriterion).toBe('Value constructives: choose who better established and defended their value, criterion, definitions, and contentions.');
    expect(mockScoreDisplayProps.scores.left.roundWins).toBe(1);

    mockVotingInterfaceProps.onVote('left');
    expect(recordVote).toHaveBeenCalledWith('left');
  });

  it('shows the debate continuation prompt and resumes when pressed', async () => {
    const continueDebate = jest.fn();
    const preset = getPresetForFormat('oxford', 'short');
    const { renderResult } = renderScreen({
      flow: {
        isDebateActive: true,
        continuation: {
          title: 'Opening speeches complete',
          message: 'Review the last two speeches or finish any voice clips before the next round begins.',
          buttonLabel: 'Continue Debate',
          isFinalReview: false,
          completedMessageIndex: 1,
          nextMessageIndex: 2,
        },
        continueDebate,
      },
      messages: {
        messages: [
          { id: 'm1', sender: 'Claude', senderType: 'ai', content: 'Opening', timestamp: 1 } as Message,
        ],
      },
      session: { isInitialized: true, session: { topic: 'Topic', preset }, orchestrator: {} },
    });

    await flushMicrotasks();

    expect(renderResult.getByText('Opening speeches complete')).toBeTruthy();
    expect(renderResult.getByText('Continue Debate')).toBeTruthy();

    fireEvent.press(renderResult.getByTestId('debate-continuation-button'));

    expect(continueDebate).toHaveBeenCalledTimes(1);
  });

  it('shows the audience questions modal and submits questions', async () => {
    const submitAudienceQuestions = jest.fn();
    const preset = getPresetForFormat('oxford', 'long');
    const { renderResult } = renderScreen({
      flow: {
        isDebateActive: true,
        audienceQuestionsPrompt: {
          title: 'Audience questions',
          message: 'Enter one question for each side.',
          completedMessageIndex: 3,
          nextMessageIndex: 4,
          affirmativeLabel: 'Affirmative',
          negativeLabel: 'Negative',
          required: true,
        },
        submitAudienceQuestions,
      },
      messages: {
        messages: [
          { id: 'm1', sender: 'Claude', senderType: 'ai', content: 'Opening', timestamp: 1 } as Message,
        ],
      },
      session: { isInitialized: true, session: { topic: 'Topic', preset }, orchestrator: {} },
      routeParams: { formatId: 'oxford', rounds: 7 },
    });

    await flushMicrotasks();

    expect(mockAudienceQuestionsModalProps).toEqual(expect.objectContaining({
      visible: true,
      title: 'Audience questions',
      affirmativeLabel: 'Affirmative',
      negativeLabel: 'Negative',
    }));

    fireEvent.press(renderResult.getByTestId('audience-questions-modal'));

    expect(submitAudienceQuestions).toHaveBeenCalledWith({
      aff: 'Aff?',
      neg: 'Neg?',
    });
  });

  it('shows alert when vote submission fails', async () => {
    const recordVote = jest.fn().mockRejectedValue(new Error('vote failed'));

    renderScreen({
      flow: { isDebateActive: true },
      messages: {
        messages: [
          { id: 'm1', sender: 'Host', senderType: 'ai', content: 'Opening', timestamp: 1 } as Message,
        ],
      },
      session: { isInitialized: true, session: { topic: 'Topic' }, orchestrator: {} },
      voting: {
        isVoting: true,
        recordVote,
      },
    });

    await flushMicrotasks();

    await act(async () => {
      await mockVotingInterfaceProps.onVote('left');
    });

    // Error is now shown via ErrorService.handleWithToast instead of Alert.alert
    expect(mockHandleWithToast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'vote failed' }),
      { feature: 'debate' }
    );
  });

  it('loads demo sample from samples bar and primes debate', async () => {
    const sample = { id: 'sample-1', title: 'Sample', topic: 'Topic' };
    DemoContentService.listDebateSamples.mockResolvedValueOnce([{ id: 'sample-1', title: 'Sample', topic: 'Topic' }]);
    DemoContentService.findDebateById.mockResolvedValueOnce(sample as any);
    const initializeSession = jest.fn().mockResolvedValue(undefined);

    renderScreen({
      featureAccess: { isDemo: true },
      topicSelection: { finalTopic: '' },
      session: { initializeSession },
    });

    await flushMicrotasks();
    await flushMicrotasks();

    await act(async () => {
      await mockDemoSamplesBarProps.onSelect('sample-1');
    });

    expect(DemoContentService.findDebateById).toHaveBeenCalledWith('sample-1');
    expect(primeDebate).toHaveBeenCalledWith(sample);
    expect(initializeSession).toHaveBeenCalled();
  });

  it('dispatches subscription sheet when demo banner pressed', async () => {
    const store = createAppStore();
    const dispatchSpy = jest.spyOn(store, 'dispatch');

    renderScreen({ featureAccess: { isDemo: true }, topicSelection: { finalTopic: '' }, store });

    await act(async () => {
      mockDemoBannerProps.onPress();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(showSheet({ sheet: 'subscription' }));
  });

  it('shows victory celebration and opens transcript when messages exist', async () => {
    renderScreen({
      flow: { isDebateEnded: true },
      messages: {
        messages: [
          { id: '1', sender: 'Host', senderType: 'ai', content: 'Summary', timestamp: 1 } as Message,
        ],
      },
      session: { isInitialized: true, session: { topic: 'Topic' }, orchestrator: {} },
      voting: {
        scores: {
          left: { name: 'Claude', roundWins: 2, roundsWon: [1, 2], isOverallWinner: true },
          right: { name: 'GPT-4', roundWins: 1, roundsWon: [3], isOverallWinner: false },
        },
        isOverallVote: true,
        isVoting: false,
      },
      routeParams: { formatId: 'policy' },
    });

    await flushMicrotasks();

    expect(mockVictoryProps).toBeDefined();
    expect(mockDebateSessionHeaderProps).toBeUndefined();
    expect(mockHeaderProps).toBeUndefined();

    act(() => {
      mockVictoryProps.onViewTranscript();
    });

    expect(mockTranscriptModalProps.visible).toBe(true);
  });

  it('hides debate headers for Oxford audience decision victory', async () => {
    const preset = getPresetForFormat('oxford', 'short');

    renderScreen({
      flow: { isDebateEnded: true, currentMessageIndex: preset.messages.length - 1 },
      messages: {
        messages: [
          { id: '1', sender: 'Host', senderType: 'ai', content: 'Summary', timestamp: 1 } as Message,
        ],
      },
      session: { isInitialized: true, session: { topic: 'Pineapple on pizza is acceptable.', preset }, orchestrator: {} },
      voting: {
        voteKind: 'audience_stance',
        audienceResult: {
          initialStance: 'against',
          finalStance: 'against',
          winningSide: 'neg',
          winningSideLabel: 'Negative',
          resultVerb: 'held',
          summary: 'Negative held the audience at Against.',
          winningParticipantIds: ['right'],
        },
        scores: {},
      },
      routeParams: { formatId: 'oxford' },
    });

    await flushMicrotasks();

    expect(mockVictoryProps).toBeDefined();
    expect(mockDebateSessionHeaderProps).toBeUndefined();
    expect(mockHeaderProps).toBeUndefined();
  });

  it('generates a selected-clips podcast file and navigates to the finished Gallery audio item', async () => {
    const compiledAudio = {
      id: 'compile-job-1',
      uri: 'file:///documents/gallery-podcasts/debate_podcast_debate_1_1000/compiled.mp3',
      mimeType: 'audio/mpeg',
      fileName: 'compiled.mp3',
      createdAt: 2000,
      remoteUrl: 'https://signed.example/debate-podcast.mp3',
      storagePath: 'debate-audio-compile/user/job/output/debate-podcast.mp3',
      expiresAt: 3000,
    };
    mockCompileDebateVoicePack.mockResolvedValueOnce(compiledAudio);

    const voicedMessage: Message = {
      id: 'msg_1_openai',
      sender: 'Claude (Default)',
      senderType: 'ai',
      content: 'Opening statement.',
      timestamp: 1,
      attachments: [{ type: 'audio', uri: 'file:///debate/msg_1.mp3', mimeType: 'audio/mpeg' }],
      metadata: {
        providerId: 'left',
        debateSpeech: { speaker: 'aff', label: 'Opening statement' },
        debateAudio: {
          status: 'ready',
          voiceId: 'voice-1',
          voiceName: 'Aria',
          uri: 'file:///debate/msg_1.mp3',
          mimeType: 'audio/mpeg',
        },
      },
    };

    const { renderResult, navigation, store } = renderScreen({
      flow: { isDebateEnded: true },
      messages: { messages: [voicedMessage] },
      session: { isInitialized: true, session: { id: 'debate_1', topic: 'Resolved: podcasts matter.' }, orchestrator: {} },
      voting: {
        scores: {
          left: { name: 'Claude', roundWins: 1, roundsWon: [1], isOverallWinner: true },
        },
        isOverallVote: true,
        isVoting: false,
      },
      routeParams: {
        topic: 'Resolved: podcasts matter.',
        formatId: 'policy',
        voiceConfig: {
          enabled: true,
          providerId: 'elevenlabs',
          debaterVoices: {
            left: { voiceId: 'voice-1', voiceName: 'Aria' },
          },
        },
      },
    });

    await flushMicrotasks();

    expect(mockVictoryProps.voicePackActionLabel).toBe('Podcast');

    act(() => {
      mockVictoryProps.onSaveVoicePack();
    });

    expect(renderResult.getAllByText('Generate Podcast File').length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.press(renderResult.getByTestId('voice-pack-save'));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockCompileDebateVoicePack).toHaveBeenCalledWith(expect.objectContaining({
        kind: 'debate_podcast_playlist',
        topic: 'Resolved: podcasts matter.',
        clips: [expect.objectContaining({
          messageId: 'msg_1_openai',
          uri: 'file:///debate/msg_1.mp3',
        })],
      }));
      expect(store.getState().create.mediaGallery[0]).toMatchObject({
        mediaType: 'audio',
        modelId: 'debate_podcast',
        operation: 'debate_podcast_playlist',
        prompt: 'Debate podcast: Resolved: podcasts matter.',
        uri: compiledAudio.uri,
        mimeType: compiledAudio.mimeType,
      });
      expect(store.getState().create.mediaGallery[0].voicePack).toBeUndefined();
      expect(mockShowSuccess).toHaveBeenCalledWith('Podcast file generated and saved to Gallery.', 'debate');
      expect(navigation.navigate).toHaveBeenCalledWith('CreateSession', {
        focusMediaId: store.getState().create.mediaGallery[0].id,
        galleryTab: 'audio',
      });
    });
  });

  it('keeps the podcast modal stable when debate messages are rebuilt during render', async () => {
    const voicedMessage: Message = {
      id: 'msg_1_openai',
      sender: 'Claude (Default)',
      senderType: 'ai',
      content: 'Opening statement.',
      timestamp: 1,
      attachments: [{ type: 'audio', uri: 'file:///debate/msg_1.mp3', mimeType: 'audio/mpeg' }],
      metadata: {
        providerId: 'left',
        debateSpeech: { speaker: 'aff', label: 'Opening statement' },
        debateAudio: {
          status: 'ready',
          voiceId: 'voice-1',
          voiceName: 'Aria',
          uri: 'file:///debate/msg_1.mp3',
          mimeType: 'audio/mpeg',
        },
      },
    };

    const { renderResult } = renderScreen({
      flow: { isDebateEnded: true },
      messages: { messages: [voicedMessage] },
      session: { isInitialized: true, session: { id: 'debate_1', topic: 'Resolved: podcasts matter.' }, orchestrator: {} },
      voting: {
        scores: {
          left: { name: 'Claude', roundWins: 1, roundsWon: [1], isOverallWinner: true },
        },
        isOverallVote: true,
        isVoting: false,
      },
      routeParams: {
        topic: 'Resolved: podcasts matter.',
        formatId: 'policy',
        voiceConfig: {
          enabled: true,
          providerId: 'elevenlabs',
          debaterVoices: {
            left: { voiceId: 'voice-1', voiceName: 'Aria' },
          },
        },
      },
    });

    mockUseDebateMessages.mockImplementation(() => createMessagesState({
      messages: [{
        ...voicedMessage,
        attachments: [...(voicedMessage.attachments || [])],
        metadata: { ...voicedMessage.metadata },
      }],
    }));

    await flushMicrotasks();

    act(() => {
      mockVictoryProps.onSaveVoicePack();
    });

    await waitFor(() => {
      expect(renderResult.getAllByText('Generate Podcast File').length).toBeGreaterThan(0);
      expect(renderResult.getByText('1 selected • 1 ready')).toBeTruthy();
    });
  });

  it('starts a rematch with the same debate configuration', async () => {
    const resetSession = jest.fn();
    const personalities = { left: 'sage', right: 'default' };
    const { navigation } = renderScreen({
      flow: { isDebateEnded: true },
      messages: {
        messages: [
          { id: '1', sender: 'Host', senderType: 'ai', content: 'Summary', timestamp: 1 } as Message,
        ],
      },
      session: {
        isInitialized: true,
        session: { topic: 'Resolved: AI should be regulated.' },
        orchestrator: {},
        resetSession,
      },
      voting: {
        scores: {
          left: { name: 'Claude', roundWins: 2, roundsWon: [1, 2], isOverallWinner: true },
          right: { name: 'GPT-4', roundWins: 1, roundsWon: [3], isOverallWinner: false },
        },
        isOverallVote: true,
        isVoting: false,
      },
      routeParams: {
        topic: 'Resolved: AI should be regulated.',
        personalities,
        formatId: 'policy',
        rounds: 5,
        exchanges: 5,
        civility: 3,
      },
    });

    await flushMicrotasks();

    act(() => {
      mockVictoryProps.onRematch();
    });

    expect(mockStreamingService.cancelAllStreams).toHaveBeenCalled();
    expect(resetSession).toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('Debate', expect.objectContaining({
      selectedAIs: baseAIs,
      topic: 'Resolved: AI should be regulated.',
      personalities,
      formatId: 'policy',
      rounds: 5,
      exchanges: 5,
      civility: 3,
      rematchKey: expect.any(String),
    }));
  });

  it('starts over from the victory screen by returning to debate setup', async () => {
    const resetSession = jest.fn();
    const { navigation } = renderScreen({
      flow: { isDebateEnded: true },
      session: { isInitialized: true, session: { topic: 'Topic' }, orchestrator: {}, resetSession },
      voting: {
        scores: {
          left: { name: 'Claude', roundWins: 1, roundsWon: [1], isOverallWinner: true },
        },
        isOverallVote: true,
        isVoting: false,
      },
      routeParams: { formatId: 'policy' },
    });

    await flushMicrotasks();

    act(() => {
      mockVictoryProps.onStartOver();
    });

    expect(mockStreamingService.cancelAllStreams).toHaveBeenCalled();
    expect(resetSession).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'DebateTab',
      params: expect.objectContaining({
        resetDebateSetup: true,
        resetKey: expect.any(String),
      }),
    });
  });

  it('alerts when viewing transcript without messages', async () => {
    renderScreen({
      flow: { isDebateEnded: true },
      messages: { messages: [] },
      session: { isInitialized: true, session: { topic: 'Topic' }, orchestrator: {} },
      voting: {
        scores: {
          left: { name: 'Claude', roundWins: 1, roundsWon: [1], isOverallWinner: true },
        },
        isOverallVote: true,
        isVoting: false,
      },
      routeParams: { formatId: 'policy' },
    });

    await flushMicrotasks();

    act(() => {
      mockVictoryProps.onViewTranscript();
    });

    // Info message is now shown via ErrorService.showInfo instead of Alert.alert
    expect(mockShowInfo).toHaveBeenCalledWith('No messages to display in transcript.', 'debate');
  });

  it('stops streams and resets session after confirming start over', async () => {
    const resetSession = jest.fn();
    const { navigation } = renderScreen({
      session: { resetSession },
    });

    mockHeaderProps.onBack();

    expect(mockStreamingService.cancelAllStreams).not.toHaveBeenCalled();
    expect(resetSession).not.toHaveBeenCalled();

    const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertArgs[2] as Array<{ text: string; onPress?: () => void }>;
    const startOverButton = buttons.find((btn) => btn.text === 'Start Over');

    await act(async () => {
      await startOverButton?.onPress?.();
    });

    expect(mockStreamingService.cancelAllStreams).toHaveBeenCalled();
    expect(resetSession).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'DebateTab',
      params: expect.objectContaining({
        resetDebateSetup: true,
        resetKey: expect.any(String),
      }),
    });
  });
});
