import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle,
  withSequence,
  withSpring
} from 'react-native-reanimated';
import { GlassCard, ThemedView, AIAvatar, SelectionIndicator } from '../atoms';
import { PersonalityPicker } from './PersonalityPicker';
import { AIConfig } from '../../types';
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
              icon={ai.icon || ai.name.charAt(0)}
              iconType={ai.iconType || 'letter'}
              size="large"
              color={ai.color}
              isSelected={isSelected}
              style={{ flex: 1 }}
            />
            
            {/* Only show personality picker when selected */}
            {isSelected && onPersonalityChange && (
              <PersonalityPicker
                currentPersonalityId={personalityId}
                onSelectPersonality={onPersonalityChange}
                isPremium={isPremium}
                aiName={ai.name}
              />
            )}
          </ThemedView>
        </GlassCard>
      </Animated.View>
    </Animated.View>
  );
};