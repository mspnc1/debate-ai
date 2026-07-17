import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '@/theme';
import { Typography, InfoButton } from '@/components/molecules';
import type { HelpTopicId } from '@/config/help/types';

/**
 * Shared option controls for the Studio's config sheets, extracted from
 * CreateSetupScreen's render helpers so every sheet (image model, options,
 * video, audio) styles choices identically.
 */

export interface OptionGridOption<T extends string> {
  id: T;
  label: string;
  description?: string;
}

export function OptionGrid<T extends string>({
  options,
  selectedId,
  onSelect,
  testID,
}: {
  options: Array<OptionGridOption<T>>;
  selectedId: T;
  onSelect: (id: T) => void;
  testID?: string;
}) {
  const { theme, isDark } = useTheme();
  const selectedBackground = isDark ? theme.colors.overlays.medium : theme.colors.primary[50];

  return (
    <View style={styles.optionGrid} testID={testID}>
      {options.map(option => {
        const selected = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionTile,
              {
                backgroundColor: selected ? selectedBackground : theme.colors.surface,
                borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
              },
            ]}
            onPress={() => onSelect(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <View style={styles.optionTileHeader}>
              <Typography
                variant="caption"
                weight="semibold"
                style={{ color: theme.colors.text.primary }}
              >
                {option.label}
              </Typography>
              {selected && (
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary[500]} />
              )}
            </View>
            {option.description && (
              <Typography variant="caption" color="secondary" numberOfLines={2}>
                {option.description}
              </Typography>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function OutputControlGroup({
  label,
  helpTopicId,
  testID,
  children,
}: {
  label: string;
  helpTopicId?: HelpTopicId;
  testID?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.outputControlGroup} testID={testID}>
      <View style={styles.outputControlLabelRow}>
        <Typography
          variant="caption"
          weight="semibold"
          color="secondary"
          style={styles.outputControlLabel}
        >
          {label}
        </Typography>
        {helpTopicId && <InfoButton topicId={helpTopicId} size="small" />}
      </View>
      {children}
    </View>
  );
}

export function DiscreteSlider<T extends string | number | undefined>({
  options,
  value,
  getLabel,
  onChange,
  testID,
}: {
  options: readonly T[];
  value: T;
  getLabel: (value: T) => string;
  onChange: (value: T) => void;
  testID: string;
}) {
  const { theme } = useTheme();
  const currentIndex = Math.max(0, options.findIndex(option => option === value));
  const maxIndex = Math.max(0, options.length - 1);
  const selectedValue = options[currentIndex] as T;
  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < maxIndex;
  const sliderDisabled = options.length <= 1;
  const updateByIndex = (rawIndex: number) => {
    const nextIndex = Math.min(maxIndex, Math.max(0, Math.round(rawIndex)));
    onChange(options[nextIndex] as T);
  };

  return (
    <View
      style={[
        styles.discreteSlider,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.discreteSliderHeader}>
        <Typography variant="body" weight="semibold">
          {getLabel(selectedValue)}
        </Typography>
        <View style={styles.sliderStepper}>
          <TouchableOpacity
            testID={`${testID}-decrement`}
            style={[
              styles.stepperButton,
              { borderColor: theme.colors.border, opacity: canDecrease ? 1 : 0.4 },
            ]}
            onPress={() => updateByIndex(currentIndex - 1)}
            disabled={!canDecrease}
            accessibilityRole="button"
            accessibilityLabel="Decrease value"
          >
            <Ionicons name="remove" size={18} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID={`${testID}-increment`}
            style={[
              styles.stepperButton,
              { borderColor: theme.colors.border, opacity: canIncrease ? 1 : 0.4 },
            ]}
            onPress={() => updateByIndex(currentIndex + 1)}
            disabled={!canIncrease}
            accessibilityRole="button"
            accessibilityLabel="Increase value"
          >
            <Ionicons name="add" size={18} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <Slider
        testID={testID}
        value={currentIndex}
        minimumValue={0}
        maximumValue={maxIndex}
        step={1}
        disabled={sliderDisabled}
        onValueChange={updateByIndex}
        minimumTrackTintColor={theme.colors.primary[500]}
        maximumTrackTintColor={theme.colors.border}
        thumbTintColor={theme.colors.primary[500]}
      />
    </View>
  );
}

export function SelectableChip({
  label,
  selected = false,
  onPress,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.optionChip,
        {
          backgroundColor: selected ? theme.colors.primary[500] : theme.colors.surface,
          borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
    >
      <Typography
        variant="caption"
        weight="semibold"
        style={{ color: selected ? '#FFFFFF' : theme.colors.text.primary }}
      >
        {label}
      </Typography>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionTile: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  optionTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  outputControlGroup: {
    gap: 8,
  },
  outputControlLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  outputControlLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  discreteSlider: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  discreteSliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  sliderStepper: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
