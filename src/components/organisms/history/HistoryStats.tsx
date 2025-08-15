import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';
import { HistoryStatsProps } from '../../../types/history';

export const HistoryStats: React.FC<HistoryStatsProps> = ({
  sessionCount,
  messageCount,
  visible,
  onPress
}) => {
  const { theme } = useTheme();

  if (!visible) {
    return null;
  }

  const statsText = `${sessionCount} conversation${sessionCount !== 1 ? 's' : ''} • ${messageCount} total message${messageCount !== 1 ? 's' : ''}`;

  const content = (
    <Box style={[
      styles.container,
      { 
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
      }
    ]}>
      <Typography variant="caption" color="secondary" align="center">
        {statsText}
      </Typography>
    </Box>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});