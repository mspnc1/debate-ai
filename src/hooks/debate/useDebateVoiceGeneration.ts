import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import APIKeyService from '@/services/APIKeyService';
import { StorageService } from '@/services/chat/StorageService';
import { DebateVoiceGenerationError, generateDebateVoiceAudio } from '@/services/debate/DebateVoiceService';
import { updateMessage, isApiKeyConfigured, type RootState } from '@/store';
import type { DebateAudioMetadata, DebateVoiceConfig, Message, MessageAttachment } from '@/types';

interface UseDebateVoiceGenerationInput {
  sessionId?: string;
  voiceConfig?: DebateVoiceConfig;
  messages: Message[];
}

interface UseDebateVoiceGenerationResult {
  canRetryAudio: boolean;
  retryMessageAudio: (message: Message) => void;
}

function hasAudioAttachment(message: Message): boolean {
  return Boolean(message.attachments?.some((attachment) => attachment.type === 'audio' && attachment.uri));
}

function mergeAudioAttachment(message: Message, attachment: MessageAttachment): MessageAttachment[] {
  const existing = message.attachments || [];
  return [
    ...existing.filter((candidate) => candidate.type !== 'audio'),
    attachment,
  ];
}

function getMessageById(messages: Message[], messageId: string): Message | undefined {
  return messages.find((message) => message.id === messageId);
}

function getDebaterId(message: Message): string | undefined {
  return message.metadata?.providerId || message.sender.split(' (')[0].toLowerCase();
}

function getVoiceForMessage(message: Message, voiceConfig?: DebateVoiceConfig) {
  if (!voiceConfig?.enabled) return undefined;
  if (message.metadata?.debateInterstitial) {
    return voiceConfig.podcast?.mcVoice;
  }

  const debaterId = getDebaterId(message);
  return debaterId ? voiceConfig.debaterVoices[debaterId] : undefined;
}

function shouldAutoGenerate(message: Message, voiceConfig?: DebateVoiceConfig): boolean {
  if (!voiceConfig?.enabled) return false;
  if (!message.metadata?.debateSpeech && !message.metadata?.debateInterstitial) return false;
  if (!message.content.trim()) return false;
  if (hasAudioAttachment(message)) return false;

  const status = message.metadata.debateAudio?.status;
  if (status === 'generating' || status === 'ready' || status === 'failed') return false;

  return Boolean(getVoiceForMessage(message, voiceConfig));
}

export function useDebateVoiceGeneration({
  sessionId,
  voiceConfig,
  messages,
}: UseDebateVoiceGenerationInput): UseDebateVoiceGenerationResult {
  const dispatch = useDispatch();
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const verifiedProviders = useSelector((state: RootState) => state.settings.verifiedProviders || []);
  const hasVerifiedElevenLabs = isApiKeyConfigured(apiKeys.elevenlabs) && verifiedProviders.includes('elevenlabs');
  const messagesRef = useRef(messages);
  const inFlightRef = useRef<Set<string>>(new Set());
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const persistSessionMessages = useCallback((
    targetMessageId: string,
    metadata: DebateAudioMetadata,
    attachment?: MessageAttachment
  ) => {
    if (!sessionId) return Promise.resolve();

    const persist = async () => {
      const storedSession = await StorageService.loadSession(sessionId);
      const baseMessages = storedSession?.messages?.length ? storedSession.messages : messagesRef.current;
      const nextMessages = baseMessages.map((message) => {
        if (message.id !== targetMessageId) return message;
        return {
          ...message,
          attachments: attachment ? mergeAudioAttachment(message, attachment) : message.attachments,
          metadata: {
            ...message.metadata,
            debateAudio: metadata,
          },
        };
      });

      await StorageService.mergeSession(sessionId, { messages: nextMessages });
    };

    const queuedPersist = persistQueueRef.current.catch(() => undefined).then(persist);
    persistQueueRef.current = queuedPersist.catch(() => undefined);
    return queuedPersist;
  }, [sessionId]);

  const markFailed = useCallback(async (message: Message, error: unknown) => {
    const voice = getVoiceForMessage(message, voiceConfig);
    if (!voice) return;

    const generationError = error instanceof DebateVoiceGenerationError
      ? error
      : new DebateVoiceGenerationError(
        'generation_failed',
        error instanceof Error ? error.message : 'Failed to generate debate audio.'
      );
    const metadata: DebateAudioMetadata = {
      status: 'failed',
      voiceId: voice.voiceId,
      voiceName: voice.voiceName,
      error: generationError.message,
    };

    dispatch(updateMessage({ id: message.id, metadata: { debateAudio: metadata } }));
    try {
      await persistSessionMessages(message.id, metadata);
    } catch {
      // Active debate playback should not fail because history persistence was unavailable.
    }
  }, [dispatch, persistSessionMessages, voiceConfig]);

  const generateForMessage = useCallback(async (message: Message, force = false) => {
    if (!voiceConfig?.enabled || !sessionId || !hasVerifiedElevenLabs) return;
    if (inFlightRef.current.has(message.id)) return;
    if (!force && !shouldAutoGenerate(message, voiceConfig)) return;

    const voice = getVoiceForMessage(message, voiceConfig);
    if (!voice) return;

    inFlightRef.current.add(message.id);
    const generatingMetadata: DebateAudioMetadata = {
      status: 'generating',
      voiceId: voice.voiceId,
      voiceName: voice.voiceName,
    };
    dispatch(updateMessage({ id: message.id, metadata: { debateAudio: generatingMetadata } }));

    try {
      const apiKey = await APIKeyService.getKey('elevenlabs');
      if (!apiKey) {
        throw new DebateVoiceGenerationError('generation_failed', 'Add an ElevenLabs API key before generating debate audio.');
      }

      const result = await generateDebateVoiceAudio({
        apiKey,
        sessionId,
        message,
        voice,
      });

      const latestMessage = getMessageById(messagesRef.current, message.id) || message;
      const attachments = mergeAudioAttachment(latestMessage, result.attachment);

      dispatch(updateMessage({
        id: message.id,
        attachments,
        metadata: { debateAudio: result.metadata },
      }));

      try {
        await persistSessionMessages(message.id, result.metadata, result.attachment);
      } catch {
        // Active debate playback should not fail because history persistence was unavailable.
      }
    } catch (error) {
      await markFailed(message, error);
    } finally {
      inFlightRef.current.delete(message.id);
    }
  }, [
    dispatch,
    hasVerifiedElevenLabs,
    markFailed,
    persistSessionMessages,
    sessionId,
    voiceConfig,
  ]);

  useEffect(() => {
    if (!voiceConfig?.enabled || !sessionId || !hasVerifiedElevenLabs) return;
    messages.forEach((message) => {
      if (shouldAutoGenerate(message, voiceConfig)) {
        void generateForMessage(message);
      }
    });
  }, [generateForMessage, hasVerifiedElevenLabs, messages, sessionId, voiceConfig]);

  const retryMessageAudio = useCallback((message: Message) => {
    const latestMessage = getMessageById(messagesRef.current, message.id) || message;
    void generateForMessage(latestMessage, true);
  }, [generateForMessage]);

  return useMemo(() => ({
    canRetryAudio: Boolean(voiceConfig?.enabled && hasVerifiedElevenLabs),
    retryMessageAudio,
  }), [hasVerifiedElevenLabs, retryMessageAudio, voiceConfig?.enabled]);
}
