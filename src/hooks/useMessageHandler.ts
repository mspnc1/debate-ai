import { useState } from 'react';
import { Keyboard } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, addMessage, setTypingAI } from '../store';
import { Message } from '../types';
import { useAIService } from '../providers/AIServiceProvider';
import { getPersonality } from '../config/personalities';

export const useMessageHandler = () => {
  const dispatch = useDispatch();
  const [inputText, setInputText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  
  const { aiService, isInitialized } = useAIService();
  const { currentSession, aiPersonalities } = useSelector((state: RootState) => state.chat);
  const messages = currentSession?.messages || [];
  const selectedAIs = currentSession?.selectedAIs || [];

  const parseMentions = (text: string): string[] => {
    const matches = text.match(/@(\w+)/g) || [];
    return matches.map(m => m.substring(1).toLowerCase());
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    // Check for @ mentions
    const lastChar = text[text.length - 1];
    setShowMentions(lastChar === '@' || !!text.match(/@\w*$/));
  };

  const insertMention = (aiName: string) => {
    const currentText = inputText;
    const atIndex = currentText.lastIndexOf('@');
    const newText = currentText.substring(0, atIndex) + `@${aiName} `;
    setInputText(newText);
    setShowMentions(false);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || !currentSession) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'You',
      senderType: 'user',
      content: messageText.trim(),
      timestamp: Date.now(),
      mentions: parseMentions(messageText),
    };

    dispatch(addMessage(userMessage));
    setInputText('');
    Keyboard.dismiss();

    // Determine which AIs should respond
    const mentions = parseMentions(messageText);
    
    let respondingAIs: typeof selectedAIs;
    if (mentions.length > 0) {
      respondingAIs = selectedAIs.filter(ai => mentions.includes(ai.name.toLowerCase()));
    } else if (selectedAIs.length > 1) {
      // Pick two different random AIs for a back-and-forth
      const firstAI = selectedAIs[Math.floor(Math.random() * selectedAIs.length)];
      const remainingAIs = selectedAIs.filter(ai => ai.id !== firstAI.id);
      const secondAI = remainingAIs[Math.floor(Math.random() * remainingAIs.length)];
      respondingAIs = [firstAI, secondAI];
    } else {
      respondingAIs = selectedAIs;
    }

    // Build conversation context incrementally (round-robin style)
    let conversationContext = [...messages, userMessage];
    
    // Process AI responses sequentially (round-robin)
    for (const ai of respondingAIs) {
      dispatch(setTypingAI({ ai: ai.name, isTyping: true }));

      try {
        // Simulate natural typing delay
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        // Get AI response using service
        if (!aiService || !isInitialized) {
          throw new Error('AI service not ready. Please wait for initialization to complete.');
        }

        // Apply personality if set
        const personalityId = aiPersonalities[ai.id] || 'default';
        const personality = getPersonality(personalityId);
        if (personality) {
          aiService.setPersonality(ai.id, personality);
        }

        // For round-robin: Each AI sees the full conversation including previous AI responses
        const isDebateMode = conversationContext.some(msg => msg.content.includes('[DEBATE MODE]'));
        
        // Build the prompt based on position in conversation
        const isFirstAI = conversationContext[conversationContext.length - 1].senderType === 'user';
        let promptForAI: string;
        let historyToPass: Message[];
        
        if (isFirstAI) {
          // First AI responds directly to the user's message
          promptForAI = userMessage.content;
          historyToPass = conversationContext.slice(0, -1); // Don't include the current user message
        } else {
          // Subsequent AIs should engage with the previous AI's response
          const lastSpeaker = conversationContext[conversationContext.length - 1].sender;
          const lastMessage = conversationContext[conversationContext.length - 1].content;
          
          promptForAI = `You are in a multi-AI conversation. ${lastSpeaker} just responded to the user's message. 

${lastSpeaker} said: "${lastMessage}"

Please respond to ${lastSpeaker}'s comment above. You can agree, disagree, add new perspectives, or take the conversation in a new direction. Do NOT respond directly to the original user message - respond to what ${lastSpeaker} just said.`;
          
          // Include full history so they understand context
          historyToPass = conversationContext.slice(0, -1);
        }
        
        const response = await aiService.sendMessage(
          ai.id,
          promptForAI,
          historyToPass,
          isDebateMode
        );

        const aiMessage: Message = {
          id: `msg_${Date.now()}_${ai.id}`,
          sender: ai.name,
          senderType: 'ai',
          content: response,
          timestamp: Date.now(),
        };

        dispatch(addMessage(aiMessage));
        
        // Add this AI's response to the context for the next AI
        conversationContext = [...conversationContext, aiMessage];
        
      } catch (error) {
        console.error(`Error getting response from ${ai.name}:`, error);
        
        // Add error message to chat
        const errorMessage: Message = {
          id: `msg_${Date.now()}_${ai.id}_error`,
          sender: ai.name,
          senderType: 'ai',
          content: error instanceof Error && error.message.includes('not configured') 
            ? `I'm not configured yet. Please add my API key in Settings → API Configuration.`
            : `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        };
        dispatch(addMessage(errorMessage));
        
        // Even error messages are part of the conversation context
        conversationContext = [...conversationContext, errorMessage];
      } finally {
        dispatch(setTypingAI({ ai: ai.name, isTyping: false }));
      }
    }
  };

  const handleQuickStartMessage = async (userPromptText: string, enrichedPromptText: string) => {
    console.log('handleQuickStartMessage called with:', {
      userPromptText,
      enrichedPromptText,
      hasSession: !!currentSession,
      selectedAIsCount: selectedAIs.length
    });
    
    if (!userPromptText.trim() || !currentSession) {
      console.log('handleQuickStartMessage early return - missing prompt or session');
      return;
    }

    // Add user message with the user-visible prompt
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'You',
      senderType: 'user',
      content: userPromptText.trim(),
      timestamp: Date.now(),
      mentions: [],
    };

    dispatch(addMessage(userMessage));
    setInputText('');
    Keyboard.dismiss();

    // Use enriched prompt for AI responses
    const respondingAIs = selectedAIs.slice(0, 2); // Pick up to 2 AIs for response
    let conversationContext = [...messages, userMessage];
    
    for (const ai of respondingAIs) {
      dispatch(setTypingAI({ ai: ai.name, isTyping: true }));

      try {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        if (!aiService || !isInitialized) {
          throw new Error('AI service not ready');
        }

        // Use the enriched prompt which includes personality injection
        const isFirstAI = conversationContext[conversationContext.length - 1].senderType === 'user';
        let promptForAI: string;
        let historyToPass: Message[];
        
        if (isFirstAI) {
          // First AI gets the enriched prompt
          promptForAI = enrichedPromptText;
          historyToPass = conversationContext.slice(0, -1);
        } else {
          // Subsequent AIs engage with the previous response
          const lastSpeaker = conversationContext[conversationContext.length - 1].sender;
          const lastMessage = conversationContext[conversationContext.length - 1].content;
          promptForAI = `You are in a multi-AI conversation. ${lastSpeaker} just responded. 
${lastSpeaker} said: "${lastMessage}"
Please respond to ${lastSpeaker}'s comment. Add your perspective or take the conversation in a new direction.`;
          historyToPass = conversationContext.slice(0, -1);
        }
        
        const response = await aiService.sendMessage(
          ai.id,
          promptForAI,
          historyToPass,
          false
        );

        const aiMessage: Message = {
          id: `msg_${Date.now()}_${ai.id}`,
          sender: ai.name,
          senderType: 'ai',
          content: response,
          timestamp: Date.now(),
        };

        dispatch(addMessage(aiMessage));
        conversationContext = [...conversationContext, aiMessage];
        
      } catch (error) {
        console.error(`Error getting response from ${ai.name}:`, error);
        
        const errorMessage: Message = {
          id: `msg_${Date.now()}_${ai.id}_error`,
          sender: ai.name,
          senderType: 'ai',
          content: error instanceof Error && error.message.includes('not configured') 
            ? `I'm not configured yet. Please add my API key in Settings.`
            : `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        };
        dispatch(addMessage(errorMessage));
        conversationContext = [...conversationContext, errorMessage];
      } finally {
        dispatch(setTypingAI({ ai: ai.name, isTyping: false }));
      }
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    await handleSendMessage(inputText);
  };

  return {
    inputText,
    setInputText,
    showMentions,
    handleInputChange,
    insertMention,
    sendMessage,
    handleSendMessage,
    handleQuickStartMessage,
    parseMentions,
  };
};