import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

interface AIAvatarProps {
  emoji: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  isSelected?: boolean;
  style?: ViewStyle;
}

export const AIAvatar: React.FC<AIAvatarProps> = ({
  emoji,
  size = 'medium',
  color,
  isSelected = false,
  style,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  
  const sizeMap = {
    small: { container: 36, emoji: 18 },
    medium: { container: 48, emoji: 24 },
    large: { container: 64, emoji: 32 },
  };
  
  const dimensions = sizeMap[size];
  
  React.useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withSpring(1.1, { damping: 10 }),
        withSpring(1, { damping: 15 })
      );
    }
  }, [isSelected, scale]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <Animated.View style={[animatedStyle, style]}>
      <View
        style={{
          width: dimensions.container,
          height: dimensions.container,
          borderRadius: dimensions.container / 2,
          backgroundColor: color 
            ? `${color}20` 
            : theme.colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: color || theme.colors.primary[500],
        }}
      >
        <Text style={{ fontSize: dimensions.emoji }}>
          {emoji}
        </Text>
      </View>
    </Animated.View>
  );
};