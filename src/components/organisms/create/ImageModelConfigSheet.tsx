import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Typography, ImageModelSelector } from '@/components/molecules';
import { AIAvatar } from '../common/AIAvatar';
import { CreateSheetShell } from './CreateSheetShell';
import { DiscreteSlider, OptionGrid, OutputControlGroup } from './createControls';
import { getProviderById } from '@/config/aiProviders';
import { getAIProviderIcon } from '@/utils/aiProviderAssets';
import {
  getResolvedImageModel,
  type ImageBackgroundOption,
  type ImageModerationOption,
  type ImageOutputFormat,
  type ImageOutputQuality,
} from '@/config/imageGenerationModels';
import type { ImageModelSettings } from '@/store/createSlice';
import type { AIProvider } from '@/types';

const IMAGE_QUALITY_LABELS: Record<ImageOutputQuality, string> = {
  auto: 'Match model',
  low: 'Draft',
  medium: 'Medium',
  high: 'High',
  standard: 'Standard',
  hd: 'HD',
};

const IMAGE_FORMAT_LABELS: Record<ImageOutputFormat, string> = {
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
};

const IMAGE_BACKGROUND_LABELS: Record<ImageBackgroundOption, string> = {
  auto: 'Default background',
  opaque: 'Opaque',
  transparent: 'Transparent',
};

const IMAGE_MODERATION_LABELS: Record<ImageModerationOption, string> = {
  auto: 'Default safety',
  low: 'Less restrictive',
};

interface ImageModelConfigSheetProps {
  visible: boolean;
  onClose: () => void;
  providerId: AIProvider | null;
  modelId?: string;
  settings?: ImageModelSettings;
  onChangeModel: (modelId: string) => void;
  onChangeSettings: (patch: Partial<ImageModelSettings>) => void;
  onRemove: () => void;
  testID?: string;
}

/**
 * Per-pill bottom sheet for an image provider: model picker, capability
 * caption, only the settings the resolved model supports, and a destructive
 * remove action — the Studio counterpart of AIConfigSheet.
 */
