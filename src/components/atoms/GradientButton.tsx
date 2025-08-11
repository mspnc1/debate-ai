import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  gradient?: readonly [string, string];
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  hapticType?: string;
  style?: ViewStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  gradient,
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  hapticType: _hapticType,
  style,
}) => {
  const { theme } = useTheme();

  const gradientMap = {
    primary: theme.colors.gradients.primary,
    secondary: theme.colors.gradients.ocean,
    success: theme.colors.gradients.forest,
  };

  const sizeMap = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: 14,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      fontSize: 16,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      fontSize: 18,
    },
  };

  const buttonSize = sizeMap[size];
  const gradientColors = disabled 
    ? [theme.colors.gray[400], theme.colors.gray[400]] as const
    : gradient || gradientMap[variant];

  const buttonStyle: ViewStyle = {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    opacity: disabled ? 0.6 : 1,
    ...(fullWidth && { width: '100%' }),
  };

  const gradientStyle: ViewStyle = {
    paddingVertical: buttonSize.paddingVertical,
    paddingHorizontal: buttonSize.paddingHorizontal,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  };

  const textStyle: TextStyle = {
    fontSize: buttonSize.fontSize,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[buttonStyle, style]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={gradientStyle}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.text.inverse} />
        ) : (
          <Text style={textStyle}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};