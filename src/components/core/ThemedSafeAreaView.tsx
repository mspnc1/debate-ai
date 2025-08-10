import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ViewStyle } from 'react-native';
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
  
  return (
    <SafeAreaView 
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background,
        },
        style,
      ]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
};