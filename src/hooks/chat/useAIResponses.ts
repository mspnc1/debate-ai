import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { Message, MessageAttachment } from '../../types';
import { useAIService } from '../../providers/AIServiceProvider';
import { ChatService, ChatOrchestrator } from '../../services/chat';
import { addMessage } from '../../store';

export interface AIResponsesHook {
  typingAIs: string[];
  isAnyAITyping: boolean;
  sendAIResponses: (
    userMessage: Message,
    enrichedPrompt?: string,
    attachments?: MessageAttachment[]
  ) => Promise<void>;
  sendQuickStartResponses: (
    userPrompt: string,
    enrichedPrompt: string,
    attachments?: MessageAttachment[]
  ) => Promise<void>;
  isProcessing: boolean;
}

export const useAIResponses = (_isResuming?: boolean): AIResponsesHook => {
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

  const messages = useMemo(() => currentSession?.messages ?? [], [currentSession?.messages]);

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

  const sendAIResponses = useCallback(async (
    userMessage: Message,
    enrichedPrompt?: string,
    attachments?: MessageAttachment[]
  ) => {
    if (!aiService || !isInitialized || !currentSession || !orchestratorRef.current) {
      console.error('AI service not ready or no active session');
      return;
    }

    await orchestratorRef.current.processUserMessage({
      userMessage,
      existingMessages: messages,
      mentions: userMessage.mentions || [],
      enrichedPrompt,
      attachments,
      resumptionContext: undefined,
      aiPersonalities,
      selectedModels,
      apiKeys,
      expertModeConfigs,
      streamingPreferences: {},
      globalStreamingEnabled: false,
      allowStreaming: false,
      isDemo: false,
    });
  }, [aiService, apiKeys, expertModeConfigs, isInitialized, messages, selectedModels, aiPersonalities, currentSession]);

  const sendQuickStartResponses = useCallback(async (
    userPrompt: string,
    enrichedPrompt: string,
    attachments?: MessageAttachment[]
  ) => {
    if (!aiService || !isInitialized || !currentSession || !orchestratorRef.current) {
      console.error('AI service not ready or no active session');
      return;
    }

    const userMessage: Message = {
      ...ChatService.createUserMessage(userPrompt, []),
      ...(attachments?.length ? { attachments } : {}),
    };
    dispatch(addMessage(userMessage));

    await orchestratorRef.current.processUserMessage({
      userMessage,
      existingMessages: messages,
      mentions: [],
      enrichedPrompt,
      attachments,
      aiPersonalities,
      selectedModels,
      apiKeys,
      expertModeConfigs,
      streamingPreferences: {},
      globalStreamingEnabled: false,
      allowStreaming: false,
      isDemo: false,
    });
  }, [aiService, apiKeys, dispatch, expertModeConfigs, isInitialized, messages, selectedModels, aiPersonalities, currentSession]);

  return {
    typingAIs,
    isAnyAITyping: typingAIs.length > 0,
    sendAIResponses,
    sendQuickStartResponses,
    isProcessing: typingAIs.length > 0,
  };
};
