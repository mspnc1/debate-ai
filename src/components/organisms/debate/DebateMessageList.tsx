/**
 * DebateMessageList Organism Component
 * Message list specifically designed for debate mode
 * Handles message rendering and typing indicators
 */

import React, { useRef, useEffect, useLayoutEffect, memo, useCallback, useState } from 'react';
import { FlatList, ListRenderItem, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity, StyleSheet } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { DebateMessageBubble, DebateTypingIndicator } from '../../molecules';
import { SystemAnnouncement } from './SystemAnnouncement';
import { Message } from '../../../types';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface DebateMessageListProps {
  messages: Message[];
  typingAIs: string[];
  contentContainerStyle?: object;
  showsVerticalScrollIndicator?: boolean;
  headerComponent?: React.ReactElement | null;
  bottomInset?: number;
  canRetryAudio?: boolean;
  onRetryAudio?: (message: Message) => void;
}

type DetectedAnnouncementType =
  | 'topic'
  | 'exchange-winner'
  | 'debate-complete'
  | 'overall-winner'
  | 'debate-start'
  | 'audience-stance'
  | 'audience-questions'
  | 'mc';

// Helper functions moved outside component for performance
const detectType = (msg: Message): DetectedAnnouncementType | null => {
  if (msg.metadata?.debateInterstitial) return 'mc';
  if (msg.metadata?.debateAudienceQuestions) return 'audience-questions';
  if (msg.sender !== 'Debate Host' && msg.sender !== 'System') return null;
  
  const content = msg.content.toLowerCase();

  if (content.includes('audience questions submitted')) return 'audience-questions';
  if (content.includes('audience stance') || content.includes('audience vote')) return 'audience-stance';
  
  // Check for legacy round winner format: "Round X: Name" and map to exchange-winner
  if (/round\s+\d+:\s*\w+/i.test(msg.content)) return 'exchange-winner';
  
  // Check for debate start
  if (content.includes('opens the debate')) return 'debate-start';
  
  // Check for other patterns
  if (content.includes('wins round') || content.includes('round winner')) return 'exchange-winner';
  // New exchange winner formats: "Opening: Name", "Rebuttal: Name", "Closing: Name", "Cross-examination: Name"
  // Backward-compat accepts "Opening Argument" and "Closing Argument"
  if (/^(opening(?:\s+argument)?|rebuttal|closing(?:\s+argument)?|cross[- ]?examination|counter|crossfire|question)\s*:\s*\S+/i.test(msg.content)) return 'exchange-winner';
  if (content.includes('debate complete') || content.includes('debate has ended')) return 'debate-complete';
  if (content.includes('overall winner') || content.includes('winner is')) return 'overall-winner';
  if (msg.content.startsWith('"') && msg.content.includes('"')) return 'topic';
  
  return null;
};

const getLabel = (type: DetectedAnnouncementType, content = ''): string => {
  switch (type) {
    case 'topic': return 'DEBATE TOPIC';
    case 'debate-start': return 'DEBATE BEGINS';
    case 'audience-stance':
      return content.toLowerCase().includes('final audience')
        ? 'FINAL AUDIENCE VOTE'
        : 'OPENING AUDIENCE STANCE';
    case 'audience-questions': return 'AUDIENCE Q&A';
    case 'mc': return 'MC';
    case 'exchange-winner': return 'EXCHANGE RESULT';
    case 'debate-complete': return 'DEBATE ENDED';
    case 'overall-winner': return 'CHAMPION';
    default: return 'ANNOUNCEMENT';
  }
};

const getIcon = (type: DetectedAnnouncementType): string => {
  switch (type) {
    case 'topic': return ''; // No icon for cleaner look
    case 'debate-start': return '🥊';
    case 'audience-stance': return '◉';
    case 'audience-questions': return '?';
    case 'mc': return '🎙️';
    case 'exchange-winner': return '🎯';
    case 'debate-complete': return '🏁';
    case 'overall-winner': return '🏆';
    default: return '📢';
  }
};

const getCitationMetadataKey = (message: Message): string => {
  const citations = message.metadata?.citations || [];
  const audio = message.metadata?.debateAudio;
  const audienceQuestions = message.metadata?.debateAudienceQuestions;
  const audioAttachments = (message.attachments || [])
    .filter((attachment) => attachment.type === 'audio')
    .map((attachment) => `${attachment.uri}:${attachment.mimeType}`)
    .join('|');
  return [
    message.metadata?.webSearchEnabled ? 'search' : 'no-search',
    citations.length,
    citations.map(citation => `${citation.index}:${citation.url}`).join('|'),
    audienceQuestions ? `${audienceQuestions.aff}:${audienceQuestions.neg}` : 'no-audience-questions',
    audio ? `${audio.status}:${audio.voiceId}:${audio.uri || ''}:${audio.error || ''}` : 'no-audio',
    audioAttachments,
  ].join(':');
};

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

