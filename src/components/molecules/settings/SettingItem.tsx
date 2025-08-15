import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../Typography';
import { SettingLabel, SettingValue, SettingIcon } from '../../atoms/settings';
import { useTheme } from '../../../theme';

export interface SettingItemProps {
  label: string;
  description?: string;
  value?: string | boolean;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  leftIcon?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  label,
  description,
  value,
  onPress,
  rightElement,
  leftIcon,
  disabled = false,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useTheme();

  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      ...theme.shadows.sm,
    },
    disabled && styles.disabled,
    style,
  ];

  const content = (
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

        <Box style={styles.rightContainer}>
          {value !== undefined && typeof value === 'string' && (
            <SettingValue 
              value={value}
              testID={testID ? `${testID}-value` : undefined}
            />
          )}
          {rightElement}
        </Box>
      </Box>
    </Box>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <Box
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="text"
      testID={testID}
    >
      {content}
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
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
});