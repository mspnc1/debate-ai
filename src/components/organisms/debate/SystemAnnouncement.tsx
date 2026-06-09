import React, { useEffect } from 'react';
import { View, StyleSheet, ImageSourcePropType, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '../../molecules';
import { useTheme, type Theme } from '../../../theme';

export interface SystemAnnouncementProps {
  type: 'topic' | 'exchange-winner' | 'debate-complete' | 'overall-winner' | 'debate-start' | 'audience-stance' | 'audience-questions' | 'mc';
  label?: string;
  content: string;
  icon?: string | ImageSourcePropType;
  gradient?: [string, string];
  brandColor?: string;
  animation?: 'fade' | 'slide-up' | 'scale';
  onDismiss?: () => void;
  onReportContent?: () => void;
}

interface AnnouncementPalette {
  gradient: [string, string];
  borderColor: string;
  backgroundColor: string;
  labelColor: string;
  contentColor: string;
  iconColor: string;
}

const parseAudienceQuestions = (content: string): { aff: string; neg: string } => {
  const lines = content
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  const affirmative = lines.find(line => line.toLowerCase().startsWith('affirmative:'));
  const negative = lines.find(line => line.toLowerCase().startsWith('negative:'));

  return {
    aff: affirmative?.replace(/^affirmative:\s*/i, '') ?? '',
    neg: negative?.replace(/^negative:\s*/i, '') ?? '',
  };
};

export const getSystemAnnouncementPalette = (
  theme: Theme,
  isDark: boolean,
  type: SystemAnnouncementProps['type']
): AnnouncementPalette => {
  const neutralSurface = theme.colors.card;

  switch (type) {
    case 'mc':
      return {
        gradient: isDark
          ? [theme.colors.card, theme.colors.surface]
          : [theme.colors.primary[50], theme.colors.card],
        borderColor: isDark ? theme.colors.primary[500] : theme.colors.primary[200],
        backgroundColor: neutralSurface,
        labelColor: isDark ? theme.colors.primary[300] : theme.colors.primary[700],
        contentColor: theme.colors.text.primary,
        iconColor: isDark ? theme.colors.primary[300] : theme.colors.primary[700],
      };
    case 'audience-stance':
    case 'audience-questions':
      return {
        gradient: isDark
          ? [theme.colors.card, theme.colors.surface]
          : [theme.colors.primary[50], theme.colors.card],
        borderColor: isDark ? theme.colors.primary[500] : theme.colors.primary[200],
        backgroundColor: isDark ? theme.colors.card : theme.colors.primary[50],
        labelColor: isDark ? theme.colors.primary[300] : theme.colors.primary[700],
        contentColor: theme.colors.text.primary,
        iconColor: isDark ? theme.colors.primary[300] : theme.colors.primary[600],
      };
    case 'exchange-winner':
      return {
        gradient: isDark
          ? [theme.colors.card, theme.colors.surface]
          : [theme.colors.success[50], theme.colors.card],
        borderColor: isDark ? theme.colors.success[600] : theme.colors.success[200],
        backgroundColor: neutralSurface,
        labelColor: isDark ? theme.colors.success[300] : theme.colors.success[700],
        contentColor: theme.colors.text.primary,
        iconColor: isDark ? theme.colors.success[300] : theme.colors.success[700],
      };
    case 'debate-complete':
      return {
        gradient: isDark
          ? [theme.colors.card, theme.colors.surface]
          : [theme.colors.warning[50], theme.colors.card],
        borderColor: isDark ? theme.colors.warning[600] : theme.colors.warning[200],
        backgroundColor: neutralSurface,
        labelColor: isDark ? theme.colors.warning[300] : theme.colors.warning[700],
        contentColor: theme.colors.text.primary,
        iconColor: isDark ? theme.colors.warning[300] : theme.colors.warning[700],
      };
    case 'overall-winner':
      return {
        gradient: isDark
          ? [theme.colors.card, theme.colors.surface]
          : [theme.colors.warning[50], theme.colors.card],
        borderColor: isDark ? theme.colors.warning[500] : theme.colors.warning[300],
        backgroundColor: neutralSurface,
        labelColor: isDark ? theme.colors.warning[300] : theme.colors.warning[800],
        contentColor: theme.colors.text.primary,
        iconColor: isDark ? theme.colors.warning[300] : theme.colors.warning[800],
      };
    case 'debate-start':
    case 'topic':
    default:
      return {
        gradient: isDark
          ? [theme.colors.card, theme.colors.surface]
          : [theme.colors.info[50], theme.colors.card],
        borderColor: isDark ? theme.colors.info[700] : theme.colors.info[200],
        backgroundColor: neutralSurface,
        labelColor: isDark ? theme.colors.info[300] : theme.colors.info[700],
        contentColor: theme.colors.text.primary,
        iconColor: isDark ? theme.colors.info[300] : theme.colors.info[700],
      };
  }
};

export const SystemAnnouncement: React.FC<SystemAnnouncementProps> = ({
  type,
  label,
  content,
  icon,
  gradient,
  brandColor,
  animation = 'fade',
  onReportContent,
}) => {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(0.95);
  const isAudienceQuestions = type === 'audience-questions';
  const isAudienceCue = type === 'audience-stance' || isAudienceQuestions;
  const audienceQuestions = isAudienceQuestions ? parseAudienceQuestions(content) : null;
  const palette = getSystemAnnouncementPalette(theme, isDark, type);
  
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
  
  const getDefaultIcon = (): string => {
    switch (type) {
      case 'topic':
        return ''; // No icon for topic - looks cleaner
      case 'debate-start':
        return '🥊';
      case 'audience-stance':
        return '◉';
      case 'audience-questions':
        return '?';
      case 'mc':
        return '🎙️';
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
          intensity={isAudienceCue ? (isDark ? 28 : 18) : (isDark ? 24 : 16)}
          style={[
            styles.blurContainer,
            styles.announcementContainer,
            {
              borderColor: palette.borderColor,
              backgroundColor: palette.backgroundColor,
            },
            isAudienceCue && styles.audienceContainer,
          ]}
        >
          <LinearGradient
            colors={gradient || palette.gradient}
            style={[
              styles.gradientOverlay,
              isAudienceCue && styles.audienceGradient,
            ]}
          >
            {onReportContent && (
              <TouchableOpacity
                onPress={onReportContent}
                accessibilityRole="button"
                accessibilityLabel="Report AI content"
                testID="report-system-announcement"
                style={[
                  styles.reportButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <Ionicons name="flag-outline" size={15} color={theme.colors.error[500]} />
              </TouchableOpacity>
            )}
            {label && (
              <Typography
                variant="caption"
                weight="semibold"
                style={[
                  styles.label,
                  isAudienceCue && styles.audienceLabel,
                  {
                    color: brandColor || palette.labelColor,
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
              isAudienceQuestions && styles.audienceQuestionsContentRow,
            ]}>
              {(() => {
                const displayIcon = typeof icon === 'string' ? icon : getDefaultIcon();
                return displayIcon ? (
                  <Typography
                    variant="title"
                    style={[
                      styles.icon,
                      { color: palette.iconColor },
                    ]}
                  >
                    {displayIcon}
                  </Typography>
                ) : null;
              })()}
              {audienceQuestions ? (
                <View style={styles.questionBlock}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    style={[styles.questionIntro, { color: palette.labelColor }]}
                    selectable
                  >
                    Audience questions submitted
                  </Typography>
                  <View style={[styles.questionRow, { borderLeftColor: palette.borderColor }]}>
                    <Typography
                      variant="caption"
                      weight="bold"
                      style={[styles.questionSide, { color: palette.labelColor }]}
                      selectable
                    >
                      Affirmative
                    </Typography>
                    <Typography
                      variant="caption"
                      style={[styles.questionText, { color: palette.contentColor }]}
                      selectable
                    >
                      {audienceQuestions.aff}
                    </Typography>
                  </View>
                  <View style={[styles.questionRow, { borderLeftColor: palette.borderColor }]}>
                    <Typography
                      variant="caption"
                      weight="bold"
                      style={[styles.questionSide, { color: palette.labelColor }]}
                      selectable
                    >
                      Negative
                    </Typography>
                    <Typography
                      variant="caption"
                      style={[styles.questionText, { color: palette.contentColor }]}
                      selectable
                    >
                      {audienceQuestions.neg}
                    </Typography>
                  </View>
                </View>
              ) : (
                <Typography
                  variant={isAudienceCue ? 'caption' : 'body'}
                  weight={isAudienceCue ? 'semibold' : 'bold'}
                  align="center"
                  style={[
                    styles.content,
                    isAudienceCue && styles.audienceContent,
                    { color: palette.contentColor },
                  ]}
                  selectable
                >
                  {content}
                </Typography>
              )}
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
    borderRadius: 8,
    overflow: 'hidden',
  },
  announcementContainer: {
    borderWidth: 1,
  },
  audienceContainer: {
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
  audienceQuestionsContentRow: {
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    textAlign: 'center',
  },
  reportButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 2,
    borderRadius: 12,
    padding: 6,
  },
  audienceContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  questionBlock: {
    flex: 1,
    gap: 10,
  },
  questionIntro: {
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 2,
    paddingLeft: 10,
    paddingVertical: 2,
  },
  questionSide: {
    width: 82,
    fontSize: 12,
    lineHeight: 18,
  },
  questionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
