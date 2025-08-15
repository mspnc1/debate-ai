import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';
import { HistoryHeaderProps } from '../../../types/history';

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  title,
  sessionCount,
  maxSessions,
  isPremium
}) => {
  const { theme } = useTheme();

  const showLimitBadge = !isPremium && maxSessions !== Infinity;

  return (
    <Box style={[
      styles.container,
      { 
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border,
      }
    ]}>
      <Typography variant="title" weight="bold">
        {title}
      </Typography>
      
      {showLimitBadge && (
        <Box 
          style={[
            styles.limitBadge,
            { backgroundColor: theme.colors.warning[50] }
          ]}
        >
          <Typography 
            variant="caption" 
            style={{ color: theme.colors.warning[600] }}
          >
            {sessionCount}/{maxSessions} chats (Free plan)
          </Typography>
        </Box>
      )}

      {isPremium && sessionCount > 0 && (
        <Box 
          style={[
            styles.premiumBadge,
            { backgroundColor: theme.colors.primary[50] }
          ]}
        >
          <Typography 
            variant="caption" 
            style={{ color: theme.colors.primary[600] }}
          >
            {sessionCount} conversations
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
});