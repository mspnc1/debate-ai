/**
 * VotingInterface Organism Component
 * Professional voting interface with smooth animations and brand colors
 */

import React, { useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Animated, { 
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';
import { AI } from '../../../types';
import { AI_BRAND_COLORS } from '../../../constants/aiColors';
import { ScoreBoard } from '../../../services/debate';
import { getAIProviderIcon } from '../../../utils/aiProviderAssets';

export interface VotingInterfaceProps {
  participants: AI[];
  isOverallVote: boolean;
  isFinalVote: boolean;
  votingRound: number;
  scores?: ScoreBoard | null;
  votingPrompt: string;
  onVote: (aiId: string) => void;
}


export const VotingInterface: React.FC<VotingInterfaceProps> = ({
  participants,
  isOverallVote,
  isFinalVote: _isFinalVote,
  votingRound: _votingRound,
  scores,
  votingPrompt,
  onVote,
}) => {
  const { theme, isDark } = useTheme();
  const containerScale = useSharedValue(0.95);
  const titleOpacity = useSharedValue(0);
  
  useEffect(() => {
    containerScale.value = withSpring(1, { damping: 15 });
    titleOpacity.value = withTiming(1, { duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAIConfig = (aiId: string) => {
    const aiBrandKey = (aiId === 'openai' || aiId === 'chatgpt') ? 'openai' : 
                       aiId === 'claude' ? 'claude' :
                       aiId === 'gemini' ? 'gemini' :
                       aiId === 'nomi' ? 'nomi' : null;
    
    const colors = aiBrandKey ? AI_BRAND_COLORS[aiBrandKey as keyof typeof AI_BRAND_COLORS] : theme.colors.primary;
    const providerIcon = aiBrandKey ? getAIProviderIcon(aiBrandKey) : null;
    
    return { colors, providerIcon };
  };

  const renderCurrentScores = () => {
    if (!isOverallVote || !scores) return null;

    return (
      <View style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        padding: 12,
        marginBottom: 12,
        borderRadius: 8,
        borderWidth: 1,
      }}>
        <Typography variant="caption" weight="semibold" color="brand">
          Current Scores:
        </Typography>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginTop: 8,
        }}>
          {participants.map((ai) => {
            const aiScore = scores[ai.id];
            const { colors } = getAIConfig(ai.id);
            
            return (
              <View key={ai.id} style={{ alignItems: 'center' }}>
                <Typography 
                  variant="body" 
                  weight="semibold"
                  style={{ color: colors[600] }}
                >
                  {ai.name}
                </Typography>
                <Typography variant="title" weight="bold">
                  {aiScore?.roundWins || 0}
                </Typography>
              </View>
            );
          })}
        </View>
        <Typography 
          variant="caption" 
          color="secondary" 
          align="center" 
          style={{ marginTop: 8 }}
        >
          Despite the scores, you can crown any AI as the overall winner!
        </Typography>
      </View>
    );
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));
  
  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const dynamicContainerStyles = {
    ...styles.container,
    ...theme.shadows.lg,
  };

  const dynamicVoteButtonStyles = {
    ...styles.voteButton,
    ...theme.shadows.md,
  };

  return (
    <Animated.View 
      entering={FadeInDown.duration(300)}
      style={dynamicContainerStyles}
    >
      <Animated.View style={animatedContainerStyle}>
        <BlurView 
          intensity={isDark ? 80 : 40} 
          style={styles.blurContainer}
        >
          <LinearGradient
            colors={isDark 
              ? [theme.colors.overlays.soft, theme.colors.overlays.subtle]
              : [theme.colors.overlays.medium, theme.colors.overlays.subtle]
            }
            style={styles.gradientBackground}
          >
            <Animated.View style={animatedTitleStyle}>
              <Typography 
                variant="title" 
                weight="bold" 
                align="center" 
                style={styles.title}
              >
                {votingPrompt}
              </Typography>
            </Animated.View>
        
            {renderCurrentScores()}
        
            <View style={styles.votingButtons}>
              {participants.map((ai) => {
                const { colors, providerIcon } = getAIConfig(ai.id);
                
                return (
                  <TouchableOpacity
                    key={ai.id}
                    style={dynamicVoteButtonStyles}
                    onPress={() => onVote(ai.id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[colors[400], colors[600]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    >
                      <View style={styles.buttonContent}>
                        <View style={styles.aiIcon}>
                          {providerIcon && providerIcon.iconType === 'image' ? (
                            <Image 
                              source={providerIcon.icon as number} 
                              style={styles.aiLogo} 
                              resizeMode="contain"
                            />
                          ) : (
                            <Typography variant="title" style={{ fontSize: 36, color: theme.colors.text.white }}>
                              {providerIcon?.icon || ai.name.charAt(0)}
                            </Typography>
                          )}
                        </View>
                        
                        {/* Only show name if no logo or it's just a letter */}
                        {(!providerIcon || providerIcon.iconType !== 'image') && (
                          <Typography 
                            variant="subtitle" 
                            weight="bold" 
                            align="center"
                            style={{ color: theme.colors.text.white }}
                          >
                            {ai.name}
                          </Typography>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurContainer: {
    borderRadius: 20,
  },
  gradientBackground: {
    padding: 20,
  },
  title: {
    marginBottom: 20,
    fontSize: 22,
  },
  currentScoresCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  scoreItem: {
    alignItems: 'center',
  },
  overrideText: {
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  votingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 50, // Further reduced for more compact design
  },
  buttonGradient: {
    paddingVertical: 4, // Further reduced padding
    paddingHorizontal: 4, // Further reduced padding
  },
  buttonContent: {
    alignItems: 'center',
    gap: 2, // Further reduced gap
    paddingVertical: 4, // Minimal padding
  },
  aiIcon: {
    marginBottom: 2,
  },
  aiLogo: {
    width: 80,  // Increased to 80x80 as requested
    height: 80, // Increased to 80x80 as requested
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
});