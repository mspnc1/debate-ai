import { useRef } from 'react';
import { FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { addMessage } from '../../store';
import { Message } from '../../types';
import { ChatService, MessageService } from '../../services/chat';

export interface ChatMessagesHook {
  messages: Message[];
  flatListRef: React.RefObject<FlatList | null>;
  sendMessage: (content: string, mentions?: string[]) => void;
  scrollToBottom: () => void;
  scrollToMessage: (messageIndex: number) => void;
  hasMessages: boolean;
  lastMessage: Message | null;
  getMessageStats: () => ReturnType<typeof MessageService.getConversationStats>;
}

export const useChatMessages = (): ChatMessagesHook => {
  const dispatch = useDispatch();
  const flatListRef = useRef<FlatList>(null);
  const { currentSession } = useSelector((state: RootState) => state.chat);
  
  const messages = currentSession?.messages || [];

  const sendMessage = (content: string, mentions: string[] = []): void => {
    // Validate message content
    const validation = ChatService.validateMessageContent(content);
    if (!validation.isValid) {
      console.error('Invalid message:', validation.error);
      return;
    }

    // Create user message
    const userMessage = ChatService.createUserMessage(content, mentions);
    
    // Dispatch to Redux
    dispatch(addMessage(userMessage));
    
    // Auto-scroll to bottom
    setTimeout(() => scrollToBottom(), 100);
  };

  const scrollToBottom = (): void => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const scrollToMessage = (messageIndex: number): void => {
    if (flatListRef.current && messageIndex >= 0 && messageIndex < messages.length) {
      flatListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5, // Center the message
      });
    }
  };

  const getMessageStats = () => {
    return MessageService.getConversationStats(messages);
  };

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return {
    messages,
    flatListRef,
    sendMessage,
    scrollToBottom,
    scrollToMessage,
    hasMessages: ChatService.hasMessages(messages),
    lastMessage,
    getMessageStats,
  };
};