import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
// import { useSelector } from 'react-redux';
// import { RootState } from '../../store';
import { Typography, Badge } from '../molecules';
import { useTheme } from '../../theme';
import { AI_MODELS } from '../../config/modelConfigs';
import { MODEL_PRICING, formatCost } from '../../config/modelPricing';
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
  // const user = useSelector((state: RootState) => state.user.currentUser);
  // const isPremium = user?.subscription === 'pro' || user?.subscription === 'business';
  // TESTING: Premium checks disabled
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const models = useMemo(() => {
    return AI_MODELS[providerId] || [];
  }, [providerId]);
  
  const selectedModelInfo = useMemo(() => {
    return models.find(m => m.id === selectedModel);
  }, [models, selectedModel]);
  
  const canSelectModel = (_model: typeof models[0]) => {
    // TESTING: Premium checks disabled - all models available
    // if (!isPremium && model.isPremium) return false;
    return true;
  };
  
  const handleModelSelect = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model && canSelectModel(model)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectModel(modelId);
      setIsModalVisible(false);
    }
  };
  
  const openModelSelector = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsModalVisible(true);
  };
  
  // Estimate cost per average message (200 input + 800 output tokens)
  const getEstimatedCost = (modelId: string) => {
    const pricing = MODEL_PRICING[providerId]?.[modelId];
    if (!pricing) return null;
    
    const estimatedCost = (200 * pricing.inputPer1M + 800 * pricing.outputPer1M) / 1_000_000;
    return formatCost(estimatedCost);
  };
  
  if (compactMode) {
    return (
      <>
        <TouchableOpacity
          onPress={openModelSelector}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.sm,
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginTop: theme.spacing.xs,
          }}
        >
          <View style={{ flex: 1 }}>
            <Typography variant="caption" color="secondary" style={{ marginBottom: 2 }}>
              Model
            </Typography>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Typography variant="body" weight="medium">
                {selectedModelInfo?.name || 'Select Model'}
              </Typography>
              {selectedModelInfo && (
                <View style={{ flexDirection: 'row', marginLeft: theme.spacing.sm }}>
                  {selectedModelInfo.supportsVision && (
                    <Typography variant="caption" color="secondary" style={{ marginRight: 4 }}>
                      👁
                    </Typography>
                  )}
                  {selectedModelInfo.supportsDocuments && (
                    <Typography variant="caption" color="secondary">
                      📄
                    </Typography>
                  )}
                </View>
              )}
            </View>
            {showPricing && MODEL_PRICING[providerId]?.[selectedModel] && (
              <Typography variant="caption" color="secondary">
                ~{getEstimatedCost(selectedModel)} per message
              </Typography>
            )}
          </View>
          <Typography variant="body" color="secondary">
            ▼
          </Typography>
        </TouchableOpacity>
        
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
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: theme.spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}>
                <View>
                  <Typography variant="heading" weight="bold">
                    Select Model
                  </Typography>
                  <Typography variant="caption" color="secondary">
                    {aiName} • {models.length} models available
                  </Typography>
                </View>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Typography variant="heading" color="secondary">✕</Typography>
                </TouchableOpacity>
              </View>
              
              {/* Model List */}
              <ScrollView 
                contentContainerStyle={{ padding: theme.spacing.lg }}
                showsVerticalScrollIndicator={false}
              >
                {models.map((model) => {
                  const isSelected = selectedModel === model.id;
                  const isLocked = !canSelectModel(model);
                  const pricing = MODEL_PRICING[providerId]?.[model.id];
                  
                  return (
                    <TouchableOpacity
                      key={model.id}
                      onPress={() => !isLocked && handleModelSelect(model.id)}
                      disabled={isLocked}
                      style={{
                        backgroundColor: isSelected 
                          ? theme.colors.primary[50]
                          : theme.colors.surface,
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Typography 
                              variant="subtitle" 
                              weight="semibold"
                              style={{ marginRight: theme.spacing.xs }}
                            >
                              {model.name}
                            </Typography>
                            {model.isDefault && (
                              <Badge label="Default" type="default" />
                            )}
                            {model.isPremium && (
                              <Badge label="Premium" type="premium" />
                            )}
                          </View>
                          
                          <Typography variant="caption" color="secondary" style={{ marginBottom: 4 }}>
                            {model.description}
                          </Typography>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="secondary" style={{ marginRight: theme.spacing.md }}>
                              {(model.contextLength / 1000).toFixed(0)}K context
                            </Typography>
                            
                            {showPricing && pricing && (
                              <Typography variant="caption" color="secondary">
                                ~{getEstimatedCost(model.id)} per message
                              </Typography>
                            )}
                            
                            {/* Capability Icons */}
                            <View style={{ flexDirection: 'row', marginLeft: theme.spacing.md }}>
                              {/* Vision/Image capability */}
                              <View style={{ position: 'relative', marginRight: theme.spacing.xs }}>
                                <Typography 
                                  variant="caption" 
                                  style={{ 
                                    color: model.supportsVision ? theme.colors.text.secondary : theme.colors.gray[400]
                                  }}
                                >
                                  👁
                                </Typography>
                                {!model.supportsVision && (
                                  <Typography 
                                    variant="caption" 
                                    style={{
                                      position: 'absolute',
                                      top: -2,
                                      left: 0,
                                      color: theme.colors.error[400],
                                      fontSize: 16,
                                    }}
                                  >
                                    ✕
                                  </Typography>
                                )}
                              </View>
                              
                              {/* Document capability */}
                              <View style={{ position: 'relative' }}>
                                <Typography 
                                  variant="caption" 
                                  style={{ 
                                    color: model.supportsDocuments ? theme.colors.text.secondary : theme.colors.gray[400]
                                  }}
                                >
                                  📄
                                </Typography>
                                {!model.supportsDocuments && (
                                  <Typography 
                                    variant="caption" 
                                    style={{
                                      position: 'absolute',
                                      top: -2,
                                      left: 0,
                                      color: theme.colors.error[400],
                                      fontSize: 16,
                                    }}
                                  >
                                    ✕
                                  </Typography>
                                )}
                              </View>
                            </View>
                          </View>
                        </View>
                        
                        {isSelected && (
                          <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: theme.colors.primary[500],
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
                
                {/* TESTING: Premium upgrade message disabled
                {!isPremium && (
                  <View style={{
                    backgroundColor: theme.colors.primary[50],
                    borderRadius: theme.borderRadius.md,
                    padding: theme.spacing.md,
                    marginTop: theme.spacing.md,
                  }}>
                    <Typography variant="caption" color="secondary">
                      🔒 Premium models are locked. Upgrade to access all models and save on API costs.
                    </Typography>
                  </View>
                )}
                */}
              </ScrollView>
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
          const isSelected = selectedModel === model.id;
          const isLocked = !canSelectModel(model);
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
              
              {model.isPremium && (
                <Badge 
                  label="Premium" 
                  type="premium" 
                />
              )}
              
              {model.isDefault && !model.isPremium && (
                <Badge label="Default" type="default" />
              )}
              
              {showPricing && pricing && (
                <Typography 
                  variant="caption" 
                  style={{ 
                    color: isSelected ? '#FFFFFF' : theme.colors.text.secondary,
                    marginTop: 4,
                  }}
                >
                  ~{getEstimatedCost(model.id)}/msg
                </Typography>
              )}
              
              <Typography 
                variant="caption" 
                style={{ 
                  color: isSelected ? '#FFFFFF' : theme.colors.text.secondary 
                }}
              >
                {(model.contextLength / 1000).toFixed(0)}K context
              </Typography>
              
              {/* Capability icons */}
              <View style={{ flexDirection: 'row', marginTop: 4 }}>
                {model.supportsVision && (
                  <Typography 
                    variant="caption" 
                    style={{ 
                      color: isSelected ? '#FFFFFF' : theme.colors.text.secondary,
                      marginRight: 4 
                    }}
                  >
                    👁
                  </Typography>
                )}
                {model.supportsDocuments && (
                  <Typography 
                    variant="caption" 
                    style={{ 
                      color: isSelected ? '#FFFFFF' : theme.colors.text.secondary 
                    }}
                  >
                    📄
                  </Typography>
                )}
              </View>
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