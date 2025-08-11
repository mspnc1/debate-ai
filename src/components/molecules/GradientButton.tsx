import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../atoms';
import { useTheme } from '../../theme';

interface GradientButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  gradient?: string[];
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  gradient,
  size = 'medium',
  fullWidth = false,
  disabled = false,
  onPress,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  
  const gradientColors = (gradient || theme.colors.gradients.primary) as readonly [string, string, ...string[]];
  
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8,
        };
      case 'large':
        return {
          paddingHorizontal: 32,
          paddingVertical: 16,
          borderRadius: 16,
        };
      case 'medium':
      default:
        return {
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        };
    }
  };
  
  const sizeStyles = getSizeStyles();
  const textSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'base';
  
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          sizeStyles,
        ]}
      >
        <Text
          size={textSize}
          weight="semibold"
          color="inverse"
          align="center"
        >
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});