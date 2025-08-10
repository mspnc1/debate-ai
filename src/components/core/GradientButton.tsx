import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { ThemedText } from './ThemedText';
import { AnimatedPressable } from './AnimatedPressable';

// Removed AnimatedLinearGradient - no longer needed

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  gradient?: readonly string[];
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy';
  size?: 'small' | 'medium' | 'large';
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  gradient,
  style,
  textStyle,
  disabled = false,
  hapticType = 'medium',
  size = 'medium',
  borderRadius = 'md',
  fullWidth = false,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  
  const defaultGradient: [string, string] = gradient ? [gradient[0], gradient[1]] : [theme.colors.gradients.primary[0], theme.colors.gradients.primary[1]];
  const disabledGradient: [string, string] = [theme.colors.gray[300], theme.colors.gray[400]];
  
  const sizeConfig = {
    small: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.sizes.sm,
    },
    medium: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      fontSize: theme.typography.sizes.base,
    },
    large: {
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      fontSize: theme.typography.sizes.lg,
    },
  };
  
  const config = sizeConfig[size];
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePress = () => {
    if (disabled) return;
    
    // Trigger haptic feedback
    const hapticMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    
    Haptics.impactAsync(hapticMap[hapticType]);
    
    // Animate button
    scale.value = withSequence(
      withSpring(0.95, { damping: 10, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    
    onPress();
  };
  
  const gradientStyle: ViewStyle = {
    paddingVertical: config.paddingVertical,
    paddingHorizontal: config.paddingHorizontal,
    borderRadius: theme.borderRadius[borderRadius],
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
    width: fullWidth ? '100%' : undefined,
  };
  
  const buttonTextStyle: TextStyle = {
    color: disabled ? theme.colors.text.disabled : '#FFFFFF',
    fontSize: config.fontSize,
    fontWeight: theme.typography.weights.semibold,
  };
  
  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={disabled}
      animationType="opacity"
      style={style}
    >
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={disabled ? disabledGradient : defaultGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={gradientStyle}
        >
          <ThemedText 
            style={[buttonTextStyle, textStyle]}
            numberOfLines={1}
          >
            {title}
          </ThemedText>
        </LinearGradient>
      </Animated.View>
    </AnimatedPressable>
  );
};