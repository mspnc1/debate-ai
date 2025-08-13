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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

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

  return (
    <Animated.View 
      entering={FadeInDown.duration(300)}
      style={styles.container}
    >
      <Animated.View style={animatedContainerStyle}>
        <BlurView 
          intensity={isDark ? 80 : 40} 
          style={styles.blurContainer}
        >
        <LinearGradient
          colors={isDark 
            ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']
            : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.02)']
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
                <AnimatedTouchable
                  key={ai.id}
                  entering={FadeInDown.duration(300)}
                  style={styles.voteButton}
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
                          <Typography variant="title" style={{ fontSize: 36, color: '#FFFFFF' }}>
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
                          style={{ color: '#FFFFFF' }}
                        >
                          {ai.name}
                        </Typography>
                      )}
                      
                      {scores && scores[ai.id] && (
                        <View style={styles.scoreBadge}>
                          <Typography 
                            variant="caption" 
                            weight="semibold"
                            style={{ color: 'rgba(255,255,255,0.9)' }}
                          >
                            {scores[ai.id].roundWins} wins
                          </Typography>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </AnimatedTouchable>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    minHeight: 80, // Ensure proper touch target (60pt minimum)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  buttonContent: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16, // More padding for better touch target
  },
  aiIcon: {
    marginBottom: 4,
  },
  aiLogo: {
    width: 48,  // Increased from 32 for better visibility
    height: 48, // Increased from 32 for better visibility
  },
  scoreBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
});