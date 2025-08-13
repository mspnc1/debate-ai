/**
 * DebateMessageList Organism Component
 * Message list specifically designed for debate mode
 * Handles message rendering and typing indicators
 */

import React, { useRef, useEffect } from 'react';
import { FlatList } from 'react-native';
import { Box } from '../../atoms';
import { DebateMessageBubble, DebateTypingIndicator } from '../../molecules';
import { Message } from '../../../types';

export interface DebateMessageListProps {
  messages: Message[];
  typingAIs: string[];
  contentContainerStyle?: object;
  showsVerticalScrollIndicator?: boolean;
}

export const DebateMessageList: React.FC<DebateMessageListProps> = ({
  messages,
  typingAIs,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}) => {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to new messages
  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Scroll when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      scrollToEnd();
    }
  }, [messages.length]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <DebateMessageBubble message={item} index={index} />
  );

  const renderTypingIndicator = () => {
    if (typingAIs.length === 0) return null;
    
    return (
      <Box style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        {typingAIs.map((aiName) => (
          <DebateTypingIndicator key={aiName} aiName={aiName} />
        ))}
      </Box>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderMessage}
      ListFooterComponent={renderTypingIndicator}
      contentContainerStyle={[
        {
          paddingHorizontal: 16,
          paddingVertical: 16,
        },
        contentContainerStyle,
      ]}
      onContentSizeChange={scrollToEnd}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={20}
    />
  );
};