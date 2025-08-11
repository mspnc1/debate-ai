import React from 'react';
import { TouchableOpacity, Text, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';

interface ThemedButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress: () => void;
  variant?: 'filled' | 'outlined' | 'ghost' | 'primary' | 'secondary';
  color?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  children,
  onPress,
  variant = 'filled',
  color = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}) => {
  const { theme } = useTheme();

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

  const colorMap: Record<string, string> = {
    primary: theme.colors.primary[500],
    secondary: theme.colors.secondary,
    danger: theme.colors.error[500],
  };

  const buttonSize = sizeMap[size];
  const buttonColor = disabled ? theme.colors.disabled : colorMap[color];

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      paddingVertical: buttonSize.paddingVertical,
      paddingHorizontal: buttonSize.paddingHorizontal,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.6 : 1,
    };

    switch (variant) {
      case 'filled':
      case 'primary':
        return {
          ...base,
          backgroundColor: buttonColor,
        };
      case 'outlined':
      case 'secondary':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: buttonColor,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
        };
      default:
        return base;
    }
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontSize: buttonSize.fontSize,
      fontWeight: '600',
    };

    switch (variant) {
      case 'filled':
      case 'primary':
        return {
          ...base,
          color: theme.colors.text.inverse,
        };
      case 'outlined':
      case 'secondary':
      case 'ghost':
        return {
          ...base,
          color: buttonColor,
        };
      default:
        return base;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={(variant === 'filled' || variant === 'primary') ? theme.colors.text.inverse : buttonColor} 
        />
      ) : children ? (
        children
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};