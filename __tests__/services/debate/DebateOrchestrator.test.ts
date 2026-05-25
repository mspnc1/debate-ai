import { DebateOrchestrator, DebateStatus } from '@/services/debate/DebateOrchestrator';
import { DEBATE_CONSTANTS } from '@/config/debateConstants';
import { getPresetForFormat } from '@/config/debate/formats';
import type { AI, DebateVoiceConfig, Message } from '@/types';
import { setProviderVerificationError } from '@/store/streamingSlice';

const mockMergeAvailabilitiesStrict = jest.fn();
jest.mock('@/hooks/multimodal/useModalityAvailability', () => ({
  mergeAvailabilitiesStrict: (...args: unknown[]) => mockMergeAvailabilitiesStrict(...args),
}));

jest.mock('@/services/chat/StorageService', () => ({
  StorageService: {
    enforceStorageLimits: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockStreamingService = {
  streamResponse: jest.fn(),
  cancelStream: jest.fn(),
  cancelAllStreams: jest.fn(),
};

jest.mock('@/services/streaming/StreamingService', () => ({
  getStreamingService: jest.fn(() => mockStreamingService),
}));

jest.mock('@/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(),
  },
}));

const { store } = jest.requireMock('@/store');

const defaultState = {
  user: { currentUser: { subscription: 'free' } },
  streaming: {
    streamingPreferences: {
      claude: { enabled: true },
      'gpt-4': { enabled: true },
    },
    globalStreamingEnabled: true,
    streamingSpeed: 'natural',
    providerVerificationErrors: {},
  },
  settings: {
    expertMode: {},
  },
};

const participants: AI[] = [
  {
    id: 'claude',
    provider: 'claude',
    name: 'Claude',
    model: 'claude-3-opus',
  } as AI,
  {
    id: 'gpt-4',
    provider: 'openai',
    name: 'GPT-4',
    model: 'gpt-4.1-mini',
  } as AI,
];

describe('DebateOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.getState.mockReturnValue(defaultState);
    mockStreamingService.streamResponse.mockReset();
    mockStreamingService.cancelAllStreams.mockReset();
    mockStreamingService.cancelStream.mockReset();
    // Default: web search not supported
    mockMergeAvailabilitiesStrict.mockReturnValue({
      webSearch: { supported: false },
      imageUpload: { supported: false },
      documentUpload: { supported: false },
      imageGeneration: { supported: false },
      videoGeneration: { supported: false },
    });
  });

  it('throws when debate setup validation fails', async () => {
    const orchestrator = new DebateOrchestrator({
      getAdapter: jest.fn(),
      sendMessage: jest.fn(),
    } as unknown as Parameters<typeof DebateOrchestrator>[0]);

    await expect(
      orchestrator.initializeDebate('Missing opponent', [participants[0]])
    ).rejects.toThrow('Invalid debate setup');
  });

  it('enables streaming fallback with verification error and schedules next turn', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {},
      getCapabilities: jest.fn(() => ({ streaming: true })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };

    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'Recovered after verification error' }),
    };

    mockStreamingService.streamResponse.mockImplementation(async (_config, _onChunk, _onComplete, onError) => {
      onError?.(new Error('Streaming requires organization verification'));
    });

    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const session = await orchestrator.initializeDebate('AI ethics', participants, {}, { formatId: 'lincoln_douglas', rounds: 3 });
    expect(session.status).toBe(DebateStatus.ACTIVE);

    const events: string[] = [];
    orchestrator.addEventListener(event => events.push(event.type));

    await orchestrator.startDebate([]);

    expect(aiService.sendMessage).toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalledWith(
      setProviderVerificationError({ providerId: 'claude', hasError: true })
    );
    expect(events).toContain('stream_error');
    expect(events).toContain('stream_completed');

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('schedules next turn after successful streaming', async () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const adapter = {
      config: {},
      getCapabilities: jest.fn(() => ({ streaming: true })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };

    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn(),
    };

    const streamChunks: string[] = [];
    mockStreamingService.streamResponse.mockImplementation(async (_config, onChunk, onComplete) => {
      if (onChunk) {
        onChunk('partial');
        streamChunks.push('partial');
      }
      onComplete?.('finalized');
    });

    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);

    await orchestrator.initializeDebate('Climate policy', participants, {}, { formatId: 'lincoln_douglas', rounds: 3 });
    await orchestrator.startDebate([]);

    expect(aiService.sendMessage).not.toHaveBeenCalled();
    expect(streamChunks).toHaveLength(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), DEBATE_CONSTANTS.DELAYS.POST_STREAM_PAUSE);

    setTimeoutSpy.mockRestore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('emits typing while a streaming turn is being prepared', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {},
      getCapabilities: jest.fn(() => ({ streaming: true })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };

    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn(),
    };

    mockStreamingService.streamResponse.mockImplementation(async (_config, _onChunk, onComplete) => {
      onComplete?.('Prepared response');
    });

    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const events: Array<{ type: string; data: Record<string, unknown> }> = [];
    orchestrator.addEventListener(event => events.push({ type: event.type, data: event.data }));

    await orchestrator.initializeDebate('Climate policy', participants, {}, { formatId: 'lincoln_douglas', rounds: 3 });
    await orchestrator.startDebate([]);

    const eventTypes = events.map(event => event.type);
    expect(events.find(event => event.type === 'typing_started')?.data).toEqual(expect.objectContaining({
      aiName: 'Claude',
      messageIndex: 0,
      messageLabel: 'Affirmative Constructive (AC)',
      phase: 'constructive',
    }));
    expect(eventTypes.indexOf('typing_started')).toBeLessThan(eventTypes.indexOf('message_added'));
    expect(eventTypes.indexOf('typing_started')).toBeLessThan(eventTypes.indexOf('stream_started'));
    expect(eventTypes.indexOf('typing_stopped')).toBeGreaterThan(eventTypes.indexOf('stream_started'));

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('passes selected debate personality and model parameters into the adapter', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: true })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => 'adapter prompt'),
    };

    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn(),
    };

    mockStreamingService.streamResponse.mockImplementation(async (_config, _onChunk, onComplete) => {
      onComplete?.('finalized');
    });

    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    await orchestrator.initializeDebate('AI regulation should be stricter.', participants, { claude: 'george' }, { formatId: 'lincoln_douglas', rounds: 3, civility: 5 });
    await orchestrator.startDebate([]);

    expect(adapter.setTemporaryPersonality).toHaveBeenCalledWith(expect.objectContaining({
      id: 'george',
      systemPrompt: expect.stringContaining('PG-13 observational satirist'),
    }));
    expect(adapter.setTemporaryPersonality).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: expect.stringContaining('Affirmative (FOR)'),
    }));
    expect(adapter.config.parameters).toEqual(expect.objectContaining({
      temperature: 0.9,
      maxTokens: expect.any(Number),
    }));
    expect(adapter.config.parameters.maxTokens).toBeLessThan(600);

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('maps legacy rounds values to selected presets', async () => {
    const orchestrator = new DebateOrchestrator({
      getAdapter: jest.fn(),
      sendMessage: jest.fn(),
    } as unknown as Parameters<typeof DebateOrchestrator>[0]);

    const session = await orchestrator.initializeDebate('Climate policy', participants, {}, {
      formatId: 'policy',
      rounds: 5,
    });
    const policyStandard = getPresetForFormat('policy', 'standard');

    expect(session.presetId).toBe('standard');
    expect(session.preset).toEqual(policyStandard);
    expect(session.totalMessages).toBe(policyStandard.messages.length);
    expect(session.totalRounds).toBe(policyStandard.voteCount);
  });

  it('runs the Oxford short opening sequence from preset messages', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);

    await orchestrator.initializeDebate('AI ethics', participants, {}, {
      formatId: 'oxford',
      rounds: 3,
    });

    await orchestrator.executeDebateMessage(0, []);
    await orchestrator.executeDebateMessage(1, []);

    expect(aiService.sendMessage.mock.calls[0][0]).toBe('claude');
    expect(aiService.sendMessage.mock.calls[0][1]).toContain('Turn: Affirmative Opening Statement');
    expect(aiService.sendMessage.mock.calls[0][1]).toContain('Length: 154-220 words maximum');
    expect(aiService.sendMessage.mock.calls[1][0]).toBe('openai');
    expect(aiService.sendMessage.mock.calls[1][1]).toContain('Turn: Negative Opening Statement');

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('requires opening audience stance before an Oxford debate starts', async () => {
    jest.useFakeTimers();
    const aiService = {
      getAdapter: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const votingEvents: Array<Record<string, unknown>> = [];
    const typingEvents: Array<Record<string, unknown>> = [];
    orchestrator.addEventListener(event => {
      if (event.type === 'voting_started' || event.type === 'voting_completed') {
        votingEvents.push(event.data);
      }
      if (event.type === 'typing_started') {
        typingEvents.push(event.data);
      }
    });

    await orchestrator.initializeDebate('AI ethics', participants, {}, {
      formatId: 'oxford',
      rounds: 3,
    });
    await orchestrator.startDebate([]);

    expect(aiService.sendMessage).not.toHaveBeenCalled();
    expect(votingEvents[0]).toEqual(expect.objectContaining({
      voteKind: 'audience_stance',
      audienceVoteStage: 'initial',
      votingLabel: 'Opening Audience Stance',
    }));

    await orchestrator.recordVote(0, 'undecided');

    expect(votingEvents[1]).toEqual(expect.objectContaining({
      voteKind: 'audience_stance',
      audienceVoteStage: 'initial',
    }));
    expect(typingEvents[0]).toEqual(expect.objectContaining({
      aiName: 'Claude',
      messageIndex: 0,
      messageLabel: 'Affirmative Opening Statement',
      phase: 'opening',
    }));

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('emits a podcast intro interstitial after the opening audience stance', async () => {
    jest.useFakeTimers();
    const aiService = {
      getAdapter: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({ response: "Welcome to tonight's debate.", modelUsed: 'gpt-5' }),
    };
    const voiceConfig: DebateVoiceConfig = {
      enabled: true,
      providerId: 'elevenlabs',
      debaterVoices: {},
      podcast: {
        enabled: true,
        scriptMode: 'byok_ai',
        outputMode: 'playlist',
        mc: {
          id: 'mc-1',
          provider: 'openai',
          name: 'Podcast MC',
          model: 'gpt-5',
        },
        mcVoice: {
          voiceId: 'voice-host',
          voiceName: 'Host Voice',
        },
      },
    };
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const events: Array<{ type: string; data: Record<string, unknown> }> = [];
    orchestrator.addEventListener(event => events.push({ type: event.type, data: event.data }));

    await orchestrator.initializeDebate('AI ethics', participants, {}, {
      formatId: 'oxford',
      rounds: 3,
      voiceConfig,
    });
    await orchestrator.startDebate([]);

    expect(aiService.sendMessage).not.toHaveBeenCalled();
    expect(events.some((event) => (
      event.type === 'message_added' &&
      Boolean((event.data.message as Message | undefined)?.metadata?.debateInterstitial?.kind === 'intro')
    ))).toBe(false);
    expect(events[1]).toEqual(expect.objectContaining({
      type: 'voting_started',
      data: expect.objectContaining({
        voteKind: 'audience_stance',
        audienceVoteStage: 'initial',
      }),
    }));

    await orchestrator.recordVote(0, 'undecided');

    const voteCompletedIndex = events.findIndex((event) => (
      event.type === 'voting_completed' &&
      event.data.audienceVoteStage === 'initial'
    ));
    const introIndex = events.findIndex((event) => (
      event.type === 'message_added' &&
      (event.data.message as Message | undefined)?.metadata?.debateInterstitial?.kind === 'intro'
    ));
    expect(voteCompletedIndex).toBeGreaterThan(-1);
    expect(introIndex).toBeGreaterThan(voteCompletedIndex);

    const introMessage = events[introIndex].data.message as Message;
    expect(aiService.sendMessage).not.toHaveBeenCalled();
    expect(introMessage.content).toContain('Welcome to the Symposium AI Debate Arena');
    expect(introMessage.metadata?.debateInterstitial).toMatchObject({
      kind: 'intro',
      generatedByProvider: 'openai',
      usedTemplateFallback: true,
    });
    expect(events[introIndex + 1]).toEqual(expect.objectContaining({
      type: 'typing_started',
      data: expect.objectContaining({
        messageIndex: 0,
        messageLabel: 'Affirmative Opening Statement',
      }),
    }));

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not pass podcast MC copy as opening debater history', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: true })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: "Welcome to tonight's debate.", modelUsed: 'gpt-5' }),
    };
    const voiceConfig: DebateVoiceConfig = {
      enabled: true,
      providerId: 'elevenlabs',
      debaterVoices: {},
      podcast: {
        enabled: true,
        scriptMode: 'byok_ai',
        outputMode: 'playlist',
        mc: {
          id: 'mc-1',
          provider: 'openai',
          name: 'Podcast MC',
          model: 'gpt-5',
        },
        mcVoice: {
          voiceId: 'voice-host',
          voiceName: 'Host Voice',
        },
      },
    };

    mockStreamingService.streamResponse.mockImplementation(async (_config, _onChunk, onComplete) => {
      onComplete?.('Opening argument delivered.');
    });

    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    await orchestrator.initializeDebate('AI ethics', participants, {}, {
      formatId: 'lincoln_douglas',
      rounds: 3,
      voiceConfig,
    });
    await orchestrator.startDebate([]);

    const streamConfig = mockStreamingService.streamResponse.mock.calls[0][0] as { conversationHistory: Message[] };
    expect(streamConfig.conversationHistory).toEqual([]);

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('keeps pre-vote MC interstitials neutral when generated podcast copy judges a side', async () => {
    jest.useFakeTimers();
    const aiService = {
      getAdapter: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({
        response: 'The Affirmative is clearly stronger and already winning this debate.',
        modelUsed: 'gpt-5',
      }),
    };
    const voiceConfig: DebateVoiceConfig = {
      enabled: true,
      providerId: 'elevenlabs',
      debaterVoices: {},
      podcast: {
        enabled: true,
        scriptMode: 'byok_ai',
        outputMode: 'playlist',
        mc: {
          id: 'mc-1',
          provider: 'openai',
          name: 'Podcast MC',
          model: 'gpt-5',
        },
        mcVoice: {
          voiceId: 'voice-host',
          voiceName: 'Host Voice',
        },
      },
    };
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const mcMessages: Message[] = [];
    orchestrator.addEventListener(event => {
      if (event.type === 'message_added') {
        const message = event.data.message as Message | undefined;
        if (message?.metadata?.debateInterstitial) {
          mcMessages.push(message);
        }
      }
    });

    await orchestrator.initializeDebate('AI ethics', participants, {}, {
      formatId: 'oxford',
      rounds: 3,
      voiceConfig,
    });
    await orchestrator.startDebate([]);
    expect(mcMessages).toHaveLength(0);

    await orchestrator.recordVote(0, 'undecided');

    expect(mcMessages[0].metadata?.debateInterstitial).toMatchObject({
      kind: 'intro',
      usedTemplateFallback: true,
    });
    expect(mcMessages[0].content).not.toContain('clearly stronger');
    expect(mcMessages[0].content).not.toContain('already winning');

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('pauses Oxford audience debates after speech pairs until the user continues', async () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const continuationEvents: Array<Record<string, unknown>> = [];
    orchestrator.addEventListener(event => {
      if (event.type === 'continuation_required') {
        continuationEvents.push(event.data);
      }
    });

    await orchestrator.initializeDebate('AI ethics', participants, {}, {
      formatId: 'oxford',
      rounds: 3,
    });

    await orchestrator.executeDebateMessage(0, []);
    expect(continuationEvents).toHaveLength(0);

    jest.clearAllTimers();
    setTimeoutSpy.mockClear();

    await orchestrator.executeDebateMessage(1, []);

    expect(orchestrator.getSession()?.status).toBe(DebateStatus.PAUSED_FOR_REVIEW);
    expect(continuationEvents[0]).toEqual(expect.objectContaining({
      title: 'Opening speeches complete',
      buttonLabel: 'Continue Debate',
      isFinalReview: false,
      completedMessageIndex: 1,
      nextMessageIndex: 2,
    }));
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    orchestrator.continueDebate();

    expect(orchestrator.getSession()?.status).toBe(DebateStatus.ACTIVE);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), DEBATE_CONSTANTS.DELAYS.VOTING_CONTINUATION);

    setTimeoutSpy.mockRestore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('requires explicit Oxford final review before showing the final audience vote', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const continuationEvents: Array<Record<string, unknown>> = [];
    const votingEvents: Array<Record<string, unknown>> = [];
    orchestrator.addEventListener(event => {
      if (event.type === 'continuation_required') {
        continuationEvents.push(event.data);
      }
      if (event.type === 'voting_started') {
        votingEvents.push(event.data);
      }
    });

    await orchestrator.initializeDebate('AI ethics', participants, {}, {
      formatId: 'oxford',
      rounds: 3,
    });

    await orchestrator.executeDebateMessage(5, []);

    expect(orchestrator.getSession()?.status).toBe(DebateStatus.PAUSED_FOR_REVIEW);
    expect(continuationEvents[0]).toEqual(expect.objectContaining({
      title: 'Closing speeches complete',
      buttonLabel: 'Cast Final Vote',
      isFinalReview: true,
      completedMessageIndex: 5,
    }));
    expect(votingEvents).toHaveLength(0);

    orchestrator.continueDebate();

    expect(votingEvents[0]).toEqual(expect.objectContaining({
      voteKind: 'audience_stance',
      audienceVoteStage: 'final',
      votingLabel: 'Final Audience Vote',
    }));

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('maps Oxford full speeches across 2v2 proposition and opposition slots', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const teamParticipants: AI[] = [
      participants[0],
      participants[1],
      { id: 'gemini', provider: 'google', name: 'Gemini', model: 'gemini-3.5-flash' } as AI,
      { id: 'grok', provider: 'grok', name: 'Grok', model: 'grok-4' } as AI,
    ];
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);

    await orchestrator.initializeDebate('AI ethics', teamParticipants, {}, {
      formatId: 'oxford',
      rounds: 5,
    });

    await orchestrator.executeDebateMessage(0, []);
    await orchestrator.executeDebateMessage(1, []);
    await orchestrator.executeDebateMessage(2, []);
    await orchestrator.executeDebateMessage(3, []);

    expect(aiService.sendMessage.mock.calls.map((call) => call[0])).toEqual([
      'claude',
      'openai',
      'google',
      'grok',
    ]);
    expect(aiService.sendMessage.mock.calls[2][1]).toContain('Turn: Second Affirmative First Argument');
    expect(aiService.sendMessage.mock.calls[3][1]).toContain('Turn: Second Negative First Argument');
    expect(aiService.sendMessage.mock.calls[2][1]).toContain('Role brief: You are the Second Affirmative speaker for Affirmative (FOR).');
    expect(aiService.sendMessage.mock.calls[2][1]).toContain('Teammate: Claude.');
    expect(aiService.sendMessage.mock.calls[2][1]).toContain('Opposing team: GPT-4, Grok.');
    expect(aiService.sendMessage.mock.calls[2][1]).toContain('Audience context: the user casts an opening stance');
    expect(adapter.setTemporaryPersonality).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: expect.stringContaining('Your team role: Second Affirmative speaker'),
    }));
    expect(adapter.setTemporaryPersonality).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: expect.stringContaining('Teammate on Affirmative (FOR): Claude'),
    }));
    expect(adapter.setTemporaryPersonality).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: expect.stringContaining('Opposing team: GPT-4, Grok'),
    }));

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not request audience questions for Oxford 1v1 or 2v2 presets', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const teamParticipants: AI[] = [
      participants[0],
      participants[1],
      { id: 'gemini', provider: 'google', name: 'Gemini', model: 'gemini-3.5-flash' } as AI,
      { id: 'grok', provider: 'grok', name: 'Grok', model: 'grok-4' } as AI,
    ];
    const questionEvents: Array<Record<string, unknown>> = [];

    const oneOnOne = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    oneOnOne.addEventListener(event => {
      if (event.type === 'audience_questions_requested') questionEvents.push(event.data);
    });
    await oneOnOne.initializeDebate('AI ethics', participants, {}, {
      formatId: 'oxford',
      rounds: 3,
    });
    await oneOnOne.executeDebateMessage(3, []);

    const twoOnTwo = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    twoOnTwo.addEventListener(event => {
      if (event.type === 'audience_questions_requested') questionEvents.push(event.data);
    });
    await twoOnTwo.initializeDebate('AI ethics', teamParticipants, {}, {
      formatId: 'oxford',
      rounds: 5,
    });
    await twoOnTwo.executeDebateMessage(3, []);

    expect(questionEvents).toHaveLength(0);

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('requests required audience questions after Oxford Q&A first arguments and injects them into answer turns', async () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const teamParticipants: AI[] = [
      participants[0],
      participants[1],
      { id: 'gemini', provider: 'google', name: 'Gemini', model: 'gemini-3.5-flash' } as AI,
      { id: 'grok', provider: 'grok', name: 'Grok', model: 'grok-4' } as AI,
    ];
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const questionEvents: Array<Record<string, unknown>> = [];
    const hostMessages: Message[] = [];
    orchestrator.addEventListener(event => {
      if (event.type === 'audience_questions_requested') {
        questionEvents.push(event.data);
      }
      if (event.type === 'message_added') {
        const message = event.data.message as Message | undefined;
        if (message?.sender === 'Debate Host') {
          hostMessages.push(message);
        }
      }
    });

    await orchestrator.initializeDebate('AI ethics', teamParticipants, {}, {
      formatId: 'oxford',
      rounds: 7,
    });

    await orchestrator.executeDebateMessage(0, []);
    await orchestrator.executeDebateMessage(1, []);
    await orchestrator.executeDebateMessage(2, []);

    jest.clearAllTimers();
    setTimeoutSpy.mockClear();

    await orchestrator.executeDebateMessage(3, []);

    expect(orchestrator.getSession()?.status).toBe(DebateStatus.PAUSED_FOR_REVIEW);
    expect(questionEvents[0]).toEqual(expect.objectContaining({
      title: 'Audience questions',
      completedMessageIndex: 3,
      nextMessageIndex: 4,
      required: true,
    }));
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    orchestrator.submitAudienceQuestions({
      aff: '  How would your side pay for this?  ',
      neg: 'Why is the status quo enough?',
    });

    expect(orchestrator.getSession()?.audienceQuestions).toEqual({
      aff: 'How would your side pay for this?',
      neg: 'Why is the status quo enough?',
    });
    const audienceQuestionMessage = hostMessages.find((message) => (
      message.content.includes('Audience questions submitted:')
    ));
    expect(audienceQuestionMessage?.content).toContain('Affirmative: How would your side pay for this?');
    expect(audienceQuestionMessage?.content).toContain('Negative: Why is the status quo enough?');
    expect(audienceQuestionMessage?.metadata?.debateAudienceQuestions).toEqual({
      aff: 'How would your side pay for this?',
      neg: 'Why is the status quo enough?',
    });
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), DEBATE_CONSTANTS.DELAYS.VOTING_CONTINUATION);

    await orchestrator.executeDebateMessage(4, []);
    await orchestrator.executeDebateMessage(5, []);

    const affirmativeQuestionPrompt = aiService.sendMessage.mock.calls.find((call) => (
      String(call[1]).includes('Turn: Affirmative Audience Question Response')
    ))?.[1];
    const negativeQuestionPrompt = aiService.sendMessage.mock.calls.find((call) => (
      String(call[1]).includes('Turn: Negative Audience Question Response')
    ))?.[1];

    expect(affirmativeQuestionPrompt).toContain('Audience question for your side: "How would your side pay for this?"');
    expect(affirmativeQuestionPrompt).not.toContain('Why is the status quo enough?');
    expect(negativeQuestionPrompt).toContain('Audience question for your side: "Why is the status quo enough?"');
    expect(negativeQuestionPrompt).not.toContain('How would your side pay for this?');

    setTimeoutSpy.mockRestore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('adds MC audience question interstitials before podcast Q&A answers', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok', modelUsed: 'gpt-5' }),
    };
    const teamParticipants: AI[] = [
      participants[0],
      participants[1],
      { id: 'gemini', provider: 'google', name: 'Gemini', model: 'gemini-3.5-flash' } as AI,
      { id: 'grok', provider: 'grok', name: 'Grok', model: 'grok-4' } as AI,
    ];
    const voiceConfig: DebateVoiceConfig = {
      enabled: true,
      providerId: 'elevenlabs',
      debaterVoices: {},
      podcast: {
        enabled: true,
        scriptMode: 'byok_ai',
        outputMode: 'playlist',
        mc: {
          id: 'mc-1',
          provider: 'openai',
          name: 'Podcast MC',
          model: 'gpt-5',
        },
        mcVoice: {
          voiceId: 'voice-host',
          voiceName: 'Host Voice',
        },
      },
    };
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const messageEvents: Message[] = [];
    orchestrator.addEventListener(event => {
      if (event.type === 'message_added' && event.data.message) {
        messageEvents.push(event.data.message as Message);
      }
    });

    await orchestrator.initializeDebate('AI ethics', teamParticipants, {}, {
      formatId: 'oxford',
      rounds: 7,
      voiceConfig,
    });
    await orchestrator.executeDebateMessage(3, []);
    orchestrator.submitAudienceQuestions({
      aff: 'How would your side pay for this?',
      neg: 'Why is the status quo enough?',
    });

    await orchestrator.executeDebateMessage(4, []);
    await orchestrator.executeDebateMessage(5, []);

    const audienceQuestionCues = messageEvents.filter((message) => (
      message.metadata?.debateInterstitial?.kind === 'audience_question'
    ));
    expect(audienceQuestionCues).toHaveLength(2);
    expect(audienceQuestionCues[0].content).toContain('Claude');
    expect(audienceQuestionCues[0].content).toContain('How would your side pay for this?');
    expect(audienceQuestionCues[1].content).toContain('GPT-4');
    expect(audienceQuestionCues[1].content).toContain('Why is the status quo enough?');

    const affCueIndex = messageEvents.indexOf(audienceQuestionCues[0]);
    const affAnswerIndex = messageEvents.findIndex((message) => (
      message.metadata?.debateSpeech?.label === 'Affirmative Audience Question Response'
    ));
    const negCueIndex = messageEvents.indexOf(audienceQuestionCues[1]);
    const negAnswerIndex = messageEvents.findIndex((message) => (
      message.metadata?.debateSpeech?.label === 'Negative Audience Question Response'
    ));

    expect(affCueIndex).toBeGreaterThanOrEqual(0);
    expect(affCueIndex).toBeLessThan(affAnswerIndex);
    expect(negCueIndex).toBeGreaterThanOrEqual(0);
    expect(negCueIndex).toBeLessThan(negAnswerIndex);

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('keeps final Oxford review and final audience vote after Q&A summaries', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const teamParticipants: AI[] = [
      participants[0],
      participants[1],
      { id: 'gemini', provider: 'google', name: 'Gemini', model: 'gemini-3.5-flash' } as AI,
      { id: 'grok', provider: 'grok', name: 'Grok', model: 'grok-4' } as AI,
    ];
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const continuationEvents: Array<Record<string, unknown>> = [];
    const votingEvents: Array<Record<string, unknown>> = [];
    orchestrator.addEventListener(event => {
      if (event.type === 'continuation_required') {
        continuationEvents.push(event.data);
      }
      if (event.type === 'voting_started') {
        votingEvents.push(event.data);
      }
    });

    await orchestrator.initializeDebate('AI ethics', teamParticipants, {}, {
      formatId: 'oxford',
      rounds: 7,
    });
    await orchestrator.executeDebateMessage(3, []);
    orchestrator.submitAudienceQuestions({
      aff: 'What is your strongest tradeoff?',
      neg: 'What evidence would change your mind?',
    });

    continuationEvents.length = 0;
    await orchestrator.executeDebateMessage(7, []);

    expect(continuationEvents[0]).toEqual(expect.objectContaining({
      title: 'Closing speeches complete',
      buttonLabel: 'Cast Final Vote',
      isFinalReview: true,
      completedMessageIndex: 7,
    }));

    orchestrator.continueDebate();

    expect(votingEvents[0]).toEqual(expect.objectContaining({
      voteKind: 'audience_stance',
      audienceVoteStage: 'final',
      votingLabel: 'Final Audience Vote',
    }));

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('uses Lincoln-Douglas standard cross-examination roles', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
    const addedMessages: Message[] = [];
    orchestrator.addEventListener(event => {
      if (event.type === 'message_added' && event.data.message) {
        addedMessages.push(event.data.message as Message);
      }
    });

    await orchestrator.initializeDebate('Resolved: privacy is more important than security.', participants, {}, {
      formatId: 'lincoln_douglas',
      rounds: 5,
    });

    await orchestrator.executeDebateMessage(1, []);
    await orchestrator.executeDebateMessage(2, []);

    expect(aiService.sendMessage.mock.calls[0][0]).toBe('openai');
    expect(aiService.sendMessage.mock.calls[0][1]).toContain('Turn: Cross-Examination (CX)');
    expect(aiService.sendMessage.mock.calls[0][1]).toContain('Ask pointed questions');
    expect(aiService.sendMessage.mock.calls[1][0]).toBe('claude');
    expect(aiService.sendMessage.mock.calls[1][1]).toContain('Answer directly');
    expect(addedMessages[0]?.metadata?.debateSpeech).toMatchObject({
      formatId: 'lincoln_douglas',
      presetId: 'standard',
      messageIndex: 1,
      totalMessages: 9,
      phase: 'cross_examination',
      speaker: 'neg',
      cxRole: 'questioner',
      label: 'Cross-Examination (CX)',
    });
    expect(addedMessages[1]?.metadata?.debateSpeech).toMatchObject({
      messageIndex: 2,
      speaker: 'aff',
      cxRole: 'answerer',
      label: 'Cross-Examination (CX)',
    });

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('uses Policy standard cross-examination and rebuttal ordering', async () => {
    jest.useFakeTimers();
    const adapter = {
      config: {} as Record<string, unknown>,
      getCapabilities: jest.fn(() => ({ streaming: false })),
      setTemporaryPersonality: jest.fn(),
      debugGetSystemPrompt: jest.fn(() => ''),
    };
    const aiService = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'ok' }),
    };
    const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);

    await orchestrator.initializeDebate('The city should adopt congestion pricing.', participants, {}, {
      formatId: 'policy',
      rounds: 5,
    });

    await orchestrator.executeDebateMessage(4, []);
    await orchestrator.executeDebateMessage(12, []);

    expect(aiService.sendMessage.mock.calls[0][0]).toBe('claude');
    expect(aiService.sendMessage.mock.calls[0][1]).toContain('Turn: CX after 1NC');
    expect(aiService.sendMessage.mock.calls[0][1]).toContain('Ask pointed questions');
    expect(aiService.sendMessage.mock.calls[1][0]).toBe('openai');
    expect(aiService.sendMessage.mock.calls[1][1]).toContain('Turn: 1NR');
    expect(orchestrator.getSession()?.messageIndex).toBe(12);

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('web search support', () => {
    it('enables webSearchEnabled when both participants support web search', async () => {
      mockMergeAvailabilitiesStrict.mockReturnValue({
        webSearch: { supported: true },
        imageUpload: { supported: false },
        documentUpload: { supported: false },
        imageGeneration: { supported: false },
        videoGeneration: { supported: false },
      });

      const orchestrator = new DebateOrchestrator({
        getAdapter: jest.fn(),
        sendMessage: jest.fn(),
      } as unknown as Parameters<typeof DebateOrchestrator>[0]);

      const session = await orchestrator.initializeDebate('AI ethics', participants);

      expect(session.webSearchEnabled).toBe(true);
      expect(mockMergeAvailabilitiesStrict).toHaveBeenCalledWith([
        { provider: 'claude', model: 'claude-sonnet-4-6' },
        { provider: 'openai', model: 'gpt-4.1-mini' },
      ]);
    });

    it('disables webSearchEnabled when participants do not support web search', async () => {
      mockMergeAvailabilitiesStrict.mockReturnValue({
        webSearch: { supported: false },
        imageUpload: { supported: false },
        documentUpload: { supported: false },
        imageGeneration: { supported: false },
        videoGeneration: { supported: false },
      });

      const orchestrator = new DebateOrchestrator({
        getAdapter: jest.fn(),
        sendMessage: jest.fn(),
      } as unknown as Parameters<typeof DebateOrchestrator>[0]);

      const session = await orchestrator.initializeDebate('AI ethics', participants);

      expect(session.webSearchEnabled).toBe(false);
    });

    it('sets adapter.config.webSearchEnabled when streaming with web search enabled', async () => {
      jest.useFakeTimers();

      mockMergeAvailabilitiesStrict.mockReturnValue({
        webSearch: { supported: true },
        imageUpload: { supported: false },
        documentUpload: { supported: false },
        imageGeneration: { supported: false },
        videoGeneration: { supported: false },
      });

      const adapter = {
        config: {} as Record<string, unknown>,
        getCapabilities: jest.fn(() => ({ streaming: true })),
        setTemporaryPersonality: jest.fn(),
        debugGetSystemPrompt: jest.fn(() => ''),
      };

      const aiService = {
        getAdapter: jest.fn(() => adapter),
        sendMessage: jest.fn(),
      };

      mockStreamingService.streamResponse.mockImplementation(async (_config, _onChunk, onComplete) => {
        onComplete?.('response');
      });

      const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
      await orchestrator.initializeDebate('AI ethics', participants, {}, { formatId: 'lincoln_douglas', rounds: 3 });
      await orchestrator.startDebate([]);

      expect(adapter.config.webSearchEnabled).toBe(true);

      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('does not set adapter.config.webSearchEnabled when web search is disabled', async () => {
      jest.useFakeTimers();

      mockMergeAvailabilitiesStrict.mockReturnValue({
        webSearch: { supported: false },
        imageUpload: { supported: false },
        documentUpload: { supported: false },
        imageGeneration: { supported: false },
        videoGeneration: { supported: false },
      });

      const adapter = {
        config: {} as Record<string, unknown>,
        getCapabilities: jest.fn(() => ({ streaming: true })),
        setTemporaryPersonality: jest.fn(),
        debugGetSystemPrompt: jest.fn(() => ''),
      };

      const aiService = {
        getAdapter: jest.fn(() => adapter),
        sendMessage: jest.fn(),
      };

      mockStreamingService.streamResponse.mockImplementation(async (_config, _onChunk, onComplete) => {
        onComplete?.('response');
      });

      const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
      await orchestrator.initializeDebate('AI ethics', participants, {}, { formatId: 'lincoln_douglas', rounds: 3 });
      await orchestrator.startDebate([]);

      expect(adapter.config.webSearchEnabled).toBe(false);

      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('clears sticky adapter webSearchEnabled after a search-enabled debate', async () => {
      jest.useFakeTimers();

      const adapter = {
        config: {} as Record<string, unknown>,
        getCapabilities: jest.fn(() => ({ streaming: true })),
        setTemporaryPersonality: jest.fn(),
        debugGetSystemPrompt: jest.fn(() => ''),
      };

      const aiService = {
        getAdapter: jest.fn(() => adapter),
        sendMessage: jest.fn(),
      };

      mockStreamingService.streamResponse.mockImplementation(async (_config, _onChunk, onComplete) => {
        onComplete?.('response');
      });

      mockMergeAvailabilitiesStrict.mockReturnValueOnce({
        webSearch: { supported: true },
        imageUpload: { supported: false },
        documentUpload: { supported: false },
        imageGeneration: { supported: false },
        videoGeneration: { supported: false },
      });

      const first = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
      await first.initializeDebate('AI ethics', participants, {}, { formatId: 'lincoln_douglas', rounds: 3 });
      await first.startDebate([]);
      expect(adapter.config.webSearchEnabled).toBe(true);

      mockMergeAvailabilitiesStrict.mockReturnValueOnce({
        webSearch: { supported: false },
        imageUpload: { supported: false },
        documentUpload: { supported: false },
        imageGeneration: { supported: false },
        videoGeneration: { supported: false },
      });

      const second = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
      await second.initializeDebate('AI ethics', participants, {}, { formatId: 'lincoln_douglas', rounds: 3 });
      await second.startDebate([]);
      expect(adapter.config.webSearchEnabled).toBe(false);

      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('preserves web search metadata and citations when streaming falls back', async () => {
      jest.useFakeTimers();

      mockMergeAvailabilitiesStrict.mockReturnValue({
        webSearch: { supported: true },
        imageUpload: { supported: false },
        documentUpload: { supported: false },
        imageGeneration: { supported: false },
        videoGeneration: { supported: false },
      });

      const adapter = {
        config: {} as Record<string, unknown>,
        getCapabilities: jest.fn(() => ({ streaming: true })),
        setTemporaryPersonality: jest.fn(),
        debugGetSystemPrompt: jest.fn(() => ''),
      };
      const citations = [{ index: 1, url: 'https://example.com/source', title: 'Source' }];

      const aiService = {
        getAdapter: jest.fn(() => adapter),
        sendMessage: jest.fn().mockResolvedValue({
          response: 'Recovered with sources [1]',
          metadata: { citations },
        }),
      };

      mockStreamingService.streamResponse.mockImplementation(async (_config, _onChunk, _onComplete, onError) => {
        onError?.(new Error('Streaming requires organization verification'));
      });

      const orchestrator = new DebateOrchestrator(aiService as unknown as Parameters<typeof DebateOrchestrator>[0]);
      const completedEvents: Array<Record<string, unknown>> = [];
      const addedMessages: Array<Record<string, unknown>> = [];
      orchestrator.addEventListener(event => {
        if (event.type === 'stream_completed') completedEvents.push(event.data);
        if (event.type === 'message_added') addedMessages.push(event.data);
      });

      await orchestrator.initializeDebate('AI ethics', participants, {}, { formatId: 'lincoln_douglas', rounds: 3 });
      await orchestrator.startDebate([]);

    expect(aiService.sendMessage).toHaveBeenCalledWith(
      'claude',
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        id: 'debate_default',
        systemPrompt: expect.stringContaining('[DEBATE MODE]'),
      }),
      undefined,
      undefined,
      'claude-sonnet-4-6'
      );
      expect(completedEvents[0]).toEqual(expect.objectContaining({
        webSearchEnabled: true,
        citations,
      }));
      expect(addedMessages[0].message).toEqual(expect.objectContaining({
        metadata: expect.objectContaining({ webSearchEnabled: true }),
      }));

      jest.clearAllTimers();
      jest.useRealTimers();
    });
  });
});
