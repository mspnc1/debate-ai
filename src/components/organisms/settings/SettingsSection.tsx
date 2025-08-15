import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  animationDelay?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  animationDelay = 0,
  style,
  testID,
}) => {
  const { theme } = useTheme();

  const containerStyle = [
    styles.container,
    style,
  ];

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).springify()}
      style={containerStyle}
      testID={testID}
    >
      {/* Section Header */}
      <Box style={styles.header}>
        <Typography
          variant="title"
          weight="semibold"
          style={{
            ...styles.title,
            color: theme.colors.text.primary
          }}
        >
          {title}
        </Typography>
        
        {description && (
          <Typography
            variant="body"
            color="secondary"
            style={styles.description}
          >
            {description}
          </Typography>
        )}
      </Box>

      {/* Section Content */}
      <Box 
        style={styles.content}
        testID={testID ? `${testID}-content` : undefined}
      >
        {children}
      </Box>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  title: {
    marginBottom: 4,
  },
  description: {
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 24,
  },
});