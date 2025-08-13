/**
 * DebateMessageList Organism Component
 * Message list specifically designed for debate mode
 * Handles message rendering and typing indicators
 */

import React, { useRef, useEffect } from 'react';
import { FlatList } from 'react-native';
import { Box } from '../../atoms';
import { DebateMessageBubble, DebateTypingIndicator } from '../../molecules';
import { SystemAnnouncement } from './SystemAnnouncement';
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

  const detectSystemMessageType = (message: Message): 'topic' | 'round-winner' | 'debate-complete' | 'overall-winner' | null => {
    if (message.sender !== 'Debate Host' && message.sender !== 'System') return null;
    
    const content = message.content.toLowerCase();
    if (content.includes('wins round') || content.includes('round winner')) return 'round-winner';
    if (content.includes('debate complete') || content.includes('debate has ended')) return 'debate-complete';
    if (content.includes('overall winner') || content.includes('winner is')) return 'overall-winner';
    if (message.content.startsWith('"') && message.content.includes('"')) return 'topic';
    
    return null;
  };

  const getSystemMessageLabel = (type: string): string => {
    switch (type) {
      case 'topic':
        return 'DEBATE TOPIC';
      case 'round-winner':
        return 'ROUND RESULT';
      case 'debate-complete':
        return 'DEBATE ENDED';
      case 'overall-winner':
        return 'CHAMPION';
      default:
        return 'ANNOUNCEMENT';
    }
  };
  
  const getSystemMessageIcon = (type: string): string => {
    switch (type) {
      case 'topic':
        return '💭';
      case 'round-winner':
        return '🎯';
      case 'debate-complete':
        return '🏁';
      case 'overall-winner':
        return '🏆';
      default:
        return '📢';
    }
  };
  
  const getSystemMessageGradient = (type: string): [string, string] => {
    switch (type) {
      case 'topic':
        return ['rgba(99,102,241,0.1)', 'rgba(168,85,247,0.1)'];
      case 'round-winner':
        return ['rgba(34,197,94,0.1)', 'rgba(59,130,246,0.1)'];
      case 'debate-complete':
        return ['rgba(249,115,22,0.1)', 'rgba(239,68,68,0.1)'];
      case 'overall-winner':
        return ['rgba(234,179,8,0.1)', 'rgba(168,85,247,0.1)'];
      default:
        return ['rgba(99,102,241,0.1)', 'rgba(168,85,247,0.1)'];
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const messageType = detectSystemMessageType(item);
    
    if (messageType) {
      return (
        <SystemAnnouncement
          type={messageType}
          content={item.content}
          label={getSystemMessageLabel(messageType)}
          icon={getSystemMessageIcon(messageType)}
          gradient={getSystemMessageGradient(messageType)}
          animation="slide-up"
        />
      );
    }
    
    return <DebateMessageBubble message={item} index={index} />;
  };

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