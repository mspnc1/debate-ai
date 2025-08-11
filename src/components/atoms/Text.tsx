import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../theme';

interface TextProps extends RNTextProps {
  color?: 'primary' | 'secondary' | 'disabled' | 'inverse';
  size?: 'xs' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
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

  const textColor = theme.colors.text[color];
  const fontSize = theme.typography.sizes[size];
  const fontWeight = theme.typography.weights[weight];

  const textStyle = {
    color: textColor,
    fontSize,
    fontWeight,
    textAlign: align,
  };

  return <RNText style={[textStyle, style]} {...props} />;
};