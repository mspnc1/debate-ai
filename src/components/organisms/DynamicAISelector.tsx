import React from 'react';
import { View, Dimensions } from 'react-native';
import { Box } from '../atoms';
import { GradientButton } from '../molecules';
import { SectionHeader } from '../molecules';
import { AICard } from './AICard';
import { AIConfig } from '../../types';
import { useTheme } from '../../theme';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface DynamicAISelectorProps {
  configuredAIs: AIConfig[];
  selectedAIs: AIConfig[];
  maxAIs: number;
  onToggleAI: (ai: AIConfig) => void;
  onStartChat?: () => void;  // Made optional
  onAddAI: () => void;
  isPremium: boolean;
  customSubtitle?: string;
  hideStartButton?: boolean;  // New prop to hide the start button
  aiPersonalities?: { [aiId: string]: string };
  selectedModels?: { [aiId: string]: string };
  onPersonalityChange?: (aiId: string, personalityId: string) => void;
  onModelChange?: (aiId: string, modelId: string) => void;
}

export const DynamicAISelector: React.FC<DynamicAISelectorProps> = ({
  configuredAIs,
  selectedAIs,
  maxAIs,
  onToggleAI,
  onStartChat,
  onAddAI,
  isPremium,
  customSubtitle,
  hideStartButton = false,
  aiPersonalities = {},
  selectedModels = {},
  onPersonalityChange,
  onModelChange,
}) => {
  const { theme } = useTheme();
  
  const getSubtitle = () => {
    if (customSubtitle) {
      return customSubtitle;
    }
    if (configuredAIs.length === 0) {
      return 'No AIs configured yet';
    } else if (configuredAIs.length === 1) {
      return '1 AI ready';
    } else if (isPremium) {
      return `${configuredAIs.length} AIs ready`;
    } else {
      return `${configuredAIs.length} configured • Select up to ${maxAIs}`;
    }
  };
  
  const handleAddAI = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddAI();
  };
  
  // Calculate optimal grid layout based on number of AIs
  const getGridLayout = (aiCount: number) => {
    if (aiCount <= 4) return 2; // 2 columns for 1-4 AIs
    if (aiCount <= 6) return 2; // 2 columns for 5-6 AIs (3x2 grid)
    return 3; // 3 columns for 7+ AIs
  };
  
  const columns = getGridLayout(configuredAIs.length);
  const containerPadding = theme.spacing.lg * 2; // Left + right padding from parent
  const itemGap = theme.spacing.sm; // Better visual separation (8px)
  const cardWidth = (screenWidth - containerPadding - (itemGap * (columns - 1))) / columns;
  
  return (
    <Box>
      <SectionHeader
        title="Choose Your AIs"
        subtitle={getSubtitle()}
        icon="🤖"
        onAction={handleAddAI}
        actionLabel="+ Add AI"
      />
      
      
      {/* AI Grid Layout - Only AI cards, no Add button */}
      <View style={{ marginBottom: theme.spacing.lg, overflow: 'visible', zIndex: 1 }}>
        {/* Create rows dynamically */}
        {Array.from({ length: Math.ceil(configuredAIs.length / columns) }, (_, rowIndex) => (
          <View
            key={rowIndex}
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              marginBottom: theme.spacing.sm, // Better spacing between rows
              overflow: 'visible',
              zIndex: 999 - rowIndex,
            }}
          >
            {Array.from({ length: columns }, (_, colIndex) => {
              const itemIndex = rowIndex * columns + colIndex;
              
              // AI cards only
              if (itemIndex < configuredAIs.length) {
                const ai = configuredAIs[itemIndex];
                const isSelected = selectedAIs.some(s => s.id === ai.id);
                const isDisabled = !isSelected && selectedAIs.length >= maxAIs;
                
                return (
                  <View key={ai.id} style={{ 
                    width: cardWidth, 
                    marginRight: colIndex < columns - 1 ? itemGap : 0, 
                    overflow: 'visible', 
                    zIndex: 1,
                  }}>
                    <AICard
                      ai={{
                        ...ai,
                        model: selectedModels[ai.id] || ai.model,
                      }}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      onPress={onToggleAI}
                      index={itemIndex}
                      style={{ width: '100%' }}
                      personalityId={aiPersonalities[ai.id] || 'default'}
                      onPersonalityChange={isSelected && onPersonalityChange ? (personalityId) => onPersonalityChange(ai.id, personalityId) : undefined}
                      onModelChange={isSelected && onModelChange ? (modelId) => onModelChange(ai.id, modelId) : undefined}
                      isPremium={isPremium}
                    />
                  </View>
                );
              }
              
              // Empty space
              return <View key={`empty-${itemIndex}`} style={{ width: cardWidth, marginRight: colIndex < columns - 1 ? itemGap : 0 }} />;
            })}
          </View>
        ))}
      </View>
      
      {!hideStartButton && (
        configuredAIs.length > 0 ? (
          <GradientButton
            title={selectedAIs.length === 0 
              ? "Select AIs to start" 
              : `Start Chat with ${selectedAIs.length} AI${selectedAIs.length > 1 ? 's' : ''}`
            }
            onPress={onStartChat || (() => {})}
            disabled={selectedAIs.length === 0}
            gradient={theme.colors.gradients.ocean}
            fullWidth
            hapticType="medium"
          />
        ) : (
          <GradientButton
            title="Configure Your First AI"
            onPress={onAddAI}
            gradient={theme.colors.gradients.primary}
            fullWidth
            hapticType="medium"
          />
        )
      )}
    </Box>
  );
};