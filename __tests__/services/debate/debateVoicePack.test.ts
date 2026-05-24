import * as FileSystem from 'expo-file-system/legacy';
import {
  createDebateVoicePackGalleryEntry,
  DEBATE_VOICE_PACK_PAUSE_MS,
  getDebateVoicePackCandidates,
} from '@/services/debate/debateVoicePack';
import type { AI, Message } from '@/types';

const createDebateMessage = (overrides: Partial<Message>): Message => ({
  id: 'msg_1_openai',
  sender: 'ChatGPT (Default)',
  senderType: 'ai',
  content: 'Opening statement for the affirmative side.',
  timestamp: 1000,
  metadata: {
    providerId: 'openai',
    debateSpeech: {
      speaker: 'aff',
      label: 'Opening statement',
    },
  },
  ...overrides,
});

describe('debateVoicePack', () => {
  const participants: AI[] = [
    { id: 'openai', provider: 'openai', name: 'ChatGPT', model: 'gpt-5' },
    { id: 'google', provider: 'google', name: 'Gemini', model: 'gemini-3.5-flash' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
  });

  it('collects ready and unavailable debate voice pack candidates', () => {
    const readyMessage = createDebateMessage({
      id: 'ready',
      attachments: [{ type: 'audio', uri: 'file:///ready.mp3', mimeType: 'audio/mpeg' }],
      metadata: {
        providerId: 'openai',
        debateSpeech: { speaker: 'aff', label: 'Opening statement' },
        debateAudio: {
          status: 'ready',
          voiceId: 'voice_1',
          voiceName: 'Aria',
          uri: 'file:///ready.mp3',
          mimeType: 'audio/mpeg',
        },
      },
    });
    const failedMessage = createDebateMessage({
      id: 'failed',
      sender: 'Gemini (Default)',
      metadata: {
        providerId: 'google',
        debateSpeech: { speaker: 'neg', label: 'Opening response' },
        debateAudio: {
          status: 'failed',
          voiceId: 'voice_2',
          voiceName: 'Roger',
          error: 'Too long',
        },
      },
    });
    const ignoredUserMessage = createDebateMessage({
      id: 'user',
      sender: 'You',
      senderType: 'user',
      metadata: undefined,
    });

    const candidates = getDebateVoicePackCandidates([readyMessage, failedMessage, ignoredUserMessage]);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      id: 'ready',
      status: 'ready',
      speakerId: 'openai',
      speakerName: 'ChatGPT',
      speechLabel: 'Opening statement',
      uri: 'file:///ready.mp3',
      mimeType: 'audio/mpeg',
    });
    expect(candidates[1]).toMatchObject({
      id: 'failed',
      status: 'failed',
      speakerId: 'google',
      speakerName: 'Gemini',
      error: 'Too long',
    });
  });

  it('copies selected ready clips into a gallery-owned voice pack entry', async () => {
    const readyMessages = [
      createDebateMessage({
        id: 'msg_1_openai',
        attachments: [{ type: 'audio', uri: 'file:///debate/msg_1.mp3', mimeType: 'audio/mpeg' }],
        metadata: {
          providerId: 'openai',
          debateSpeech: { speaker: 'aff', label: 'Opening statement' },
          debateAudio: {
            status: 'ready',
            voiceId: 'voice_1',
            voiceName: 'Aria',
            uri: 'file:///debate/msg_1.mp3',
            mimeType: 'audio/mpeg',
          },
        },
      }),
      createDebateMessage({
        id: 'msg_2_google',
        sender: 'Gemini (Default)',
        content: 'Opening response for the negative side.',
        attachments: [{ type: 'audio', uri: 'file:///debate/msg_2.mp3', mimeType: 'audio/mpeg' }],
        metadata: {
          providerId: 'google',
          debateSpeech: { speaker: 'neg', label: 'Opening response' },
          debateAudio: {
            status: 'ready',
            voiceId: 'voice_2',
            voiceName: 'Roger',
            uri: 'file:///debate/msg_2.mp3',
            mimeType: 'audio/mpeg',
          },
        },
      }),
    ];
    const candidates = getDebateVoicePackCandidates(readyMessages);
    const copyAsync = jest.fn().mockResolvedValue(undefined) as unknown as typeof FileSystem.copyAsync;

    const entry = await createDebateVoicePackGalleryEntry({
      sessionId: 'debate_1',
      topic: 'Resolved: storage matters.',
      participants,
      candidates,
      selectedCandidateIds: ['msg_2_google', 'msg_1_openai'],
    }, {
      now: () => 123456,
      copyAsync,
    });

    expect(entry).toMatchObject({
      id: 'debate_voice_pack_debate_1_123456',
      mediaType: 'audio',
      providerId: 'elevenlabs',
      modelId: 'debate_voice_pack',
      operation: 'debate_voice_pack',
      prompt: 'Voice pack: Resolved: storage matters.',
      status: 'succeeded',
    });
    expect(entry.voicePack?.clips.map((clip) => clip.messageId)).toEqual([
      'msg_1_openai',
      'msg_2_google',
    ]);
    expect(entry.voicePack?.clips.every((clip) => clip.pauseAfterMs === DEBATE_VOICE_PACK_PAUSE_MS)).toBe(true);
    expect(copyAsync).toHaveBeenNthCalledWith(1, {
      from: 'file:///debate/msg_1.mp3',
      to: '/tmp/gallery-voice-packs/debate_voice_pack_debate_1_123456/001_msg_1_openai.mp3',
    });
    expect(copyAsync).toHaveBeenNthCalledWith(2, {
      from: 'file:///debate/msg_2.mp3',
      to: '/tmp/gallery-voice-packs/debate_voice_pack_debate_1_123456/002_msg_2_google.mp3',
    });
    expect(entry.uri).toBe(entry.voicePack?.clips[0].uri);
  });
});
