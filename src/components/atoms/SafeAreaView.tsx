import React from 'react';
import { SafeAreaView as RNSafeAreaView, ViewProps } from 'react-native';
import { useTheme } from '../../theme';

interface SafeAreaViewProps extends ViewProps {
  backgroundColor?: 'background' | 'surface' | 'card' | 'primary' | 'transparent';
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  style,
  backgroundColor = 'background',
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

  const safeAreaStyle = {
    flex: 1,
    backgroundColor: getBackgroundColor(),
  };

  return <RNSafeAreaView style={[safeAreaStyle, style]} {...props} />;
};