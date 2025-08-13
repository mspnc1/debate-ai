/**
 * DebateMessageBubble Molecule Component
 * Specialized message bubble for debate mode with host message support
 * Extends the base MessageBubble functionality for debate-specific features
 */

import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import { Box } from '../atoms';
import { Typography } from './Typography';
import { useTheme } from '../../theme';
import { Message } from '../../types';
import { AI_BRAND_COLORS } from '../../constants/aiColors';
import { StyleSheet } from 'react-native';

export interface DebateMessageBubbleProps {
  message: Message;
  index: number;
  participants?: Array<{ id: string; name: string }>;
  scores?: Record<string, { roundWins: number; name: string }>;
}

export const DebateMessageBubble: React.FC<DebateMessageBubbleProps> = React.memo(({ 
  message,
  participants: _participants,
  scores: _scores 
}) => {
  const { theme, isDark } = useTheme();
  const isHost = message.sender === 'Debate Host';
  
  
  // Get AI-specific color from the message sender using theme brand colors
  const getAIColor = () => {
    if (isHost) return null;
    
    // Extract AI name from sender (format: "AI Name (Personality)")
    const aiName = message.sender.split(' (')[0].toLowerCase();
    
    // Map AI names to their brand color keys
    const aiBrandKey = (aiName === 'chatgpt' || aiName === 'openai') ? 'openai' : 
                       aiName === 'claude' ? 'claude' :
                       aiName === 'gemini' ? 'gemini' :
                       aiName === 'nomi' ? 'nomi' : null;
    
    if (!aiBrandKey) return null;
    
    const brandColors = AI_BRAND_COLORS[aiBrandKey as keyof typeof AI_BRAND_COLORS];
    return {
      light: brandColors[50],
      dark: theme.colors.surface, // Use surface color with tinted border in dark mode
      border: brandColors[500],
    };
  };
  
  const aiColor = getAIColor();
  
  // Simple fade-in animation
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // This component now ONLY handles AI messages - host messages are handled by SystemMessageCard
  
  // Fallback for unrecognized host messages
  if (isHost) {
    return (
      <Animated.View style={[styles.messageContainer, animatedStyle, { alignItems: 'center' }]}>
        <Box style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 8,
        }}>
          <Box style={{
            height: 1,
            flex: 1,
            backgroundColor: theme.colors.border,
            opacity: 0.3,
          }} />
          
          <Typography
            variant="caption"
            weight="medium"
            style={{
              color: theme.colors.text.secondary,
              textAlign: 'center',
              paddingHorizontal: 16,
            }}
          >
            {message.content}
          </Typography>
          
          <Box style={{
            height: 1,
            flex: 1,
            backgroundColor: theme.colors.border,
            opacity: 0.3,
          }} />
        </Box>
      </Animated.View>
    );
  }
  
  // Regular AI message
  return (
    <Animated.View style={[styles.messageContainer, animatedStyle]}>
      <Box style={styles.aiHeader}>
        <Typography 
          variant="subtitle" 
          weight="semibold"
          style={{ color: aiColor?.border || theme.colors.primary[500] }}
        >
          {message.sender}
        </Typography>
      </Box>
      <Box style={[
        styles.aiBubble,
        { 
          backgroundColor: aiColor ? (isDark ? aiColor.dark : aiColor.light) : theme.colors.card, 
          borderColor: aiColor?.border || theme.colors.border,
          borderWidth: 1,
        }
      ]}>
        <Typography 
          variant="body" 
          style={styles.messageText}
        >
          {message.content}
        </Typography>
      </Box>
    </Animated.View>
  );
}, (prevProps, nextProps) => prevProps.message.id === nextProps.message.id);

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 16,
  },
  aiHeader: {
    marginBottom: 4,
  },
  aiBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
});