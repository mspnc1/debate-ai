import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';

interface AttachmentChipProps {
  uri: string;
  onRemove: () => void;
  testID?: string;
}

/**
 * Source-image thumbnail attached to the composer (refine / reference /
 * image-to-video). The modern attachment idiom: the presence of a chip is
 * what turns a plain generation into a refinement.
 */
export const AttachmentChip: React.FC<AttachmentChipProps> = ({ uri, onRemove, testID }) => {
  const { theme } = useTheme();

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRemove();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
      testID={testID}
    >
      <Image source={{ uri }} style={styles.preview} accessibilityIgnoresInvertColors />
      <TouchableOpacity
        onPress={handleRemove}
        style={styles.remove}
        accessibilityRole="button"
        accessibilityLabel="Remove attached image"
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        testID={testID ? `${testID}-remove` : undefined}
      >
        <Ionicons name="close-circle" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  remove: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
});

export default AttachmentChip;
