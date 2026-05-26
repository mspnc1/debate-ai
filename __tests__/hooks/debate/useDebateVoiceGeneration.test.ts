import { waitFor } from '@testing-library/react-native';
import { useDebateVoiceGeneration } from '@/hooks/debate/useDebateVoiceGeneration';
import { renderHookWithProviders } from '../../../test-utils/renderHookWithProviders';
import APIKeyService from '@/services/APIKeyService';
import { StorageService } from '@/services/chat/StorageService';
import { generateDebateVoiceAudio } from '@/services/debate/DebateVoiceService';
import type { DebateVoiceConfig, Message } from '@/types';
import type { RootState } from '@/store';

jest.mock('@/services/APIKeyService', () => ({
  __esModule: true,
  default: {
    getKey: jest.fn(),
  },
}));

jest.mock('@/services/chat/StorageService', () => ({
  StorageService: {
    loadSession: jest.fn(),
    mergeSession: jest.fn(),
  },
}));

jest.mock('@/services/debate/DebateVoiceService', () => ({
  DebateVoiceGenerationError: class DebateVoiceGenerationError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  generateDebateVoiceAudio: jest.fn(),
}));

const message: Message = {
  id: 'msg-1',
  sender: 'Claude',
  senderType: 'ai',
  content: 'Opening argument.',
  timestamp: 1,
  metadata: {
    providerId: 'claude',
    debateSpeech: {
      formatId: 'oxford',
      presetId: 'short',
      messageIndex: 0,
      totalMessages: 6,
      phase: 'opening',
      speaker: 'aff',
      label: 'Opening',
    },
  },
};

const voiceConfig: DebateVoiceConfig = {
  enabled: true,
  providerId: 'elevenlabs',
  debaterVoices: {
    claude: { voiceId: 'voice-1', voiceName: 'Voice One' },
  },
};

const preloadedState: Partial<RootState> = {
  settings: {
    theme: 'auto',
    fontSize: 'medium',
    apiKeys: { elevenlabs: { configured: true, maskedLabel: 'key', updatedAt: 1 } },
    verifiedProviders: ['elevenlabs'],
    verificationTimestamps: {},
    verificationModels: {},
    expertMode: {},
    hasCompletedOnboarding: true,
    recordModeEnabled: false,
  },
  chat: {
    currentSession: {
      id: 'session-1',
      selectedAIs: [],
      messages: [message],
      isActive: true,
      createdAt: 1,
      sessionType: 'debate',
    },
    sessions: [],
    typingAIs: [],
    isLoading: false,
    aiPersonalities: {},
    selectedModels: {},
  },
};

describe('useDebateVoiceGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (APIKeyService.getKey as jest.Mock).mockResolvedValue('eleven-key');
    (StorageService.loadSession as jest.Mock).mockResolvedValue({
      id: 'debate-1',
      messages: [message],
    });
    (StorageService.mergeSession as jest.Mock).mockResolvedValue({
      id: 'debate-1',
      messages: [],
    });
    (generateDebateVoiceAudio as jest.Mock).mockResolvedValue({
      attachment: { type: 'audio', uri: 'file:///debate/msg-1.mp3', mimeType: 'audio/mpeg' },
      metadata: {
        status: 'ready',
        voiceId: 'voice-1',
        voiceName: 'Voice One',
        modelId: 'eleven_multilingual_v2',
        generatedAt: 2,
        mimeType: 'audio/mpeg',
        uri: 'file:///debate/msg-1.mp3',
      },
      spokenText: 'Opening argument.',
    });
  });

  it('generates audio once for a finalized debate message and stores attachment metadata', async () => {
    const { store, rerender } = renderHookWithProviders(
      ({ messages }) => useDebateVoiceGeneration({ sessionId: 'debate-1', voiceConfig, messages }),
      { preloadedState, initialProps: { messages: [message] } }
    );

    await waitFor(() => {
      expect(generateDebateVoiceAudio).toHaveBeenCalledTimes(1);
    });

    const updatedMessages = store.getState().chat.currentSession?.messages || [];
    expect(updatedMessages[0].metadata?.debateAudio?.status).toBe('ready');
    expect(updatedMessages[0].attachments?.[0]).toMatchObject({ type: 'audio', uri: 'file:///debate/msg-1.mp3' });
    expect(StorageService.mergeSession).toHaveBeenCalledWith('debate-1', expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          id: 'msg-1',
          metadata: expect.objectContaining({
            debateAudio: expect.objectContaining({ status: 'ready' }),
          }),
        }),
      ]),
    }));

    rerender({ messages: updatedMessages });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(generateDebateVoiceAudio).toHaveBeenCalledTimes(1);
  });

  it('marks failed generation without blocking the debate', async () => {
    (generateDebateVoiceAudio as jest.Mock).mockRejectedValueOnce(new Error('quota exceeded'));

    const { store } = renderHookWithProviders(
      ({ messages }) => useDebateVoiceGeneration({ sessionId: 'debate-1', voiceConfig, messages }),
      { preloadedState, initialProps: { messages: [message] } }
    );

    await waitFor(() => {
      expect(store.getState().chat.currentSession?.messages[0].metadata?.debateAudio?.status).toBe('failed');
    });

    expect(store.getState().chat.currentSession?.messages[0].metadata?.debateAudio?.error).toBe('quota exceeded');
  });

  it('uses the MC voice for podcast interstitial messages', async () => {
    const mcMessage: Message = {
      id: 'mc-intro',
      sender: 'Debate MC',
      senderType: 'user',
      content: 'Welcome to the debate.',
      timestamp: 2,
      metadata: {
        debateInterstitial: {
          kind: 'intro',
          flowStep: 'podcast_intro',
          label: 'MC Introduction',
          usedTemplateFallback: false,
        },
      },
    };
    const podcastVoiceConfig: DebateVoiceConfig = {
      ...voiceConfig,
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

    renderHookWithProviders(
      ({ messages }) => useDebateVoiceGeneration({ sessionId: 'debate-1', voiceConfig: podcastVoiceConfig, messages }),
      { preloadedState, initialProps: { messages: [mcMessage] } }
    );

    await waitFor(() => {
      expect(generateDebateVoiceAudio).toHaveBeenCalledWith(expect.objectContaining({
        message: mcMessage,
        voice: {
          voiceId: 'voice-host',
          voiceName: 'Host Voice',
        },
      }));
    });
  });
});
