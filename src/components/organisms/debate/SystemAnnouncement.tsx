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
  type: 'topic' | 'exchange-winner' | 'debate-complete' | 'overall-winner' | 'debate-start' | 'audience-stance';
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
  const isAudienceCue = type === 'audience-stance';
  
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
        return [theme.colors.semantic.primary, theme.colors.semantic.secondary];
      case 'debate-start':
        return [theme.colors.semantic.info, theme.colors.semantic.primary];
      case 'audience-stance':
        return [theme.colors.semantic.info, theme.colors.semantic.success];
      case 'exchange-winner':
        return [theme.colors.semantic.success, theme.colors.semantic.info];
      case 'debate-complete':
        return [theme.colors.semantic.warning, theme.colors.semantic.error];
      case 'overall-winner':
        return [theme.colors.semantic.gold, theme.colors.semantic.secondary];
      default:
        return [theme.colors.semantic.primary, theme.colors.semantic.secondary];
    }
  };
  
  const getDefaultIcon = (): string => {
    switch (type) {
      case 'topic':
        return ''; // No icon for topic - looks cleaner
      case 'debate-start':
        return '🥊';
      case 'audience-stance':
        return '◉';
      case 'exchange-winner':
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
        <BlurView
          intensity={isAudienceCue ? (isDark ? 90 : 70) : (isDark ? 80 : 60)}
          style={[
            styles.blurContainer,
            isAudienceCue && styles.audienceContainer,
            isAudienceCue && {
              borderColor: isDark ? theme.colors.primary[500] : theme.colors.primary[200],
              backgroundColor: isDark ? theme.colors.overlays.soft : theme.colors.primary[50],
            },
          ]}
        >
          <LinearGradient
            colors={gradient || getDefaultGradient()}
            style={[
              styles.gradientOverlay,
              isAudienceCue && styles.audienceGradient,
            ]}
          >
            {label && (
              <Typography
                variant="caption"
                weight="semibold"
                style={[
                  styles.label,
                  isAudienceCue && styles.audienceLabel,
                  {
                    color: brandColor || (isAudienceCue ? theme.colors.primary[400] : theme.colors.text.secondary),
                  },
                ]}
                selectable
              >
                {label}
              </Typography>
            )}
            
            <View style={[
              styles.contentRow,
              isAudienceCue && styles.audienceContentRow,
            ]}>
              {(() => {
                const displayIcon = typeof icon === 'string' ? icon : getDefaultIcon();
                return displayIcon ? (
                  <Typography
                    variant="title"
                    style={[
                      styles.icon,
                      isAudienceCue && {
                        color: theme.colors.primary[400],
                      },
                    ]}
                  >
                    {displayIcon}
                  </Typography>
                ) : null;
              })()}
              <Typography
                variant={isAudienceCue ? 'caption' : 'body'}
                weight={isAudienceCue ? 'semibold' : 'bold'}
                align="center"
                style={[
                  styles.content,
                  isAudienceCue && styles.audienceContent,
                ]}
                selectable
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
  audienceContainer: {
    borderWidth: 1,
    shadowColor: 'rgba(0,0,0,0.18)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 4,
  },
  gradientOverlay: {
    padding: 16,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audienceGradient: {
    minHeight: 78,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  label: {
    marginBottom: 4,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  audienceLabel: {
    letterSpacing: 0,
    marginBottom: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  audienceContentRow: {
    gap: 10,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    textAlign: 'center',
  },
  audienceContent: {
    fontSize: 14,
    lineHeight: 20,
  },
});
