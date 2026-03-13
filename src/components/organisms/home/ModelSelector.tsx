import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Typography, InfoButton } from '@/components/molecules';
import { ActualPricing } from '@/components/organisms/subscription/ActualPricing';
import { useTheme } from '@/theme';
import { ModelConfig } from '@/config/modelConfigs';
import { MODEL_PRICING, getFreeMessageInfo } from '@/config/modelPricing';

interface ModelSelectorProps {
  models: ModelConfig[];
  selectedModel?: string;
  onSelectModel: (modelId: string) => void; // Pass empty string ('') to clear selection
  providerId: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onSelectModel,
  providerId,
}) => {
  const { theme } = useTheme();
  const visibleModels = models.filter((model) => !model.isDeprecated);
  const effectiveSelectedModel = visibleModels.some((model) => model.id === selectedModel)
    ? selectedModel
    : visibleModels.find((model) => model.isDefault)?.id;
  
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: theme.spacing.sm }}>
        <Typography variant="subtitle" weight="semibold">
          Default Model Selection (optional)
        </Typography>
        <InfoButton topicId="expert-mode" size="small" />
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: theme.spacing.md }}
      >
        {visibleModels.map((model) => {
          const isSelected = effectiveSelectedModel === model.id;
          
          return (
            <TouchableOpacity
              key={model.id}
              onPress={() => onSelectModel(isSelected ? '' : model.id)}
              style={{
                backgroundColor: isSelected 
                  ? theme.colors.primary[500] 
                  : theme.colors.surface,
                borderRadius: theme.borderRadius.md,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                marginRight: theme.spacing.sm,
                borderWidth: 1,
                borderColor: isSelected
                  ? theme.colors.primary[500]
                  : theme.colors.border,
                minWidth: 120,
              }}
            >
              <View style={{ alignItems: 'center' }}>
                <Typography 
                  variant="caption" 
                  weight="semibold"
                  style={{ 
                    color: isSelected 
                      ? '#FFFFFF' 
                      : theme.colors.text.primary,
                    marginBottom: 4,
                  }}
                >
                  {model.name}
                </Typography>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {effectiveSelectedModel && (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Typography 
            variant="caption" 
            color="secondary"
          >
            {visibleModels.find(m => m.id === effectiveSelectedModel)?.description}
          </Typography>
          <View style={{ marginTop: theme.spacing.xs }}>
            {(() => {
              const pricing = MODEL_PRICING[providerId]?.[effectiveSelectedModel];
              const freeInfo = getFreeMessageInfo(providerId, effectiveSelectedModel);
              
              if (pricing || freeInfo) {
                return (
                  <ActualPricing
                    inputPricePerM={pricing?.inputPer1M}
                    outputPricePerM={pricing?.outputPer1M}
                    freeInfo={freeInfo}
                    compact={false}
                  />
                );
              }
              return null;
            })()}
          </View>
        </View>
      )}

      {/* No upsell — all models selectable; demo mode handled elsewhere */}
    </View>
  );
};
