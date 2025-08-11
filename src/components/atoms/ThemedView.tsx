import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface ThemedViewProps extends ViewProps {
  variant?: 'default' | 'card' | 'surface';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  direction?: 'row' | 'column';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  flex?: number;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export const ThemedView: React.FC<ThemedViewProps> = ({
  variant = 'default',
  padding = 'none',
  gap = 'none',
  direction = 'column',
  alignItems,
  justifyContent,
  flex,
  backgroundColor,
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const paddingMap = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
    xl: theme.spacing.xl,
  };

  const gapMap = {
    none: 0,
    xs: theme.spacing.xs,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
    xl: theme.spacing.xl,
  };

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: 'transparent',
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
    },
    surface: {
      backgroundColor: theme.colors.surface,
    },
  };

  const viewStyle: ViewStyle = {
    ...variantStyles[variant],
    padding: paddingMap[padding],
    gap: gapMap[gap],
    flexDirection: direction,
    alignItems,
    justifyContent,
    ...(flex !== undefined && { flex }),
    ...(backgroundColor && { backgroundColor }),
  };

  return (
    <View style={[viewStyle, style]} {...props}>
      {children}
    </View>
  );
};