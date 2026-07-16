import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Typography } from '../common/Typography';

interface AIPillProps {
  name: string;
  color: string;
  modelLabel?: string;
  indexLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Brand-tinted provider chip for the composer's WHO row. Tapping opens the
 * per-AI config sheet.
 */
export const AIPill: React.FC<AIPillProps> = ({
  name,
  color,
  modelLabel,
  indexLabel,
  onPress,
  disabled = false,
  testID,
}) => {
  const { theme } = useTheme();

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={modelLabel ? `${name}, ${modelLabel}` : name}
      accessibilityHint="Opens model and personality settings"
      style={[
        styles.container,
        {
          borderColor: `${color}66`,
          backgroundColor: `${color}14`,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      testID={testID}
    >
      {indexLabel ? (
        <View style={[styles.indexBadge, { backgroundColor: color }]}>
          <Typography variant="caption" style={styles.indexLabel}>
            {indexLabel}
          </Typography>
        </View>
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Typography variant="caption" weight="semibold">
        {name}
      </Typography>
      {modelLabel ? (
        <Typography
          variant="caption"
          color="secondary"
          numberOfLines={1}
          style={styles.modelLabel}
        >
          {modelLabel}
        </Typography>
      ) : null}
      <Ionicons name="chevron-down" size={12} color={theme.colors.text.secondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indexBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  modelLabel: {
    maxWidth: 96,
  },
});

export default AIPill;
