import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../../theme';
import { getFontFamily, FontSize, FontWeight } from '../../theme/typography';

interface ThemedTextProps extends Omit<TextProps, 'style'> {
  style?: TextProps['style'];
  variant?: 'heading' | 'title' | 'subtitle' | 'body' | 'caption' | 'button';
  color?: 'primary' | 'secondary' | 'disabled' | 'inverse' | 'success' | 'warning' | 'error' | 'brand';
  size?: FontSize;
  weight?: FontWeight;
  align?: 'left' | 'center' | 'right' | 'justify';
  numberOfLines?: number;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  style,
  variant = 'body',
  color = 'primary',
  size,
  weight,
  align,
  numberOfLines,
  ...props
}) => {
  const { theme } = useTheme();
  
  // Default styles for each variant
  const variantStyles = {
    heading: {
      fontSize: theme.typography.sizes['4xl'],
      fontWeight: theme.typography.weights.bold,
      lineHeight: theme.typography.sizes['4xl'] * theme.typography.lineHeights.tight,
    },
    title: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.semibold,
      lineHeight: theme.typography.sizes['2xl'] * theme.typography.lineHeights.snug,
    },
    subtitle: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.medium,
      lineHeight: theme.typography.sizes.lg * theme.typography.lineHeights.normal,
    },
    body: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.regular,
      lineHeight: theme.typography.sizes.base * theme.typography.lineHeights.normal,
    },
    caption: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.regular,
      lineHeight: theme.typography.sizes.sm * theme.typography.lineHeights.normal,
    },
    button: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: theme.typography.sizes.base * theme.typography.lineHeights.snug,
    },
  };
  
  // Get color value
  const getColorValue = () => {
    switch (color) {
      case 'primary':
        return theme.colors.text.primary;
      case 'secondary':
        return theme.colors.text.secondary;
      case 'disabled':
        return theme.colors.text.disabled;
      case 'inverse':
        return theme.colors.text.inverse;
      case 'success':
        return theme.colors.success[500];
      case 'warning':
        return theme.colors.warning[500];
      case 'error':
        return theme.colors.error[500];
      case 'brand':
        return theme.colors.primary[500];
      default:
        return theme.colors.text.primary;
    }
  };
  
  const defaultStyle = variantStyles[variant];
  const fontWeight = weight || (defaultStyle.fontWeight as FontWeight);
  
  const themedStyle = {
    ...defaultStyle,
    color: getColorValue(),
    fontSize: size ? theme.typography.sizes[size] : defaultStyle.fontSize,
    fontWeight,
    fontFamily: getFontFamily(fontWeight),
    textAlign: align,
  };
  
  return (
    <Text 
      style={[themedStyle, style]} 
      numberOfLines={numberOfLines}
      {...props} 
    />
  );
};