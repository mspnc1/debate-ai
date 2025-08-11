import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useTheme } from '../../theme';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  style,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  ...props
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    const opacity = disabled ? 0.5 : 1;
    
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary[500],
          opacity,
        };
      case 'secondary':
        return {
          backgroundColor: theme.colors.gray[200],
          opacity,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary[500],
          opacity,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          opacity,
        };
      default:
        return {
          backgroundColor: theme.colors.primary[500],
          opacity,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.borderRadius.sm,
        };
      case 'md':
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
        };
      case 'lg':
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderRadius: theme.borderRadius.lg,
        };
      default:
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
        };
    }
  };

  const buttonStyle = {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...(fullWidth && { width: '100%' as const }),
    ...getVariantStyles(),
    ...getSizeStyles(),
  };

  return (
    <TouchableOpacity 
      style={[buttonStyle, style]} 
      disabled={disabled}
      {...props} 
    />
  );
};