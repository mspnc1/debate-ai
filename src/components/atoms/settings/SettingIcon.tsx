import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../Box';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';

export interface SettingIconProps {
  name: string;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  testID?: string;
}

export const SettingIcon: React.FC<SettingIconProps> = ({
  name,
  size = 24,
  color,
  accessibilityLabel,
  testID,
}) => {
  const { theme } = useTheme();

  const iconColor = color || theme.colors.text.secondary;

  // For now, we'll use text as icon placeholder
  // In a real app, you'd use an icon library like react-native-vector-icons
  const getIconSymbol = (iconName: string): string => {
    const iconMap: Record<string, string> = {
      'theme': '🎨',
      'api': '🔑',
      'subscription': '💎',
      'about': 'ℹ️',
      'logout': '🚪',
      'settings': '⚙️',
      'appearance': '🌓',
      'darkmode': '🌙',
      'lightmode': '☀️',
      'notifications': '🔔',
      'privacy': '🔒',
      'accessibility': '♿',
      'help': '❓',
      'support': '💬',
      'feedback': '📝',
      'share': '📤',
      'rate': '⭐',
      'version': '📱',
    };

    return iconMap[iconName.toLowerCase()] || '⚙️';
  };

  return (
    <Box
      style={[
        styles.container,
        {
          width: size,
          height: size,
        }
      ]}
      accessibilityLabel={accessibilityLabel || `${name} icon`}
      accessibilityRole="image"
      testID={testID}
    >
      <Typography
        variant="body"
        style={{
          ...styles.icon,
          fontSize: size * 0.75,
          color: iconColor,
        }}
      >
        {getIconSymbol(name)}
      </Typography>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    textAlign: 'center',
  },
});