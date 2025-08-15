import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../Typography';
import { SettingIcon } from '../../atoms/settings';
import { useTheme } from '../../../theme';

export interface SettingButtonProps {
  label: string;
  description?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'brand';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const SettingButton: React.FC<SettingButtonProps> = ({
  label,
  description,
  variant = 'secondary',
  onPress,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useTheme();

  const getButtonColors = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.colors.primary[500],
          textColor: '#FFFFFF',
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.error[500],
          textColor: '#FFFFFF',
        };
      case 'brand':
        return {
          backgroundColor: theme.colors.brand,
          textColor: '#FFFFFF',
        };
      case 'secondary':
      default:
        return {
          backgroundColor: theme.colors.gray[100],
          textColor: theme.colors.brand,
        };
    }
  };

  const colors = getButtonColors();
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.backgroundColor,
      borderRadius: 12,
    },
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={containerStyle}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint || description}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
    >
      <Box style={styles.content}>
        {leftIcon && (
          <Box style={styles.leftIconContainer}>
            <SettingIcon 
              name={leftIcon} 
              size={18}
              color={colors.textColor}
              testID={testID ? `${testID}-left-icon` : undefined}
            />
          </Box>
        )}

        <Box style={styles.textContainer}>
          <Typography
            variant="subtitle"
            weight="semibold"
            style={{
              ...styles.label,
              color: colors.textColor
            }}
          >
            {label}
          </Typography>
          
          {description && (
            <Typography
              variant="caption"
              style={{
                ...styles.description,
                color: colors.textColor, 
                opacity: 0.8
              }}
            >
              {description}
            </Typography>
          )}
        </Box>

        {loading && (
          <Box style={styles.loadingContainer}>
            <ActivityIndicator 
              size="small" 
              color={colors.textColor}
              testID={testID ? `${testID}-loading` : undefined}
            />
          </Box>
        )}

        {rightIcon && !loading && (
          <Box style={styles.rightIconContainer}>
            <SettingIcon 
              name={rightIcon} 
              size={18}
              color={colors.textColor}
              testID={testID ? `${testID}-right-icon` : undefined}
            />
          </Box>
        )}
      </Box>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconContainer: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginTop: 2,
  },
  loadingContainer: {
    marginLeft: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
  },
});