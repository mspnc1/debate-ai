import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { addMessage, setTypingAI } from '../../store';
import { Message } from '../../types';
import { useAIService } from '../../providers/AIServiceProvider';
import { ChatService, PromptBuilder } from '../../services/chat';
import { getPersonality } from '../../config/personalities';

export interface AIResponsesHook {
  typingAIs: string[];
  isAnyAITyping: boolean;
  sendAIResponses: (
    userMessage: Message, 
    enrichedPrompt?: string
  ) => Promise<void>;
  sendQuickStartResponses: (
    userPrompt: string,
    enrichedPrompt: string
  ) => Promise<void>;
  isProcessing: boolean;
}

export const useAIResponses = (): AIResponsesHook => {
  const dispatch = useDispatch();
  const { aiService, isInitialized } = useAIService();
  const { 
    currentSession, 
    typingAIs, 
    aiPersonalities 
  } = useSelector((state: RootState) => state.chat);

  const messages = currentSession?.messages || [];
  const selectedAIs = currentSession?.selectedAIs || [];

  const sendAIResponses = async (
    userMessage: Message,
    enrichedPrompt?: string
  ): Promise<void> => {
    if (!aiService || !isInitialized || !currentSession) {
      console.error('AI service not ready or no active session');
      return;
    }

    // Determine which AIs should respond
    const mentions = userMessage.mentions || [];
    const respondingAIs = ChatService.determineRespondingAIs(mentions, selectedAIs, 2);

    // Build conversation context
    let conversationContext = ChatService.buildConversationContext(messages, userMessage);
    
    // Process AI responses sequentially (round-robin)
    for (const ai of respondingAIs) {
      dispatch(setTypingAI({ ai: ai.name, isTyping: true }));

      try {
        // Natural typing delay
        await new Promise(resolve => 
          setTimeout(resolve, ChatService.calculateTypingDelay())
        );

        // Apply personality if set
        const personalityId = aiPersonalities[ai.id] || 'default';
        const personality = getPersonality(personalityId);
        if (personality) {
          aiService.setPersonality(ai.id, personality);
        }

        // Build prompt based on context
        const isFirstAI = ChatService.isFirstAIInRound(conversationContext);
        const promptContext = {
          isFirstAI,
          isDebateMode: conversationContext.isDebateMode,
          lastSpeaker: conversationContext.lastSpeaker,
          lastMessage: conversationContext.lastMessage,
          conversationHistory: conversationContext.messages,
          mentions,
        };

        const promptForAI = enrichedPrompt && isFirstAI 
          ? enrichedPrompt 
          : PromptBuilder.buildAIPrompt(
              userMessage.content,
              promptContext,
              ai,
              personality
            );

        // Get AI response
        const response = await aiService.sendMessage(
          ai.id,
          promptForAI,
          conversationContext.messages.slice(0, -1), // Don't include the current user message
          conversationContext.isDebateMode
        );

        // Create AI message
        const aiMessage = ChatService.createAIMessage(ai, response);
        dispatch(addMessage(aiMessage));

        // Update context for next AI
        conversationContext = ChatService.buildRoundRobinContext(
          conversationContext.messages,
          [aiMessage]
        );
        
      } catch (error) {
        console.error(`Error getting response from ${ai.name}:`, error);
        
        // Add error message
        const errorMessage = ChatService.createErrorMessage(ai, error as Error);
        dispatch(addMessage(errorMessage));

        // Even error messages are part of the conversation context
        conversationContext = ChatService.buildRoundRobinContext(
          conversationContext.messages,
          [errorMessage]
        );
      } finally {
        dispatch(setTypingAI({ ai: ai.name, isTyping: false }));
      }
    }
  };

  const sendQuickStartResponses = async (
    userPrompt: string,
    enrichedPrompt: string
  ): Promise<void> => {
    if (!aiService || !isInitialized || !currentSession) {
      console.error('AI service not ready or no active session');
      return;
    }

    // Create user message with user-visible prompt
    const userMessage = ChatService.createUserMessage(userPrompt, []);
    dispatch(addMessage(userMessage));

    // Use enriched prompt for AI responses
    const respondingAIs = selectedAIs.slice(0, 2); // Pick up to 2 AIs for response
    let conversationContext = ChatService.buildConversationContext(messages, userMessage);
    
    for (const ai of respondingAIs) {
      dispatch(setTypingAI({ ai: ai.name, isTyping: true }));

      try {
        await new Promise(resolve => 
          setTimeout(resolve, ChatService.calculateTypingDelay())
        );

        if (!aiService || !isInitialized) {
          throw new Error('AI service not ready');
        }

        // Use the enriched prompt which includes personality injection
        const isFirstAI = conversationContext.messages[conversationContext.messages.length - 1].senderType === 'user';
        let promptForAI: string;
        let historyToPass: Message[];
        
        if (isFirstAI) {
          // First AI gets the enriched prompt
          promptForAI = enrichedPrompt;
          historyToPass = conversationContext.messages.slice(0, -1);
        } else {
          // Subsequent AIs engage with the previous response
          const lastSpeaker = conversationContext.messages[conversationContext.messages.length - 1].sender;
          const lastMessage = conversationContext.messages[conversationContext.messages.length - 1].content;
          promptForAI = PromptBuilder.buildRoundRobinPrompt(lastSpeaker, lastMessage);
          historyToPass = conversationContext.messages.slice(0, -1);
        }
        
        const response = await aiService.sendMessage(
          ai.id,
          promptForAI,
          historyToPass,
          false
        );

        const aiMessage = ChatService.createAIMessage(ai, response);
        dispatch(addMessage(aiMessage));
        
        // Update context for next AI
        conversationContext = ChatService.buildRoundRobinContext(
          conversationContext.messages,
          [aiMessage]
        );
        
      } catch (error) {
        console.error(`Error getting response from ${ai.name}:`, error);
        
        const errorMessage = ChatService.createErrorMessage(ai, error as Error);
        dispatch(addMessage(errorMessage));
        
        conversationContext = ChatService.buildRoundRobinContext(
          conversationContext.messages,
          [errorMessage]
        );
      } finally {
        dispatch(setTypingAI({ ai: ai.name, isTyping: false }));
      }
    }
  };

  return {
    typingAIs,
    isAnyAITyping: typingAIs.length > 0,
    sendAIResponses,
    sendQuickStartResponses,
    isProcessing: typingAIs.length > 0,
  };
};