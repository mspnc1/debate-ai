import React from 'react';
import { View, Text } from 'react-native';
import { ThemedText } from '../atoms';
import { useTheme } from '../../theme';

interface ActualPricingProps {
  inputPricePerM?: number;
  outputPricePerM?: number;
  freeInfo?: string | null;
  compact?: boolean;
}

export const ActualPricing: React.FC<ActualPricingProps> = ({
  inputPricePerM,
  outputPricePerM,
  freeInfo,
  compact = false,
}) => {
  const { theme } = useTheme();
  
  // If it's a subscription service (Nomi, Replika, etc)
  if (inputPricePerM === 0 && outputPricePerM === 0 && freeInfo) {
    return (
      <ThemedText 
        variant={compact ? "caption" : "body"}
        style={{ 
          color: theme.colors.success[600],
          fontSize: compact ? 12 : 13,
        }}
      >
        {freeInfo}
      </ThemedText>
    );
  }
  
  // If we don't have pricing data and no free info
  if ((inputPricePerM === undefined || outputPricePerM === undefined) && !freeInfo) {
    return null;
  }
  
  if (compact) {
    if (inputPricePerM !== undefined && outputPricePerM !== undefined) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ThemedText variant="caption" color="secondary">
            ${inputPricePerM}/1M in
          </ThemedText>
          <ThemedText variant="caption" color="secondary">•</ThemedText>
          <ThemedText variant="caption" color="secondary">
            ${outputPricePerM}/1M out
          </ThemedText>
          {freeInfo && (
            <>
              <ThemedText variant="caption" color="secondary">•</ThemedText>
              <ThemedText variant="caption" color="success">
                {freeInfo}
              </ThemedText>
            </>
          )}
        </View>
      );
    } else if (freeInfo) {
      return (
        <ThemedText variant="caption" color="success">
          {freeInfo}
        </ThemedText>
      );
    }
    return null;
  }
  
  if (inputPricePerM !== undefined && outputPricePerM !== undefined) {
    return (
      <View>
        <ThemedText variant="caption" color="secondary" style={{ marginBottom: 2 }}>
          API Pricing:
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <ThemedText variant="body" weight="semibold">
              ${inputPricePerM}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              /1M input
            </ThemedText>
          </View>
          <Text style={{ color: theme.colors.text.disabled }}>•</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
            <ThemedText variant="body" weight="semibold">
              ${outputPricePerM}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              /1M output
            </ThemedText>
          </View>
        </View>
        {freeInfo && (
          <View style={{ 
            backgroundColor: theme.colors.success[50], 
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: theme.borderRadius.sm,
            marginTop: 4,
            alignSelf: 'flex-start',
          }}>
            <ThemedText variant="caption" color="success" weight="semibold">
              ✨ {freeInfo}
            </ThemedText>
          </View>
        )}
      </View>
    );
  }
  
  // Only free info available
  if (freeInfo) {
    return (
      <View style={{ 
        backgroundColor: theme.colors.success[50], 
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
        alignSelf: 'flex-start',
      }}>
        <ThemedText variant="caption" color="success" weight="semibold">
          ✨ {freeInfo}
        </ThemedText>
      </View>
    );
  }
  
  return null;
};