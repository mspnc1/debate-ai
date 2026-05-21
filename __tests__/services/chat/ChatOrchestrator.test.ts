import { ChatOrchestrator } from '@/services/chat/ChatOrchestrator';
import { addMessage, setTypingAI, updateMessage, type AppDispatch } from '@/store';
import {
  startStreaming,
  updateStreamingContent,
  endStreaming,
  streamingError,
  clearStreamingMessage,
  setProviderVerificationError,
} from '@/store/streamingSlice';
import type { AI, ChatSession, Message } from '@/types';
import type { AIService } from '@/services/aiAdapter';

jest.mock('@/services/demo/RecordController', () => ({
  RecordController: {
    isActive: jest.fn(() => false),
    recordAssistantChunk: jest.fn(),
    recordAssistantMessage: jest.fn(),
    recordImageMarkdown: jest.fn(),
  },
}));

jest.mock('@/services/demo/DemoPlaybackRouter', () => ({
  getCurrentTurnProviders: jest.fn(() => []),
  markProviderComplete: jest.fn(),
}));

jest.mock('@/config/personalities', () => ({
  getPersonality: jest.fn((id: string) => (
    id === 'default'
      ? {
          id: 'default',
          name: 'Default',
          systemPrompt: 'Default assistant',
          signatureMoves: [],
        }
      : {
          id: 'persona',
          name: 'Persona',
          systemPrompt: 'Stay helpful',
          debatePrompt: 'Debate politely',
          chatGuidance: 'Be concise',
          compareGuidance: 'Compare clearly',
          signatureMoves: ['Stay useful.'],
          tone: { formality: 0.3, humor: 0.8, energy: 0.7, empathy: 0.5, technicality: 0.4 },
          modelParameters: { temperature: 0.91 },
        }
  )),
}));

jest.mock('@/utils/expertMode', () => ({
  getExpertOverrides: jest.fn(() => ({ enabled: false })),
}));

const mockStreamingService = {
  streamResponse: jest.fn(),
};

jest.mock('@/services/streaming/StreamingService', () => ({
  getStreamingService: jest.fn(() => mockStreamingService),
}));

