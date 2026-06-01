import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { addMessage } from '../../store';
import { Message, MessageAttachment } from '../../types';
import { useAIService } from '../../providers/AIServiceProvider';
import { ChatService, ChatOrchestrator } from '../../services/chat';
import useFeatureAccess from '@/hooks/useFeatureAccess';
import { usePersonality } from '@/hooks/usePersonality';

export interface AIResponsesHook {
  typingAIs: string[];
  isAnyAITyping: boolean;
  sendAIResponses: (
    userMessage: Message,
    enrichedPrompt?: string,
    attachments?: MessageAttachment[],
    webSearchEnabled?: boolean
  ) => Promise<void>;
  sendQuickStartResponses: (
    userPrompt: string,
    enrichedPrompt: string,
    webSearchEnabled?: boolean
  ) => Promise<void>;
  retryAIResponses: (
    userMessage: Message,
    existingMessagesOverride: Message[],
    webSearchEnabled?: boolean
  ) => Promise<void>;
  isProcessing: boolean;
}

export const useAIResponsesWithStreaming = (_isResuming?: boolean): AIResponsesHook => {
  const dispatch = useDispatch();
  const { aiService, isInitialized } = useAIService();

  const {
    currentSession,
    typingAIs,
    aiPersonalities,
    selectedModels,
  } = useSelector((state: RootState) => state.chat);

  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const expertModeConfigs = useSelector((state: RootState) => state.settings.expertMode || {});

  const streamingPreferences = useSelector((state: RootState) => state.streaming?.streamingPreferences || {});
  const globalStreamingEnabled = useSelector((state: RootState) => state.streaming?.globalStreamingEnabled ?? true);

  const messages = useMemo(() => currentSession?.messages ?? [], [currentSession?.messages]);
  const { isDemo } = useFeatureAccess();
  const { getPersonality: getMergedPersonality } = usePersonality();

  // Build merged personalities map from context (keyed by personality ID)
  const mergedPersonalities = useMemo(() => {
    const result: Record<string, NonNullable<ReturnType<typeof getMergedPersonality>>> = {};
    Object.values(aiPersonalities).forEach((personalityId) => {
      if (personalityId && personalityId !== 'default' && !result[personalityId]) {
        const merged = getMergedPersonality(personalityId);
        if (merged) {
          result[personalityId] = merged;
        }
      }
    });
    return result;
  }, [aiPersonalities, getMergedPersonality]);

  const orchestratorRef = useRef<ChatOrchestrator | null>(null);

  useEffect(() => {
    if (!aiService) {
      orchestratorRef.current = null;
      return;
    }
    orchestratorRef.current = new ChatOrchestrator(aiService, dispatch);
    return () => {
      orchestratorRef.current = null;
    };
  }, [aiService, dispatch]);

  useEffect(() => {
    orchestratorRef.current?.updateSession(currentSession ?? null);
  }, [currentSession]);

  const processAIResponses = useCallback(async (
    userMessage: Message,
    enrichedPrompt?: string,
    attachments?: MessageAttachment[],
    webSearchEnabled?: boolean,
    existingMessagesOverride?: Message[]
  ) => {
    if (!aiService || !isInitialized || !currentSession || !orchestratorRef.current) {
      console.error('AI service not ready or no active session');
      return;
    }

    await orchestratorRef.current.processUserMessage({
      userMessage,
      existingMessages: existingMessagesOverride || messages,
      mentions: userMessage.mentions || [],
      enrichedPrompt,
      attachments,
      resumptionContext: undefined,
      aiPersonalities,
      mergedPersonalities,
      selectedModels,
      apiKeys,
      expertModeConfigs,
      streamingPreferences,
      globalStreamingEnabled,
      allowStreaming: true,
      isDemo,
      webSearchEnabled,
    });
  }, [aiService, apiKeys, expertModeConfigs, globalStreamingEnabled, isDemo, isInitialized, messages, selectedModels, aiPersonalities, mergedPersonalities, streamingPreferences, currentSession]);

  const sendAIResponses = useCallback(async (
    userMessage: Message,
    enrichedPrompt?: string,
    attachments?: MessageAttachment[],
    webSearchEnabled?: boolean
  ) => {
    await processAIResponses(userMessage, enrichedPrompt, attachments, webSearchEnabled);
  }, [processAIResponses]);

  const retryAIResponses = useCallback(async (
    userMessage: Message,
    existingMessagesOverride: Message[],
    webSearchEnabled?: boolean
  ) => {
    await processAIResponses(
      userMessage,
      undefined,
      userMessage.attachments,
      webSearchEnabled,
      existingMessagesOverride
    );
  }, [processAIResponses]);

  const sendQuickStartResponses = useCallback(async (
    userPrompt: string,
    enrichedPrompt: string,
    webSearchEnabled?: boolean
  ) => {
    if (!aiService || !isInitialized || !currentSession || !orchestratorRef.current) {
      console.error('AI service not ready or no active session');
      return;
    }

    const userMessage = ChatService.createUserMessage(userPrompt, []);
    dispatch(addMessage(userMessage));

    await orchestratorRef.current.processUserMessage({
      userMessage,
      existingMessages: messages,
      mentions: [],
      enrichedPrompt,
      aiPersonalities,
      mergedPersonalities,
      selectedModels,
      apiKeys,
      expertModeConfigs,
      streamingPreferences,
      globalStreamingEnabled,
      allowStreaming: true,
      isDemo,
      webSearchEnabled,
    });
  }, [aiService, apiKeys, dispatch, expertModeConfigs, globalStreamingEnabled, isDemo, isInitialized, messages, selectedModels, aiPersonalities, mergedPersonalities, streamingPreferences, currentSession]);

  return {
    typingAIs,
    isAnyAITyping: typingAIs.length > 0,
    sendAIResponses,
    sendQuickStartResponses,
    retryAIResponses,
    isProcessing: typingAIs.length > 0,
  };
};
