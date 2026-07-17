import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Typography } from '@/components/molecules';
import type { CreateState, MediaGenerationState } from '@/store/createSlice';
import type { CreateMediaType } from '@/types/media';

type MediaGenerationResult = NonNullable<CreateState['lastMediaGenerationResult']>;

interface CreateMediaStatusCardProps {
  mediaType: CreateMediaType;
  /** Display label, e.g. "Video" / "Voiceover" / "Sound Effect". */
  label: string;
  generation: MediaGenerationState | null;
  result?: MediaGenerationResult;
  onViewInGallery: (mediaId: string) => void;
  testID?: string;
}

/**
 * Live video/audio generation progress for the Studio: overall status plus a
 * gallery CTA once the result lands. Extracted from the old media action rail.
 */
export const CreateMediaStatusCard: React.FC<CreateMediaStatusCardProps> = ({
  mediaType,
  label,
  generation,
  result,
  onViewInGallery,
  testID,
}) => {
  const { theme, isDark } = useTheme();
  const primaryTintBackground = isDark ? theme.colors.overlays.medium : theme.colors.primary[50];
  const primaryAccentColor = isDark ? theme.colors.primary[300] : theme.colors.primary[600];

  const relevantResult = result?.mediaType === mediaType ? result : undefined;
  const isRunning = Boolean(generation);
  const isSuccess = !isRunning && relevantResult?.status === 'succeeded';
  const isFailed = !isRunning && relevantResult?.status === 'failed';
  const message = generation?.message || relevantResult?.message;

  if (!generation && !relevantResult) return null;

  return (
    <View style={styles.container} testID={testID}>
      <View
        style={[
          styles.status,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isFailed
              ? theme.colors.error[500]
              : isSuccess
                ? theme.colors.success[500]
                : theme.colors.border,
          },
        ]}
        testID={`create-${mediaType}-status`}
      >
        {isRunning ? (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        ) : (
          <Ionicons
            name={isFailed ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={isFailed ? theme.colors.error[500] : theme.colors.success[500]}
          />
        )}
        <Typography variant="caption" color="secondary" style={styles.statusText}>
          {message ||
            (isRunning ? `Generating ${label.toLowerCase()}...` : `${label} ready.`)}
        </Typography>
      </View>

      {isSuccess && relevantResult?.id && (
        <TouchableOpacity
          style={[
            styles.galleryCta,
            { borderColor: theme.colors.primary[500], backgroundColor: primaryTintBackground },
          ]}
          onPress={() => onViewInGallery(relevantResult.id)}
          accessibilityRole="button"
          accessibilityLabel={`View ${label.toLowerCase()} in Gallery`}
          testID={`create-${mediaType}-gallery-cta`}
        >
          <Ionicons name="images-outline" size={18} color={primaryAccentColor} />
          <Typography variant="button" weight="semibold" style={{ color: primaryAccentColor }}>
            View in Gallery
          </Typography>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    alignSelf: 'stretch',
  },
  status: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    flex: 1,
  },
  galleryCta: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

export default CreateMediaStatusCard;
