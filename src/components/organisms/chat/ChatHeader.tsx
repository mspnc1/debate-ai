import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../atoms';
import { Typography, Button } from '../../molecules';
import { useTheme } from '../../../theme';
import { AI } from '../../../types';

export interface ChatHeaderProps {
  onBack: () => void;
  title?: string;
  participants: AI[];
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onBack,
  title = 'AI Conversation',
  participants = [],
}) => {
  const { theme } = useTheme();

  return (
    <Box style={[
      styles.header,
      { 
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border,
      }
    ]}>
      <Button 
        title="←"
        onPress={onBack}
        variant="ghost"
        style={{ borderWidth: 0, minWidth: 44 }}
      />
      <Box style={styles.headerCenter}>
        <Typography variant="subtitle" weight="semibold">
          {title}
        </Typography>
        <Box style={styles.participantsRow}>
          {participants.map((ai, index) => (
            <Typography key={ai.id} variant="caption" color="secondary">
              {ai.name}
              {index < participants.length - 1 && ' • '}
            </Typography>
          ))}
        </Box>
      </Box>
      <Box style={styles.headerRight} />
    </Box>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
  },
  participantsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
});