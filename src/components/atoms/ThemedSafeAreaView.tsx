import React from 'react';
import { ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

interface ThemedSafeAreaViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
}

export const ThemedSafeAreaView: React.FC<ThemedSafeAreaViewProps> = ({
  children,
  style,
  edges = ['top', 'bottom'],
}) => {
  const { theme } = useTheme();

  const safeAreaStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
  };

  return (
    <SafeAreaView style={[safeAreaStyle, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
};