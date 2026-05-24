/**
 * DebateAISelector Organism
 * Handles AI selection for debates with topic display and navigation
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Typography, GradientButton, Button } from '../../molecules';
import { Box } from '@/components/atoms';
import { DynamicAISelector } from '@/components/organisms/home/DynamicAISelector';
import { AIConfig } from '../../../types';
import { getModelById, resolveProviderModelId } from '@/config/modelConfigs';

interface DebateAISelectorProps {
  selectedTopic: string;
  customTopic: string;
  topicMode: 'preset' | 'custom' | 'surprise';
  configuredAIs: AIConfig[];
  selectedAIs: AIConfig[];
  maxAIs: number;
  isPremium: boolean;
  aiPersonalities: Record<string, string>;
  selectedModels?: Record<string, string>;
  onToggleAI: (ai: AIConfig) => void;
  onPersonalityChange: (aiId: string, personalityId: string) => void;
  onModelChange?: (aiId: string, modelId: string) => void;
  onAddAI: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const DebateAISelector: React.FC<DebateAISelectorProps> = ({
  // selectedTopic, customTopic, topicMode, // no longer used in this step
  configuredAIs,
  selectedAIs,
  maxAIs,
  isPremium,
  aiPersonalities,
  selectedModels = {},
  onToggleAI,
  onPersonalityChange,
  onModelChange,
  onAddAI,
  onNext,
  onBack,
}) => {
  const { theme, isDark } = useTheme();

  const nextButtonTitle = isPremium ? "Next: Set the Tone →" : "Start Debate ⚔️";
  const isNextEnabled = selectedAIs.length === maxAIs;
  const nextSlotIndex = selectedAIs.length < maxAIs ? selectedAIs.length : null;

  const getEffectiveModelId = useCallback((ai: AIConfig): string => (
    resolveProviderModelId(ai.provider, selectedModels[ai.id] || ai.model)
    || selectedModels[ai.id]
    || ai.model
  ), [selectedModels]);

  const getSearchInfo = useCallback((ai: AIConfig) => {
    const modelId = getEffectiveModelId(ai);
    const model = getModelById(ai.provider, modelId);

    return {
      ai,
      modelId,
      modelName: model?.name || modelId,
      supportsLiveSearch: Boolean(model?.supportsWebSearch),
    };
  }, [getEffectiveModelId]);

  const selectedSearchInfo = useMemo(
    () => selectedAIs.map(getSearchInfo),
    [getSearchInfo, selectedAIs]
  );

  const liveSearchStatus = useMemo(() => {
    if (selectedSearchInfo.length === 0) {
      return null;
    }

    if (selectedSearchInfo.length < maxAIs) {
      const remaining = maxAIs - selectedSearchInfo.length;
      return {
        tone: 'neutral' as const,
        text: `Live Search: select ${remaining} more ${remaining === 1 ? 'debater' : 'debaters'} to check availability.`,
      };
    }

    const unsupported = selectedSearchInfo.filter(info => !info.supportsLiveSearch);
    if (unsupported.length === 0) {
      return {
        tone: 'enabled' as const,
        text: 'Live Search enabled for this debate.',
      };
    }

    const names = unsupported
      .map(info => `${info.ai.name} (${info.modelName})`)
      .join(' and ');

    return {
      tone: 'unavailable' as const,
      text: `Live Search unavailable: ${names} ${unsupported.length === 1 ? 'does' : 'do'} not support it.`,
    };
  }, [maxAIs, selectedSearchInfo]);

  const liveSearchStatusColor = liveSearchStatus?.tone === 'enabled'
    ? theme.colors.success[600]
    : liveSearchStatus?.tone === 'unavailable'
      ? theme.colors.warning[600]
      : theme.colors.text.secondary;

  const getSlotLabel = (index: number): string => {
    if (maxAIs <= 2) {
      return index === 0 ? 'Proposition' : 'Opposition';
    }

    const speakerNumber = Math.floor(index / 2) + 1;
    return index % 2 === 0
      ? `Proposition ${speakerNumber}`
      : `Opposition ${speakerNumber}`;
  };

  const getSlotSide = (index: number): 'proposition' | 'opposition' => {
    if (maxAIs <= 2) {
      return index === 0 ? 'proposition' : 'opposition';
    }

    return index % 2 === 0 ? 'proposition' : 'opposition';
  };

  const getTeamSlots = (side: 'proposition' | 'opposition') =>
    Array.from({ length: maxAIs }, (_, index) => ({
      index,
      ai: selectedAIs[index],
      label: getSlotLabel(index),
      slotNumber: Math.floor(index / 2) + 1,
      side: getSlotSide(index),
    })).filter(slot => slot.side === side);

  const renderTeamColumn = (
    side: 'proposition' | 'opposition',
    title: string,
    role: string,
    description: string,
    iconName: keyof typeof Ionicons.glyphMap,
    accentColor: string,
  ) => {
    const slots = getTeamSlots(side);
    const hasNextSlot = nextSlotIndex !== null && getSlotSide(nextSlotIndex) === side;

    return (
      <View
        style={[
          styles.teamColumn,
          {
            borderColor: hasNextSlot ? accentColor : theme.colors.border,
            backgroundColor: isDark ? theme.colors.overlays.soft : theme.colors.surface,
          },
        ]}
      >
        <View style={styles.teamHeader}>
          <View style={[styles.teamIcon, { backgroundColor: `${accentColor}22` }]}>
            <Ionicons name={iconName} size={16} color={accentColor} />
          </View>
          <View style={styles.teamHeaderText}>
            <Typography variant="caption" weight="semibold" numberOfLines={1}>
              {title}
            </Typography>
            <Typography variant="caption" color="secondary" numberOfLines={1}>
              {role}
            </Typography>
          </View>
        </View>

        <Typography variant="caption" color="secondary" style={styles.teamDescription} numberOfLines={2}>
          {description}
        </Typography>

        <View style={styles.slotList}>
          {slots.map((slot) => {
            const isFilled = Boolean(slot.ai);
            const isNext = slot.index === nextSlotIndex;

            return (
              <View
                key={`${side}-${slot.index}`}
                style={[
                  styles.teamSlot,
                  {
                    borderColor: isNext || isFilled ? accentColor : theme.colors.border,
                    backgroundColor: isFilled
                      ? (isDark ? theme.colors.overlays.medium : theme.colors.card)
                      : (isDark ? 'transparent' : theme.colors.background),
                  },
                ]}
              >
                <View
                  style={[
                    styles.slotNumber,
                    {
                      backgroundColor: isFilled || isNext ? accentColor : theme.colors.overlays.medium,
                    },
                  ]}
                >
                  <Typography
                    variant="caption"
                    weight="semibold"
                    style={{
                      color: isFilled || isNext ? theme.colors.text.white : theme.colors.text.secondary,
                    }}
                  >
                    {slot.slotNumber}
                  </Typography>
                </View>
                <View style={styles.slotCopy}>
                  <Typography
                    variant="caption"
                    weight={isFilled ? 'semibold' : 'medium'}
                    color={isFilled ? 'primary' : 'secondary'}
                    numberOfLines={1}
                  >
                    {slot.ai?.name || (isNext ? 'Next pick' : 'Open slot')}
                  </Typography>
                  <Typography variant="caption" color="secondary" numberOfLines={1}>
                    {slot.label}
                  </Typography>
                </View>
                {isFilled && (
                  <Ionicons name="checkmark-circle" size={18} color={accentColor} />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Animated.View entering={FadeIn}>
      {/* Back Button */}
      <TouchableOpacity 
        onPress={onBack}
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        <Typography variant="body" style={{ marginRight: 8 }}>←</Typography>
        <Typography variant="body" color="secondary">Back to Motion</Typography>
      </TouchableOpacity>
      
      {/* Removed Selected Topic display per request */}

      <DynamicAISelector
        configuredAIs={configuredAIs}
        selectedAIs={selectedAIs}
        maxAIs={maxAIs}
        onToggleAI={onToggleAI}
        onAddAI={onAddAI}
        customSubtitle={`Select exactly ${maxAIs} ${maxAIs === 2 ? 'AIs' : 'debaters'} for this format`}
        hideStartButton={true}
        aiPersonalities={aiPersonalities}
        selectedModels={selectedModels}
        onPersonalityChange={onPersonalityChange}
        onModelChange={onModelChange}
        getBadge={(ai) => getSearchInfo(ai).supportsLiveSearch
          ? { text: 'Live Search', color: theme.colors.success[600] }
          : undefined}
      />

      <Box
        style={[
          styles.teamMap,
          {
            marginTop: theme.spacing.md,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <View style={styles.teamMapHeader}>
          <View style={styles.teamMapTitle}>
            <Typography variant="body" weight="semibold">
              Debate teams
            </Typography>
            <Typography variant="caption" color="secondary" numberOfLines={1}>
              {nextSlotIndex === null
                ? 'Teams are ready'
                : `Next pick: ${getSlotLabel(nextSlotIndex)}`}
            </Typography>
          </View>
          <View
            style={[
              styles.progressPill,
              {
                backgroundColor: isNextEnabled
                  ? theme.colors.success[500]
                  : theme.colors.primary[500],
              },
            ]}
          >
            <Typography variant="caption" weight="semibold" style={{ color: theme.colors.text.white }}>
              {selectedAIs.length}/{maxAIs}
            </Typography>
          </View>
        </View>

        <View style={styles.teamColumns}>
          {renderTeamColumn(
            'proposition',
            'Proposition',
            'Affirmative',
            'Argues for the motion',
            'arrow-up-circle-outline',
            theme.colors.primary[500],
          )}
          {renderTeamColumn(
            'opposition',
            'Opposition',
            'Negative',
            'Argues against the motion',
            'remove-circle-outline',
            theme.colors.warning[600],
          )}
        </View>
      </Box>

      {liveSearchStatus && (
        <Box
          style={{
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.sm,
            borderWidth: 1,
            borderColor: liveSearchStatus.tone === 'enabled'
              ? theme.colors.success[300]
              : liveSearchStatus.tone === 'unavailable'
                ? theme.colors.warning[300]
                : theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Typography
            variant="caption"
            weight="semibold"
            style={{ color: liveSearchStatusColor }}
          >
            {liveSearchStatus.text}
          </Typography>
        </Box>
      )}
      
      {/* Next Button */}
      <GradientButton
        title={nextButtonTitle}
        onPress={onNext}
        disabled={!isNextEnabled}
        gradient={theme.colors.gradients.primary}
        fullWidth
        style={{ marginTop: theme.spacing.lg }}
      />
      
      {/* Secondary Back Button */}
      <Button
        title="← Back to Motion Selection"
        onPress={onBack}
        variant="ghost"
        fullWidth
        style={{ marginTop: theme.spacing.md }}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  teamMap: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  teamMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  teamMapTitle: {
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
  teamColumns: {
    flexDirection: 'row',
    gap: 10,
  },
  teamColumn: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 8,
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
  teamDescription: {
    minHeight: 34,
  },
  slotList: {
    gap: 8,
  },
  teamSlot: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotCopy: {
    flex: 1,
    minWidth: 0,
  },
});
