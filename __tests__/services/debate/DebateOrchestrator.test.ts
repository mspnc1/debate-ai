import { DebateOrchestrator, DebateStatus } from '@/services/debate/DebateOrchestrator';
import { DEBATE_CONSTANTS } from '@/config/debateConstants';
import { getPresetForFormat } from '@/config/debate/formats';
import type { AI, Message } from '@/types';
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
    expect(adapter.config.parameters).toEqual(expect.objectContaining({ temperature: 0.9 }));

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
    expect(aiService.sendMessage.mock.calls[0][1]).toContain('Turn: Proposition Opening Speech');
    expect(aiService.sendMessage.mock.calls[1][0]).toBe('openai');
    expect(aiService.sendMessage.mock.calls[1][1]).toContain('Turn: Opposition Opening Speech');

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
    orchestrator.addEventListener(event => {
      if (event.type === 'voting_started' || event.type === 'voting_completed') {
        votingEvents.push(event.data);
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
    expect(aiService.sendMessage.mock.calls[2][1]).toContain('Turn: Second Proposition Speech');
    expect(aiService.sendMessage.mock.calls[3][1]).toContain('Turn: Second Opposition Speech');

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
