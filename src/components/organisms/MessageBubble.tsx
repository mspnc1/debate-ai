import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { 
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Box } from '../atoms';
import { Typography } from '../molecules';
import { useTheme } from '../../theme';
import { Message } from '../../types';
import { AI_BRAND_COLORS } from '../../constants/aiColors';

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  searchTerm?: string;
}

// Helper component for highlighted text
const HighlightedText: React.FC<{ text: string; searchTerm: string }> = ({ text, searchTerm }) => {
  const { theme } = useTheme();
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <Text>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <Text key={index} style={{ backgroundColor: theme.colors.warning[200] }}>
            {part}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        )
      )}
    </Text>
  );
};

// Helper function for formatting mentions
const highlightMentions = (text: string) => {
  const mentionRegex = /@(\w+)/g;
  const parts = text.split(mentionRegex);
  
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <Text key={index} style={{ fontWeight: 'bold', color: '#007AFF' }}>
          @{part}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
};

// Helper function for formatting time
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLast, searchTerm }) => {
  const isUser = message.senderType === 'user';
  const scale = useSharedValue(isLast ? 0 : 1);
  const { theme, isDark } = useTheme();

  useEffect(() => {
    if (isLast) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
    }
  }, [isLast, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Get AI-specific color from the message sender
  const getAIColor = () => {
    if (isUser) return null;
    
    // Map AI names to their brand color keys
    const aiName = message.sender.toLowerCase();
    const aiBrandKey = aiName === 'chatgpt' ? 'chatgpt' : 
                       aiName === 'claude' ? 'claude' :
                       aiName === 'gemini' ? 'gemini' :
                       aiName === 'nomi' ? 'nomi' : null;
    
    if (!aiBrandKey) return null;
    
    const brandColors = AI_BRAND_COLORS[aiBrandKey as keyof typeof AI_BRAND_COLORS];
    return {
      light: brandColors[50],
      dark: theme.colors.surface,
      border: brandColors[500],
      text: brandColors[600],
    };
  };
  
  const aiColor = getAIColor();

  return (
    <Animated.View
      style={[
        styles.messageContainer,
        isUser && styles.userMessageContainer,
        animatedStyle,
      ]}
    >
      {!isUser && (
        <Box style={styles.aiHeader}>
          <Typography 
            variant="caption" 
            weight="semibold"
            style={{ color: aiColor?.border || theme.colors.text.secondary }}
          >
            {message.sender}
          </Typography>
        </Box>
      )}
      <Box
        style={[
          styles.messageBubble,
          isUser ? {
            backgroundColor: theme.colors.primary[500],
            borderBottomRightRadius: 4,
          } : {
            backgroundColor: aiColor ? (isDark ? aiColor.dark : aiColor.light) : theme.colors.card,
            borderBottomLeftRadius: 4,
            borderWidth: 1,
            borderColor: aiColor?.border || theme.colors.border,
          },
        ]}
      >
        <Typography style={{
          fontSize: 16, 
          lineHeight: 22,
          ...(isUser && { color: theme.colors.text.inverse })
        }}>
          {searchTerm ? <HighlightedText text={message.content} searchTerm={searchTerm} /> : highlightMentions(message.content)}
        </Typography>
      </Box>
      <Typography 
        variant="caption" 
        color="secondary"
        style={{
          ...styles.timestamp,
          ...(isUser && styles.userTimestamp)
        }}
      >
        {formatTime(message.timestamp)}
      </Typography>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiHeader: {
    marginBottom: 4,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  timestamp: {
    marginTop: 4,
    fontSize: 11,
  },
  userTimestamp: {
    textAlign: 'right',
  },
});