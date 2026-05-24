/**
 * DebateAISelector Organism
 * Handles AI selection for debates with topic display and navigation
 */

import React, { useCallback, useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
  const { theme } = useTheme();

  const nextButtonTitle = isPremium ? "Next: Set the Tone →" : "Start Debate ⚔️";
  const isNextEnabled = selectedAIs.length === maxAIs;

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

      {selectedAIs.length > 0 && (
        <Box
          style={{
            marginTop: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.sm,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            gap: 8,
          }}
        >
          <Typography variant="caption" color="secondary" weight="semibold">
            Team slots fill in selection order
          </Typography>
          {selectedAIs.map((ai, index) => (
            <Box
              key={`${ai.id}-${index}`}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Typography variant="caption" color="secondary">
                {getSlotLabel(index)}
              </Typography>
              <Typography variant="caption" weight="semibold">
                {ai.name}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

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
