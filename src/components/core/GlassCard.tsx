import React from 'react';
import { View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme';
import { AnimatedPressable } from './AnimatedPressable';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  onPress?: () => void;
  disabled?: boolean;
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 20,
  onPress,
  disabled = false,
  borderRadius = 'lg',
  padding = 'md',
}) => {
  const { theme, isDark } = useTheme();
  
  const containerStyle: ViewStyle = {
    borderRadius: theme.borderRadius[borderRadius],
    overflow: 'hidden',
    ...style,
  };
  
  const contentStyle: ViewStyle = {
    padding: theme.spacing[padding],
    borderRadius: theme.borderRadius[borderRadius],
  };
  
  // Neumorphic style for light theme
  if (!isDark) {
    const neumorphicStyle: ViewStyle = {
      ...contentStyle,
      backgroundColor: theme.colors.card,
      // Android-friendly shadows
      ...(Platform.OS === 'ios' ? {
        shadowColor: theme.colors.neumorph.shadow1,
        shadowOffset: { width: -6, height: -6 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
      } : {
        elevation: 4,
      }),
      // Inner shadow effect (approximated)
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.8)',
    };
    
    if (onPress) {
      return (
        <AnimatedPressable
          onPress={onPress}
          disabled={disabled}
          hapticFeedback
          hapticType="light"
          style={containerStyle}
        >
          <View style={neumorphicStyle}>
            {children}
          </View>
        </AnimatedPressable>
      );
    }
    
    return (
      <View style={containerStyle}>
        <View style={neumorphicStyle}>
          {children}
        </View>
      </View>
    );
  }
  
  // Glass morphism style for dark theme
  const glassStyle: ViewStyle = {
    ...contentStyle,
    backgroundColor: theme.colors.glass.background,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  };
  
  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled}
        hapticFeedback
        hapticType="light"
        style={containerStyle}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={intensity} tint="dark" style={{ flex: 1 }}>
            <View style={glassStyle}>
              {children}
            </View>
          </BlurView>
        ) : (
          <View style={glassStyle}>
            {children}
          </View>
        )}
      </AnimatedPressable>
    );
  }
  
  return (
    <View style={containerStyle}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={intensity} tint="dark" style={{ flex: 1 }}>
          <View style={glassStyle}>
            {children}
          </View>
        </BlurView>
      ) : (
        <View style={glassStyle}>
          {children}
        </View>
      )}
    </View>
  );
};