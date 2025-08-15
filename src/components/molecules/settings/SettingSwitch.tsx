import React from 'react';
import { Switch, StyleSheet, StyleProp, ViewStyle, Vibration } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../Typography';
import { SettingLabel, SettingIcon } from '../../atoms/settings';
import { useTheme } from '../../../theme';

export interface SettingSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: string;
  hapticFeedback?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export const SettingSwitch: React.FC<SettingSwitchProps> = ({
  label,
  description,
  value,
  onChange,
  disabled = false,
  loading = false,
  leftIcon,
  hapticFeedback = true,
  style,
  testID,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();

  const handleValueChange = (newValue: boolean) => {
    if (disabled || loading) return;

    // Provide haptic feedback
    if (hapticFeedback) {
      Vibration.vibrate(50);
    }

    onChange(newValue);
  };

  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      ...theme.shadows.sm,
    },
    (disabled || loading) && styles.disabled,
    style,
  ];

  return (
    <Box style={containerStyle}>
      <Box style={styles.content}>
        {leftIcon && (
          <Box style={styles.iconContainer}>
            <SettingIcon 
              name={leftIcon} 
              size={20}
              testID={testID ? `${testID}-icon` : undefined}
            />
          </Box>
        )}
        
        <Box style={styles.textContainer}>
          <SettingLabel 
            text={label}
          />
          {description && (
            <Typography 
              variant="caption" 
              color="secondary" 
              style={styles.description}
            >
              {description}
            </Typography>
          )}
        </Box>

        <Box style={styles.switchContainer}>
          <Switch
            value={value}
            onValueChange={handleValueChange}
            disabled={disabled || loading}
            trackColor={{
              false: theme.colors.gray[300],
              true: theme.colors.primary[500],
            }}
            thumbColor={value ? theme.colors.primary[600] : theme.colors.gray[100]}
            ios_backgroundColor={theme.colors.gray[300]}
            accessibilityLabel={accessibilityLabel || `${label} toggle`}
            accessibilityRole="switch"
            accessibilityState={{ 
              checked: value,
              disabled: disabled || loading,
            }}
            accessibilityHint={description}
            testID={testID ? `${testID}-switch` : undefined}
          />
        </Box>
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  description: {
    marginTop: 4,
  },
  switchContainer: {
    marginLeft: 12,
  },
});