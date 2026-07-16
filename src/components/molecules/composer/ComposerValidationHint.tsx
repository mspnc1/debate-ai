import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Typography } from '../common/Typography';

interface ComposerValidationHintProps {
  message: string;
  testID?: string;
}

/** Amber inline validation line shown under the composer's toolbar rows. */
export const ComposerValidationHint: React.FC<ComposerValidationHintProps> = ({
  message,
  testID,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container} testID={testID} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={14} color={theme.colors.warning[600]} />
      <Typography variant="caption" style={{ color: theme.colors.warning[600], flex: 1 }}>
        {message}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
});

export default ComposerValidationHint;
