import {
  DEBATE_AUDIO_TTS_PROMPT_LIMIT,
  generateDebateVoiceAudio,
  DebateVoiceGenerationError,
} from '@/services/debate/DebateVoiceService';
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
      modelId: 'eleven_multilingual_v2',
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
    }, {
      generateAudio,
      persistAudio,
      now: () => 123,
    });

    expect(generateAudio).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'key',
      operation: 'text_to_speech',
      prompt: 'A concise argument with evidence.',
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
      generatedAt: 123,
    });
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
