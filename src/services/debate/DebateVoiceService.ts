import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_DEFAULT_TTS_MODEL,
  ELEVENLABS_DEFAULT_TTS_PROMPT_LIMIT,
} from '@/config/mediaProviders';
import type { DebateAudioMetadata, DebateVoiceSelection, Message, MessageAttachment } from '@/types';
import MediaGenerationService, { type GeneratedAudioPayload } from '@/services/media/MediaGenerationService';
import { persistDebateAudioDataUri } from './debateAudioStorage';
import { sanitizeDebateSpeechForTTS } from './debateAudioSanitizer';
import { trimToSentenceWithinBudget } from './debateSentenceTrim';
import {
  getElevenLabsCreditCheck,
  estimateElevenLabsTtsCreditCost,
  type ElevenLabsSubscriptionInfo,
} from '@/services/media/elevenLabsCredits';

export type DebateVoiceErrorCode = 'empty_speech' | 'speech_too_long' | 'insufficient_credits' | 'generation_failed';

export const DEBATE_AUDIO_TTS_PROMPT_LIMIT = Math.min(3000, ELEVENLABS_DEFAULT_TTS_PROMPT_LIMIT);

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
  ttsModelId?: string;
  subscription?: ElevenLabsSubscriptionInfo;
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
  const fullSpokenText = sanitizeDebateSpeechForTTS(request.message.content);
  if (!fullSpokenText) {
    throw new DebateVoiceGenerationError('empty_speech', 'There is no speakable text for this debate turn.');
  }

  // Bound the AUDIO to the TTS character budget on completed text, rather than rejecting the turn.
  // The transcript (request.message.content) stays full; only the synthesized clip is shortened, and
  // we record that it happened so the UI/metadata can explain the shorter audio.
  const untrimmedLength = fullSpokenText.length;
  const wasTrimmedForTts = untrimmedLength > DEBATE_AUDIO_TTS_PROMPT_LIMIT;
  const spokenText = wasTrimmedForTts
    ? trimToSentenceWithinBudget(fullSpokenText, DEBATE_AUDIO_TTS_PROMPT_LIMIT)
    : fullSpokenText;
  if (!spokenText) {
    throw new DebateVoiceGenerationError('empty_speech', 'There is no speakable text for this debate turn.');
  }

  const ttsModelId = request.ttsModelId || ELEVENLABS_DEFAULT_TTS_MODEL;
  const creditCheck = getElevenLabsCreditCheck(spokenText, ttsModelId, request.subscription);
  if (creditCheck.shouldBlock) {
    throw new DebateVoiceGenerationError(
      'insufficient_credits',
      creditCheck.message || 'Not enough ElevenLabs credits to generate this debate audio.'
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
      modelId: ttsModelId,
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
        ttsModelId: audio.modelId,
        generatedAt: now(),
        mimeType: persisted.mimeType,
        uri: persisted.uri,
        estimatedCreditCost: estimateElevenLabsTtsCreditCost(spokenText, audio.modelId),
        characterCost: audio.characterCost,
        requestId: audio.requestId,
        ...(wasTrimmedForTts ? { trimmedForTts: true, untrimmedCharacterCount: untrimmedLength } : {}),
      },
    };
  } catch (error) {
    throw toGenerationError(error);
  }
}
