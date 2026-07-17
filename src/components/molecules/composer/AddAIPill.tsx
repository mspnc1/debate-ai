import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Typography } from '../common/Typography';

interface AddAIPillProps {
  onPress: () => void;
  label?: string;
  emphasized?: boolean;
  /** Icon-only chip for tight rows once at least one pill exists. */
  compact?: boolean;
  testID?: string;
}

/**
 * Dashed "[+] Add AI" chip for the composer's WHO row. `emphasized` draws
 * attention when the lineup is empty and the send button is blocked.
 */
export const AddAIPill: React.FC<AddAIPillProps> = ({
  onPress,
  label = 'Add AI',
  emphasized = false,
  compact = false,
  testID,
}) => {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const accentColor = emphasized ? theme.colors.primary[500] : theme.colors.text.secondary;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the AI picker"
      style={[
        styles.container,
        {
          borderColor: emphasized ? theme.colors.primary[400] : theme.colors.border,
          backgroundColor: emphasized ? `${theme.colors.primary[500]}14` : 'transparent',
        },
      ]}
      testID={testID}
    >
      <Ionicons name="add" size={16} color={accentColor} />
      {!compact && (
        <Typography variant="caption" weight="medium" style={{ color: accentColor }}>
          {label}
        </Typography>
      )}
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
    borderStyle: 'dashed',
    gap: 4,
  },
});

export default AddAIPill;
