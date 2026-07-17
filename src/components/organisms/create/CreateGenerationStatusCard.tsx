import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Typography } from '@/components/molecules';
import type {
  CreateState,
  ImageGenerationState,
  ImageProviderGenerationStatus,
} from '@/store/createSlice';
import { getImageProviderDisplayName } from '@/config/imageGenerationModels';
import type { AIProvider } from '@/types';

type ImageGenerationResult = NonNullable<CreateState['lastImageGenerationResult']>;

interface CreateGenerationStatusCardProps {
  generation: ImageGenerationState | null;
  result?: ImageGenerationResult;
  selectedModels: Partial<Record<AIProvider, string>>;
  onViewInGallery: (ids: string[]) => void;
  testID?: string;
}

/**
 * Live image-generation progress for the Studio: overall status, one row per
 * provider, and a gallery CTA once results land. Extracted from the old
 * bottom action rail; now fills the region above the composer while a run is
 * active or just finished.
 */
export const CreateGenerationStatusCard: React.FC<CreateGenerationStatusCardProps> = ({
  generation,
  result,
  selectedModels,
  onViewInGallery,
  testID = 'create-image-status-card',
}) => {
  const { theme, isDark } = useTheme();
  const primaryTintBackground = isDark ? theme.colors.overlays.medium : theme.colors.primary[50];
  const primaryAccentColor = isDark ? theme.colors.primary[300] : theme.colors.primary[600];

  const isRunning = Boolean(generation);
  const isPartial = !isRunning && result?.status === 'partial';
  const isSuccess = !isRunning && (result?.status === 'succeeded' || result?.status === 'partial');
  const isFailed = !isRunning && result?.status === 'failed';
  const message = generation?.message || result?.message;
  const providerStatuses = generation?.providerStatuses || result?.providerStatuses || {};
  const statusProviders = generation?.providers?.length
    ? generation.providers
    : result?.providers ?? [];

  if (!generation && !result) return null;

  const getStatusIcon = (status?: ImageProviderGenerationStatus) => {
    if (status?.status === 'complete') {
      return { name: 'checkmark-circle-outline' as const, color: theme.colors.success[500] };
    }
    if (status?.status === 'error') {
      return { name: 'alert-circle-outline' as const, color: theme.colors.error[500] };
    }
    if (status?.status === 'generating') {
      return undefined;
    }
    return { name: 'time-outline' as const, color: theme.colors.text.secondary };
  };

  const getStatusText = (status?: ImageProviderGenerationStatus) => {
    if (!status) return 'Waiting';
    if (status.status === 'complete') return status.message || 'Complete';
    if (status.status === 'error') return status.error || status.message || 'Failed';
    if (status.status === 'generating') return status.message || 'Generating';
    return status.message || 'Waiting';
  };

  return (
    <View style={styles.container} testID={testID}>
      <View
        style={[
          styles.status,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isFailed
              ? theme.colors.error[500]
              : isPartial
                ? theme.colors.warning[500]
                : isSuccess
                  ? theme.colors.success[500]
                  : theme.colors.border,
          },
        ]}
        testID="create-image-status"
      >
        {isRunning ? (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        ) : (
          <Ionicons
            name={isFailed || isPartial ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={
              isFailed
                ? theme.colors.error[500]
                : isPartial
                  ? theme.colors.warning[500]
                  : theme.colors.success[500]
            }
          />
        )}
        <Typography variant="caption" color="secondary" style={styles.statusText}>
          {message || (isRunning ? 'Generating images...' : 'Images ready.')}
        </Typography>
      </View>

      {statusProviders.length > 0 && (
        <View style={styles.providerList} testID="create-image-provider-status-list">
          {statusProviders.map(provider => {
            const status = providerStatuses[provider];
            const icon = getStatusIcon(status);
            return (
              <View
                key={provider}
                style={[
                  styles.providerRow,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      status?.status === 'error' ? theme.colors.error[300] : theme.colors.border,
                  },
                ]}
                testID={`create-image-provider-status-${provider}`}
              >
                {status?.status === 'generating' ? (
                  <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                ) : icon ? (
                  <Ionicons name={icon.name} size={18} color={icon.color} />
                ) : null}
                <View style={styles.providerCopy}>
                  <Typography variant="caption" weight="semibold" numberOfLines={1}>
                    {getImageProviderDisplayName(provider, {
                      includeModel: true,
                      modelId: status?.modelId || selectedModels[provider],
                    })}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="secondary"
                    style={[
                      styles.providerMessage,
                      status?.status === 'error' && { color: theme.colors.error[600] },
                    ]}
                    numberOfLines={2}
                  >
                    {getStatusText(status)}
                  </Typography>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {isSuccess && result && result.ids.length > 0 && (
        <TouchableOpacity
          style={[
            styles.galleryCta,
            { borderColor: theme.colors.primary[500], backgroundColor: primaryTintBackground },
          ]}
          onPress={() => onViewInGallery(result.ids)}
          accessibilityRole="button"
          accessibilityLabel="View generated images in Gallery"
          testID="create-image-gallery-cta"
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
  providerList: {
    gap: 8,
  },
  providerRow: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  providerCopy: {
    flex: 1,
    minWidth: 0,
  },
  providerMessage: {
    marginTop: 2,
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

export default CreateGenerationStatusCard;
