import React, { useEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { MessageBubble } from '../MessageBubble';
import { useTheme } from '../../../theme';
import { Message } from '../../../types';

export interface ChatMessageListProps {
  messages: Message[];
  flatListRef: React.RefObject<FlatList | null>;
  searchTerm?: string;
  onContentSizeChange?: () => void;
  onScrollToSearchResult?: (messageIndex: number) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  flatListRef,
  searchTerm,
  onContentSizeChange,
  onScrollToSearchResult,
}) => {
  const { theme } = useTheme();

  // Auto-scroll to search result when searchTerm changes
  useEffect(() => {
    if (searchTerm && messages.length > 0 && onScrollToSearchResult) {
      const matchIndex = messages.findIndex(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (matchIndex >= 0) {
        // Small delay to ensure list is rendered
        setTimeout(() => {
          onScrollToSearchResult(matchIndex);
        }, 100);
      }
    }
  }, [searchTerm, messages, onScrollToSearchResult]);

  const handleContentSizeChange = () => {
    if (onContentSizeChange) {
      onContentSizeChange();
    } else {
      // Default behavior: scroll to end
      flatListRef.current?.scrollToEnd();
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <MessageBubble 
      message={item} 
      isLast={index === messages.length - 1}
      searchTerm={searchTerm}
    />
  );

  const renderEmptyState = () => (
    <Box style={styles.emptyState}>
      <Typography style={styles.emptyStateEmoji}>💭</Typography>
      <Typography variant="title" align="center" style={{ marginBottom: 8 }}>
        Start the conversation
      </Typography>
      <Typography variant="body" color="secondary" align="center">
        Type a message or @ mention specific AIs
      </Typography>
    </Box>
  );

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderMessage}
      contentContainerStyle={styles.messagesList}
      onContentSizeChange={handleContentSizeChange}
      style={{ backgroundColor: theme.colors.background }}
      ListEmptyComponent={renderEmptyState}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={10}
      getItemLayout={undefined} // Let FlatList handle dynamic heights
    />
  );
};

const styles = StyleSheet.create({
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
});