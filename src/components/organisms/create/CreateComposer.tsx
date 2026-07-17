import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { AttachmentChip } from '@/components/molecules';
import { ComposerShell, ComposerPillDescriptor } from '../composer/ComposerShell';
import { ProviderPickerSheet, ProviderPickerItem } from '../composer/ProviderPickerSheet';
import { ImageModelConfigSheet } from './ImageModelConfigSheet';
import { getProviderById } from '@/config/aiProviders';
import { getMediaProviderById, getMediaModelById } from '@/config/mediaProviders';
import { getResolvedImageModel } from '@/config/imageGenerationModels';
import type { AIProvider } from '@/types';
import type { CreateTab, MediaProviderId } from '@/types/media';
import type { CreateSelectionConfig, SourceAttachment } from '@/types/createSelection';

export interface CreateComposerProps {
  tab: CreateTab;
  configs: CreateSelectionConfig[];
  maxAIs: number;
  onAddProvider: (providerId: string) => void;
  onUpdateConfig: (index: number, patch: Partial<CreateSelectionConfig>) => void;
  onRemoveConfig: (index: number) => void;
  pickerProviders: ProviderPickerItem[];
  configuredProviderIds: string[];
  onRequestAddKey: () => void;
  attachments: SourceAttachment[];
  onRemoveAttachment: (uri: string) => void;
  /** Image tab: opens the composer-level output-options sheet. */
  onOpenOptions?: () => void;
  /** Video/audio: the screen owns those config sheets; image pills open theirs here. */
  onMediaPillPress?: (index: number) => void;
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  canSend: boolean;
  validationMessage: string | null;
  placeholder?: string;
  disabled?: boolean;
  testID?: string;
}

/**
 * Studio composer: the media-catalog wrapper around ComposerShell. Resolves
 * image pills from the image-model catalog and video/audio pills from
 * MEDIA_PROVIDERS, renders attachment chips above the input, and owns the
 * provider picker plus the per-pill image config sheet.
 */
export const CreateComposer: React.FC<CreateComposerProps> = ({
  tab,
  configs,
  maxAIs,
  onAddProvider,
  onUpdateConfig,
  onRemoveConfig,
  pickerProviders,
  configuredProviderIds,
  onRequestAddKey,
  attachments,
  onRemoveAttachment,
  onOpenOptions,
  onMediaPillPress,
  inputText,
  onChangeText,
  onSend,
  canSend,
  validationMessage,
  placeholder = 'Describe what you want to create…',
  disabled = false,
  testID,
}) => {
  const { theme } = useTheme();
  const { isTablet } = useResponsive();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [configIndex, setConfigIndex] = useState<number | null>(null);

  const pills: ComposerPillDescriptor[] = [];
  configs.forEach((config, index) => {
    if (tab === 'image') {
      const provider = getProviderById(config.providerId);
      if (!provider) return;
      const model = getResolvedImageModel(config.providerId as AIProvider, config.modelId);
      pills.push({
        key: `${config.providerId}-${index}`,
        name: provider.name,
        color: provider.color,
        modelLabel: isTablet ? model?.displayName : undefined,
      });
      return;
    }
    const mediaProvider = getMediaProviderById(config.providerId);
    if (!mediaProvider) return;
    const mediaModel = getMediaModelById(config.providerId as MediaProviderId, config.modelId);
    pills.push({
      key: `${config.providerId}-${index}`,
      name: mediaProvider.name,
      color: mediaProvider.color,
      modelLabel: isTablet ? mediaModel?.label : undefined,
    });
  });

  const handlePillPress = (index: number) => {
    if (tab === 'image') {
      setConfigIndex(index);
      return;
    }
    onMediaPillPress?.(index);
  };

  const handleOpenOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onOpenOptions?.();
  };

  const activeConfig = configIndex !== null ? configs[configIndex] ?? null : null;

  return (
    <ComposerShell
      inputText={inputText}
      onChangeText={onChangeText}
      onSend={onSend}
      canSend={canSend}
      pills={pills}
      onPillPress={handlePillPress}
      showAddPill={tab === 'image' && configs.length < maxAIs}
      onAddPill={() => setPickerVisible(true)}
      addPillEmphasized={configs.length === 0}
      aboveInput={
        attachments.length > 0 ? (
          <View style={styles.attachmentRow} testID={testID ? `${testID}-attachments` : undefined}>
            {attachments.map(attachment => (
              <AttachmentChip
                key={attachment.uri}
                uri={attachment.uri}
                onRemove={() => onRemoveAttachment(attachment.uri)}
                testID={testID ? `${testID}-attachment` : undefined}
              />
            ))}
          </View>
        ) : undefined
      }
      leadingAccessory={
        onOpenOptions ? (
          <TouchableOpacity
            onPress={handleOpenOptions}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Output options"
            accessibilityHint="Style, frame, count, and source image"
            style={[styles.optionsChip, { borderColor: theme.colors.border }]}
            testID={testID ? `${testID}-options` : undefined}
          >
            <Ionicons name="options-outline" size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        ) : undefined
      }
      validationMessage={validationMessage}
      placeholder={placeholder}
      disabled={disabled}
      testID={testID}
    >
      <ProviderPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectProvider={onAddProvider}
        selectedProviderIds={configs.map(c => c.providerId)}
        configuredProviderIds={configuredProviderIds}
        providers={pickerProviders}
        onRequestAddKey={onRequestAddKey}
        testID={testID ? `${testID}-picker` : undefined}
      />

      {tab === 'image' && (
        <ImageModelConfigSheet
          visible={activeConfig !== null}
          onClose={() => setConfigIndex(null)}
          providerId={(activeConfig?.providerId as AIProvider) ?? null}
          modelId={activeConfig?.modelId}
          settings={activeConfig?.settings}
          onChangeModel={modelId => {
            if (configIndex !== null) onUpdateConfig(configIndex, { modelId });
          }}
          onChangeSettings={patch => {
            if (configIndex !== null && activeConfig) {
              onUpdateConfig(configIndex, {
                settings: { ...activeConfig.settings, ...patch },
              });
            }
          }}
          onRemove={() => {
            if (configIndex !== null) onRemoveConfig(configIndex);
          }}
          testID={testID ? `${testID}-config` : undefined}
        />
      )}
    </ComposerShell>
  );
};

const styles = StyleSheet.create({
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  optionsChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CreateComposer;
