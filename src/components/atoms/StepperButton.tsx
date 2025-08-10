import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';

interface StepperButtonProps {
  type: 'increment' | 'decrement';
  onPress: () => void;
  disabled?: boolean;
}

export const StepperButton: React.FC<StepperButtonProps> = ({
  type,
  onPress,
  disabled = false,
}) => {
  const { theme } = useTheme();
  
  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: disabled 
          ? theme.colors.gray[200] 
          : theme.colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ 
        color: disabled 
          ? theme.colors.gray[400] 
          : theme.colors.primary[600], 
        fontSize: 20, 
        fontWeight: 'bold',
      }}>
        {type === 'increment' ? '+' : '−'}
      </Text>
    </TouchableOpacity>
  );
};