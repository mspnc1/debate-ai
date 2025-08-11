import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle,
  withSequence,
  withSpring
} from 'react-native-reanimated';
import { GlassCard, ThemedText, ThemedView } from '../core';
import { AIAvatar } from '../atoms/AIAvatar';
import { SelectionIndicator } from '../atoms/SelectionIndicator';
import { PersonalityPicker } from './PersonalityPicker';
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
  personalityId?: string;
  onPersonalityChange?: (personalityId: string) => void;
  isPremium?: boolean;
}

export const AICard: React.FC<AICardProps> = ({
  ai,
  isSelected,
  isDisabled,
  onPress,
  index,
  style,
  personalityId = 'default',
  onPersonalityChange,
  isPremium = false,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }]
  }));
  
  const handlePress = () => {
    if (!isDisabled) {
      // Selection bounce feedback
      scaleAnim.value = withSequence(
        withSpring(0.95, { duration: 100 }),
        withSpring(1, { duration: 200 })
      );
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(ai);
    }
  };
  
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 50).springify()}
      style={[{ flex: 1 }, style]}
      accessible={true}
      accessibilityRole="checkbox"
      accessibilityState={{ 
        checked: isSelected,
        disabled: isDisabled 
      }}
      accessibilityLabel={`${ai.name}, ${ai.personality}`}
      accessibilityHint={
        isSelected 
          ? "Double tap to deselect this AI"
          : isDisabled 
            ? "Maximum AIs selected" 
            : "Double tap to select this AI"
      }
    >
      <Animated.View style={animatedStyle}>
        <GlassCard
          onPress={handlePress}
          disabled={isDisabled}
          style={{
            opacity: isDisabled ? 0.5 : 1,
            borderColor: isSelected ? ai.color : 'transparent',
            borderWidth: isSelected ? 2 : 0,
            overflow: 'visible',
          }}
          padding="sm"
        >
          <ThemedView alignItems="center" style={{ position: 'relative', overflow: 'visible' }}>
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
            
            {/* Show personality picker when selected */}
            {isSelected && onPersonalityChange && (
              <PersonalityPicker
                currentPersonalityId={personalityId}
                onSelectPersonality={onPersonalityChange}
                isPremium={isPremium}
                aiName={ai.name}
              />
            )}
            
            {/* Show personality text when not selected */}
            {!isSelected && (
              <ThemedText 
                variant="caption" 
                color="secondary"
                numberOfLines={1}
              >
                {ai.personality}
              </ThemedText>
            )}
          </ThemedView>
        </GlassCard>
      </Animated.View>
    </Animated.View>
  );
};