// Memoized message item component - optimized
const MessageItem = memo<{
  message: Message;
  index: number;
  alignment: 'left' | 'right' | 'center';
  canRetryAudio?: boolean;
  onRetryAudio?: (message: Message) => void;
}>(({ message, index, alignment, canRetryAudio, onRetryAudio }) => {
  const systemType = detectType(message);
  
  if (systemType) {
    return (
      <SystemAnnouncement
        type={systemType}
        label={systemType === 'mc' ? message.metadata?.debateInterstitial?.label : getLabel(systemType, message.content)}
        content={message.content}
        icon={getIcon(systemType)}
        animation="slide-up"
      />
    );
  }
  
  return (
    <DebateMessageBubble
      message={message}
      index={index}
      side={alignment}
      canRetryAudio={canRetryAudio}
      onRetryAudio={onRetryAudio}
    />
  );
}, (prevProps, nextProps) => {
  // Improved comparison function
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  if (prevProps.message.sender !== nextProps.message.sender) return false;
  if (prevProps.message.timestamp !== nextProps.message.timestamp) return false;
  if (getCitationMetadataKey(prevProps.message) !== getCitationMetadataKey(nextProps.message)) return false;
  if (prevProps.alignment !== nextProps.alignment) return false;
  if (prevProps.canRetryAudio !== nextProps.canRetryAudio) return false;
  if (prevProps.onRetryAudio !== nextProps.onRetryAudio) return false;
  return true;
});

MessageItem.displayName = 'MessageItem';

