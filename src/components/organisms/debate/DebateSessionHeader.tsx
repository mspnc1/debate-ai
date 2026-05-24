import React from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Typography } from '../../molecules';
import { useTheme, type Theme } from '../../../theme';
import type { DebateSideId, MessageSpec } from '@/config/debate/formats';
import { DebateTurnTimeline } from './DebateTurnTimeline';

export interface DebateSessionHeaderParticipant {
  id: string;
  name: string;
  personaLabel?: string;
  personaIcon?: string;
}

export interface DebateSessionHeaderTeam {
  side: DebateSideId;
  label: string;
  participants: DebateSessionHeaderParticipant[];
}

export interface DebateSessionHeaderProps {
  topic: string;
  teams: DebateSessionHeaderTeam[];
  presetLabel: string;
  currentMessageIndex: number;
  totalMessages: number;
  currentTurnLabel?: string;
  activeSideLabel?: string;
  timelineMessages: MessageSpec[];
  onBack: () => void;
  rightElement?: React.ReactNode;
  recordAction?: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'danger' | 'ghost';
  };
  showDemoBadge?: boolean;
}

const getTeamAccent = (theme: Theme, side: DebateSideId): string =>
  side === 'aff' ? theme.colors.primary[500] : theme.colors.warning[600];

const stripMotionPrefix = (topic: string): string => topic.replace(/^\s*Motion:\s*/i, '').trim();

export const DebateSessionHeader: React.FC<DebateSessionHeaderProps> = ({
  topic,
  teams,
  presetLabel,
  currentMessageIndex,
  totalMessages,
  currentTurnLabel,
  activeSideLabel,
  timelineMessages,
  onBack,
  rightElement,
  recordAction,
  showDemoBadge = false,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isNarrow = width < 360;
  const styles = createStyles(theme, isDark, insets.top);
  const motionText = stripMotionPrefix(topic) || 'Debate Motion';

  return (
    <View style={styles.container} testID="debate-session-header">
      <View style={styles.topRow}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Stops this debate and returns to setup."
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          testID="debate-session-header-back"
        >
          <Ionicons name="arrow-back" size={18} color={theme.colors.text.primary} />
          <Typography variant="body" weight="semibold" numberOfLines={1}>
            Go Back
          </Typography>
        </Pressable>

        <View style={styles.topActions}>
          {showDemoBadge && (
            <View style={styles.demoBadge}>
              <Typography variant="caption" weight="bold" color="brand" numberOfLines={1}>
                DEMO
              </Typography>
            </View>
          )}
          {recordAction && (
            <Button
              title={recordAction.label}
              onPress={recordAction.onPress}
              variant={recordAction.variant || 'primary'}
              size="small"
              style={styles.recordButton}
            />
          )}
          {rightElement}
        </View>
      </View>

      <View style={styles.motionBlock}>
        <Typography variant="caption" color="secondary" weight="semibold" style={styles.overline}>
          Motion
        </Typography>
        <Typography
          variant="title"
          weight="bold"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={styles.motionText}
        >
          {motionText}
        </Typography>
      </View>

      <View style={[styles.teamGrid, isNarrow && styles.teamGridNarrow]}>
        {teams.map((team) => {
          const accentColor = getTeamAccent(theme, team.side);

          return (
            <View
              key={team.side}
              style={[
                styles.teamCard,
                {
                  borderColor: isDark ? theme.colors.border : accentColor,
                  backgroundColor: isDark ? theme.colors.overlays.soft : theme.colors.card,
                },
              ]}
            >
              <View style={[styles.teamAccent, { backgroundColor: accentColor }]} />
              <View style={styles.teamCopy}>
                <Typography variant="caption" color="secondary" weight="semibold" numberOfLines={1}>
                  {team.label}
                </Typography>
                <View style={styles.participantLine}>
                  {team.participants.map((participant, index) => (
                    <React.Fragment key={participant.id}>
                      {index > 0 && (
                        <Typography variant="caption" color="secondary" style={styles.participantJoiner}>
                          +
                        </Typography>
                      )}
                      <View
                        style={styles.participantToken}
                        accessible
                        accessibilityLabel={participant.personaLabel
                          ? `${participant.name}, ${participant.personaLabel} personality`
                          : participant.name}
                      >
                        {participant.personaIcon && (
                          <View style={styles.personaIconBadge}>
                            <Typography variant="caption" numberOfLines={1} style={styles.personaIconText}>
                              {participant.personaIcon}
                            </Typography>
                          </View>
                        )}
                        <Typography variant="caption" weight="semibold" numberOfLines={1} style={styles.participantName}>
                          {participant.name}
                        </Typography>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {timelineMessages.length > 0 && (
        <DebateTurnTimeline
          messages={timelineMessages}
          currentMessageIndex={currentMessageIndex}
          currentTurnLabel={currentTurnLabel}
          activeSideLabel={activeSideLabel}
          presetLabel={presetLabel}
          totalMessages={totalMessages}
          showCurrentSummary={false}
          showRailHeader={false}
          embedded
        />
      )}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean, topInset: number) => StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingTop: topInset + 6,
    paddingHorizontal: 14,
    paddingBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.22 : 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  topRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  backButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  pressed: {
    opacity: 0.72,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 1,
  },
  demoBadge: {
    minHeight: 24,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    marginRight: 4,
    backgroundColor: isDark ? theme.colors.overlays.medium : theme.colors.primary[50],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  recordButton: {
    marginRight: 4,
  },
  motionBlock: {
    minHeight: 62,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  overline: {
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: 2,
  },
  motionText: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: 0,
  },
  teamGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  teamGridNarrow: {
    flexDirection: 'column',
  },
  teamCard: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  teamAccent: {
    width: 4,
  },
  teamCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  participantLine: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  participantName: {
    flexShrink: 1,
    letterSpacing: 0,
  },
  participantJoiner: {
    flexShrink: 0,
  },
  participantToken: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  personaIconBadge: {
    width: 19,
    height: 19,
    borderRadius: 9.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? theme.colors.overlays.medium : theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  personaIconText: {
    fontSize: 11,
    lineHeight: 15,
  },
});
