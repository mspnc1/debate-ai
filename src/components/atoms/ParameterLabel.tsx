import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '../atoms';
import { useTheme } from '../../theme';

interface ParameterLabelProps {
  name: string;
  value: number | string;
  description?: string;
}

export const ParameterLabel: React.FC<ParameterLabelProps> = ({
  name,
  value,
  description,
}) => {
  const { theme } = useTheme();
  
  const formatName = (str: string) => {
    return str.charAt(0).toUpperCase() + 
           str.slice(1).replace(/([A-Z])/g, ' $1').trim();
  };
  
  return (
    <View>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
      }}>
        <ThemedText variant="subtitle" weight="semibold">
          {formatName(name)}
        </ThemedText>
        <ThemedText variant="body" color="brand" weight="bold">
          {value}
        </ThemedText>
      </View>
      {description && (
        <ThemedText variant="caption" color="secondary">
          {description}
        </ThemedText>
      )}
    </View>
  );
};