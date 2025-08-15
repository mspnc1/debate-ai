import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../atoms';
import { Typography, Button } from '../../molecules';
import { EmptyHistoryStateProps } from '../../../types/history';

export const EmptyHistoryState: React.FC<EmptyHistoryStateProps> = ({
  type,
  searchTerm,
  onRetry,
  onStartChat,
  onClearSearch
}) => {

  const getEmptyStateContent = () => {
    switch (type) {
      case 'no-sessions':
        return {
          emoji: '💬',
          title: 'No conversations yet',
          message: 'Start a new chat to see it here',
          actionText: 'Start Chatting',
          action: onStartChat
        };
      
      case 'no-results':
        return {
          emoji: '🔍',
          title: 'No matches found',
          message: searchTerm 
            ? `No conversations match "${searchTerm}"`
            : 'Try a different search term',
          actionText: 'Clear Search',
          action: onClearSearch
        };
      
      case 'loading-error':
        return {
          emoji: '⚠️',
          title: 'Failed to load conversations',
          message: 'Check your connection and try again',
          actionText: 'Retry',
          action: onRetry
        };
      
      default:
        return {
          emoji: '💬',
          title: 'No conversations',
          message: 'Nothing to show here',
          actionText: undefined,
          action: undefined
        };
    }
  };

  const { emoji, title, message, actionText, action } = getEmptyStateContent();

  return (
    <Box style={styles.container}>
      <Typography style={styles.emoji}>
        {emoji}
      </Typography>
      
      <Typography 
        variant="title" 
        align="center" 
        style={styles.title}
      >
        {title}
      </Typography>
      
      <Typography 
        variant="body" 
        color="secondary" 
        align="center"
        style={styles.message}
      >
        {message}
      </Typography>

      {actionText && action && (
        <Button
          title={actionText}
          onPress={action}
          variant={type === 'loading-error' ? 'primary' : 'secondary'}
          style={styles.actionButton}
        />
      )}

      {/* Additional help text for empty sessions */}
      {type === 'no-sessions' && (
        <Box style={styles.helpContainer}>
          <Typography 
            variant="caption" 
            color="secondary" 
            align="center"
            style={styles.helpText}
          >
            Start by selecting AIs and asking a question. Your conversations will be saved here automatically.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
    textAlign: 'center',
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 24,
    lineHeight: 20,
  },
  actionButton: {
    marginBottom: 16,
    minWidth: 120,
  },
  helpContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  helpText: {
    lineHeight: 16,
    opacity: 0.7,
  },
});