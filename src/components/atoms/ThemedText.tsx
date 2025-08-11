import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

interface ThemedTextProps extends TextProps {
  variant?: 'default' | 'title' | 'subtitle' | 'caption' | 'button' | 'body' | 'heading';
  color?: 'primary' | 'secondary' | 'inverse' | 'error' | 'success' | 'disabled' | 'brand' | 'warning';
  align?: 'left' | 'center' | 'right';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  children?: React.ReactNode;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'default',
  color = 'primary',
  align = 'left',
  weight = 'normal',
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const variantStyles: Record<string, TextStyle> = {
    default: {
      fontSize: 16,
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
    },
    heading: {
      fontSize: 28,
      lineHeight: 36,
      fontWeight: 'bold',
    },
    title: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: 'bold',
    },
    subtitle: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '500',
    },
    caption: {
      fontSize: 14,
      lineHeight: 20,
    },
    button: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
    },
  };

  const colorMap = {
    primary: theme.colors.text.primary,
    secondary: theme.colors.text.secondary,
    inverse: theme.colors.text.inverse,
    disabled: theme.colors.text.disabled,
    brand: theme.colors.brand,
    warning: theme.colors.warning[500],
    error: theme.colors.error[500],
    success: theme.colors.success[500],
  };

  const weightMap = {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  };

  const textStyle: TextStyle = {
    ...variantStyles[variant],
    color: colorMap[color],
    textAlign: align,
    fontWeight: weightMap[weight],
  };

  return (
    <Text style={[textStyle, style]} {...props}>
      {children}
    </Text>
  );
};