export const ImageModelConfigSheet: React.FC<ImageModelConfigSheetProps> = ({
  visible,
  onClose,
  providerId,
  modelId,
  settings = {},
  onChangeModel,
  onChangeSettings,
  onRemove,
  testID,
}) => {
  const { theme } = useTheme();

  const provider = providerId ? getProviderById(providerId) : undefined;
  const model = providerId ? getResolvedImageModel(providerId, modelId) : undefined;
  if (!visible || !providerId || !provider) return null;

  const iconData = getAIProviderIcon(providerId);

  const handleRemove = () => {
    onClose();
    onRemove();
  };

  const pick = <T,>(value: T | undefined, opts?: T[]): T | undefined =>
    value !== undefined && opts?.includes(value) ? value : opts?.[0];

  const qualityValues = model?.qualityOptions || [];
  const resolutionValues = model?.resolutions || [];
  const formatValues = model?.outputFormats || [];
  const backgroundValues = model?.backgroundOptions || [];
  const moderationValues = model?.moderationOptions || [];

  const qualityValue = (pick(settings.quality as ImageOutputQuality | undefined, qualityValues) ||
    qualityValues[0]) as ImageOutputQuality;
  const resolutionValue = pick(settings.resolution, resolutionValues) || resolutionValues[0];
  const formatValue = (pick(settings.outputFormat, formatValues) || 'png') as ImageOutputFormat;
  const backgroundValue = (pick(settings.background, backgroundValues) ||
    'auto') as ImageBackgroundOption;
  const moderationValue = (pick(settings.moderation, moderationValues) ||
    'auto') as ImageModerationOption;
  const compressionValue = settings.outputCompression ?? 80;

  const showQuality = qualityValues.length > 1;
  const showResolution = resolutionValues.length > 1;
  const showFormat = formatValues.length > 1;
  const showBackground = backgroundValues.length > 1;
  const showSafety = moderationValues.length > 1;
  const showCompression = formatValue !== 'png' && Boolean(model?.supportsOutputCompression);
  const hasControls =
    showQuality || showResolution || showFormat || showBackground || showSafety || showCompression;

  return (
    <CreateSheetShell visible={visible} title={provider.name} onClose={onClose} testID={testID}>
      <View style={styles.identityRow}>
        <AIAvatar
          icon={iconData.icon}
          iconType={iconData.iconType}
          size="small"
          color={provider.color}
        />
        <Typography variant="caption" color="secondary">
          {provider.company}
        </Typography>
      </View>

      <View style={styles.capabilityRow}>
        <Ionicons
          name={model?.supportsImageInput ? 'layers-outline' : 'text-outline'}
          size={16}
          color={
            model?.supportsImageInput ? theme.colors.primary[500] : theme.colors.text.secondary
          }
        />
        <Typography variant="caption" color="secondary" style={styles.capabilityText}>
          {model?.supportsImageInput
            ? 'Can edit images and use references'
            : 'Creates from text prompts only'}
        </Typography>
      </View>

      <ImageModelSelector
        providerId={providerId}
        selectedModel={modelId}
        onSelectModel={onChangeModel}
        aiName={model?.shortProviderName || provider.name}
      />

      {!hasControls && model && (
        <Typography variant="caption" color="secondary">
          {`${model.providerDisplayName} manages quality, format, and safety automatically — nothing to set here.`}
        </Typography>
      )}
      {showQuality && (
        <OutputControlGroup label="Quality" helpTopicId="create-quality">
          <OptionGrid
            options={qualityValues.map(q => ({ id: q, label: IMAGE_QUALITY_LABELS[q] || q }))}
            selectedId={qualityValue}
            onSelect={quality => onChangeSettings({ quality })}
            testID={`create-image-quality-${providerId}`}
          />
        </OutputControlGroup>
      )}
      {showResolution && (
        <OutputControlGroup label="Resolution" helpTopicId="create-resolution">
          <OptionGrid
            options={resolutionValues.map(r => ({ id: r, label: r }))}
            selectedId={resolutionValue}
            onSelect={resolution => onChangeSettings({ resolution })}
            testID={`create-image-resolution-${providerId}`}
          />
        </OutputControlGroup>
      )}
      {showFormat && (
        <OutputControlGroup label="Format" helpTopicId="create-format">
          <OptionGrid
            options={formatValues.map(f => ({ id: f, label: IMAGE_FORMAT_LABELS[f] || f }))}
            selectedId={formatValue}
            onSelect={outputFormat => onChangeSettings({ outputFormat })}
            testID={`create-image-format-${providerId}`}
          />
        </OutputControlGroup>
      )}
      {showBackground && (
        <OutputControlGroup label="Background" helpTopicId="create-background">
          <OptionGrid
            options={backgroundValues.map(b => ({ id: b, label: IMAGE_BACKGROUND_LABELS[b] || b }))}
            selectedId={backgroundValue}
            onSelect={background => onChangeSettings({ background })}
            testID={`create-image-background-${providerId}`}
          />
        </OutputControlGroup>
      )}
      {showSafety && (
        <OutputControlGroup label="Safety" helpTopicId="create-safety">
          <OptionGrid
            options={moderationValues.map(m => ({ id: m, label: IMAGE_MODERATION_LABELS[m] || m }))}
            selectedId={moderationValue}
            onSelect={moderation => onChangeSettings({ moderation })}
            testID={`create-image-moderation-${providerId}`}
          />
        </OutputControlGroup>
      )}
      {showCompression && (
        <OutputControlGroup label="Compression" helpTopicId="create-compression">
          <DiscreteSlider
            options={[40, 60, 80, 100] as const}
            value={compressionValue}
            getLabel={value => `${value}`}
            onChange={value => onChangeSettings({ outputCompression: value || 80 })}
            testID={`create-image-compression-${providerId}`}
          />
        </OutputControlGroup>
      )}

      <TouchableOpacity
        onPress={handleRemove}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${provider.name} from lineup`}
        style={styles.removeRow}
        testID={testID ? `${testID}-remove` : undefined}
      >
        <Ionicons name="trash-outline" size={18} color={theme.colors.error[500]} />
        <Typography variant="body" weight="medium" color="error">
          Remove from lineup
        </Typography>
      </TouchableOpacity>
    </CreateSheetShell>
  );
};

const styles = StyleSheet.create({
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capabilityText: {
    flex: 1,
  },
  removeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
});

export default ImageModelConfigSheet;
