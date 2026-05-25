/**
 * DebateAISelector Organism
 * Handles slot-first AI selection for debates.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
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
  const { width } = useWindowDimensions();
  const [activeModelKey, setActiveModelKey] = useState<string | null>(null);
  const rootYRef = useRef(0);
  const topStackYRef = useRef(0);
  const teamMapYRef = useRef(0);
  const isCompactLayout = width < 620;

  const nextButtonTitle = isPremium ? 'Next: Set the Tone ->' : 'Start Debate';
  const requiredSlots = debaterSlots.slice(0, maxAIs);
  const allDebaterSlotsFilled = requiredSlots.length === maxAIs && requiredSlots.every(Boolean);
  const filledDebaterCount = requiredSlots.filter(Boolean).length;
  const isNextEnabled = allDebaterSlotsFilled && (!podcastModeEnabled || Boolean(podcastMC));
  const providerSelectorDisabled = allDebaterSlotsFilled && !pendingSelectionTarget;

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
      return index === 0 ? 'Affirmative 1' : 'Negative 1';
    }

    const speakerNumber = Math.floor(index / 2) + 1;
    return index % 2 === 0
      ? `Affirmative ${speakerNumber}`
      : `Negative ${speakerNumber}`;
  }, [maxAIs]);

  const getSlotSide = useCallback((index: number): SlotSide => {
    if (maxAIs <= 2) {
      return index === 0 ? 'proposition' : 'opposition';
    }

    return index % 2 === 0 ? 'proposition' : 'opposition';
  }, [maxAIs]);

  const getSlotKey = (index: number) => `debater-${index}`;

  const getTeamSlots = (side: SlotSide) =>
    Array.from({ length: maxAIs }, (_, index) => ({
      index,
      ai: debaterSlots[index] || null,
      label: getSlotLabel(index),
      slotNumber: Math.floor(index / 2) + 1,
      side: getSlotSide(index),
    })).filter(slot => slot.side === side);

  const providerSubtitle = useMemo(() => {
    if (providerSelectorDisabled) {
      return 'All debater slots are filled. Tap Change on a slot to replace a debater.';
    }
    if (pendingSelectionTarget?.kind === 'mc') {
      return 'Choose the host model that will write podcast interstitials with your key.';
    }
    if (pendingSelectionTarget?.kind === 'debater') {
      return `Choose a provider for ${getSlotLabel(pendingSelectionTarget.index)}. You can reuse providers in multiple slots.`;
    }
    return 'Tap Add or Change on a slot, then choose a provider below.';
  }, [getSlotLabel, pendingSelectionTarget, providerSelectorDisabled]);

  const handleRequestDebater = (index: number) => {
    setActiveModelKey(null);
    onRequestDebaterSlot(index);
  };

  const handleRequestMC = () => {
    setActiveModelKey(null);
    onRequestPodcastMC();
  };

  const handleRemoveDebater = (index: number) => {
    const slotKey = getSlotKey(index);
    setActiveModelKey(current => current === slotKey ? null : current);
    onRemoveDebaterSlot(index);
  };

  const handleRemoveMC = () => {
    setActiveModelKey(current => current === 'mc' ? null : current);
    onRemovePodcastMC();
  };

  const toggleModelEditor = (key: string) => {
    setActiveModelKey(current => current === key ? null : key);
  };

  const reportTeamGridLayout = useCallback(() => {
    onTeamGridLayout?.(rootYRef.current + topStackYRef.current + teamMapYRef.current);
  }, [onTeamGridLayout]);

  const renderSlotAction = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void,
    options: { accentColor: string; selected?: boolean; danger?: boolean } = { accentColor: theme.colors.primary[500] },
  ) => {
    const color = options.danger
      ? theme.colors.error[500]
      : options.selected
        ? options.accentColor
        : theme.colors.text.secondary;
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        style={[
          styles.slotAction,
          {
            borderColor: options.selected ? options.accentColor : theme.colors.border,
            backgroundColor: options.selected
              ? `${options.accentColor}18`
              : (isDark ? theme.colors.overlays.soft : theme.colors.surface),
          },
        ]}
      >
        <Ionicons name={icon} size={14} color={color} />
        <Typography
          variant="caption"
          weight="semibold"
          numberOfLines={1}
          style={{ color }}
        >
          {label}
        </Typography>
      </TouchableOpacity>
    );
  };

  const renderModelPill = (ai: AIConfig, accentColor: string) => (
    <View
      style={[
        styles.modelPill,
        {
          borderColor: `${accentColor}44`,
          backgroundColor: isDark ? theme.colors.overlays.soft : `${accentColor}10`,
        },
      ]}
    >
      <Ionicons name="hardware-chip-outline" size={13} color={accentColor} />
      <Typography
        variant="caption"
        weight="medium"
        numberOfLines={1}
        style={{ color: isDark ? theme.colors.text.primary : theme.colors.text.secondary }}
      >
        {getModelName(ai)}
      </Typography>
    </View>
  );

  const renderModelEditor = (
    ai: AIConfig,
    label: string,
    helper: string,
  ) => {
    if (!onModelChange) return null;
    const selectedModel = selectedModels[ai.id]
      || selectedModels[ai.provider]
      || ai.model;

    return (
      <Box
        style={[
          styles.modelEditor,
          {
            borderColor: theme.colors.primary[300],
            backgroundColor: isDark ? theme.colors.overlays.soft : theme.colors.surface,
          },
        ]}
      >
        <View style={styles.modelEditorHeader}>
          <View style={styles.modelEditorTitle}>
            <Typography variant="body" weight="semibold" numberOfLines={1}>
              {label} model
            </Typography>
            <Typography variant="caption" color="secondary" numberOfLines={2}>
              {helper}
            </Typography>
          </View>
          <TouchableOpacity
            onPress={() => setActiveModelKey(null)}
            accessibilityRole="button"
            accessibilityLabel="Close model editor"
            style={[
              styles.closeModelButton,
              {
                borderColor: theme.colors.border,
                backgroundColor: isDark ? theme.colors.overlays.medium : theme.colors.card,
              },
            ]}
          >
            <Ionicons name="close" size={16} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ModelSelectorEnhanced
          providerId={ai.provider}
          selectedModel={selectedModel}
          onSelectModel={(modelId) => onModelChange(ai.id, modelId)}
          compactMode={false}
          aiName={ai.name}
          showPricing
        />
      </Box>
    );
  };

  const renderFilledSlot = (
    ai: AIConfig,
    label: string,
    slotKey: string,
    accentColor: string,
    onChange: () => void,
    onRemove: () => void,
  ) => {
    const modelSelected = activeModelKey === slotKey;
    return (
      <View style={styles.filledSlotContent}>
        <View style={styles.slotHeaderRow}>
          <View style={styles.slotCopy}>
            <Typography variant="body" weight="semibold" numberOfLines={1}>
              {ai.name}
            </Typography>
            <Typography variant="caption" color="secondary" numberOfLines={1}>
              {label}
            </Typography>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={accentColor} />
        </View>

        {renderModelPill(ai, accentColor)}

        <View style={styles.slotActions}>
          {renderSlotAction('Change', 'swap-horizontal-outline', onChange, { accentColor })}
          {onModelChange && renderSlotAction('Model', 'options-outline', () => toggleModelEditor(slotKey), { accentColor, selected: modelSelected })}
          {renderSlotAction('Remove', 'close-outline', onRemove, { accentColor, danger: true })}
        </View>

        {modelSelected && renderModelEditor(
          ai,
          label,
          slotKey === 'mc'
            ? 'This model writes the podcast-style intro, segues, and winner copy with your key.'
            : 'This model applies only to this debater slot.',
        )}
      </View>
    );
  };

  const renderEmptySlot = (
    index: number,
    label: string,
    isPending: boolean,
    accentColor: string,
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
      <TouchableOpacity
        onPress={() => handleRequestDebater(index)}
        accessibilityRole="button"
        accessibilityLabel={`Add ${label}`}
        style={[
          styles.addSlotButton,
          {
            borderColor: accentColor,
            backgroundColor: isPending ? accentColor : (isDark ? theme.colors.overlays.soft : `${accentColor}10`),
          },
        ]}
      >
        <Ionicons name="add" size={18} color={isPending ? theme.colors.text.white : accentColor} />
        <Typography
          variant="caption"
          weight="semibold"
          style={{ color: isPending ? theme.colors.text.white : accentColor }}
        >
          Add
        </Typography>
      </TouchableOpacity>
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
          isCompactLayout && styles.teamColumnCompact,
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
            <Typography variant="body" weight="semibold" numberOfLines={1}>
              {title}
            </Typography>
            <Typography variant="caption" color="secondary" numberOfLines={1}>
              {role}
            </Typography>
          </View>
          {!isCompactLayout && (
            <Typography variant="caption" color="secondary" numberOfLines={1}>
              {description}
            </Typography>
          )}
        </View>

        <View style={styles.slotList}>
          {slots.map((slot) => {
            const isPending = pendingSelectionTarget?.kind === 'debater' && pendingSelectionTarget.index === slot.index;
            const isFilled = Boolean(slot.ai);
            const slotKey = getSlotKey(slot.index);

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
                      slotKey,
                      accentColor,
                      () => handleRequestDebater(slot.index),
                      () => handleRemoveDebater(slot.index),
                    )
                    : renderEmptySlot(slot.index, slot.label, isPending, accentColor)}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Animated.View
      entering={FadeIn}
      testID="debate-ai-selector-root"
      onLayout={(event) => {
        rootYRef.current = event.nativeEvent.layout.y;
        reportTeamGridLayout();
      }}
    >
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
        testID="debate-ai-selector-top-stack"
        onLayout={(event) => {
          topStackYRef.current = event.nativeEvent.layout.y;
          reportTeamGridLayout();
        }}
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
                    'mc',
                    theme.colors.primary[500],
                    handleRequestMC,
                    handleRemoveMC,
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
                    <TouchableOpacity
                      onPress={handleRequestMC}
                      accessibilityRole="button"
                      accessibilityLabel="Add podcast MC"
                      style={[
                        styles.addSlotButton,
                        {
                          borderColor: theme.colors.primary[500],
                          backgroundColor: pendingSelectionTarget?.kind === 'mc'
                            ? theme.colors.primary[500]
                            : (isDark ? theme.colors.overlays.soft : theme.colors.primary[50]),
                        },
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={pendingSelectionTarget?.kind === 'mc' ? theme.colors.text.white : theme.colors.primary[500]}
                      />
                      <Typography
                        variant="caption"
                        weight="semibold"
                        style={{ color: pendingSelectionTarget?.kind === 'mc' ? theme.colors.text.white : theme.colors.primary[500] }}
                      >
                        Add MC
                      </Typography>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </Box>

        <Box
          testID="debate-team-grid"
          onLayout={(event) => {
            teamMapYRef.current = event.nativeEvent.layout.y;
            reportTeamGridLayout();
          }}
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
                Fill each slot directly. Use Model only when you want to override the default.
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

          <View style={[styles.teamColumns, isCompactLayout && styles.teamColumnsCompact]}>
            {renderTeamColumn(
              'proposition',
              'Affirmative',
              'Affirmative',
              'Argues for the motion',
              'arrow-up-circle-outline',
              theme.colors.primary[500],
            )}
            {renderTeamColumn(
              'opposition',
              'Negative',
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
        pointerEvents={providerSelectorDisabled ? 'none' : 'auto'}
        accessibilityState={{ disabled: providerSelectorDisabled }}
        testID="debate-provider-selector"
        style={[
          styles.providerSelector,
          providerSelectorDisabled && styles.providerSelectorDisabled,
        ]}
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
    minHeight: 76,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  mcIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  teamColumnsCompact: {
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
  teamColumnCompact: {
    width: '100%',
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
  teamSlot: {
    minHeight: 76,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  slotNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
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
    gap: 10,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelPill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  slotActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotAction: {
    flexGrow: 1,
    minWidth: 76,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addSlotButton: {
    minWidth: 86,
    minHeight: 38,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  modelEditor: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  modelEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modelEditorTitle: {
    flex: 1,
    minWidth: 0,
  },
  closeModelButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerSelector: {
    marginTop: 18,
  },
  providerSelectorDisabled: {
    opacity: 0.42,
  },
});
