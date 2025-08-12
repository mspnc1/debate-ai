import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  FadeInDown,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { Typography } from '../molecules';
import { useTheme } from '../../theme';

interface TypingIndicatorProps {
  aiName: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ aiName }) => {
  const { theme } = useTheme();
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  
  React.useEffect(() => {
    dot1.value = withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    );
    dot2.value = withDelay(200, withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    ));
    dot3.value = withDelay(400, withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    ));
  }, [dot1, dot2, dot3]);
  
  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -dot1.value * 4 }],
    opacity: 0.4 + dot1.value * 0.6,
  }));
  
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -dot2.value * 4 }],
    opacity: 0.4 + dot2.value * 0.6,
  }));
  
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: -dot3.value * 4 }],
    opacity: 0.4 + dot3.value * 0.6,
  }));
  
  return (
    <Animated.View 
      entering={FadeInDown}
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface }
      ]}
    >
      <Typography variant="caption" color="secondary" style={styles.text}>
        {aiName} is typing
      </Typography>
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, dot1Style, { backgroundColor: theme.colors.primary[500] }]} />
        <Animated.View style={[styles.dot, dot2Style, { backgroundColor: theme.colors.primary[500] }]} />
        <Animated.View style={[styles.dot, dot3Style, { backgroundColor: theme.colors.primary[500] }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
});