import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';
import type { MessageSpec } from '@/services/debate';

export interface DebateTurnTimelineProps {
  messages: MessageSpec[];
  currentMessageIndex: number;
  currentTurnLabel?: string;
}

const getSpeakerLabel = (speaker: MessageSpec['speaker']): string =>
  speaker === 'aff' ? 'Aff' : 'Neg';

const getCxRoleLabel = (role: MessageSpec['cxRole']): string | undefined => {
  if (role === 'questioner') return 'asks';
  if (role === 'answerer') return 'answers';
  return undefined;
};

export const DebateTurnTimeline: React.FC<DebateTurnTimelineProps> = ({
  messages,
  currentMessageIndex,
  currentTurnLabel,
}) => {
  const { theme, isDark } = useTheme();

  if (messages.length === 0) {
    return null;
  }

  const activeIndex = Math.min(Math.max(currentMessageIndex, 0), messages.length - 1);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Typography variant="caption" weight="semibold" color="secondary">
          Speech Order
        </Typography>
        <Typography variant="caption" color="secondary">
          {activeIndex + 1}/{messages.length}
        </Typography>
      </View>

      {currentTurnLabel ? (
        <Typography variant="caption" weight="medium" numberOfLines={1} style={styles.currentTurn}>
          {currentTurnLabel}
        </Typography>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {messages.map((message, index) => {
          const isCurrent = index === activeIndex;
          const isComplete = index < activeIndex;
          const cxRoleLabel = getCxRoleLabel(message.cxRole);
          const borderColor = isCurrent
            ? theme.colors.primary[500]
            : isComplete
              ? theme.colors.success[500]
              : theme.colors.border;
          const backgroundColor = isCurrent
            ? (isDark ? theme.colors.overlays.medium : theme.colors.primary[50])
            : isComplete
              ? theme.colors.semantic.success
              : theme.colors.card;

          return (
            <View
              key={`${message.label}-${index}`}
              style={[
                styles.turnChip,
                {
                  backgroundColor,
                  borderColor,
                },
              ]}
            >
              <Typography
                variant="caption"
                weight={isCurrent ? 'semibold' : 'medium'}
                numberOfLines={1}
              >
                {message.label}
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {getSpeakerLabel(message.speaker)}{cxRoleLabel ? ` · ${cxRoleLabel}` : ''}
              </Typography>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  currentTurn: {
    marginBottom: 8,
  },
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  turnChip: {
    width: 132,
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
