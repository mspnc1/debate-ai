import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { Box, ResponsiveContainer } from '../../atoms';
import { Typography } from '../../molecules';
import { MessageBubble } from '@/components/organisms/common/MessageBubble';
import { ImageMessageRow } from './ImageMessageRow';
import { ImageGeneratingRow } from './ImageGeneratingRow';
import { useTheme } from '../../../theme';
import { useResponsive } from '../../../hooks/useResponsive';
import { Message, AIProvider } from '../../../types';

const BOTTOM_THRESHOLD = 48;

const scheduleFrame = (callback: (timestamp: number) => void): number =>
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(callback)
    : (setTimeout(() => callback(Date.now()), 0) as unknown as number);

const cancelFrame = (frame: number): void => {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(frame);
  } else {
    clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
  }
};

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
  const userPinnedAwayRef = useRef(false);
  const userScrollInProgressRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);

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

  const scrollToEnd = useCallback((animated = false) => {
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = scheduleFrame(() => {
      scrollFrameRef.current = null;
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, [flatListRef]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) {
      cancelFrame(scrollFrameRef.current);
    }
  }, []);

  const updatePinnedStateFromScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - BOTTOM_THRESHOLD;

    if (atBottom) {
      userPinnedAwayRef.current = false;
    } else if (userScrollInProgressRef.current) {
      userPinnedAwayRef.current = true;
    }
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    userScrollInProgressRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updatePinnedStateFromScroll(event);
    userScrollInProgressRef.current = false;
  }, [updatePinnedStateFromScroll]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updatePinnedStateFromScroll(event);
  }, [updatePinnedStateFromScroll]);

  const handleContentSizeChange = useCallback(() => {
    onContentSizeChange?.();

    if (!userPinnedAwayRef.current) {
      scrollToEnd(false);
    }
  }, [onContentSizeChange, scrollToEnd]);

  const isUserMessage = (m: Message) => m.senderType === 'user';
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
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
  };

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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ResponsiveContainer maxWidth="lg" center>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesList, contentPadding]}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleScrollEndDrag}
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
