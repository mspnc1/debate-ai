/**
 * DebateAISelector Organism
 * Handles AI selection for debates with topic display and navigation
 */

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../../theme';
import { Typography, GradientButton, Button } from '../../molecules';
import { DynamicAISelector } from '../DynamicAISelector';
import { AIConfig } from '../../../types';

interface DebateAISelectorProps {
  selectedTopic: string;
  customTopic: string;
  topicMode: 'preset' | 'custom' | 'surprise';
  configuredAIs: AIConfig[];
  selectedAIs: AIConfig[];
  maxAIs: number;
  isPremium: boolean;
  aiPersonalities: Record<string, string>;
  onToggleAI: (ai: AIConfig) => void;
  onPersonalityChange: (aiId: string, personalityId: string) => void;
  onAddAI: () => void;
  onNext: () => void;
  onBack: () => void;
}

export const DebateAISelector: React.FC<DebateAISelectorProps> = ({
  selectedTopic,
  customTopic,
  topicMode,
  configuredAIs,
  selectedAIs,
  maxAIs,
  isPremium,
  aiPersonalities,
  onToggleAI,
  onPersonalityChange,
  onAddAI,
  onNext,
  onBack,
}) => {
  const { theme } = useTheme();

  const displayTopic = topicMode === 'custom' ? customTopic : selectedTopic;
  const nextButtonTitle = isPremium ? "Next: Set the Tone →" : "Start Debate ⚔️";
  const isNextEnabled = selectedAIs.length === 2;

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
        <Typography variant="body" color="secondary">Back to Topic</Typography>
      </TouchableOpacity>
      
      {/* Selected Topic Display */}
      <View style={{
        backgroundColor: theme.colors.primary[50],
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary[200],
      }}>
        <Typography variant="caption" color="secondary" style={{ marginBottom: 4 }}>
          Selected Topic:
        </Typography>
        <Typography variant="body" weight="semibold">
          {displayTopic}
        </Typography>
      </View>
      
      <DynamicAISelector
        configuredAIs={configuredAIs}
        selectedAIs={selectedAIs}
        maxAIs={maxAIs}
        onToggleAI={onToggleAI}
        onAddAI={onAddAI}
        isPremium={isPremium}
        customSubtitle="Select exactly 2 AIs for the debate"
        hideStartButton={true}
        aiPersonalities={aiPersonalities}
        onPersonalityChange={onPersonalityChange}
      />
      
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
        title="← Back to Topic Selection"
        onPress={onBack}
        variant="ghost"
        fullWidth
        style={{ marginTop: theme.spacing.md }}
      />
    </Animated.View>
  );
};