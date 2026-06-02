import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ResponsiveContainer } from '../../atoms';
import { MessageBubble } from '@/components/organisms/common/MessageBubble';
import { ImageMessageRow } from './ImageMessageRow';
import { ImageGeneratingRow } from './ImageGeneratingRow';
import { ChatEmptyState } from './ChatEmptyState';
import { useTheme } from '../../../theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { Message, AIProvider } from '../../../types';

export interface ChatMessageListProps {
  messages: Message[];
  flatListRef: React.RefObject<FlatList | null>;
  searchTerm?: string;
  onContentSizeChange?: () => void;
  onScrollToSearchResult?: (messageIndex: number) => void;
  onCancelImage?: (message: Message) => void;
  onRetryImage?: (message: Message) => void;
  /** Whether any provider supports image refinement (img2img) */
  canRefineImages?: boolean;
  /** Called when user taps Refine on an image */
  onRefineImage?: (imageUri: string, originalPrompt: string, originalProvider: AIProvider, messageId?: string) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  flatListRef,
  searchTerm,
  onContentSizeChange,
  onScrollToSearchResult,
  onCancelImage,
  onRetryImage,
  canRefineImages,
  onRefineImage,
}) => {
  const { theme } = useTheme();
  const { responsive, rs } = useResponsive();

  // Responsive padding for iPad
  const contentPadding = useMemo(() => ({
    paddingHorizontal: responsive(16, 32),
    paddingVertical: rs('md'),
  }), [responsive, rs]);

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

  const handleContentSizeChange = useCallback(() => {
    onContentSizeChange?.();
  }, [onContentSizeChange]);

  const isUserMessage = useCallback((m: Message) => m.senderType === 'user', []);
  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const meta = item.metadata as { providerMetadata?: Record<string, unknown> } | undefined;
    const isGenerating = !!meta?.providerMetadata && meta.providerMetadata['imageGenerating'] === true;
    if (!isUserMessage(item) && isGenerating) {
      return <ImageGeneratingRow message={item} onCancel={onCancelImage} onRetry={onRetryImage} />;
    }
    const hasImageOnly = (item.attachments && item.attachments.length > 0 && item.attachments.some(a => a.type === 'image')) && (!item.content || item.content.trim() === '');
    if (!isUserMessage(item) && hasImageOnly) {
      return <ImageMessageRow message={item} canRefine={canRefineImages} onRefine={onRefineImage} />;
    }
    return (
      <MessageBubble 
        message={item} 
        isLast={index === messages.length - 1}
        searchTerm={searchTerm}
      />
    );
  }, [
    canRefineImages,
    isUserMessage,
    messages.length,
    onCancelImage,
    onRefineImage,
    onRetryImage,
    searchTerm,
  ]);

  const renderEmptyState = () => <ChatEmptyState />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ResponsiveContainer maxWidth="lg" center>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesList, contentPadding]}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={80}
          style={{ backgroundColor: theme.colors.background }}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={10}
          getItemLayout={undefined} // Let FlatList handle dynamic heights
        />
      </ResponsiveContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
