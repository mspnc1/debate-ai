import React from 'react';
import { TextInput, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

interface ThemedTextInputProps extends TextInputProps {
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
}

export const ThemedTextInput: React.FC<ThemedTextInputProps> = ({
  variant = 'outlined',
  size = 'medium',
  style,
  ...props
}) => {
  const { theme, isDark } = useTheme();

  const sizeMap = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      fontSize: 18,
    },
  };

  const getVariantStyles = (): ViewStyle & TextStyle => {
    const base: ViewStyle & TextStyle = {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
    };

    switch (variant) {
      case 'filled':
        return {
          ...base,
          backgroundColor: isDark ? theme.colors.gray[900] : theme.colors.gray[100],
          borderWidth: 0,
        };
      case 'outlined':
        return {
          ...base,
          backgroundColor: theme.colors.background,
          borderWidth: 1,
          borderColor: isDark ? theme.colors.gray[700] : theme.colors.gray[300],
        };
      case 'default':
      default:
        return {
          ...base,
          backgroundColor: 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          borderRadius: 0,
        };
    }
  };

  const inputSize = sizeMap[size];
  const variantStyle = getVariantStyles();

  const inputStyle: TextStyle & ViewStyle = {
    ...variantStyle,
    ...inputSize,
    color: theme.colors.text.primary,
  };

  return (
    <TextInput
      style={[inputStyle, style]}
      placeholderTextColor={theme.colors.text.secondary}
      {...props}
    />
  );
};