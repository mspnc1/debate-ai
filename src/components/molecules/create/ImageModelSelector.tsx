import React, { useMemo, useState } from 'react';
import { Dimensions, Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { AIProvider } from '@/types';
import {
  getImageModels,
  getResolvedImageModel,
  ImageModelConfig,
} from '@/config/imageGenerationModels';
import { Badge } from '../common/Badge';
import { SheetHeader } from '../sheets/SheetHeader';
import { Typography } from '../common/Typography';

interface ImageModelSelectorProps {
  providerId: AIProvider;
  selectedModel?: string;
  onSelectModel: (modelId: string) => void;
  aiName?: string;
}

const { height: screenHeight } = Dimensions.get('window');

function getCapabilityLabel(model: ImageModelConfig): string {
  if (model.supportsImageInput && model.supportsMultipleReferenceImages) {
    return 'Supports img2img and reference images';
  }
  return model.supportsImageInput ? 'Supports img2img' : 'Text-to-image only';
}

function summarizeList(values: string[], maxVisible = 4): string {
  if (values.length <= maxVisible) {
    return values.join(', ');
  }

  return `${values.slice(0, maxVisible).join(', ')} +${values.length - maxVisible} more`;
}

function getSizeLabel(model: ImageModelConfig): string {
  if (model.aspectRatios?.length) {
    const aspectLabel = `Aspect ratios: ${summarizeList(model.aspectRatios)}`;
    if (model.resolutions?.length) {
      return `${aspectLabel} • Resolutions: ${model.resolutions.join(', ')}`;
    }
    return aspectLabel;
  }

  if (model.sizes.length === 0) {
    return 'Provider-controlled output size';
  }

  return `Sizes: ${summarizeList(model.sizes.filter((size) => size !== 'auto'))}`;
}

export const ImageModelSelector: React.FC<ImageModelSelectorProps> = ({
  providerId,
  selectedModel,
  onSelectModel,
  aiName = '',
}) => {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const models = useMemo(() => getImageModels(providerId), [providerId]);
  const selectedModelInfo = useMemo(
    () => getResolvedImageModel(providerId, selectedModel),
    [providerId, selectedModel]
  );

  const openModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalVisible(true);
  };

  const handleModelSelect = (modelId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectModel(modelId);
    setIsModalVisible(false);
  };

  return (
    <>
      <View style={{ width: '100%' }}>
        <Typography variant="caption" color="secondary" style={{ marginBottom: 4 }}>
          Model
        </Typography>

        <TouchableOpacity
          onPress={openModal}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.sm,
            borderWidth: 1,
            borderColor: theme.colors.border,
            width: '100%',
            minHeight: 44,
          }}
        >
          <View style={{ flex: 1 }}>
            <Typography variant="body" weight="medium">
              {selectedModelInfo?.displayName || 'Select Model'}
            </Typography>
            {selectedModelInfo && (
              <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>
                {getCapabilityLabel(selectedModelInfo)}
              </Typography>
            )}
          </View>
          <Typography variant="body" color="secondary">
            ▶
          </Typography>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Animated.View
            entering={FadeIn}
            style={{
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: theme.borderRadius.xl,
              borderTopRightRadius: theme.borderRadius.xl,
              maxHeight: screenHeight * 0.72,
              paddingBottom: 40,
            }}
          >
            <SheetHeader
              title="Select Image Model"
              onClose={() => setIsModalVisible(false)}
              showHandle
            />
            <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: 8 }}>
              <Typography variant="caption" color="secondary">
                {aiName} • {models.length} image model{models.length === 1 ? '' : 's'} available
              </Typography>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: theme.spacing.lg }}
              showsVerticalScrollIndicator={false}
            >
              {models.map((model) => {
                const isSelected = selectedModelInfo?.id === model.id;

                return (
                  <TouchableOpacity
                    key={model.id}
                    onPress={() => handleModelSelect(model.id)}
                    style={{
                      backgroundColor: isSelected
                        ? theme.colors.primary[100]
                        : theme.colors.card,
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                      marginBottom: theme.spacing.sm,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected
                        ? theme.colors.primary[500]
                        : theme.colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                          <Typography
                            variant="subtitle"
                            weight="semibold"
                            style={{
                              color: isSelected ? '#000000' : theme.colors.text.primary,
                            }}
                          >
                            {model.displayName}
                          </Typography>
                          {model.isDefault && (
                            <Badge label="Default" type="default" />
                          )}
                          {model.isPreview && (
                            <Badge label="Preview" type="experimental" />
                          )}
                          {model.isDeprecated && (
                            <Badge label="Legacy" type="default" />
                          )}
                          {model.supportsImageInput && (
                            <Badge label="img2img" type="new" />
                          )}
                        </View>

                        <Typography
                          variant="caption"
                          style={{
                            marginBottom: 4,
                            color: isSelected ? 'rgba(0,0,0,0.7)' : theme.colors.text.secondary,
                          }}
                        >
                          {model.description}
                        </Typography>

                        <Typography
                          variant="caption"
                          style={{
                            marginBottom: 2,
                            color: isSelected ? 'rgba(0,0,0,0.65)' : theme.colors.text.secondary,
                          }}
                        >
                          {getCapabilityLabel(model)}
                        </Typography>

                        <Typography
                          variant="caption"
                          style={{
                            color: isSelected ? 'rgba(0,0,0,0.65)' : theme.colors.text.secondary,
                          }}
                        >
                          {getSizeLabel(model)}
                        </Typography>
                      </View>

                      {isSelected && (
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: '#000000',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Typography style={{ color: '#FFFFFF', fontSize: 16 }}>✓</Typography>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};
