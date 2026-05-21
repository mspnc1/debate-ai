import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
// Upsell removed; no dispatch required
import { Typography, Badge, SheetHeader } from '@/components/molecules';
import { useTheme } from '@/theme';
import { getModelContextLabel, getProviderModels } from '@/config/modelConfigs';
import { MODEL_PRICING } from '@/config/modelPricing';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ModelSelectorEnhancedProps {
  providerId: string;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  showPricing?: boolean;
  compactMode?: boolean;
  aiName?: string;
}

const { height: screenHeight } = Dimensions.get('window');

export const ModelSelectorEnhanced: React.FC<ModelSelectorEnhancedProps> = ({
  providerId,
  selectedModel,
  onSelectModel,
  showPricing = true,
  compactMode = false,
  aiName = '',
}) => {
  const { theme } = useTheme();

  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const models = useMemo(() => {
    return (getProviderModels(providerId) || []).filter((model) => !model.isDeprecated);
  }, [providerId]);

  const effectiveSelectedModel = useMemo(() => {
    if (models.some((model) => model.id === selectedModel)) {
      return selectedModel;
    }
    return models.find((model) => model.isDefault)?.id || '';
  }, [models, selectedModel]);
  
  const selectedModelInfo = useMemo(() => {
    return models.find(m => m.id === effectiveSelectedModel);
  }, [models, effectiveSelectedModel]);
  
  const canSelectModel = (_model: typeof models[0]) => true;
  
  const handleModelSelect = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model && canSelectModel(model)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectModel(modelId);
      setIsModalVisible(false);
    }
  };
  
  // Get token pricing for display
  const getTokenPricing = (modelId: string) => {
    const pricing = MODEL_PRICING[providerId]?.[modelId];
    if (!pricing) return null;
    
    return `$${pricing.inputPer1M}/$${pricing.outputPer1M} per 1M`;
  };
  
  if (compactMode) {
    return (
      <>
        <View style={{ width: '100%' }}>
          {/* Label */}
          <Typography variant="caption" color="secondary" style={{ marginBottom: 4 }}>
            Model
          </Typography>
          
          {/* Compact model selector button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsModalVisible(true);
            }}
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
                {selectedModelInfo?.name || 'Select Model'}
              </Typography>
              {showPricing && MODEL_PRICING[providerId]?.[effectiveSelectedModel] && (
                <Typography variant="caption" color="secondary" style={{ marginTop: 2 }}>
                  {getTokenPricing(effectiveSelectedModel)}
                </Typography>
              )}
            </View>
            <Typography variant="body" color="secondary">
              ▶
            </Typography>
          </TouchableOpacity>
        </View>

        {/* Modal for model selection */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}>
            <Animated.View
              entering={FadeIn}
              style={{
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: theme.borderRadius.xl,
                borderTopRightRadius: theme.borderRadius.xl,
                maxHeight: screenHeight * 0.7,
                paddingBottom: 40,
              }}
            >
              {/* Header */}
              <SheetHeader title="Select Model" onClose={() => setIsModalVisible(false)} showHandle />
              <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: 8 }}>
                <Typography variant="caption" color="secondary">
                  {aiName} • {models.length} models available
                </Typography>
              </View>
              
              {/* Model List */}
              <ScrollView 
                contentContainerStyle={{ padding: theme.spacing.lg }}
                showsVerticalScrollIndicator={false}
              >
                {models.map((model) => {
                  const isSelected = effectiveSelectedModel === model.id;
                  const isLocked = !canSelectModel(model);
                  const contextLabel = getModelContextLabel(model);
                  const pricing = MODEL_PRICING[providerId]?.[model.id];
                  
                  return (
                    <TouchableOpacity
                      key={model.id}
                      onPress={() => !isLocked && handleModelSelect(model.id)}
                      disabled={isLocked}
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
                        opacity: isLocked ? 0.5 : 1,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                            <Typography 
                              variant="subtitle" 
                              weight="semibold"
                              style={{ 
                                marginRight: theme.spacing.xs,
                                color: isSelected ? '#000000' : theme.colors.text.primary
                              }}
                            >
                              {model.name}
                            </Typography>
                            {model.isDefault && (
                              <Badge label="Default" type="default" />
                            )}
                            {model.supportsWebSearch && (
                              <Badge label="Live Search" type="new" />
                            )}
                          </View>
                          
                          <Typography 
                            variant="caption" 
                            style={{ 
                              marginBottom: 4,
                              color: isSelected ? 'rgba(0,0,0,0.7)' : theme.colors.text.secondary
                            }}
                          >
                            {model.description}
                          </Typography>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            {contextLabel && (
                              <Typography 
                                variant="caption" 
                                style={{ 
                                  marginRight: theme.spacing.md,
                                  color: isSelected ? 'rgba(0,0,0,0.6)' : theme.colors.text.secondary
                                }}
                              >
                                {contextLabel}
                              </Typography>
                            )}
                            
                            {showPricing && pricing && (
                              <Typography 
                                variant="caption"
                                style={{
                                  color: isSelected ? 'rgba(0,0,0,0.6)' : theme.colors.text.secondary
                                }}
                              >
                                {getTokenPricing(model.id)}
                              </Typography>
                            )}
                          </View>
                        </View>
                        
                        {isSelected && (
                          <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: '#000000',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}>
                            <Typography style={{ color: '#FFFFFF', fontSize: 16 }}>✓</Typography>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Upsell CTA for free users when premium models exist */}
              {/* No upsell — all models selectable; demo mode handled elsewhere */}
            </Animated.View>
          </View>
        </Modal>
      </>
    );
  }
  
  // Full mode (horizontal scroll)
  return (
    <View>
      <Typography variant="subtitle" weight="semibold" style={{ marginBottom: theme.spacing.sm }}>
        Model Selection
      </Typography>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: theme.spacing.md }}
      >
        {models.map((model) => {
          const isSelected = effectiveSelectedModel === model.id;
          const isLocked = !canSelectModel(model);
          const contextLabel = getModelContextLabel(model);
          const pricing = MODEL_PRICING[providerId]?.[model.id];
          
          return (
            <TouchableOpacity
              key={model.id}
              onPress={() => !isLocked && handleModelSelect(model.id)}
              disabled={isLocked}
              style={{
                backgroundColor: isSelected 
                  ? theme.colors.primary[500]
                  : theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                padding: theme.spacing.md,
                marginRight: theme.spacing.sm,
                opacity: isLocked ? 0.5 : 1,
                minWidth: 140,
                borderWidth: 1,
                borderColor: isSelected
                  ? theme.colors.primary[500]
                  : theme.colors.border,
              }}
            >
              <Typography 
                variant="subtitle" 
                weight="semibold"
                style={{ 
                  color: isSelected ? '#FFFFFF' : theme.colors.text.primary,
                  marginBottom: 4,
                }}
              >
                {model.name}
              </Typography>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {model.isDefault && (
                  <Badge label="Default" type="default" />
                )}
                {model.supportsWebSearch && (
                  <Badge label="Live Search" type="new" />
                )}
              </View>
              
              {showPricing && pricing && (
                <Typography 
                  variant="caption" 
                  style={{ 
                    color: isSelected ? '#FFFFFF' : theme.colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  {getTokenPricing(model.id)}
                </Typography>
              )}
              
              {contextLabel && (
                <Typography 
                  variant="caption" 
                  style={{ 
                    color: isSelected ? '#FFFFFF' : theme.colors.text.secondary 
                  }}
                >
                  {contextLabel}
                </Typography>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {selectedModelInfo && (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Typography variant="caption" color="secondary">
            {selectedModelInfo.description}
          </Typography>
        </View>
      )}
    </View>
  );
};
