/**
 * VictoryCelebration Component
 * Professional victory celebration with animations and confetti
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '../../molecules';
import { GradientButton, Button } from '../../molecules';
import { useTheme } from '../../../theme';
import { AI_BRAND_COLORS } from '../../../constants/aiColors';
import { AI } from '../../../types';
import { ScoreBoard } from '../../../services/debate';

const { width } = Dimensions.get('window');

export interface RoundResult {
  round: number;
  winner: string;
  topic?: string;
}

export interface VictoryCelebrationProps {
  winner: AI;
  scores: ScoreBoard;
  rounds: RoundResult[];
  onNewDebate: () => void;
  onShare: () => void;
  onViewTranscript: () => void;
}

export const VictoryCelebration: React.FC<VictoryCelebrationProps> = ({
  winner,
  scores,
  rounds,
  onNewDebate,
  onShare,
  onViewTranscript,
}) => {
  const { theme, isDark } = useTheme();
  const trophyScale = useSharedValue(0);
  const trophyRotation = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  
  useEffect(() => {
    // Animation sequence
    trophyScale.value = withSequence(
      withDelay(200, withSpring(1.2, { damping: 8 })),
      withSpring(1, { damping: 15 })
    );
    
    trophyRotation.value = withSequence(
      withDelay(200, withSpring(10)),
      withSpring(-10),
      withSpring(0)
    );
    
    contentOpacity.value = withDelay(500, withSpring(1));
  }, [trophyScale, trophyRotation, contentOpacity]);
  
  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotation.value}deg` },
    ],
  }));
  
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));
  
  // Get winner colors - support both old and new AI ID formats
  const getWinnerColors = () => {
    const winnerKey = (winner.id === 'openai' || winner.id === 'chatgpt') ? 'openai' : 
                     winner.id === 'claude' ? 'claude' :
                     winner.id === 'gemini' ? 'gemini' :
                     winner.id === 'nomi' ? 'nomi' : null;
    
    return winnerKey ? AI_BRAND_COLORS[winnerKey as keyof typeof AI_BRAND_COLORS] : theme.colors.primary;
  };
  
  const winnerColors = getWinnerColors();
  
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <BlurView intensity={90} style={styles.backdrop}>
        <LinearGradient
          colors={isDark 
            ? ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)']
            : ['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)']
          }
          style={styles.gradientBackdrop}
        >
          <Animated.View entering={ZoomIn.springify()} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Animated.View style={[styles.trophyContainer, trophyStyle]}>
              <Typography variant="title" style={styles.trophy}>
                🏆
              </Typography>
              <View style={[
                styles.glowEffect, 
                { backgroundColor: `${winnerColors[400]}40` }
              ]} />
            </Animated.View>
            
            <Animated.View style={contentStyle}>
              <Typography 
                variant="caption" 
                weight="semibold" 
                align="center" 
                color="secondary"
                style={styles.championLabel}
              >
                DEBATE CHAMPION
              </Typography>
              
              <LinearGradient
                colors={[winnerColors[400], winnerColors[600]]}
                style={styles.winnerNameContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Typography 
                  variant="title" 
                  weight="bold" 
                  align="center" 
                  style={styles.winnerName}
                >
                  {winner.name}
                </Typography>
              </LinearGradient>
              
              <View style={styles.scoreContainer}>
                <Typography 
                  variant="body" 
                  weight="semibold" 
                  align="center" 
                  color="secondary"
                  style={styles.finalScoreLabel}
                >
                  Final Scores
                </Typography>
                
                {Object.entries(scores).map(([aiId, score]) => {
                  const aiColors = aiId === winner.id ? winnerColors : theme.colors.gray;
                  const isWinner = aiId === winner.id;
                  
                  return (
                    <View key={aiId} style={[
                      styles.scoreItem,
                      isWinner && styles.winnerScoreItem
                    ]}>
                      <View style={styles.scoreItemHeader}>
                        <Typography 
                          variant="body" 
                          weight={isWinner ? "bold" : "semibold"}
                          style={{ color: isWinner ? winnerColors[600] : theme.colors.text.primary }}
                        >
                          {score.name}
                          {isWinner && " 👑"}
                        </Typography>
                        <Typography 
                          variant="subtitle" 
                          weight="bold"
                          style={{ color: isWinner ? winnerColors[600] : theme.colors.text.primary }}
                        >
                          {score.roundWins} rounds
                        </Typography>
                      </View>
                      
                      <View style={styles.scoreBar}>
                        <Animated.View
                          entering={FadeIn.delay(800).duration(600)}
                          style={[
                            styles.scoreBarFill,
                            {
                              width: `${Math.max((score.roundWins / Math.max(rounds.length, 1)) * 100, 5)}%`,
                              backgroundColor: aiColors[500] || theme.colors.primary[500],
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
              
              <View style={styles.actions}>
                <GradientButton
                  title="🎯 Start New Debate"
                  onPress={onNewDebate}
                  gradient={[winnerColors[400], winnerColors[600]]}
                  fullWidth
                  style={styles.primaryAction}
                />
                
                <View style={styles.secondaryActions}>
                  <Button
                    title="📤 Share Results"
                    onPress={onShare}
                    variant="secondary"
                    size="medium"
                    style={styles.secondaryButton}
                  />
                  <Button
                    title="📄 View Transcript"
                    onPress={onViewTranscript}
                    variant="ghost"
                    size="medium"
                    style={styles.secondaryButton}
                  />
                </View>
              </View>
            </Animated.View>
          </Animated.View>
          
          {/* Confetti effect */}
          <ConfettiEffect colors={[winnerColors[400], winnerColors[600], winnerColors[500]]} />
        </LinearGradient>
      </BlurView>
    </View>
  );
};

// Simple confetti effect component
const Particle: React.FC<{ color: string; delay: number }> = ({ color, delay }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);
  
  React.useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSpring(-800, { duration: 3000 })
    );
    translateX.value = withSequence(
      withSpring(Math.random() * 100 - 50, { duration: 1000 }),
      withSpring(Math.random() * 100 - 50, { duration: 1000 }),
      withSpring(Math.random() * 100 - 50, { duration: 1000 })
    );
    rotation.value = withSpring(360 * 3, { duration: 3000 });
    opacity.value = withDelay(2500, withSpring(0, { duration: 500 }));
  }, [translateY, translateX, rotation, opacity, delay]);
  
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 100,
          left: width / 2,
          width: 10,
          height: 10,
          backgroundColor: color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
};

const ConfettiEffect: React.FC<{ colors: string[] }> = ({ colors }) => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    delay: i * 50,
  }));
  
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((particle) => (
        <Particle key={particle.id} color={particle.color} delay={particle.delay} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    maxWidth: width * 0.9,
    width: '100%',
  },
  trophyContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 24,
  },
  trophy: {
    fontSize: 80,
    lineHeight: 90,
  },
  glowEffect: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.3,
    top: -10,
  },
  championLabel: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  winnerNameContainer: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  winnerName: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  scoreContainer: {
    width: '100%',
    marginBottom: 32,
  },
  finalScoreLabel: {
    marginBottom: 16,
  },
  scoreItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
  },
  winnerScoreItem: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  scoreItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  primaryAction: {
    marginBottom: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
  },
});