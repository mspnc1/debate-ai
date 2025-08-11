import React from 'react';
import { View as RNView, ViewProps as RNViewProps } from 'react-native';
import { useTheme } from '../../theme';

interface ViewProps extends RNViewProps {
  backgroundColor?: 'background' | 'surface' | 'card' | 'primary' | 'transparent';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  margin?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  shadow?: 'sm' | 'md' | 'lg';
}

export const View: React.FC<ViewProps> = ({
  style,
  backgroundColor = 'transparent',
  padding,
  margin,
  borderRadius,
  shadow,
  ...props
}) => {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    switch (backgroundColor) {
      case 'background':
        return theme.colors.background;
      case 'surface':
        return theme.colors.surface;
      case 'card':
        return theme.colors.card;
      case 'primary':
        return theme.colors.primary[500];
      case 'transparent':
      default:
        return 'transparent';
    }
  };

  const viewStyle = {
    backgroundColor: getBackgroundColor(),
    padding: padding ? theme.spacing[padding] : undefined,
    margin: margin ? theme.spacing[margin] : undefined,
    borderRadius: borderRadius ? theme.borderRadius[borderRadius] : undefined,
    ...(shadow ? theme.shadows[shadow] : {}),
  };

  return <RNView style={[viewStyle, style]} {...props} />;
};