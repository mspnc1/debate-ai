import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text } from '../atoms';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: string[];
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  gradient,
  style,
  children,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const gradientColors = (gradient || theme.colors.gradients.primary) as readonly [string, string, ...string[]];
  
  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        { paddingTop: insets.top + 16 },
        style,
      ]}
    >
      <View style={styles.content}>
        <Text
          size="2xl"
          weight="bold"
          color="inverse"
          align="center"
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            size="sm"
            color="inverse"
            align="center"
            style={{ marginTop: 4, opacity: 0.9 }}
          >
            {subtitle}
          </Text>
        )}
        {children}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  content: {
    alignItems: 'center',
  },
});