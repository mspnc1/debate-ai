import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../atoms';
import { useTheme } from '../../theme';

interface PricingDisplayProps {
  costPerMessage: string;
  freeInfo?: string | null;
  compact?: boolean;
}

export const PricingDisplay: React.FC<PricingDisplayProps> = ({
  costPerMessage,
  freeInfo,
  compact = false,
}) => {
  const { theme } = useTheme();
  
  if (compact) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <ThemedText variant="caption" color="secondary">
          ~{costPerMessage}/msg
        </ThemedText>
        {freeInfo && (
          <>
            <ThemedText variant="caption" color="secondary">•</ThemedText>
            <ThemedText variant="caption" color="success" weight="semibold">
              {freeInfo}
            </ThemedText>
          </>
        )}
      </View>
    );
  }
  
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <ThemedText variant="caption" color="secondary">Est. cost:</ThemedText>
        <ThemedText variant="body" color="primary" weight="semibold">
          {costPerMessage}
        </ThemedText>
        <ThemedText variant="caption" color="secondary">per message</ThemedText>
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
};