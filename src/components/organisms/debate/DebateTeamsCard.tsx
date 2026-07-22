/**
 * DebateTeamsCard
 *
 * Presentational Affirmative/Negative slot grid for debate setup. The screen
 * resolves each slot to display strings (model, personality, voice) and this
 * card only renders them: a filled slot is one tap target that opens the
 * slot's config sheet; an empty slot opens the provider picker.
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Typography } from '@/components/molecules';
import { AIAvatar } from '../common/AIAvatar';
import { getAIProviderIcon } from '@/utils/aiProviderAssets';
import type { AIConfig } from '@/types';

export interface DebateTeamSlotDescriptor {
  index: number;
  /** e.g. "Affirmative 1" */
  label: string;
  side: 'affirmative' | 'negative';
  ai: AIConfig | null;
  modelLabel?: string;
  /** e.g. "😀 Friendly"; omitted in demo mode. */
  personalityLabel?: string;
  /** Voice name when voiced debate is active. */
  voiceLabel?: string;
  /** True when a voice is required but not yet chosen. */
  voiceMissing?: boolean;
}

export interface DebateTeamsStatusNote {
  tone: 'neutral' | 'enabled' | 'unavailable';
  text: string;
}

interface DebateTeamsCardProps {
  slots: DebateTeamSlotDescriptor[];
  filledCount: number;
  totalCount: number;
  onSlotPress: (slot: DebateTeamSlotDescriptor) => void;
  statusNote?: DebateTeamsStatusNote | null;
  testID?: string;
}

const COMPACT_LAYOUT_MAX_WIDTH = 620;

export const DebateTeamsCard: React.FC<DebateTeamsCardProps> = ({
  slots,
  filledCount,
  totalCount,
  onSlotPress,
  statusNote,
  testID,
}) => {
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isCompactLayout = width < COMPACT_LAYOUT_MAX_WIDTH;

  const teams = [
    {
      side: 'affirmative' as const,
      title: 'Affirmative',
      subtitle: 'Argues for the motion',
      icon: 'arrow-up-circle-outline' as const,
      accentColor: theme.colors.primary[500],
    },
    {
      side: 'negative' as const,
      title: 'Negative',
      subtitle: 'Argues against the motion',
      icon: 'remove-circle-outline' as const,
      accentColor: theme.colors.warning[600],
    },
  ];

  const statusColor = statusNote?.tone === 'enabled'
    ? theme.colors.success[600]
    : statusNote?.tone === 'unavailable'
      ? theme.colors.warning[600]
      : theme.colors.text.secondary;

  const renderSlot = (slot: DebateTeamSlotDescriptor, accentColor: string) => {
    const filled = Boolean(slot.ai);
    const detailLines: string[] = [];
    if (slot.ai) {
      if (slot.personalityLabel) detailLines.push(slot.personalityLabel);
      if (slot.voiceLabel) detailLines.push(slot.voiceLabel);
    }

    return (
      <TouchableOpacity
        key={slot.index}
        onPress={() => onSlotPress(slot)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={filled ? `${slot.ai?.name}, ${slot.label}` : `Add ${slot.label}`}
        accessibilityHint={filled ? 'Opens debater configuration' : 'Opens the AI provider picker'}
        testID={testID ? `${testID}-slot-${slot.index}` : undefined}
        style={[
          styles.slot,
          {
            borderColor: filled ? accentColor : theme.colors.border,
            borderStyle: filled ? 'solid' : 'dashed',
            backgroundColor: filled
              ? (isDark ? theme.colors.overlays.medium : theme.colors.card)
              : 'transparent',
          },
        ]}
      >
        {slot.ai ? (
          <>
            <AIAvatar
              icon={getAIProviderIcon(slot.ai.provider).icon}
              iconType={getAIProviderIcon(slot.ai.provider).iconType}
              size="small"
              color={slot.ai.color}
            />
            <View style={styles.slotBody}>
              <Typography variant="body" weight="semibold" numberOfLines={1}>
                {slot.ai.name}
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {slot.label}
                {slot.modelLabel ? ` · ${slot.modelLabel}` : ''}
              </Typography>
              {detailLines.length > 0 && (
                <Typography variant="caption" color="secondary" numberOfLines={1}>
                  {detailLines.join(' · ')}
                </Typography>
              )}
              {slot.voiceMissing && (
                <Typography
                  variant="caption"
                  weight="semibold"
                  numberOfLines={1}
                  style={{ color: theme.colors.warning[600] }}
                >
                  Voice needed
                </Typography>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.text.secondary} />
          </>
        ) : (
          <>
            <View style={[styles.addIcon, { borderColor: accentColor }]}>
              <Ionicons name="add" size={18} color={accentColor} />
            </View>
            <View style={styles.slotBody}>
              <Typography variant="body" weight="semibold" style={{ color: accentColor }}>
                Add debater
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {slot.label}
              </Typography>
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View testID={testID}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Typography variant="subtitle" weight="semibold">
            Debate Teams
          </Typography>
          <Typography variant="caption" color="secondary">
            Tap a slot to add or configure a debater.
          </Typography>
        </View>
        <View
          style={[
            styles.progressPill,
            {
              backgroundColor: filledCount >= totalCount
                ? theme.colors.success[500]
                : theme.colors.primary[500],
            },
          ]}
        >
          <Typography variant="caption" weight="semibold" style={{ color: theme.colors.text.white }}>
            {filledCount}/{totalCount}
          </Typography>
        </View>
      </View>

      <View style={[styles.columns, isCompactLayout && styles.columnsCompact]}>
        {teams.map((team) => (
          <View
            key={team.side}
            style={[
              styles.teamColumn,
              {
                borderColor: theme.colors.border,
                backgroundColor: isDark ? theme.colors.overlays.soft : theme.colors.surface,
              },
            ]}
          >
            <View style={styles.teamHeader}>
              <View style={[styles.teamIcon, { backgroundColor: `${team.accentColor}22` }]}>
                <Ionicons name={team.icon} size={16} color={team.accentColor} />
              </View>
              <View style={styles.teamHeaderText}>
                <Typography variant="body" weight="semibold" numberOfLines={1}>
                  {team.title}
                </Typography>
                <Typography variant="caption" color="secondary" numberOfLines={1}>
                  {team.subtitle}
                </Typography>
              </View>
            </View>
            <View style={styles.slotList}>
              {slots
                .filter((slot) => slot.side === team.side)
                .map((slot) => renderSlot(slot, team.accentColor))}
            </View>
          </View>
        ))}
      </View>

      {statusNote && (
        <Typography
          variant="caption"
          weight="semibold"
          style={[styles.statusNote, { color: statusColor }]}
        >
          {statusNote.text}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  progressPill: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  columns: {
    flexDirection: 'row',
    gap: 10,
  },
  columnsCompact: {
    flexDirection: 'column',
  },
  teamColumn: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  slotList: {
    gap: 8,
  },
  slot: {
    minHeight: 64,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotBody: {
    flex: 1,
    minWidth: 0,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusNote: {
    marginTop: 12,
  },
});

export default DebateTeamsCard;
