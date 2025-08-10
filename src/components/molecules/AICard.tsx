import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCard, ThemedText, ThemedView } from '../core';
import { AIAvatar } from '../atoms/AIAvatar';
import { SelectionIndicator } from '../atoms/SelectionIndicator';
import { AIConfig } from '../../types';
import { useTheme } from '../../theme';
import * as Haptics from 'expo-haptics';

interface AICardProps {
  ai: AIConfig;
  isSelected: boolean;
  isDisabled: boolean;
  onPress: (ai: AIConfig) => void;
  index: number;
  style?: ViewStyle;
}

export const AICard: React.FC<AICardProps> = ({
  ai,
  isSelected,
  isDisabled,
  onPress,
  index,
  style,
}) => {
  const { theme } = useTheme();
  
  const handlePress = () => {
    if (!isDisabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(ai);
    }
  };
  
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 50).springify()}
      style={[{ flex: 1 }, style]}
    >
      <GlassCard
        onPress={handlePress}
        disabled={isDisabled}
        style={{
          opacity: isDisabled ? 0.5 : 1,
          borderColor: isSelected ? ai.color : 'transparent',
          borderWidth: isSelected ? 2 : 0,
        }}
        padding="sm"
      >
        <ThemedView alignItems="center" style={{ position: 'relative' }}>
          <SelectionIndicator isSelected={isSelected} color={ai.color} />
          
          <AIAvatar
            emoji={ai.avatar || '🤖'}
            size="medium"
            color={ai.color}
            isSelected={isSelected}
            style={{ marginBottom: theme.spacing.xs }}
          />
          
          <ThemedText 
            variant="subtitle" 
            weight="semibold"
            numberOfLines={1}
          >
            {ai.name}
          </ThemedText>
          
          <ThemedText 
            variant="caption" 
            color="secondary"
            numberOfLines={1}
          >
            {ai.personality}
          </ThemedText>
        </ThemedView>
      </GlassCard>
    </Animated.View>
  );
};