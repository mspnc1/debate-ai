import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useAIService } from '../../providers/AIServiceProvider';

export interface QuickStartParams {
  initialPrompt?: string;
  userPrompt?: string;
  autoSend?: boolean;
}

export interface QuickStartHook {
  shouldAutoSend: boolean;
  hasInitialPrompt: boolean;
  initialPromptSent: boolean;
  handleQuickStart: (
    sendQuickStartResponses: (userPrompt: string, enrichedPrompt: string) => Promise<void>,
    setInputText: (text: string) => void,
    handleSendMessage: (messageText: string) => Promise<void>
  ) => void;
  resetQuickStart: () => void;
}

export const useQuickStart = (params: QuickStartParams): QuickStartHook => {
  const [initialPromptSent, setInitialPromptSent] = useState(false);
  const { initialPrompt, userPrompt, autoSend } = params;
  
  const { currentSession } = useSelector((state: RootState) => state.chat);
  const { aiService, isInitialized } = useAIService();
  const messages = currentSession?.messages || [];

  const shouldAutoSend = !!(
    initialPrompt && 
    userPrompt && 
    autoSend && 
    messages.length === 0 && 
    currentSession && 
    isInitialized && 
    aiService && 
    !initialPromptSent
  );

  const hasInitialPrompt = !!(
    initialPrompt && 
    typeof initialPrompt === 'string' && 
    messages.length === 0 && 
    currentSession && 
    isInitialized && 
    aiService && 
    !initialPromptSent
  );

  const handleQuickStart = (
    sendQuickStartResponses: (userPrompt: string, enrichedPrompt: string) => Promise<void>,
    setInputText: (text: string) => void,
    handleSendMessage: (messageText: string) => Promise<void>
  ): void => {

    if (!hasInitialPrompt) {
      return;
    }

    setInitialPromptSent(true);

    if (shouldAutoSend) {
      // For Quick Start: auto-send immediately with enriched prompt
      sendQuickStartResponses(userPrompt!, initialPrompt!);
    } else if (!autoSend) {
      // For regular flow: just set the text in input
      setInputText(initialPrompt!);
      
      // Auto-send after a delay for non-Quick Start flows
      setTimeout(() => {
        if (initialPrompt!.trim()) {
          handleSendMessage(initialPrompt!);
        }
      }, 800);
    }
  };

  const resetQuickStart = (): void => {
    setInitialPromptSent(false);
  };

  // Auto-trigger Quick Start when conditions are met
  useEffect(() => {

    if (hasInitialPrompt || shouldAutoSend) {
      // Note: The actual handlers will be passed in when this hook is used
      // This effect is mainly for state validation
    }
  }, [
    hasInitialPrompt,
    shouldAutoSend,
    initialPrompt, 
    userPrompt, 
    autoSend, 
    currentSession, 
    isInitialized, 
    aiService,
    messages.length,
    initialPromptSent
  ]);

  return {
    shouldAutoSend,
    hasInitialPrompt,
    initialPromptSent,
    handleQuickStart,
    resetQuickStart,
  };
};