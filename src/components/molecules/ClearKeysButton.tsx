import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Alert } from 'react-native';
import { Box } from '../atoms';
import { Typography } from './Typography';
import { useTheme } from '../../theme';
import * as Haptics from 'expo-haptics';

interface ClearKeysButtonProps {
  onPress: () => Promise<void>;
  isVisible: boolean;
  title?: string;
  subtitle?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const ClearKeysButton: React.FC<ClearKeysButtonProps> = ({
  onPress,
  isVisible,
  title = 'Clear All Keys',
  subtitle = 'Remove all configured API keys',
  confirmTitle = 'Clear All API Keys',
  confirmMessage = 'This will remove all configured API keys. Are you sure?',
  icon = '🗑️',
  disabled = false,
  style,
  testID,
}) => {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      confirmTitle,
      confirmMessage,
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await onPress();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'All API keys have been cleared');
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                'Error', 
                error instanceof Error ? error.message : 'Failed to clear API keys'
              );
            }
          },
        },
      ],
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.error[50],
          borderColor: theme.colors.error[500],
        },
        disabled && styles.disabled,
        style,
      ]}
      testID={testID}
    >
      <Box style={styles.content}>
        {icon && (
          <Typography variant="body" style={styles.icon}>
            {icon}
          </Typography>
        )}
        
        <Box style={styles.textContainer}>
          <Typography 
            variant="body" 
            color="secondary" 
            weight="semibold"
          >
            {title}
          </Typography>
          
          {subtitle && (
            <Typography 
              variant="caption" 
              color="secondary"
              style={styles.subtitle}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  subtitle: {
    marginTop: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});