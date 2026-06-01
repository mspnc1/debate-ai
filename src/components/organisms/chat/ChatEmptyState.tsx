import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';

export interface ChatEmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title?: string;
  subtitle?: string;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  iconName = 'chatbubble-ellipses-outline',
  title = 'Start the conversation',
  subtitle = 'Type a message or @ mention specific AIs',
}) => {
  const { theme } = useTheme();

  return (
    <Box style={styles.emptyState}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: theme.colors.overlays.soft,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons name={iconName} size={32} color={theme.colors.brand} />
      </View>
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
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
});
