import React, { useEffect } from 'react';
import { View, StyleSheet, ImageSourcePropType } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';

export interface SystemAnnouncementProps {
  type: 'topic' | 'round-winner' | 'debate-complete' | 'overall-winner';
  label?: string;
  content: string;
  icon?: string | ImageSourcePropType;
  gradient?: [string, string];
  brandColor?: string;
  animation?: 'fade' | 'slide-up' | 'scale';
  onDismiss?: () => void;
}

export const SystemAnnouncement: React.FC<SystemAnnouncementProps> = ({
  type,
  label,
  content,
  icon,
  gradient,
  brandColor,
  animation = 'fade',
}) => {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(0.95);
  
  useEffect(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, [scale]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const getEnteringAnimation = () => {
    switch (animation) {
      case 'slide-up':
        return FadeInDown.springify().damping(15);
      case 'scale':
        return FadeInDown.duration(300);
      default:
        return FadeInDown.duration(400);
    }
  };
  
  const getDefaultGradient = (): [string, string] => {
    switch (type) {
      case 'topic':
        return ['rgba(99,102,241,0.1)', 'rgba(168,85,247,0.1)'];
      case 'round-winner':
        return ['rgba(34,197,94,0.1)', 'rgba(59,130,246,0.1)'];
      case 'debate-complete':
        return ['rgba(249,115,22,0.1)', 'rgba(239,68,68,0.1)'];
      case 'overall-winner':
        return ['rgba(234,179,8,0.1)', 'rgba(168,85,247,0.1)'];
      default:
        return ['rgba(99,102,241,0.1)', 'rgba(168,85,247,0.1)'];
    }
  };
  
  const getDefaultIcon = (): string => {
    switch (type) {
      case 'topic':
        return '💭';
      case 'round-winner':
        return '🎯';
      case 'debate-complete':
        return '🏁';
      case 'overall-winner':
        return '🏆';
      default:
        return '📢';
    }
  };
  
  return (
    <Animated.View
      entering={getEnteringAnimation()}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <Animated.View style={animatedStyle}>
        <BlurView intensity={isDark ? 80 : 60} style={styles.blurContainer}>
          <LinearGradient
            colors={gradient || getDefaultGradient()}
            style={styles.gradientOverlay}
          >
            {label && (
              <Typography
                variant="caption"
                weight="semibold"
                style={{
                  ...styles.label,
                  color: brandColor || theme.colors.text.secondary
                }}
              >
                {label}
              </Typography>
            )}
            
            <View style={styles.contentRow}>
              {(icon || type) && (
                <Typography variant="title" style={styles.icon}>
                  {typeof icon === 'string' ? icon : getDefaultIcon()}
                </Typography>
              )}
              <Typography
                variant="body"
                weight="bold"
                align="center"
                style={styles.content}
              >
                {content}
              </Typography>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientOverlay: {
    padding: 16,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginBottom: 4,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    textAlign: 'center',
  },
});