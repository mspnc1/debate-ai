import React from 'react';
import { TextInput, TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import type { SpacingKey } from '../../theme/spacing';

interface ThemedTextInputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  style?: ViewStyle | TextStyle;
  variant?: 'default' | 'filled' | 'outline';
  padding?: SpacingKey;
  margin?: SpacingKey;
  borderRadius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  multilineStyle?: ViewStyle;
}

export const ThemedTextInput: React.FC<ThemedTextInputProps> = ({
  style,
  variant = 'default',
  padding = 'md',
  margin,
  borderRadius = 'md',
  multiline,
  multilineStyle,
  ...props
}) => {
  const { theme, isDark } = useTheme();
  
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: isDark ? theme.colors.gray[900] : theme.colors.gray[100],
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: isDark ? theme.colors.gray[600] : theme.colors.gray[300],
        };
      case 'default':
      default:
        return {
          backgroundColor: isDark ? theme.colors.gray[800] : theme.colors.gray[50],
          borderWidth: 1,
          borderColor: isDark ? theme.colors.gray[700] : theme.colors.gray[200],
        };
    }
  };
  
  const inputStyle: TextStyle & ViewStyle = {
    ...getVariantStyles(),
    color: theme.colors.text.primary,
    fontSize: theme.typography.sizes.base,
    padding: theme.spacing[padding],
    borderRadius: theme.borderRadius[borderRadius],
    ...(margin && { margin: theme.spacing[margin] }),
    ...(multiline && {
      minHeight: 100,
      maxHeight: 200,
      textAlignVertical: 'top' as const,
      ...multilineStyle,
    }),
  };
  
  return (
    <TextInput
      style={[inputStyle, style]}
      placeholderTextColor={theme.colors.text.secondary}
      multiline={multiline}
      {...props}
    />
  );
};