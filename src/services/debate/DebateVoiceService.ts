import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_DEFAULT_TTS_MODEL,
  ELEVENLABS_DEFAULT_TTS_PROMPT_LIMIT,
} from '@/config/mediaProviders';
import type { DebateAudioMetadata, DebateVoiceSelection, Message, MessageAttachment } from '@/types';
import MediaGenerationService, { type GeneratedAudioPayload } from '@/services/media/MediaGenerationService';
import { persistDebateAudioDataUri } from './debateAudioStorage';
import { sanitizeDebateSpeechForTTS } from './debateAudioSanitizer';

export type DebateVoiceErrorCode = 'empty_speech' | 'speech_too_long' | 'generation_failed';

export class DebateVoiceGenerationError extends Error {
  code: DebateVoiceErrorCode;

  constructor(code: DebateVoiceErrorCode, message: string) {
    super(message);
    this.name = 'DebateVoiceGenerationError';
    this.code = code;
  }
}

export interface GenerateDebateVoiceAudioDependencies {
  generateAudio?: typeof MediaGenerationService.generateElevenLabsAudio;
  persistAudio?: typeof persistDebateAudioDataUri;
  now?: () => number;
}

export interface GenerateDebateVoiceAudioRequest {
  apiKey: string;
  sessionId: string;
  message: Message;
  voice: DebateVoiceSelection;
}

export interface GeneratedDebateVoiceAudio {
  attachment: MessageAttachment;
  metadata: DebateAudioMetadata;
  spokenText: string;
}

function toGenerationError(error: unknown): DebateVoiceGenerationError {
  if (error instanceof DebateVoiceGenerationError) return error;
  const message = error instanceof Error ? error.message : 'Failed to generate debate audio.';
  return new DebateVoiceGenerationError('generation_failed', message);
}

export async function generateDebateVoiceAudio(
  request: GenerateDebateVoiceAudioRequest,
  dependencies: GenerateDebateVoiceAudioDependencies = {}
): Promise<GeneratedDebateVoiceAudio> {
  const spokenText = sanitizeDebateSpeechForTTS(request.message.content);
  if (!spokenText) {
    throw new DebateVoiceGenerationError('empty_speech', 'There is no speakable text for this debate turn.');
  }
  if (spokenText.length > ELEVENLABS_DEFAULT_TTS_PROMPT_LIMIT) {
    throw new DebateVoiceGenerationError(
      'speech_too_long',
      `This debate turn is too long for ElevenLabs text to speech (${spokenText.length}/${ELEVENLABS_DEFAULT_TTS_PROMPT_LIMIT} characters).`
    );
  }

  const generateAudio = dependencies.generateAudio || MediaGenerationService.generateElevenLabsAudio;
  const persistAudio = dependencies.persistAudio || persistDebateAudioDataUri;
  const now = dependencies.now || Date.now;

  let audio: GeneratedAudioPayload;
  try {
    audio = await generateAudio({
      apiKey: request.apiKey,
      operation: 'text_to_speech',
      prompt: spokenText,
      modelId: ELEVENLABS_DEFAULT_TTS_MODEL,
      voiceId: request.voice.voiceId,
      outputFormat: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
    });
  } catch (error) {
    throw toGenerationError(error);
  }

  try {
    const persisted = await persistAudio(audio.dataUri, {
      sessionId: request.sessionId,
      messageId: request.message.id,
      fallbackMimeType: audio.mimeType,
    });

    const attachment: MessageAttachment = {
      type: 'audio',
      uri: persisted.uri,
      mimeType: persisted.mimeType,
      fileName: persisted.fileName,
    };

    return {
      attachment,
      spokenText,
      metadata: {
        status: 'ready',
        voiceId: request.voice.voiceId,
        voiceName: request.voice.voiceName,
        modelId: audio.modelId,
        generatedAt: now(),
        mimeType: persisted.mimeType,
        uri: persisted.uri,
      },
    };
  } catch (error) {
    throw toGenerationError(error);
  }
}
