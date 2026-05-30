import {
  DEBATE_AUDIO_TTS_PROMPT_LIMIT,
  generateDebateVoiceAudio,
  DebateVoiceGenerationError,
} from '@/services/debate/DebateVoiceService';
import {
  ELEVENLABS_DEFAULT_TTS_MODEL,
  ELEVENLABS_MULTILINGUAL_TTS_MODEL,
} from '@/config/mediaProviders';
import type { Message } from '@/types';

const message: Message = {
  id: 'msg-1',
  sender: 'Claude',
  senderType: 'ai',
  content: 'A concise argument with [evidence](https://example.com).',
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

describe('generateDebateVoiceAudio', () => {
  it('generates and persists sanitized debate audio', async () => {
    const generateAudio = jest.fn().mockResolvedValue({
      dataUri: 'data:audio/mpeg;base64,YXVkaW8=',
      mimeType: 'audio/mpeg',
      modelId: ELEVENLABS_DEFAULT_TTS_MODEL,
      operation: 'text_to_speech',
      characterCost: 25,
      requestId: 'req_voice_1',
    });
    const persistAudio = jest.fn().mockResolvedValue({
      uri: 'file:///debate-audio/debate/msg-1.mp3',
      mimeType: 'audio/mpeg',
      fileName: 'msg-1.mp3',
    });

    const result = await generateDebateVoiceAudio({
      apiKey: 'key',
      sessionId: 'debate-1',
      message,
      voice: { voiceId: 'voice-1', voiceName: 'Voice One' },
    }, {
      generateAudio,
      persistAudio,
      now: () => 123,
    });

    expect(generateAudio).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'key',
      operation: 'text_to_speech',
      prompt: 'A concise argument with evidence.',
      modelId: ELEVENLABS_DEFAULT_TTS_MODEL,
      voiceId: 'voice-1',
    }));
    expect(persistAudio).toHaveBeenCalledWith('data:audio/mpeg;base64,YXVkaW8=', expect.objectContaining({
      sessionId: 'debate-1',
      messageId: 'msg-1',
    }));
    expect(result.attachment).toMatchObject({ type: 'audio', uri: 'file:///debate-audio/debate/msg-1.mp3' });
    expect(result.metadata).toMatchObject({
      status: 'ready',
      voiceId: 'voice-1',
      voiceName: 'Voice One',
      modelId: ELEVENLABS_DEFAULT_TTS_MODEL,
      ttsModelId: ELEVENLABS_DEFAULT_TTS_MODEL,
      generatedAt: 123,
      characterCost: 25,
      requestId: 'req_voice_1',
      estimatedCreditCost: 17,
    });
  });

  it('passes through Multilingual v2 when explicitly selected', async () => {
    const generateAudio = jest.fn().mockResolvedValue({
      dataUri: 'data:audio/mpeg;base64,YXVkaW8=',
      mimeType: 'audio/mpeg',
      modelId: ELEVENLABS_MULTILINGUAL_TTS_MODEL,
      operation: 'text_to_speech',
    });
    const persistAudio = jest.fn().mockResolvedValue({
      uri: 'file:///debate-audio/debate/msg-1.mp3',
      mimeType: 'audio/mpeg',
      fileName: 'msg-1.mp3',
    });

    const result = await generateDebateVoiceAudio({
      apiKey: 'key',
      sessionId: 'debate-1',
      message,
      voice: { voiceId: 'voice-1', voiceName: 'Voice One' },
      ttsModelId: ELEVENLABS_MULTILINGUAL_TTS_MODEL,
    }, { generateAudio, persistAudio });

    expect(generateAudio).toHaveBeenCalledWith(expect.objectContaining({
      modelId: ELEVENLABS_MULTILINGUAL_TTS_MODEL,
    }));
    expect(result.metadata).toMatchObject({
      modelId: ELEVENLABS_MULTILINGUAL_TTS_MODEL,
      ttsModelId: ELEVENLABS_MULTILINGUAL_TTS_MODEL,
      estimatedCreditCost: 33,
    });
  });

  it('blocks low-credit auto-generation before calling ElevenLabs', async () => {
    const generateAudio = jest.fn();

    await expect(generateDebateVoiceAudio({
      apiKey: 'key',
      sessionId: 'debate-1',
      message,
      voice: { voiceId: 'voice-1', voiceName: 'Voice One' },
      subscription: {
        characterCount: 999,
        characterLimit: 1000,
        remainingCredits: 1,
        overageAllowed: false,
        resetDateLabel: 'Jan 1, 2024',
      },
    }, { generateAudio })).rejects.toMatchObject({
      code: 'insufficient_credits',
    } satisfies Partial<DebateVoiceGenerationError>);

    expect(generateAudio).not.toHaveBeenCalled();
  });

  it('rejects empty speakable text before calling ElevenLabs', async () => {
    const generateAudio = jest.fn();
    const emptyMessage = { ...message, content: '[1] https://example.com' };

    await expect(generateDebateVoiceAudio({
      apiKey: 'key',
      sessionId: 'debate-1',
      message: emptyMessage,
      voice: { voiceId: 'voice-1', voiceName: 'Voice One' },
    }, { generateAudio })).rejects.toMatchObject({
      code: 'empty_speech',
    } satisfies Partial<DebateVoiceGenerationError>);

    expect(generateAudio).not.toHaveBeenCalled();
  });

  it('rejects oversized debate turns before generating long audio clips', async () => {
    const generateAudio = jest.fn();
    const oversizedMessage = {
      ...message,
      content: 'word '.repeat(DEBATE_AUDIO_TTS_PROMPT_LIMIT),
    };

    await expect(generateDebateVoiceAudio({
      apiKey: 'key',
      sessionId: 'debate-1',
      message: oversizedMessage,
      voice: { voiceId: 'voice-1', voiceName: 'Voice One' },
    }, { generateAudio })).rejects.toMatchObject({
      code: 'speech_too_long',
    } satisfies Partial<DebateVoiceGenerationError>);

    expect(generateAudio).not.toHaveBeenCalled();
  });
});
