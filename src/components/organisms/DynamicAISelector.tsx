import React from 'react';
import { View, TouchableOpacity, Text, Dimensions } from 'react-native';
import { ThemedView, ThemedText, GradientButton } from '../core';
import { SectionHeader } from '../atoms/SectionHeader';
import { AICard } from '../molecules/AICard';
import { AIConfig } from '../../types';
import { useTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface DynamicAISelectorProps {
  configuredAIs: AIConfig[];
  selectedAIs: AIConfig[];
  maxAIs: number;
  onToggleAI: (ai: AIConfig) => void;
  onStartChat: () => void;
  onAddAI: () => void;
  isPremium: boolean;
}

export const DynamicAISelector: React.FC<DynamicAISelectorProps> = ({
  configuredAIs,
  selectedAIs,
  maxAIs,
  onToggleAI,
  onStartChat,
  onAddAI,
  isPremium,
}) => {
  const { theme } = useTheme();
  
  const getSubtitle = () => {
    if (configuredAIs.length === 0) {
      return 'No AIs configured yet';
    } else if (configuredAIs.length === 1) {
      return '1 AI friend ready';
    } else if (isPremium) {
      return `${configuredAIs.length} AI friends ready`;
    } else {
      return `${configuredAIs.length} configured • Select up to ${maxAIs}`;
    }
  };
  
  const handleAddAI = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddAI();
  };
  
  // Calculate optimal grid layout based on total items
  const totalItems = configuredAIs.length + 1; // +1 for "Add AI" card
  const getGridLayout = (itemCount: number) => {
    if (itemCount <= 2) return 2; // 2 columns for 1-2 items
    if (itemCount <= 4) return 2; // 2 columns for 3-4 items  
    return 3; // 3 columns for 5+ items
  };
  
  const columns = getGridLayout(totalItems);
  const containerPadding = theme.spacing.lg * 2; // Left + right padding from parent
  const itemGap = theme.spacing.md;
  const cardWidth = (screenWidth - containerPadding - (itemGap * (columns - 1))) / columns;
  
  return (
    <ThemedView>
      <SectionHeader
        title="Your AI Friends"
        subtitle={getSubtitle()}
        icon="🤖"
      />
      
      
      {/* Proper Grid Layout */}
      <View style={{ marginBottom: theme.spacing.lg }}>
        {/* Create rows dynamically */}
        {Array.from({ length: Math.ceil(totalItems / columns) }, (_, rowIndex) => (
          <View
            key={rowIndex}
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              marginBottom: theme.spacing.md,
            }}
          >
            {Array.from({ length: columns }, (_, colIndex) => {
              const itemIndex = rowIndex * columns + colIndex;
              
              // Add AI Friend card (always last)
              if (itemIndex === configuredAIs.length) {
                return (
                  <View key="add-ai" style={{ width: cardWidth, marginRight: colIndex < columns - 1 ? itemGap : 0 }}>
                    <TouchableOpacity
                      onPress={handleAddAI}
                      style={{
                        height: 120,
                      }}
                    >
                      <LinearGradient
                        colors={[theme.colors.gray[200], theme.colors.gray[100]]}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: theme.borderRadius.lg,
                          borderWidth: 2,
                          borderColor: theme.colors.border,
                          borderStyle: 'dashed',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: theme.spacing.sm,
                        }}
                      >
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: theme.colors.background,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: theme.spacing.xs,
                        }}>
                          <Text style={{ fontSize: 24 }}>➕</Text>
                        </View>
                        <ThemedText 
                          variant="caption" 
                          weight="semibold"
                          style={{ 
                            textAlign: 'center',
                            marginTop: 4,
                          }}
                        >
                          Add AI{'\n'}Friend
                        </ThemedText>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                );
              }
              
              // AI cards
              if (itemIndex < configuredAIs.length) {
                const ai = configuredAIs[itemIndex];
                const isSelected = selectedAIs.some(s => s.id === ai.id);
                const isDisabled = !isSelected && selectedAIs.length >= maxAIs;
                
                return (
                  <View key={ai.id} style={{ width: cardWidth, marginRight: colIndex < columns - 1 ? itemGap : 0 }}>
                    <AICard
                      ai={ai}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      onPress={onToggleAI}
                      index={itemIndex}
                      style={{ width: '100%' }}
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
      
      {configuredAIs.length > 0 ? (
        <GradientButton
          title={selectedAIs.length === 0 
            ? "Select AIs to start" 
            : `Start Chat with ${selectedAIs.length} AI${selectedAIs.length > 1 ? 's' : ''}`
          }
          onPress={onStartChat}
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
      )}
    </ThemedView>
  );
};