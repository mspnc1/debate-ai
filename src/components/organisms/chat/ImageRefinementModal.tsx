import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Box } from '../../atoms';
import { useTheme } from '../../../theme';
import { GradientButton, SheetHeader, Typography, KeyboardAvoider } from '@/components/molecules';
import { Badge } from '@/components/molecules/common/Badge';
import {
  getDefaultImageInputModel,
  getImageInputModels,
  getImageProviderDisplayName,
  ImageModelConfig,
  supportsImageInput,
} from '@/config/imageGenerationModels';
import type { AIProvider } from '@/types';

export interface RefinementProvider {
  provider: AIProvider;
  name: string;
  supportsImg2Img: boolean;
  hasApiKey: boolean;
}

export interface ImageRefinementModalProps {
  visible: boolean;
  imageUri: string;
  originalProvider: AIProvider;
  originalModelId?: string;
  availableProviders: RefinementProvider[];
  onClose: () => void;
  onRefine: (opts: {
    instructions: string;
    provider: AIProvider;
    modelId: string;
  }) => void;
}

const QUICK_SUGGESTIONS = [
  { label: 'More detail', instruction: 'Add more fine details and textures throughout the image' },
  { label: 'Vibrant colors', instruction: 'Make the colors more vibrant and saturated' },
  { label: 'Dramatic lighting', instruction: 'Add more dramatic lighting and shadows' },
  { label: 'Sharper', instruction: 'Make the image sharper and crisper with more defined edges' },
  { label: 'Artistic style', instruction: 'Apply a more artistic, painterly style' },
  { label: 'Fix faces', instruction: 'Improve the faces to look more natural and realistic' },
];

function getPreferredInputModelId(provider: AIProvider, preferredModelId?: string): string | undefined {
  if (preferredModelId && supportsImageInput(provider, preferredModelId)) {
    return preferredModelId;
  }

  return getDefaultImageInputModel(provider)?.id || getImageInputModels(provider)[0]?.id;
}

function getCapabilityCopy(model: ImageModelConfig): string {
  if (model.supportsMultipleReferenceImages) {
    return 'Supports refinement and reference images';
  }
  return 'Supports image refinement';
}

