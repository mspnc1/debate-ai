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
  showCurrentSummary?: boolean;
  showRailHeader?: boolean;
  embedded?: boolean;
}

const CHIP_GAP = 8;
const MIN_CHIP_WIDTH = 124;
const MAX_CHIP_WIDTH = 168;
const EMBEDDED_MIN_CHIP_WIDTH = 108;
const EMBEDDED_MAX_CHIP_WIDTH = 148;

export const getDebateTimelineActiveIndex = (currentMessageIndex: number, messageCount: number): number => (
  messageCount > 0
    ? Math.min(Math.max(currentMessageIndex, 0), messageCount - 1)
    : 0
);

export const getDebateTimelineLeftOffset = (activeIndex: number, chipWidth: number): number =>
  Math.max(0, activeIndex * (chipWidth + CHIP_GAP));

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
  showCurrentSummary = true,
  showRailHeader = true,
  embedded = false,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const activeIndex = getDebateTimelineActiveIndex(currentMessageIndex, messages.length);
  const activeMessage = messages[activeIndex];
  const chipMinWidth = embedded ? EMBEDDED_MIN_CHIP_WIDTH : MIN_CHIP_WIDTH;
  const chipMaxWidth = embedded ? EMBEDDED_MAX_CHIP_WIDTH : MAX_CHIP_WIDTH;
  const chipWidth = Math.min(chipMaxWidth, Math.max(chipMinWidth, Math.round(width * (embedded ? 0.31 : 0.36))));
  const viewportWidth = Math.max(0, width - (embedded ? 28 : 32));
  const railRightPadding = Math.max(16, viewportWidth - chipWidth);

  useEffect(() => {
    if (messages.length === 0) return undefined;

    const frame = scheduleFrame(() => {
      const leftLockedOffset = getDebateTimelineLeftOffset(activeIndex, chipWidth);
      scrollRef.current?.scrollTo({
        x: Math.max(0, leftLockedOffset),
        animated: true,
      });
    });

    return () => cancelFrame(frame);
  }, [activeIndex, chipWidth, messages.length]);

  if (!activeMessage) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        embedded && styles.embeddedContainer,
        {
          backgroundColor: embedded ? 'transparent' : theme.colors.surface,
          borderColor: embedded ? 'transparent' : theme.colors.border,
        },
      ]}
    >
      {showRailHeader && (
        <View style={styles.headerRow}>
          <Typography variant="caption" weight="semibold" color="secondary">
            Speech Order
          </Typography>
          <Typography variant="caption" color="secondary">
            {activeIndex + 1}/{messages.length}
          </Typography>
        </View>
      )}

      {showCurrentSummary && (
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
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingRight: railRightPadding },
        ]}
        testID="debate-turn-timeline-scroll"
      >
        {messages.map((message, index) => {
          const isCurrent = index === activeIndex;
          const isComplete = index < activeIndex;
          const borderColor = isCurrent
            ? theme.colors.primary[500]
            : isComplete
              ? theme.colors.border
              : theme.colors.border;
          const backgroundColor = isCurrent
            ? (isDark ? theme.colors.overlays.medium : theme.colors.primary[50])
            : isComplete
              ? (isDark ? theme.colors.overlays.soft : theme.colors.gray[100])
              : theme.colors.card;

          return (
            <View
              key={`${message.label}-${index}`}
              style={[
                styles.turnChip,
                embedded && styles.embeddedTurnChip,
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
  embeddedContainer: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    paddingTop: 3,
    paddingBottom: 0,
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
  embeddedTurnChip: {
    minHeight: 52,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
});
