import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Typography } from '../common/Typography';

interface AttachmentChipProps {
  /** Image preview; required when kind is 'image' (the default). */
  uri?: string;
  kind?: 'image' | 'document';
  /** Document label rendered under the icon. */
  fileName?: string;
  onRemove: () => void;
  testID?: string;
}

/**
 * File attached to the composer (source image, reference, or a document for
 * the first chat message). The modern attachment idiom: the presence of a
 * chip is what turns a plain send into a multimodal one.
 */
export const AttachmentChip: React.FC<AttachmentChipProps> = ({
  uri,
  kind = 'image',
  fileName,
  onRemove,
  testID,
}) => {
  const { theme } = useTheme();

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRemove();
  };

  const isDocument = kind === 'document';

  return (
    <View
      style={[
        styles.container,
        isDocument && styles.documentContainer,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
      testID={testID}
    >
      {isDocument ? (
        <View style={styles.documentBody}>
          <Ionicons
            name="document-text-outline"
            size={20}
            color={theme.colors.text.secondary}
          />
          {fileName && (
            <Typography
              variant="caption"
              color="secondary"
              numberOfLines={1}
              style={styles.documentLabel}
            >
              {fileName}
            </Typography>
          )}
        </View>
      ) : (
        <Image source={{ uri }} style={styles.preview} accessibilityIgnoresInvertColors />
      )}
      <TouchableOpacity
        onPress={handleRemove}
        style={styles.remove}
        accessibilityRole="button"
        accessibilityLabel={isDocument ? 'Remove attached document' : 'Remove attached image'}
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
  documentContainer: {
    width: 96,
  },
  documentBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingTop: 4,
    gap: 2,
  },
  documentLabel: {
    maxWidth: 84,
    fontSize: 10,
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