export const ImageRefinementModal: React.FC<ImageRefinementModalProps> = ({
  visible,
  imageUri,
  originalProvider,
  originalModelId,
  availableProviders,
  onClose,
  onRefine,
}) => {
  const { theme, isDark } = useTheme();
  const [instructions, setInstructions] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | undefined>(originalProvider);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(originalModelId);

  const eligibleProviders = useMemo(() => {
    return availableProviders.filter((providerInfo) => {
      if (!providerInfo.hasApiKey || !providerInfo.supportsImg2Img) {
        return false;
      }

      return getImageInputModels(providerInfo.provider).length > 0;
    });
  }, [availableProviders]);

  const selectedProviderInfo = useMemo(() => {
    return eligibleProviders.find((providerInfo) => providerInfo.provider === selectedProvider);
  }, [eligibleProviders, selectedProvider]);

  const availableModels = useMemo(() => {
    return selectedProvider ? getImageInputModels(selectedProvider) : [];
  }, [selectedProvider]);

  const selectedModelInfo = useMemo(() => {
    return availableModels.find((model) => model.id === selectedModelId);
  }, [availableModels, selectedModelId]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const nextProvider = eligibleProviders.some((providerInfo) => providerInfo.provider === originalProvider)
      ? originalProvider
      : eligibleProviders[0]?.provider;

    if (!nextProvider) {
      setSelectedProvider(undefined);
      setSelectedModelId(undefined);
      return;
    }

    setSelectedProvider(nextProvider);
    setSelectedModelId(getPreferredInputModelId(
      nextProvider,
      nextProvider === originalProvider ? originalModelId : undefined
    ));
  }, [eligibleProviders, originalModelId, originalProvider, visible]);

  const handleQuickSuggestion = (instruction: string) => {
    setInstructions((currentInstructions) => {
      if (currentInstructions.trim()) {
        return `${currentInstructions.trim()}. ${instruction}`;
      }
      return instruction;
    });
  };

  const handleProviderSelect = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setSelectedModelId(getPreferredInputModelId(
      provider,
      provider === originalProvider ? originalModelId : undefined
    ));
  };

  const handleRefine = () => {
    if (!instructions.trim() || !selectedProvider || !selectedModelInfo) {
      return;
    }

    onRefine({
      instructions: instructions.trim(),
      provider: selectedProvider,
      modelId: selectedModelInfo.id,
    });
    setInstructions('');
  };

  const canRefine = instructions.trim().length > 0 && Boolean(selectedProvider) && Boolean(selectedModelInfo);
  const selectedProviderLabel = selectedProviderInfo?.name
    || (selectedProvider ? getImageProviderDisplayName(selectedProvider) : 'Unavailable');
  const selectedCardBackground = isDark ? 'rgba(61, 159, 255, 0.22)' : theme.colors.primary[100];
  const selectedTitleColor = isDark ? theme.colors.text.primary : theme.colors.text.black;
  const selectedMetaColor = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.68)';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      <BlurView intensity={24} style={styles.backdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.background }]}
            onPress={Keyboard.dismiss}
          >
            <SafeAreaView style={styles.safeArea}>
              <SheetHeader
                title="Refine Image"
                onClose={onClose}
                showHandle
                testID="refinement-header"
              />

              <KeyboardAvoider style={styles.flex}>
                <ScrollView
                  contentContainerStyle={styles.content}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  onScrollBeginDrag={Keyboard.dismiss}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.summaryRow}>
                    <Typography variant="caption" color="secondary">
                      {selectedProviderLabel} • {availableModels.length} refinement model{availableModels.length === 1 ? '' : 's'} available
                    </Typography>
                  </View>

                  <Box
                    style={[
                      styles.previewCard,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={[styles.imagePreview, { backgroundColor: theme.colors.surface }]}
                      resizeMode="contain"
                    />
                    <View style={styles.previewMeta}>
                      <Typography variant="caption" color="secondary">
                        Reference image
                      </Typography>
                      <Typography variant="caption" style={{ color: theme.colors.text.secondary }}>
                        Only models that support image refinement are shown below.
                      </Typography>
                    </View>
                  </Box>

                  <Box style={styles.section}>
                    <Typography variant="body" weight="semibold" color="secondary" style={styles.label}>
                      What would you like to change?
                    </Typography>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          borderColor: theme.colors.border,
                          color: theme.colors.text.primary,
                          backgroundColor: theme.colors.surface,
                        },
                      ]}
                      placeholder="Describe the improvements you want..."
                      placeholderTextColor={theme.colors.text.secondary}
                      value={instructions}
                      onChangeText={setInstructions}
                      multiline
                      numberOfLines={4}
                    />
                  </Box>

                  <Box style={styles.section}>
                    <Typography variant="body" weight="semibold" color="secondary" style={styles.label}>
                      Quick suggestions
                    </Typography>
                    <Box style={styles.rowWrap}>
                      {QUICK_SUGGESTIONS.map((suggestion) => (
                        <TouchableOpacity
                          key={suggestion.label}
                          onPress={() => handleQuickSuggestion(suggestion.instruction)}
                          style={[
                            styles.suggestionChip,
                            {
                              borderColor: theme.colors.border,
                              backgroundColor: theme.colors.surface,
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Typography variant="caption" color="primary">
                            {suggestion.label}
                          </Typography>
                        </TouchableOpacity>
                      ))}
                    </Box>
                  </Box>

                  <Box style={styles.section}>
                    <Typography variant="body" weight="semibold" color="secondary" style={styles.label}>
                      Refine with
                    </Typography>
                    <Typography variant="caption" color="secondary" style={styles.helperText}>
                      Pick a provider and the exact model that should edit this image.
                    </Typography>

                    {eligibleProviders.length > 1 && (
                      <Box style={styles.providerRow}>
                        {eligibleProviders.map((providerInfo) => {
                          const isSelected = selectedProvider === providerInfo.provider;
                          return (
                            <TouchableOpacity
                              key={providerInfo.provider}
                              onPress={() => handleProviderSelect(providerInfo.provider)}
                              style={[
                                styles.providerChip,
                                {
                                  borderColor: isSelected ? theme.colors.primary[500] : theme.colors.border,
                                  backgroundColor: isSelected ? selectedCardBackground : theme.colors.surface,
                                },
                              ]}
                              activeOpacity={0.7}
                              testID={`provider-option-${providerInfo.provider}`}
                            >
                              <Typography
                                variant="body"
                                weight={isSelected ? 'semibold' : 'normal'}
                                style={{ color: isSelected ? selectedTitleColor : theme.colors.text.primary }}
                              >
                                {providerInfo.name}
                              </Typography>
                            </TouchableOpacity>
                          );
                        })}
                      </Box>
                    )}

                    {selectedProvider && availableModels.length > 0 ? (
                      <View style={styles.modelStack}>
                        {availableModels.map((model) => {
                          const isSelected = selectedModelInfo?.id === model.id;

                          return (
                            <TouchableOpacity
                              key={model.id}
                              onPress={() => setSelectedModelId(model.id)}
                              style={[
                                styles.modelCard,
                                {
                                  backgroundColor: isSelected ? selectedCardBackground : theme.colors.card,
                                  borderColor: isSelected ? theme.colors.primary[500] : theme.colors.border,
                                  borderWidth: isSelected ? 2 : 1,
                                },
                              ]}
                              activeOpacity={0.8}
                              testID={`model-option-${model.id}`}
                            >
                              <View style={styles.modelCardHeader}>
                                <View style={styles.modelTitleWrap}>
                                  <Typography
                                    variant="caption"
                                    style={{ color: isSelected ? selectedMetaColor : theme.colors.text.secondary }}
                                  >
                                    {selectedProviderLabel}
                                  </Typography>
                                  <View style={styles.modelTitleRow}>
                                    <Typography
                                      variant="subtitle"
                                      weight="semibold"
                                      style={{ color: isSelected ? selectedTitleColor : theme.colors.text.primary }}
                                    >
                                      {model.displayName}
                                    </Typography>
                                    {model.isDefault && <Badge label="Default" type="default" />}
                                    {model.isPreview && <Badge label="Preview" type="experimental" />}
                                    {model.isDeprecated && <Badge label="Legacy" type="default" />}
                                  </View>
                                </View>

                                {isSelected && (
                                  <View style={styles.selectedIcon}>
                                    <Typography style={styles.selectedIconText}>✓</Typography>
                                  </View>
                                )}
                              </View>

                              <Typography
                                variant="caption"
                                style={{
                                  color: isSelected ? selectedMetaColor : theme.colors.text.secondary,
                                  marginBottom: 4,
                                }}
                              >
                                {getCapabilityCopy(model)}
                              </Typography>

                              <Typography
                                variant="caption"
                                style={{ color: isSelected ? selectedMetaColor : theme.colors.text.secondary }}
                              >
                                {model.description}
                              </Typography>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.emptyState,
                          {
                            backgroundColor: theme.colors.card,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Ionicons name="warning-outline" size={18} color={theme.colors.text.secondary} />
                        <Typography variant="caption" color="secondary" style={styles.emptyStateText}>
                          No configured provider currently supports image refinement.
                        </Typography>
                      </View>
                    )}
                  </Box>
                </ScrollView>

                <Box
                  style={[
                    styles.actions,
                    {
                      borderTopColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={onClose}
                    style={[
                      styles.button,
                      styles.cancelButton,
                      {
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Typography variant="body" color="secondary">
                      Cancel
                    </Typography>
                  </TouchableOpacity>

                  <GradientButton
                    title="Refine Image"
                    onPress={handleRefine}
                    disabled={!canRefine}
                    style={styles.actionGradient}
                    testID="refine-submit"
                  />
                </Box>
              </KeyboardAvoider>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  backdropTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '78%',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  summaryRow: {
    marginBottom: 12,
  },
  previewCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 18,
  },
  imagePreview: {
    width: '100%',
    height: 190,
    borderRadius: 14,
  },
  previewMeta: {
    marginTop: 12,
    gap: 4,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 8,
  },
  helperText: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 108,
    textAlignVertical: 'top',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  providerChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  modelStack: {
    gap: 10,
  },
  modelCard: {
    borderRadius: 18,
    padding: 14,
  },
  modelCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modelTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  selectedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIconText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  emptyStateText: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  actionGradient: {
    flex: 1,
  },
});

export default ImageRefinementModal;
