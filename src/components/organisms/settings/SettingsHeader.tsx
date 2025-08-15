import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Box } from '../../atoms';
import { Typography, IconButton } from '../../molecules';
import { useTheme } from '../../../theme';

export interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  animationDelay?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightElement,
  animationDelay = 0,
  style,
  testID,
}) => {
  const { theme } = useTheme();

  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.colors.background,
    },
    style,
  ];

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).springify()}
      style={containerStyle}
      testID={testID}
    >
      <Box style={styles.content}>
        {/* Left Section */}
        <Box style={styles.leftSection}>
          {showBack && onBack && (
            <IconButton
              icon="arrow-left"
              onPress={onBack}
            />
          )}
        </Box>

        {/* Center Section */}
        <Box style={styles.centerSection}>
          <Typography
            variant="heading"
            weight="bold"
            style={styles.title}
          >
            {title}
          </Typography>
          
          {subtitle && (
            <Typography
              variant="body"
              color="secondary"
              style={styles.subtitle}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Right Section */}
        <Box style={styles.rightSection}>
          {rightElement}
        </Box>
      </Box>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    minWidth: 40,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 4,
  },
});