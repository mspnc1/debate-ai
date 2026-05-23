import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';
import type { MessageSpec } from '@/services/debate';
import { getDebateSpeakerRoleLabel } from '@/utils/debateLabels';

export interface DebateTurnTimelineProps {
  messages: MessageSpec[];
  currentMessageIndex: number;
  currentTurnLabel?: string;
}

const CHIP_GAP = 8;
const MIN_CHIP_WIDTH = 124;
const MAX_CHIP_WIDTH = 168;
const scheduleFrame = (callback: (timestamp: number) => void): number =>
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(callback)
    : (setTimeout(() => callback(Date.now()), 0) as unknown as number);

const cancelFrame = (frame: number): void => {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(frame);
  } else {
    clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
  }
};

export const DebateTurnTimeline: React.FC<DebateTurnTimelineProps> = ({
  messages,
  currentMessageIndex,
  currentTurnLabel,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const activeIndex = messages.length > 0
    ? Math.min(Math.max(currentMessageIndex, 0), messages.length - 1)
    : 0;
  const activeMessage = messages[activeIndex];
  const chipWidth = Math.min(MAX_CHIP_WIDTH, Math.max(MIN_CHIP_WIDTH, Math.round(width * 0.36)));

  useEffect(() => {
    if (messages.length === 0) return undefined;

    const frame = scheduleFrame(() => {
      const centeredOffset = activeIndex * (chipWidth + CHIP_GAP) - Math.max(0, (width - chipWidth) / 2);
      scrollRef.current?.scrollTo({
        x: Math.max(0, centeredOffset),
        animated: true,
      });
    });

    return () => cancelFrame(frame);
  }, [activeIndex, chipWidth, messages.length, width]);

  if (!activeMessage) {
    return null;
  }

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

      <View
        style={[
          styles.activeSummary,
          {
            backgroundColor: isDark ? theme.colors.overlays.soft : theme.colors.primary[50],
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.activeCopy}>
          <Typography variant="caption" color="secondary">
            Current step
          </Typography>
          <Typography variant="body" weight="semibold" numberOfLines={1}>
            {currentTurnLabel || activeMessage.label}
          </Typography>
        </View>
        <Typography variant="caption" weight="semibold" color="brand" numberOfLines={1}>
          {getDebateSpeakerRoleLabel(activeMessage)}
        </Typography>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID="debate-turn-timeline-scroll"
      >
        {messages.map((message, index) => {
          const isCurrent = index === activeIndex;
          const isComplete = index < activeIndex;
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
                { width: chipWidth },
                {
                  backgroundColor,
                  borderColor,
                },
              ]}
            >
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {index + 1}
              </Typography>
              <Typography
                variant="caption"
                weight={isCurrent ? 'semibold' : 'medium'}
                numberOfLines={1}
              >
                {message.label}
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {getDebateSpeakerRoleLabel(message)}
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
  activeSummary: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  activeCopy: {
    flex: 1,
    minWidth: 0,
  },
  scrollContent: {
    gap: CHIP_GAP,
    paddingRight: 16,
  },
  turnChip: {
    minHeight: 66,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
