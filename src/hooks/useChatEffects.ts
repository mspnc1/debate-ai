import { useEffect, useState, useRef } from 'react';
import { FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAIService } from '../providers/AIServiceProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatSession } from '../types';

interface UseChatEffectsProps {
  route: {
    params: {
      sessionId: string;
      resuming?: boolean;
      searchTerm?: string;
      initialPrompt?: string;
      userPrompt?: string;
      autoSend?: boolean;
    };
  };
  onQuickStart: (userPrompt: string, enrichedPrompt: string) => void;
  onRegularSend: (prompt: string) => void;
  setInputText: (text: string) => void;
}

export const useChatEffects = ({ 
  route, 
  onQuickStart, 
  onRegularSend,
  setInputText 
}: UseChatEffectsProps) => {
  const [initialPromptSent, setInitialPromptSent] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  const { aiService, isInitialized } = useAIService();
  const { currentSession } = useSelector((state: RootState) => state.chat);
  const messages = currentSession?.messages || [];
  
  const searchTerm = route.params?.searchTerm;
  const initialPrompt = route.params?.initialPrompt;
  const userPrompt = route.params?.userPrompt;
  const autoSend = route.params?.autoSend;

  // Send initial prompt if provided - only when service is ready and not sent before
  useEffect(() => {
    console.log('Quick Start useEffect check:', {
      hasInitialPrompt: !!initialPrompt,
      hasUserPrompt: !!userPrompt,
      autoSend,
      hasSession: !!currentSession,
      isInitialized,
      hasService: !!aiService,
      initialPromptSent,
      messagesLength: messages.length
    });
    
    if (
      initialPrompt && 
      typeof initialPrompt === 'string' && 
      messages.length === 0 && 
      currentSession && 
      isInitialized && 
      aiService && 
      !initialPromptSent
    ) {
      setInitialPromptSent(true);
      
      if (autoSend && userPrompt) {
        // For Quick Start: auto-send immediately with enriched prompt
        console.log('Triggering Quick Start auto-send with:', { userPrompt, enrichedPrompt: initialPrompt });
        onQuickStart(userPrompt, initialPrompt);
      } else if (!autoSend) {
        // For regular flow: just set the text in input
        setInputText(initialPrompt);
        
        // Auto-send after a longer delay
        const timeoutId = setTimeout(() => {
          if (initialPrompt.trim()) {
            onRegularSend(initialPrompt);
          }
        }, 800);
        
        return () => clearTimeout(timeoutId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, userPrompt, autoSend, currentSession, isInitialized, aiService]);

  // Save session to AsyncStorage whenever it changes
  useEffect(() => {
    if (currentSession) {
      saveSessionToStorage(currentSession);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession, currentSession?.messages.length]);

  // Scroll to first matching message when search term is present
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (searchTerm && messages.length > 0) {
      const matchIndex = messages.findIndex(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (matchIndex >= 0) {
        // Small delay to ensure list is rendered
        timeoutId = setTimeout(() => {
          flatListRef.current?.scrollToIndex({ 
            index: matchIndex, 
            animated: true,
            viewPosition: 0.5 // Center the message
          });
        }, 100);
      }
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, messages.length]);

  const saveSessionToStorage = async (session: ChatSession) => {
    try {
      // Get existing sessions
      const stored = await AsyncStorage.getItem('chatSessions');
      const sessions = stored ? JSON.parse(stored) as ChatSession[] : [];
      
      // Update or add current session
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      // Save back to storage
      await AsyncStorage.setItem('chatSessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving session to storage:', error);
    }
  };

  return {
    flatListRef,
    searchTerm,
  };
};