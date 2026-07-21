/**
 * ConfigRow
 *
 * Full-width tappable value row used by config sheets: primary value,
 * optional secondary line, and a chevron affordance. Keeps sibling rows
 * (model, personality, ...) visually identical.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Typography } from './Typography';

interface ConfigRowProps {
  primary: string;
  secondary?: string;
  /** Small accent dot after the primary text (e.g. "customized" indicator). */
  showIndicatorDot?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const ConfigRow: React.FC<ConfigRowProps> = ({
  primary,
  secondary,
  showIndicatorDot = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? primary}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={[
        styles.row,
        {
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.sm,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.value}>
        <View style={styles.primaryRow}>
          <Typography variant="body" weight="medium">
            {primary}
          </Typography>
          {showIndicatorDot && (
            <View
              style={[styles.indicatorDot, { backgroundColor: theme.colors.primary[500] }]}
              testID={testID ? `${testID}-dot` : undefined}
            />
          )}
        </View>
        {secondary !== undefined && (
          <Typography variant="caption" color="secondary" style={styles.secondary}>
            {secondary}
          </Typography>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.text.secondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    width: '100%',
    minHeight: 44,
  },
  value: {
    flex: 1,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  secondary: {
    marginTop: 2,
  },
});

export default ConfigRow;