describe('ChatOrchestrator', () => {
  const baseAI: AI = {
    id: 'claude',
    provider: 'claude',
    name: 'Claude',
    model: 'claude-3-opus',
  } as AI;
  const session: ChatSession = {
    id: 'session-1',
    selectedAIs: [baseAI],
    messages: [],
    isActive: true,
    createdAt: Date.now(),
    sessionType: 'chat',
  };

  const userMessage: Message = {
    id: 'msg-user',
    sender: 'You',
    senderType: 'user',
    content: 'Hello team',
    timestamp: Date.now(),
  };

  const buildParams = (overrides: Partial<Parameters<ChatOrchestrator['processUserMessage']>[0]> = {}) => ({
    userMessage,
    existingMessages: session.messages,
    mentions: [],
    aiPersonalities: { claude: 'persona' },
    selectedModels: { claude: 'claude-3-opus' },
    apiKeys: { claude: 'key-1' },
    expertModeConfigs: {},
    streamingPreferences: { claude: { enabled: true } },
    globalStreamingEnabled: true,
    streamingSpeed: 'instant' as const,
    allowStreaming: true,
    attachments: undefined,
    resumptionContext: undefined,
    enrichedPrompt: undefined,
    isDemo: false,
    ...overrides,
  });

  const createAdapter = () => ({
    config: {},
    getCapabilities: jest.fn(() => ({ streaming: true })),
    setTemporaryPersonality: jest.fn(),
    debugGetSystemPrompt: jest.fn(() => 'adapter prompt'),
  });

  const mockAIService = () => {
    const adapter = createAdapter();
    const service = {
      getAdapter: jest.fn(() => adapter),
      sendMessage: jest.fn().mockResolvedValue({ response: 'fallback' }),
      setPersonality: jest.fn(),
    } as unknown as AIService;
    return { adapter, service };
  };

  const dispatchMock = jest.fn();
  const dispatch = dispatchMock as unknown as AppDispatch;

  beforeEach(() => {
    jest.clearAllMocks();
    dispatchMock.mockClear();
    (session.messages as Message[]).length = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('streams responses when streaming is allowed and api key provided', async () => {
    const { adapter, service } = mockAIService();
    mockStreamingService.streamResponse.mockImplementation(async (_config, onChunk, onComplete) => {
      onChunk?.('chunk');
      onComplete?.('final');
    });

    const orchestrator = new ChatOrchestrator(service, dispatch);
    orchestrator.updateSession(session);
    jest.spyOn(ChatOrchestrator.prototype as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep').mockResolvedValue(undefined);

    await orchestrator.processUserMessage(buildParams());

    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: addMessage.type }));
    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: startStreaming.type }));
    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: updateStreamingContent.type }));
    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: endStreaming.type }));
    expect(service.sendMessage).not.toHaveBeenCalled();
    expect(adapter.getCapabilities).toHaveBeenCalled();
    expect(service.setPersonality).toHaveBeenCalledWith('claude', expect.objectContaining({
      id: 'persona',
      systemPrompt: expect.stringContaining('Stay helpful'),
    }));
    expect(mockStreamingService.streamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        adapterConfig: expect.objectContaining({
          personality: expect.objectContaining({
            id: 'persona',
            systemPrompt: expect.stringContaining('Stay helpful'),
          }),
          parameters: { temperature: 0.91 },
        }),
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('clears a reused adapter personality when default is selected', async () => {
    const { service } = mockAIService();
    mockStreamingService.streamResponse.mockImplementation(async (_config, onChunk, onComplete) => {
      onChunk?.('chunk');
      onComplete?.('final');
    });

    const orchestrator = new ChatOrchestrator(service, dispatch);
    orchestrator.updateSession(session);
    jest.spyOn(ChatOrchestrator.prototype as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep').mockResolvedValue(undefined);

    await orchestrator.processUserMessage(buildParams({ aiPersonalities: { claude: 'default' } }));

    expect(service.setPersonality).toHaveBeenCalledWith('claude', undefined);
    expect(mockStreamingService.streamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        adapterConfig: expect.objectContaining({
          personality: undefined,
          parameters: undefined,
        }),
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('falls back to non-streaming when streaming throws verification error', async () => {
    const { adapter, service } = mockAIService();
    mockStreamingService.streamResponse.mockImplementation(async (_config, _onChunk, _onComplete, onError) => {
      onError?.(new Error('organization must be verified to stream'));
    });

    const orchestrator = new ChatOrchestrator(service, dispatch);
    orchestrator.updateSession(session);
    jest.spyOn(ChatOrchestrator.prototype as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep').mockResolvedValue(undefined);

    await orchestrator.processUserMessage(buildParams());

    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: streamingError.type }));
    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: clearStreamingMessage.type }));
    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({ type: updateMessage.type }));
    expect(dispatchMock).toHaveBeenCalledWith(setProviderVerificationError({ providerId: 'claude', hasError: true }));
    expect(service.sendMessage).toHaveBeenCalledTimes(1);
    expect(adapter.getCapabilities).toHaveBeenCalled();
  });

  it('uses non-streaming path when streaming disabled and toggles typing indicators', async () => {
    const { adapter, service } = mockAIService();
    adapter.getCapabilities.mockReturnValue({ streaming: false });

    const orchestrator = new ChatOrchestrator(service, dispatch);
    orchestrator.updateSession(session);
    jest.spyOn(ChatOrchestrator.prototype as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep').mockResolvedValue(undefined);

    await orchestrator.processUserMessage(
      buildParams({ allowStreaming: false, streamingPreferences: { claude: { enabled: false } }, apiKeys: {} })
    );

    expect(dispatchMock).toHaveBeenCalledWith(setTypingAI({ ai: 'Claude', isTyping: true }));
    expect(dispatchMock).toHaveBeenCalledWith(setTypingAI({ ai: 'Claude', isTyping: false }));
    expect(service.sendMessage).toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: startStreaming.type }));
  });

  it('does not persist citation-only empty non-streaming answers', async () => {
    const { adapter, service } = mockAIService();
    adapter.getCapabilities.mockReturnValue({ streaming: false });
    (service.sendMessage as jest.Mock).mockResolvedValue({
      response: '  ',
      metadata: {
        citations: [{ index: 1, url: 'https://example.com' }],
      },
    });

    const orchestrator = new ChatOrchestrator(service, dispatch);
    orchestrator.updateSession(session);
    jest.spyOn(ChatOrchestrator.prototype as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep').mockResolvedValue(undefined);

    await orchestrator.processUserMessage(
      buildParams({ allowStreaming: false, streamingPreferences: { claude: { enabled: false } }, apiKeys: {} })
    );

    expect(dispatchMock).toHaveBeenCalledWith(expect.objectContaining({
      type: addMessage.type,
      payload: expect.objectContaining({
        content: 'Claude returned source citations but no answer text. Please retry the request.',
        metadata: expect.objectContaining({
          citations: undefined,
        }),
      }),
    }));
  });

  it('uses demo api key when isDemo is true, ignoring stored api keys', async () => {
    const { service } = mockAIService();
    mockStreamingService.streamResponse.mockImplementation(async (_config, onChunk, onComplete) => {
      onChunk?.('chunk');
      onComplete?.('final');
    });

    const orchestrator = new ChatOrchestrator(service, dispatch);
    orchestrator.updateSession(session);
    jest.spyOn(ChatOrchestrator.prototype as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep').mockResolvedValue(undefined);

    // Call with isDemo: true and actual API keys - should use 'demo' instead
    await orchestrator.processUserMessage(
      buildParams({ isDemo: true, apiKeys: { claude: 'actual-key-123' } })
    );

    // Verify streamResponse was called with 'demo' as the API key, not 'actual-key-123'
    expect(mockStreamingService.streamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        adapterConfig: expect.objectContaining({
          apiKey: 'demo',
        }),
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('uses actual api key when isDemo is false', async () => {
    const { service } = mockAIService();
    mockStreamingService.streamResponse.mockImplementation(async (_config, onChunk, onComplete) => {
      onChunk?.('chunk');
      onComplete?.('final');
    });

    const orchestrator = new ChatOrchestrator(service, dispatch);
    orchestrator.updateSession(session);
    jest.spyOn(ChatOrchestrator.prototype as unknown as { sleep: (ms: number) => Promise<void> }, 'sleep').mockResolvedValue(undefined);

    // Call with isDemo: false - should use actual API key
    await orchestrator.processUserMessage(
      buildParams({ isDemo: false, apiKeys: { claude: 'actual-key-123' } })
    );

    // Verify streamResponse was called with actual API key
    expect(mockStreamingService.streamResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        adapterConfig: expect.objectContaining({
          apiKey: 'actual-key-123',
        }),
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
  });
});