export const DebateMessageList: React.FC<DebateMessageListProps> = ({
  messages,
  typingAIs,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  headerComponent,
  bottomInset = 0,
  canRetryAudio,
  onRetryAudio,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const alignmentMapRef = useRef<Record<string, 'left' | 'right'>>({});
  const lastAssignedSideRef = useRef<'left' | 'right'>('right');
  const isAtBottomRef = useRef(true);
  const userPinnedAwayRef = useRef(false);
  const userScrollInProgressRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const { theme } = useTheme();
  const lastMessageKeyRef = useRef('');

  // Auto-scroll to new messages
  const scrollToEnd = useCallback((animated = true) => {
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = scheduleFrame(() => {
      scrollFrameRef.current = null;
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) {
      cancelFrame(scrollFrameRef.current);
    }
  }, []);

  // Handle content size changes while respecting user scroll position.
  const handleContentSizeChange = useCallback(() => {
    if (userPinnedAwayRef.current) {
      setShowScrollIndicator(true);
    } else {
      scrollToEnd(true);
    }
  }, [scrollToEnd]);

  // Scroll when new messages are added
  const listEmpty = messages.length === 0;

  useEffect(() => {
    if (listEmpty) {
      alignmentMapRef.current = {};
      lastAssignedSideRef.current = 'right';
      userPinnedAwayRef.current = false;
      setShowScrollIndicator(false);
    }
  }, [listEmpty]);

  const handleContentUpdate = useCallback(() => {
    if (listEmpty) return;
    if (userPinnedAwayRef.current) {
      setShowScrollIndicator(true);
    } else {
      scrollToEnd();
    }
  }, [listEmpty, scrollToEnd]);

  useLayoutEffect(() => {
    handleContentUpdate();
  }, [messages.length, handleContentUpdate]);

  const latestMessageFingerprint = messages.length > 0
    ? `${messages[messages.length - 1].id}:${messages[messages.length - 1].content?.length ?? 0}:${messages[messages.length - 1].metadata?.citations?.length ?? 0}`
    : '';

  useLayoutEffect(() => {
    if (!latestMessageFingerprint) return;
    handleContentUpdate();
  }, [latestMessageFingerprint, handleContentUpdate]);

  useEffect(() => {
    if (typingAIs.length === 0) return;
    if (userPinnedAwayRef.current) {
      setShowScrollIndicator(true);
    } else {
      scrollToEnd();
    }
  }, [typingAIs, scrollToEnd]);

  useEffect(() => {
    if (listEmpty) {
      lastMessageKeyRef.current = '';
      return;
    }
    const lastMessage = messages[messages.length - 1];
    const key = `${lastMessage.id ?? 'unknown'}:${lastMessage.timestamp ?? ''}:${lastMessage.content?.length ?? 0}`;
    if (key !== lastMessageKeyRef.current) {
      lastMessageKeyRef.current = key;
      if (userPinnedAwayRef.current) {
        setShowScrollIndicator(true);
      } else {
        scrollToEnd();
      }
    }
  }, [messages, listEmpty, scrollToEnd]);

  const getAlignment = useCallback((message: Message): 'left' | 'right' | 'center' => {
    if (message.sender === 'Debate Host' || message.sender === 'System') {
      return 'center';
    }
    const key = message.sender;
    const current = alignmentMapRef.current[key];
    if (current) return current;

    const assigned = Object.values(alignmentMapRef.current);
    if (!assigned.includes('left')) {
      alignmentMapRef.current[key] = 'left';
      lastAssignedSideRef.current = 'left';
      return 'left';
    }
    if (!assigned.includes('right')) {
      alignmentMapRef.current[key] = 'right';
      lastAssignedSideRef.current = 'right';
      return 'right';
    }

    const next = lastAssignedSideRef.current === 'left' ? 'right' : 'left';
    alignmentMapRef.current[key] = next;
    lastAssignedSideRef.current = next;
    return next;
  }, []);

  // Memoized render function with proper types
  const renderItem: ListRenderItem<Message> = useCallback(({ item, index }) => {
    const alignment = getAlignment(item);
    return (
      <MessageItem
        message={item}
        index={index}
        alignment={alignment}
        canRetryAudio={canRetryAudio}
        onRetryAudio={onRetryAudio}
      />
    );
  }, [canRetryAudio, getAlignment, onRetryAudio]);

  // Memoized key extractor - optimized
  const keyExtractor = useCallback((item: Message, index: number) => {
    // Guard against accidental duplicate ids by including index suffix
    return item.id ? `msg-${item.id}-${index}` : `idx-${index}`;
  }, []);

  // Memoized typing indicator
  const renderTypingIndicator = useCallback(() => {
    if (typingAIs.length === 0) return null;
    
    return (
      <Box style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        {typingAIs.map((aiName) => (
          <DebateTypingIndicator key={aiName} aiName={aiName} />
        ))}
      </Box>
    );
  }, [typingAIs]);

  const handleScrollBeginDrag = useCallback(() => {
    userScrollInProgressRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    if (userScrollInProgressRef.current && !isAtBottomRef.current) {
      userPinnedAwayRef.current = true;
      setShowScrollIndicator(true);
    }
    userScrollInProgressRef.current = false;
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const paddingToBottom = 32;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;
    isAtBottomRef.current = atBottom;
    if (atBottom) {
      userPinnedAwayRef.current = false;
      setShowScrollIndicator(false);
    } else if (userScrollInProgressRef.current) {
      userPinnedAwayRef.current = true;
      setShowScrollIndicator(true);
    }
  }, []);

  const handleScrollToLatest = useCallback(() => {
    isAtBottomRef.current = true;
    userPinnedAwayRef.current = false;
    setShowScrollIndicator(false);
    scrollToEnd();
  }, [scrollToEnd]);

  useEffect(() => {
    if (listEmpty) return;
    if (userPinnedAwayRef.current) {
      setShowScrollIndicator(true);
    } else {
      scrollToEnd();
    }
  }, [bottomInset, listEmpty, scrollToEnd]);

  const effectiveBottomPadding = 32 + bottomInset;
  const indicatorBottomOffset = 24 + bottomInset;

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        ListHeaderComponent={headerComponent || null}
        contentContainerStyle={[
          { paddingTop: 8, paddingBottom: effectiveBottomPadding },
          contentContainerStyle,
        ]}
        ListFooterComponent={renderTypingIndicator}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleScrollEndDrag}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={15}
        // Let FlatList handle dynamic heights; static getItemLayout caused disappearing content with streaming
        getItemLayout={undefined as unknown as never}
      />
      {showScrollIndicator && (
        <Box
          style={[
            styles.scrollIndicator,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              bottom: indicatorBottomOffset,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleScrollToLatest}
            style={styles.scrollButton}
            accessibilityRole="button"
            accessibilityLabel="Scroll to the latest responses"
          >
            <Ionicons name="arrow-down" size={18} color={theme.colors.text.primary} />
            <Typography variant="caption" weight="semibold" style={{ marginLeft: 6 }}>
              New debate responses
            </Typography>
          </TouchableOpacity>
        </Box>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  scrollIndicator: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  scrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
