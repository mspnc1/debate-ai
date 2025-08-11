import React from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps } from 'react-native';
import { useTheme } from '../../theme';

interface TextInputProps extends RNTextInputProps {
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  style,
  variant = 'outlined',
  size = 'md',
  error = false,
  editable = true,
  ...props
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    const borderColor = error 
      ? theme.colors.error[500] 
      : theme.colors.border;
    
    const backgroundColor = variant === 'filled' 
      ? theme.colors.surface 
      : 'transparent';
    
    const borderWidth = variant === 'outlined' ? 1 : 0;
    
    return {
      backgroundColor,
      borderWidth,
      borderColor,
      opacity: editable ? 1 : 0.6,
    };
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          fontSize: theme.typography.sizes.sm,
          borderRadius: theme.borderRadius.sm,
        };
      case 'md':
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          fontSize: theme.typography.sizes.base,
          borderRadius: theme.borderRadius.md,
        };
      case 'lg':
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          fontSize: theme.typography.sizes.lg,
          borderRadius: theme.borderRadius.lg,
        };
      default:
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          fontSize: theme.typography.sizes.base,
          borderRadius: theme.borderRadius.md,
        };
    }
  };

  const textInputStyle = {
    color: theme.colors.text.primary,
    ...getVariantStyles(),
    ...getSizeStyles(),
  };

  return (
    <RNTextInput
      style={[textInputStyle, style]}
      placeholderTextColor={theme.colors.text.secondary}
      editable={editable}
      {...props}
    />
  );
};