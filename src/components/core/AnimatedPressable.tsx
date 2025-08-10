import React from 'react';
import { Pressable, PressableProps, GestureResponderEvent, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  scaleOnPress?: number;
  hapticFeedback?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection';
  springConfig?: {
    damping: number;
    stiffness: number;
    mass?: number;
  };
  animationType?: 'scale' | 'opacity' | 'both';
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onPressIn,
  onPressOut,
  disabled = false,
  scaleOnPress = 0.96,
  hapticFeedback = false,
  hapticType = 'light',
  springConfig = { damping: 15, stiffness: 150 },
  animationType = 'scale',
  style,
  ...props
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => {
    const styles: { transform?: Array<{ scale: number }>; opacity?: number } = {};
    
    if (animationType === 'scale' || animationType === 'both') {
      styles.transform = [{ scale: scale.value }];
    }
    
    if (animationType === 'opacity' || animationType === 'both') {
      styles.opacity = opacity.value;
    }
    
    return styles;
  });
  
  const handlePressIn = (event: GestureResponderEvent) => {
    if (animationType === 'scale' || animationType === 'both') {
      scale.value = withSpring(scaleOnPress, springConfig);
    }
    
    if (animationType === 'opacity' || animationType === 'both') {
      opacity.value = withTiming(0.7, { duration: 100 });
    }
    
    onPressIn?.(event);
  };
  
  const handlePressOut = (event: GestureResponderEvent) => {
    if (animationType === 'scale' || animationType === 'both') {
      scale.value = withSpring(1, springConfig);
    }
    
    if (animationType === 'opacity' || animationType === 'both') {
      opacity.value = withTiming(1, { duration: 100 });
    }
    
    onPressOut?.(event);
  };
  
  const handlePress = (event: GestureResponderEvent) => {
    if (disabled) return;
    
    // Trigger haptic feedback
    if (hapticFeedback) {
      const hapticMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
        selection: 'selection' as const,
      };
      
      if (hapticType === 'selection') {
        Haptics.selectionAsync();
      } else {
        Haptics.impactAsync(hapticMap[hapticType] as Haptics.ImpactFeedbackStyle);
      }
    }
    
    onPress?.(event);
  };
  
  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        {...props}
        style={undefined}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};