import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';

export interface TypingIndicatorProps {
  aiName: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ aiName }) => {
  const { theme } = useTheme();
  
  return (
    <Animated.View
      entering={FadeIn}
      style={styles.typingContainer}
    >
      <Box style={[
        styles.typingBubble,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        }
      ]}>
        <Typography variant="caption" color="secondary">
          {aiName} is thinking
        </Typography>
        <Box style={styles.typingDots}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: theme.colors.text.secondary }
              ]}
            />
          ))}
        </Box>
      </Box>
    </Animated.View>
  );
};

export interface ChatTypingIndicatorsProps {
  typingAIs: string[];
}

export const ChatTypingIndicators: React.FC<ChatTypingIndicatorsProps> = ({
  typingAIs,
}) => {
  if (typingAIs.length === 0) {
    return null;
  }

  return (
    <Box style={styles.typingIndicators}>
      {typingAIs.map((ai) => (
        <TypingIndicator key={ai} aiName={ai} />
      ))}
    </Box>
  );
};

const styles = StyleSheet.create({
  typingIndicators: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingContainer: {
    marginBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  typingDots: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
});