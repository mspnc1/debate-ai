import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import { ThemedText } from './ThemedText';
import type { SpacingKey } from '../../theme/spacing';

interface ThemedButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  style?: ViewStyle;
  title?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  padding?: SpacingKey;
  margin?: SpacingKey;
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  textStyle?: TextStyle;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  style,
  title,
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  padding,
  margin,
  borderRadius = 'md',
  textStyle,
  disabled,
  ...props
}) => {
  const { theme, isDark } = useTheme();
  
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? theme.colors.gray[400] : theme.colors.primary[500],
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: isDark ? theme.colors.gray[800] : theme.colors.gray[100],
          borderWidth: 1,
          borderColor: isDark ? theme.colors.gray[600] : theme.colors.gray[300],
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDark ? theme.colors.gray[600] : theme.colors.gray[300],
        };
      case 'danger':
        return {
          backgroundColor: disabled ? theme.colors.gray[400] : theme.colors.error[500],
          borderWidth: 0,
        };
      default:
        return {};
    }
  };
  
  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          minHeight: 32,
        };
      case 'large':
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          minHeight: 52,
        };
      case 'medium':
      default:
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          minHeight: 44,
        };
    }
  };
  
  const getTextColor = (): string => {
    if (disabled) return theme.colors.text.disabled;
    
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
      case 'ghost':
        return theme.colors.text.primary;
      default:
        return theme.colors.text.primary;
    }
  };
  
  const buttonStyle: ViewStyle = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    borderRadius: theme.borderRadius[borderRadius],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...(fullWidth && { width: '100%' }),
    ...(padding && { padding: theme.spacing[padding] }),
    ...(margin && { margin: theme.spacing[margin] }),
    opacity: disabled ? 0.6 : 1,
  };
  
  const textProps = {
    color: 'primary' as const,
    variant: 'button' as const,
    style: [{ color: getTextColor() }, textStyle],
  };
  
  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {title ? (
        <ThemedText {...textProps}>{title}</ThemedText>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};