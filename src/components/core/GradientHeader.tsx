import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './ThemedText';
import { useTheme } from '../../theme';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: readonly [string, string];
  style?: ViewStyle;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  gradient,
  style,
}) => {
  const { theme } = useTheme();
  
  const colors = gradient || theme.colors.gradients.ocean;
  
  return (
    <LinearGradient
      colors={[colors[0], colors[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.xl,
          paddingBottom: theme.spacing.lg,
          borderBottomLeftRadius: theme.borderRadius.xl,
          borderBottomRightRadius: theme.borderRadius.xl,
        },
        style,
      ]}
    >
      <View>
        <ThemedText 
          variant="heading" 
          style={{ 
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: 'bold',
            marginBottom: theme.spacing.xs,
          }}
        >
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText 
            variant="subtitle" 
            style={{ 
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 16,
            }}
          >
            {subtitle}
          </ThemedText>
        )}
      </View>
    </LinearGradient>
  );
};