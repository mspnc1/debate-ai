/**
 * DebateAISelector Organism
 * Handles slot-first AI selection for debates.
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { Typography, GradientButton, Button, SectionHeader } from '../../molecules';
import { Box } from '@/components/atoms';
import { DynamicAISelector } from '@/components/organisms/home/DynamicAISelector';
import { ModelSelectorEnhanced } from '@/components/organisms/home/ModelSelectorEnhanced';
import { AIConfig } from '../../../types';
import { getModelById, resolveProviderModelId } from '@/config/modelConfigs';

type DebaterSlot = AIConfig | null;
type PendingSelectionTarget = { kind: 'debater'; index: number } | { kind: 'mc' };
type SlotSide = 'proposition' | 'opposition';

interface DebateAISelectorProps {
  selectedTopic: string;
  customTopic: string;
  topicMode: 'preset' | 'custom' | 'surprise';
  configuredAIs: AIConfig[];
  debaterSlots: DebaterSlot[];
  selectedAIs: AIConfig[];
  maxAIs: number;
  isPremium: boolean;
  aiPersonalities: Record<string, string>;
  selectedModels?: Record<string, string>;
  pendingSelectionTarget?: PendingSelectionTarget | null;
  podcastModeEnabled: boolean;
  podcastMC?: AIConfig | null;
  onTogglePodcastMode: (enabled: boolean) => void;
  onRequestDebaterSlot: (index: number) => void;
  onRemoveDebaterSlot: (index: number) => void;
  onRequestPodcastMC: () => void;
  onRemovePodcastMC: () => void;
  onSelectProvider: (ai: AIConfig) => void;
  onPersonalityChange: (aiId: string, personalityId: string) => void;
  onModelChange?: (aiId: string, modelId: string) => void;
  onAddAI: () => void;
  onNext: () => void;
  onBack: () => void;
  onTeamGridLayout?: (y: number) => void;
  onProviderSelectorLayout?: (y: number) => void;
}

export const DebateAISelector: React.FC<DebateAISelectorProps> = ({
  // selectedTopic, customTopic, topicMode, // no longer used in this step
  configuredAIs,
  debaterSlots,
  selectedAIs,
  maxAIs,
  isPremium,
  aiPersonalities,
  selectedModels = {},
  pendingSelectionTarget = null,
  podcastModeEnabled,
  podcastMC,
  onTogglePodcastMode,
  onRequestDebaterSlot,
  onRemoveDebaterSlot,
  onRequestPodcastMC,
  onRemovePodcastMC,
  onSelectProvider,
  onModelChange,
  onAddAI,
  onNext,
  onBack,
  onTeamGridLayout,
  onProviderSelectorLayout,
}) => {
  const { theme, isDark } = useTheme();

  const nextButtonTitle = isPremium ? 'Next: Set the Tone ->' : 'Start Debate';
  const requiredSlots = debaterSlots.slice(0, maxAIs);
  const allDebaterSlotsFilled = requiredSlots.length === maxAIs && requiredSlots.every(Boolean);
  const filledDebaterCount = requiredSlots.filter(Boolean).length;
  const isNextEnabled = allDebaterSlotsFilled && (!podcastModeEnabled || Boolean(podcastMC));

  const getEffectiveModelId = useCallback((ai: AIConfig): string => (
    resolveProviderModelId(ai.provider, selectedModels[ai.id] || selectedModels[ai.provider] || ai.model)
    || selectedModels[ai.id]
    || selectedModels[ai.provider]
    || ai.model
  ), [selectedModels]);

  const getModelName = useCallback((ai: AIConfig): string => {
    const modelId = getEffectiveModelId(ai);
    const model = getModelById(ai.provider, modelId);
    return model?.name || modelId || 'Default model';
  }, [getEffectiveModelId]);

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

    if (!allDebaterSlotsFilled) {
      const remaining = maxAIs - filledDebaterCount;
      return {
        tone: 'neutral' as const,
        text: `Live Search: fill ${remaining} more ${remaining === 1 ? 'slot' : 'slots'} to check availability.`,
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
  }, [allDebaterSlotsFilled, filledDebaterCount, maxAIs, selectedSearchInfo]);

  const liveSearchStatusColor = liveSearchStatus?.tone === 'enabled'
    ? theme.colors.success[600]
    : liveSearchStatus?.tone === 'unavailable'
      ? theme.colors.warning[600]
      : theme.colors.text.secondary;

  const getSlotLabel = useCallback((index: number): string => {
    if (maxAIs <= 2) {
      return index === 0 ? 'Proposition 1' : 'Opposition 1';
    }

    const speakerNumber = Math.floor(index / 2) + 1;
    return index % 2 === 0
      ? `Proposition ${speakerNumber}`
      : `Opposition ${speakerNumber}`;
  }, [maxAIs]);

  const getSlotSide = useCallback((index: number): SlotSide => {
    if (maxAIs <= 2) {
      return index === 0 ? 'proposition' : 'opposition';
    }

    return index % 2 === 0 ? 'proposition' : 'opposition';
  }, [maxAIs]);

  const getTeamSlots = (side: SlotSide) =>
    Array.from({ length: maxAIs }, (_, index) => ({
      index,
      ai: debaterSlots[index] || null,
      label: getSlotLabel(index),
      slotNumber: Math.floor(index / 2) + 1,
      side: getSlotSide(index),
    })).filter(slot => slot.side === side);

  const providerSubtitle = useMemo(() => {
    if (pendingSelectionTarget?.kind === 'mc') {
      return 'Choose the host model that will write podcast interstitials with your key.';
    }
    if (pendingSelectionTarget?.kind === 'debater') {
      return `Choose a provider for ${getSlotLabel(pendingSelectionTarget.index)}. You can reuse providers in multiple slots.`;
    }
    return 'Tap Add or Change on a slot, then choose a provider below.';
  }, [getSlotLabel, pendingSelectionTarget]);

  const renderModelControl = (ai: AIConfig, subtitle: string) => {
    if (!onModelChange) return null;
    const selectedModel = selectedModels[ai.id] || selectedModels[ai.provider] || ai.model;

    return (
      <View
        style={[
          styles.modelControl,
          {
            borderColor: isDark ? theme.colors.primary[700] : theme.colors.primary[200],
            backgroundColor: isDark ? theme.colors.overlays.medium : theme.colors.primary[50],
          },
        ]}
      >
        <View style={styles.modelControlHeader}>
          <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.primary[500]} />
          <View style={styles.modelControlCopy}>
            <Typography variant="caption" weight="semibold" numberOfLines={1}>
              Model
            </Typography>
            <Typography variant="caption" color="secondary" numberOfLines={1}>
              {subtitle}
            </Typography>
          </View>
        </View>
        <ModelSelectorEnhanced
          providerId={ai.provider}
          selectedModel={selectedModel}
          onSelectModel={(modelId) => onModelChange(ai.id, modelId)}
          compactMode
          aiName={ai.name}
          showPricing
        />
      </View>
    );
  };

  const renderFilledSlot = (
    ai: AIConfig,
    label: string,
    accentColor: string,
    onChange: () => void,
    onRemove: () => void,
  ) => (
    <View style={styles.filledSlotContent}>
      <View style={styles.slotHeaderRow}>
        <View style={styles.slotCopy}>
          <Typography variant="body" weight="semibold" numberOfLines={1}>
            {ai.name}
          </Typography>
          <Typography variant="caption" color="secondary" numberOfLines={1}>
            {label} • {getModelName(ai)}
          </Typography>
        </View>
        <Ionicons name="checkmark-circle" size={20} color={accentColor} />
      </View>
      <View style={styles.slotActions}>
        <Button title="Change" onPress={onChange} variant="secondary" size="small" style={styles.slotActionButton} />
        <Button title="Remove" onPress={onRemove} variant="ghost" size="small" style={styles.slotActionButton} />
      </View>
      {renderModelControl(ai, `Applies only to ${label}`)}
    </View>
  );

  const renderEmptySlot = (
    index: number,
    label: string,
    isPending: boolean,
  ) => (
    <View style={styles.emptySlotContent}>
      <View style={styles.slotCopy}>
        <Typography variant="body" weight="semibold" color={isPending ? 'primary' : 'secondary'} numberOfLines={1}>
          {isPending ? 'Choose below' : 'Open slot'}
        </Typography>
        <Typography variant="caption" color="secondary" numberOfLines={1}>
          {label}
        </Typography>
      </View>
      <Button
        title="Add"
        onPress={() => onRequestDebaterSlot(index)}
        variant={isPending ? 'primary' : 'tonal'}
        size="small"
        style={styles.addSlotButton}
        accessibilityLabel={`Add ${label}`}
      />
    </View>
  );

  const renderTeamColumn = (
    side: SlotSide,
    title: string,
    role: string,
    description: string,
    iconName: keyof typeof Ionicons.glyphMap,
    accentColor: string,
  ) => {
    const slots = getTeamSlots(side);

    return (
      <View
        style={[
          styles.teamColumn,
          {
            borderColor: theme.colors.border,
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
            const isPending = pendingSelectionTarget?.kind === 'debater' && pendingSelectionTarget.index === slot.index;
            const isFilled = Boolean(slot.ai);

            return (
              <View
                key={`${side}-${slot.index}`}
                style={[
                  styles.teamSlot,
                  {
                    borderColor: isPending || isFilled ? accentColor : theme.colors.border,
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
                      backgroundColor: isFilled || isPending ? accentColor : theme.colors.overlays.medium,
                    },
                  ]}
                >
                  <Typography
                    variant="caption"
                    weight="semibold"
                    style={{
                      color: isFilled || isPending ? theme.colors.text.white : theme.colors.text.secondary,
                    }}
                  >
                    {slot.slotNumber}
                  </Typography>
                </View>
                <View style={styles.slotBody}>
                  {slot.ai
                    ? renderFilledSlot(
                      slot.ai,
                      slot.label,
                      accentColor,
                      () => onRequestDebaterSlot(slot.index),
                      () => onRemoveDebaterSlot(slot.index),
                    )
                    : renderEmptySlot(slot.index, slot.label, isPending)}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Animated.View entering={FadeIn}>
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

      <View
        onLayout={(event) => onTeamGridLayout?.(event.nativeEvent.layout.y)}
        style={styles.topStack}
      >
        <Box
          style={[
            styles.podcastPanel,
            {
              borderColor: podcastModeEnabled ? theme.colors.primary[400] : theme.colors.border,
              backgroundColor: isDark ? theme.colors.overlays.soft : theme.colors.surface,
            },
          ]}
        >
          <View style={styles.podcastHeader}>
            <View style={styles.podcastTitle}>
              <Typography variant="body" weight="semibold">
                Podcast Mode
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={2}>
                Adds a BYOK MC for intro, segues, and winner announcements.
              </Typography>
            </View>
            <Button
              title={podcastModeEnabled ? 'On' : 'Off'}
              onPress={() => onTogglePodcastMode(!podcastModeEnabled)}
              variant={podcastModeEnabled ? 'primary' : 'secondary'}
              size="small"
            />
          </View>

          {podcastModeEnabled && (
            <View
              style={[
                styles.mcSlot,
                {
                  borderColor: pendingSelectionTarget?.kind === 'mc' || podcastMC ? theme.colors.primary[500] : theme.colors.border,
                  backgroundColor: isDark ? theme.colors.overlays.medium : theme.colors.card,
                },
              ]}
            >
              <View style={styles.mcIcon}>
                <Ionicons name="mic-outline" size={18} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.mcBody}>
                {podcastMC ? (
                  renderFilledSlot(
                    podcastMC,
                    'Podcast MC',
                    theme.colors.primary[500],
                    onRequestPodcastMC,
                    onRemovePodcastMC,
                  )
                ) : (
                  <View style={styles.emptySlotContent}>
                    <View style={styles.slotCopy}>
                      <Typography variant="body" weight="semibold" color={pendingSelectionTarget?.kind === 'mc' ? 'primary' : 'secondary'}>
                        {pendingSelectionTarget?.kind === 'mc' ? 'Choose below' : 'No MC selected'}
                      </Typography>
                      <Typography variant="caption" color="secondary" numberOfLines={2}>
                        Select a text provider/model for interstitial scripts.
                      </Typography>
                    </View>
                    <Button
                      title="Add MC"
                      onPress={onRequestPodcastMC}
                      variant={pendingSelectionTarget?.kind === 'mc' ? 'primary' : 'tonal'}
                      size="small"
                      style={styles.addSlotButton}
                    />
                  </View>
                )}
              </View>
            </View>
          )}
        </Box>

        <Box
          style={[
            styles.teamMap,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <View style={styles.teamMapHeader}>
            <View style={styles.teamMapTitle}>
              <Typography variant="body" weight="semibold">
                Debate Teams
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={2}>
                Fill each slot directly. Changing or removing one slot keeps the others intact.
              </Typography>
            </View>
            <View
              style={[
                styles.progressPill,
                {
                  backgroundColor: allDebaterSlotsFilled
                    ? theme.colors.success[500]
                    : theme.colors.primary[500],
                },
              ]}
            >
              <Typography variant="caption" weight="semibold" style={{ color: theme.colors.text.white }}>
                {filledDebaterCount}/{maxAIs}
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
      </View>

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
            marginTop: theme.spacing.md,
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

      <View
        onLayout={(event) => onProviderSelectorLayout?.(event.nativeEvent.layout.y)}
        style={styles.providerSelector}
      >
        <SectionHeader
          title="Provider Selector"
          subtitle={providerSubtitle}
          icon="🤖"
          onAction={onAddAI}
          actionLabel="+ Add AI"
        />
        <DynamicAISelector
          configuredAIs={configuredAIs}
          selectedAIs={[]}
          maxAIs={Math.max(configuredAIs.length, 1)}
          onToggleAI={onSelectProvider}
          onAddAI={onAddAI}
          customSubtitle={providerSubtitle}
          hideStartButton
          hideHeader
          aiPersonalities={aiPersonalities}
          selectedModels={selectedModels}
          onPersonalityChange={undefined}
          onModelChange={undefined}
          getBadge={(ai) => getSearchInfo(ai).supportsLiveSearch
            ? { text: 'Live Search', color: theme.colors.success[600] }
            : undefined}
        />
      </View>

      <GradientButton
        title={nextButtonTitle}
        onPress={onNext}
        disabled={!isNextEnabled}
        gradient={theme.colors.gradients.primary}
        fullWidth
        style={{ marginTop: theme.spacing.lg }}
      />

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
  topStack: {
    gap: 12,
  },
  podcastPanel: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  podcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  podcastTitle: {
    flex: 1,
    minWidth: 0,
  },
  mcSlot: {
    minHeight: 72,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  mcIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mcBody: {
    flex: 1,
    minWidth: 0,
  },
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
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  slotNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  slotBody: {
    flex: 1,
    minWidth: 0,
  },
  slotCopy: {
    flex: 1,
    minWidth: 0,
  },
  filledSlotContent: {
    gap: 8,
  },
  emptySlotContent: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotActions: {
    flexDirection: 'row',
    gap: 8,
  },
  slotActionButton: {
    flex: 1,
    minHeight: 34,
  },
  addSlotButton: {
    minHeight: 34,
  },
  modelControl: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  modelControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelControlCopy: {
    flex: 1,
    minWidth: 0,
  },
  providerSelector: {
    marginTop: 18,
  },
});
