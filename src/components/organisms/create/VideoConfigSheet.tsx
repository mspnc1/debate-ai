import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Typography } from '@/components/molecules';
import { CreateSheetShell } from './CreateSheetShell';
import { DiscreteSlider, OptionGrid, OutputControlGroup, SelectableChip } from './createControls';
import {
  RUNWAY_DEFAULT_ASPECT_RATIO,
  RUNWAY_DEFAULT_DURATION_SECONDS,
  getMediaModels,
  getRunwayAspectRatios,
  getRunwayVideoDurations,
} from '@/config/mediaProviders';
import type { CreateVideoOptions } from '@/types/createSelection';
import type { CreateMediaOperation } from '@/types/media';

type VideoOperation = Extract<CreateMediaOperation, 'text_to_video' | 'image_to_video'>;

interface VideoConfigSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Derived from the composer's attachment: image_to_video when one is set. */
  operation: VideoOperation;
  options: CreateVideoOptions;
  onChange: (patch: Partial<CreateVideoOptions>) => void;
  /** Source-image actions; upload/latest hidden when unavailable. */
  onUploadSource: () => void;
  onUseLatestImage?: () => void;
  onClearSource?: () => void;
  testID?: string;
}

/**
 * Runway pill config sheet: model, duration, and frame for the active
 * operation. Dependent options clamp when the model changes so the chosen
 * duration/aspect always stays valid for it.
 */
export const VideoConfigSheet: React.FC<VideoConfigSheetProps> = ({
  visible,
  onClose,
  operation,
  options,
  onChange,
  onUploadSource,
  onUseLatestImage,
  onClearSource,
  testID,
}) => {
  const { theme, isDark } = useTheme();
  const primaryTintBackground = isDark ? theme.colors.overlays.medium : theme.colors.primary[50];
  const primaryTintStrongBackground = isDark
    ? theme.colors.overlays.strong
    : theme.colors.primary[100];

  const models = getMediaModels('runway', operation);
  const durations = getRunwayVideoDurations(options.modelId, operation);
  const aspectRatios = getRunwayAspectRatios(options.modelId, operation);

  const withLightHaptic = (action: () => void) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    action();
  };

  const handleSelectModel = (modelId: string) => {
    const nextDurations = getRunwayVideoDurations(modelId, operation);
    const nextRatios = getRunwayAspectRatios(modelId, operation);
    onChange({
      modelId,
      durationSeconds: nextDurations.includes(options.durationSeconds)
        ? options.durationSeconds
        : nextDurations[0] || RUNWAY_DEFAULT_DURATION_SECONDS,
      aspectRatio: nextRatios.some(ratio => ratio.id === options.aspectRatio)
        ? options.aspectRatio
        : nextRatios[0]?.id || RUNWAY_DEFAULT_ASPECT_RATIO,
    });
  };

  return (
    <CreateSheetShell visible={visible} title="Runway" onClose={onClose} testID={testID}>
      <OutputControlGroup label="Model" helpTopicId="create-video-model">
        <OptionGrid
          options={models.map(model => ({
            id: model.id,
            label: model.label,
            description: model.description,
          }))}
          selectedId={options.modelId}
          onSelect={handleSelectModel}
          testID="create-video-model-grid"
        />
      </OutputControlGroup>

      <OutputControlGroup label="Duration" helpTopicId="create-video-duration">
        <DiscreteSlider
          options={durations}
          value={options.durationSeconds}
          getLabel={duration => `${duration}s`}
          onChange={durationSeconds => onChange({ durationSeconds })}
          testID="create-video-duration-slider"
        />
      </OutputControlGroup>

      <OutputControlGroup label="Frame" helpTopicId="create-video-frame">
        <View style={styles.aspectGrid} testID="create-video-aspect-grid">
          {aspectRatios.map(ratio => {
            const selected = options.aspectRatio === ratio.id;
            const [widthValue, heightValue] = ratio.id.split(':').map(part => Number(part));
            const isPortrait = heightValue > widthValue;
            const isSquare = heightValue === widthValue;
            return (
              <TouchableOpacity
                key={ratio.id}
                style={[
                  styles.aspectTile,
                  {
                    backgroundColor: selected ? primaryTintBackground : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
                  },
                ]}
                onPress={withLightHaptic(() => onChange({ aspectRatio: ratio.id }))}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View
                  style={[
                    styles.aspectPreview,
                    {
                      width: isSquare ? 24 : isPortrait ? 18 : 30,
                      height: isSquare ? 24 : isPortrait ? 30 : 18,
                      borderColor: selected
                        ? theme.colors.primary[500]
                        : theme.colors.text.secondary,
                      backgroundColor: selected ? primaryTintStrongBackground : 'transparent',
                    },
                  ]}
                />
                <Typography
                  variant="caption"
                  weight="semibold"
                  style={{ color: theme.colors.text.primary, textAlign: 'center' }}
                >
                  {ratio.label}
                </Typography>
                <Typography variant="caption" color="secondary" style={{ textAlign: 'center' }}>
                  {ratio.description}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </View>
      </OutputControlGroup>

      <OutputControlGroup label="Source image" helpTopicId="create-video-source">
        <View style={styles.sourceActions}>
          <SelectableChip
            label={operation === 'image_to_video' ? 'Replace image' : 'Upload image'}
            onPress={withLightHaptic(() => {
              onClose();
              onUploadSource();
            })}
            testID="create-video-source-upload"
          />
          {onUseLatestImage && (
            <SelectableChip
              label="Use latest image"
              onPress={withLightHaptic(() => {
                onClose();
                onUseLatestImage();
              })}
              testID="create-video-source-latest"
            />
          )}
          {operation === 'image_to_video' && onClearSource && (
            <SelectableChip
              label="Clear source"
              onPress={withLightHaptic(onClearSource)}
              testID="create-video-source-clear"
            />
          )}
        </View>
      </OutputControlGroup>
    </CreateSheetShell>
  );
};

const styles = StyleSheet.create({
  aspectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  aspectTile: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 106,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  aspectPreview: {
    borderWidth: 2,
    borderRadius: 4,
  },
  sourceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export default VideoConfigSheet;
