/**
 * TraitSlider - Native slider for personality traits
 * Uses @react-native-community/slider for reliable cross-platform behavior
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/components/molecules/common/Typography';
import { useTheme } from '@/theme';

interface TraitSliderProps {
  /** Current value between 0 and 1 */
  value: number;
  /** Callback when value changes */
  onValueChange: (value: number) => void;
  /** Label for the trait */
  label: string;
  /** Label for low end (0) */
  lowLabel: string;
  /** Label for high end (1) */
  highLabel: string;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export const TraitSlider: React.FC<TraitSliderProps> = ({
  value,
  onValueChange,
  label,
  lowLabel,
  highLabel,
  disabled = false,
  testID,
}) => {
  const { theme } = useTheme();

  const displayValue = Math.round(value * 100);

  const handleSlidingBegin = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSlidingComplete = useCallback(
    (newValue: number) => {
      const rounded = Math.round(newValue * 100) / 100;
      onValueChange(rounded);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [onValueChange]
  );

  const activeColor = theme.colors.primary[500];
  const disabledColor = theme.colors.text.disabled;
  const trackColor = disabled ? disabledColor : activeColor;

  return (
    <View style={styles.container} testID={testID}>
      {/* Header with label and value */}
      <View style={styles.header}>
        <Typography
          variant="body"
          weight="medium"
          color={disabled ? 'disabled' : 'primary'}
        >
          {label}
        </Typography>
        <Typography
          variant="body"
          weight="semibold"
          color={disabled ? 'disabled' : 'primary'}
        >
          {displayValue}%
        </Typography>
      </View>

      {/* Native slider */}
      <View style={[styles.sliderContainer, disabled && styles.sliderDisabled]}>
        <Slider
          value={value}
          onValueChange={onValueChange}
          onSlidingStart={handleSlidingBegin}
          onSlidingComplete={handleSlidingComplete}
          minimumValue={0}
          maximumValue={1}
          step={0.01}
          minimumTrackTintColor={trackColor}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={trackColor}
          disabled={disabled}
          style={styles.slider}
        />
      </View>

      {/* Low/High labels */}
      <View style={styles.labels}>
        <Typography variant="caption" color={disabled ? 'disabled' : 'secondary'}>
          {lowLabel}
        </Typography>
        <Typography variant="caption" color={disabled ? 'disabled' : 'secondary'}>
          {highLabel}
        </Typography>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderContainer: {
    justifyContent: 'center',
  },
  sliderDisabled: {
    opacity: 0.5,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});
