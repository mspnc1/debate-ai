import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';

export interface ChatEmptyStateProps {
  emoji?: string;
  title?: string;
  subtitle?: string;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  emoji = '💭',
  title = 'Start the conversation',
  subtitle = 'Type a message or @ mention specific AIs',
}) => {
  return (
    <Box style={styles.emptyState}>
      <Typography style={styles.emptyStateEmoji}>
        {emoji}
      </Typography>
      <Typography variant="title" align="center" style={styles.title}>
        {title}
      </Typography>
      <Typography variant="body" color="secondary" align="center">
        {subtitle}
      </Typography>
    </Box>
  );
};

const styles = StyleSheet.create({
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
  title: {
    marginBottom: 8,
  },
});