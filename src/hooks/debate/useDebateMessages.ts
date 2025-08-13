/**
 * useDebateMessages Hook
 * Manages debate message operations and typing indicators
 */

import { useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { addMessage } from '../../store';
import { Message } from '../../types';

export interface UseDebateMessagesReturn {
  messages: Message[];
  typingAIs: string[];
  addHostMessage: (content: string) => void;
  getDebateMessages: () => Message[];
  messageCount: number;
}

export const useDebateMessages = (debateStartTime?: number): UseDebateMessagesReturn => {
  const dispatch = useDispatch();
  const currentSession = useSelector((state: RootState) => state.chat.currentSession);
  const typingAIs = useSelector((state: RootState) => state.chat.typingAIs);
  
  const messages = useMemo(() => currentSession?.messages || [], [currentSession?.messages]);
  const startTime = debateStartTime || currentSession?.startTime || 0;
  
  // Get only messages from the current debate session
  const getDebateMessages = useCallback((): Message[] => {
    return messages.filter(msg => msg.timestamp >= startTime);
  }, [messages, startTime]);
  
  // Add host message
  const addHostMessage = useCallback((content: string) => {
    const hostMessage: Message = {
      id: `msg_${Date.now()}_host`,
      sender: 'Debate Host',
      senderType: 'user',
      content,
      timestamp: Date.now(),
    };
    
    dispatch(addMessage(hostMessage));
  }, [dispatch]);
  
  const debateMessages = getDebateMessages();
  
  return {
    messages: debateMessages,
    typingAIs,
    addHostMessage,
    getDebateMessages,
    messageCount: debateMessages.length,
  };
};