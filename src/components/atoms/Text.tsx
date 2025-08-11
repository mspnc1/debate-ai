import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme, getFontFamily } from '../../theme';

interface TextProps extends RNTextProps {
  color?: 'primary' | 'secondary' | 'disabled' | 'inverse';
  size?: 'xs' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';
  align?: 'left' | 'center' | 'right';
}

export const Text: React.FC<TextProps> = ({
  style,
  color = 'primary',
  size = 'base',
  weight = 'regular',
  align,
  ...props
}) => {
  const { theme } = useTheme();

  const textColor = color === 'primary' ? theme.colors.text.primary 
    : color === 'secondary' ? theme.colors.text.secondary
    : color === 'disabled' ? theme.colors.text.disabled
    : theme.colors.text.inverse;
  const fontSize = theme.typography.sizes[size];
  const fontFamily = getFontFamily(weight);
  const fontWeight = theme.typography.weights[weight];

  const textStyle = {
    color: textColor,
    fontSize,
    fontFamily,
    fontWeight,
    textAlign: align,
  };

  return <RNText style={[textStyle, style]} {...props} />;
};