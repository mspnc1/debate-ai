/**
 * VictoryCelebration Component
 * Professional victory summary with clear next actions
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';
import { AI_BRAND_COLORS } from '../../../constants/aiColors';
import { AI, type DebateVoteResult, Message } from '../../../types';
import { ScoreBoard } from '../../../services/debate';
import type { AudienceDecisionResult, AudienceStance } from '../../../config/debate/formats';
import ShareModal from './ShareModal';
import { analytics } from '../../../services/analytics';
import { shareIncentives } from '../../../services/shareIncentives';

export interface RoundResult {
  round: number;
  winner: string;
  topic?: string;
}

export interface VictoryCelebrationProps {
  winner?: AI;
  scores: ScoreBoard;
  rounds: RoundResult[];
  audienceResult?: AudienceDecisionResult;
  voteResults?: DebateVoteResult[];
  onViewTranscript: () => void;
  onRematch: () => void;
  onStartOver: () => void;
  onSaveVoicePack?: () => void;
  voicePackClipCount?: number;
  voicePackActionLabel?: string;
  topic?: string;
  participants?: AI[];
  messages?: Message[];
}

export const VictoryCelebration: React.FC<VictoryCelebrationProps> = ({
  winner,
  scores,
  rounds,
  audienceResult,
  voteResults = [],
  onViewTranscript,
  onRematch,
  onStartOver,
  onSaveVoicePack,
  voicePackClipCount = 0,
  voicePackActionLabel = 'Voice Pack',
  topic,
  participants,
  messages,
}) => {
  const { theme } = useTheme();
  const [showShareCard, setShowShareCard] = useState(false);
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
  
  // Get winner colors from current text provider IDs and common aliases.
  const getWinnerColors = () => {
    if (!winner) {
      return theme.colors.primary;
    }

    const winnerKey = (winner.id === 'openai' || winner.id === 'chatgpt') ? 'openai' : 
                     winner.id === 'claude' ? 'claude' :
                     (winner.id === 'gemini' || winner.id === 'google') ? 'gemini' :
                     winner.id === 'perplexity' ? 'perplexity' :
                     winner.id === 'mistral' ? 'mistral' :
                     winner.id === 'cohere' ? 'cohere' :
                     winner.id === 'deepseek' ? 'deepseek' :
                     winner.id === 'grok' ? 'grok' : null;
    
    return winnerKey ? AI_BRAND_COLORS[winnerKey as keyof typeof AI_BRAND_COLORS] : theme.colors.primary;
  };
  
  const winnerColors = getWinnerColors();
  const scoreEntries = Object.entries(scores);
  const totalScoredRounds = Math.max(
    rounds.length,
    ...scoreEntries.map(([, score]) => score.roundWins),
    1
  );
  
  const dynamicCardStyles = {
    ...styles.card,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.lg,
  };

  const stanceLabel = (stance: AudienceStance): string => {
    if (stance === 'for') return 'For';
    if (stance === 'against') return 'Against';
    return 'Undecided';
  };

  const renderAudienceDecision = () => {
    if (!audienceResult) return null;

    const winningTeam = participants?.filter((_, index) => {
      if (audienceResult.winningSide === 'aff') return index % 2 === 0;
      return index % 2 === 1;
    }) || [];

    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
              <Animated.View entering={ZoomIn.springify()} style={dynamicCardStyles}>
                <Animated.View style={[styles.trophyContainer, trophyStyle]}>
                  <Ionicons name="podium" size={64} color={winnerColors[500]} />
                  <View style={[
                    styles.glowEffect,
                    { backgroundColor: `${winnerColors[400]}40` },
                  ]} />
                </Animated.View>

                <Animated.View style={[styles.content, contentStyle]}>
                  <Typography
                    variant="caption"
                    weight="semibold"
                    align="center"
                    color="secondary"
                    style={styles.championLabel}
                  >
                    OXFORD AUDIENCE DECISION
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
                      style={{
                        ...styles.winnerName,
                        color: theme.colors.text.white,
                      }}
                    >
                      {audienceResult.winningSideLabel}
                    </Typography>
                  </LinearGradient>

                  <Typography
                    variant="body"
                    align="center"
                    color="secondary"
                    style={styles.audienceSummary}
                  >
                    {audienceResult.summary}
                  </Typography>

                  <View style={[styles.audienceStanceCard, { borderColor: theme.colors.border }]}>
                    <View style={styles.audienceStanceRow}>
                      <Typography variant="caption" color="secondary">Started</Typography>
                      <Typography variant="body" weight="bold">
                        {stanceLabel(audienceResult.initialStance)}
                      </Typography>
                    </View>
                    <View style={[styles.audienceStanceDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.audienceStanceRow}>
                      <Typography variant="caption" color="secondary">Finished</Typography>
                      <Typography variant="body" weight="bold">
                        {stanceLabel(audienceResult.finalStance)}
                      </Typography>
                    </View>
                  </View>

                  {winningTeam.length > 0 && (
                    <View style={styles.audienceTeam}>
                      <Typography variant="caption" color="secondary" weight="semibold" align="center">
                        Winning side
                      </Typography>
                      <Typography variant="body" weight="semibold" align="center">
                        {winningTeam.map((ai) => ai.name).join(' + ')}
                      </Typography>
                    </View>
                  )}

                  <View style={styles.actions}>
                    <VictoryActionButton
                      title="Rematch"
                      icon="refresh"
                      onPress={onRematch}
                      variant="primary"
                      colors={[winnerColors[400], winnerColors[600]]}
                      testID="victory-rematch"
                    />
                    <View style={styles.secondaryActions}>
                      <VictoryActionButton
                        title="Transcript"
                        icon="document-text-outline"
                        onPress={onViewTranscript}
                        variant="secondary"
                        testID="victory-transcript"
                      />
                      {onSaveVoicePack && voicePackClipCount > 0 && (
                        <VictoryActionButton
                          title={voicePackActionLabel}
                          icon="albums-outline"
                          onPress={onSaveVoicePack}
                          variant="secondary"
                          testID="victory-voice-pack"
                        />
                      )}
                      <VictoryActionButton
                        title="Share"
                        icon="share-social-outline"
                        onPress={() => setShowShareCard(true)}
                        variant="secondary"
                        testID="victory-share"
                      />
                    </View>
                    <VictoryActionButton
                      title="Start Over"
                      icon="arrow-back-circle-outline"
                      onPress={onStartOver}
                      variant="ghost"
                      testID="victory-start-over"
                    />
                  </View>
                </Animated.View>
              </Animated.View>
        </ScrollView>

        <ShareModal
          visible={showShareCard}
          topic={topic || 'AI Debate'}
          participants={participants || []}
          messages={messages || []}
          winner={winner}
          scores={scores}
          onShare={async (platform?: string) => {
            analytics.trackShare(
              platform || 'unknown',
              'debate_image_card',
              true,
              {
                topic: topic || 'AI Debate',
                winner: audienceResult.winningSideLabel,
                participant_count: participants?.length || 0,
              }
            );
            await shareIncentives.recordShare();
            setShowShareCard(false);
          }}
          onClose={() => setShowShareCard(false)}
        />
      </View>
    );
  };

  if (audienceResult) {
    return renderAudienceDecision();
  }

  if (!winner) {
    return null;
  }
  
  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
            <Animated.View entering={ZoomIn.springify()} style={dynamicCardStyles}>
              <Animated.View style={[styles.trophyContainer, trophyStyle]}>
                <Ionicons name="trophy" size={64} color={winnerColors[500]} />
                <View style={[
                  styles.glowEffect, 
                  { backgroundColor: `${winnerColors[400]}40` }
                ]} />
              </Animated.View>
              
              <Animated.View style={[styles.content, contentStyle]}>
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
                    style={{
                      ...styles.winnerName,
                      color: theme.colors.text.white,
                    }}
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
                  
                  <View style={styles.scoresWrapper}>
                    {scoreEntries.map(([aiId, score]) => {
                      const aiColors = aiId === winner.id ? winnerColors : theme.colors.gray;
                      const isWinner = aiId === winner.id;
                      
                      return (
                        <View key={aiId} style={[
                          styles.scoreItem,
                          { backgroundColor: theme.colors.overlays.soft },
                          isWinner && styles.winnerScoreItem,
                          isWinner && { 
                            backgroundColor: theme.colors.semantic.winner,
                            borderColor: theme.colors.semantic.winnerBorder,
                          }
                        ]}>
                          <View style={styles.scoreItemHeader}>
                            <Typography
                              variant="body"
                              weight={isWinner ? "bold" : "semibold"}
                              style={{ color: isWinner ? winnerColors[600] : theme.colors.text.primary }}
                            >
                              {score.name}{isWinner ? ' wins' : ''}
                            </Typography>
                            <Typography
                              variant="body"
                              weight="bold"
                              style={{ color: isWinner ? winnerColors[600] : theme.colors.text.primary }}
                            >
                              {score.roundWins} {score.roundWins === 1 ? 'round' : 'rounds'}
                            </Typography>
                          </View>
                          
                          <View style={[styles.scoreBar, { backgroundColor: theme.colors.overlays.strong }]}>
                            <Animated.View
                              entering={FadeIn.delay(800).duration(600)}
                              style={[
                                styles.scoreBarFill,
                                {
                                  width: `${Math.max((score.roundWins / totalScoredRounds) * 100, 5)}%`,
                                  backgroundColor: aiColors[500] || theme.colors.primary[500],
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {voteResults.length > 0 && (
                  <View style={[styles.voteBreakdown, { borderColor: theme.colors.border }]}>
                    <Typography
                      variant="body"
                      weight="semibold"
                      color="secondary"
                      align="center"
                      style={styles.voteBreakdownTitle}
                    >
                      Vote Decisions
                    </Typography>
                    {voteResults.map((vote) => (
                      <View key={vote.round} style={styles.voteResultRow}>
                        <View style={styles.voteResultHeader}>
                          <Typography variant="caption" weight="semibold">
                            {vote.votingLabel}
                          </Typography>
                          <Typography variant="caption" color="secondary">
                            {vote.winnerName || vote.winnerId}
                          </Typography>
                        </View>
                        <Typography variant="caption" color="secondary" style={styles.voteCriterionText}>
                          {vote.criterion}
                        </Typography>
                      </View>
                    ))}
                  </View>
                )}
                
                <View style={styles.actions}>
                  <VictoryActionButton
                    title="Rematch"
                    icon="refresh"
                    onPress={onRematch}
                    variant="primary"
                    colors={[winnerColors[400], winnerColors[600]]}
                    testID="victory-rematch"
                  />
                  <View style={styles.secondaryActions}>
                    <VictoryActionButton
                      title="Transcript"
                      icon="document-text-outline"
                      onPress={onViewTranscript}
                      variant="secondary"
                      testID="victory-transcript"
                    />
                    {onSaveVoicePack && voicePackClipCount > 0 && (
                      <VictoryActionButton
                        title={voicePackActionLabel}
                        icon="albums-outline"
                        onPress={onSaveVoicePack}
                        variant="secondary"
                        testID="victory-voice-pack"
                      />
                    )}
                    <VictoryActionButton
                      title="Share"
                      icon="share-social-outline"
                      onPress={() => setShowShareCard(true)}
                      variant="secondary"
                      testID="victory-share"
                    />
                  </View>
                  <VictoryActionButton
                    title="Start Over"
                    icon="arrow-back-circle-outline"
                    onPress={onStartOver}
                    variant="ghost"
                    testID="victory-start-over"
                  />
                </View>
              </Animated.View>
            </Animated.View>
      </ScrollView>
      
      {/* Share Modal */}
      <ShareModal
        visible={showShareCard}
        topic={topic || 'AI Debate'}
        participants={participants || [winner]}
        messages={messages || []}
        winner={winner}
        scores={scores}
        onShare={async (platform?: string) => {
          analytics.trackShare(
            platform || 'unknown',
            'debate_image_card',
            true,
            {
              topic: topic || 'AI Debate',
              winner: winner.name,
              participant_count: participants?.length || 0,
            }
          );
          
          // Record share and check for rewards
          await shareIncentives.recordShare();
          
          setShowShareCard(false);
        }}
        onClose={() => setShowShareCard(false)}
      />
    </View>
  );
};

type VictoryActionButtonProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant: 'primary' | 'secondary' | 'ghost';
  colors?: readonly string[];
  testID: string;
};

const VictoryActionButton: React.FC<VictoryActionButtonProps> = ({
  title,
  icon,
  onPress,
  variant,
  colors,
  testID,
}) => {
  const { theme, isDark } = useTheme();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const contentColor = isPrimary
    ? theme.colors.text.white
    : isGhost
      ? theme.colors.text.secondary
      : theme.colors.text.primary;

  const content = (
    <>
      <Ionicons name={icon} size={18} color={contentColor} />
      <Typography
        variant="button"
        weight="semibold"
        style={{ color: contentColor }}
      >
        {title}
      </Typography>
    </>
  );

  if (isPrimary) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={title}
        testID={testID}
        style={styles.actionTouchable}
      >
        <LinearGradient
          colors={(colors || theme.colors.gradients.primary) as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.actionButton, styles.fullAction, styles.primaryAction]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      style={[
        styles.actionButton,
        isGhost ? styles.ghostAction : styles.secondaryAction,
        isGhost && styles.fullAction,
        {
          backgroundColor: isGhost
            ? 'transparent'
            : isDark ? theme.colors.overlays.medium : theme.colors.surface,
          borderColor: isGhost ? theme.colors.border : theme.colors.border,
        },
      ]}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  trophyContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 24,
  },
  content: {
    width: '100%',
  },
  glowEffect: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    opacity: 0.25,
    top: -16,
    zIndex: -1,
  },
  championLabel: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  winnerNameContainer: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  winnerName: {
    fontSize: 24,
  },
  audienceSummary: {
    lineHeight: 22,
    marginBottom: 18,
  },
  audienceStanceCard: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 18,
    padding: 14,
    width: '100%',
  },
  audienceStanceRow: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  audienceStanceDivider: {
    width: StyleSheet.hairlineWidth,
  },
  audienceTeam: {
    gap: 6,
    marginBottom: 22,
  },
  scoreContainer: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  finalScoreLabel: {
    marginBottom: 16,
  },
  scoresWrapper: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'stretch',
  },
  scoreItem: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    minWidth: 240,
  },
  winnerScoreItem: {
    borderWidth: 1,
  },
  scoreItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  scoreBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  voteBreakdown: {
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 14,
    marginBottom: 22,
    gap: 10,
  },
  voteBreakdownTitle: {
    marginBottom: 2,
  },
  voteResultRow: {
    gap: 4,
  },
  voteCriterionText: {
    lineHeight: 18,
  },
  voteResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  actions: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  actionTouchable: {
    width: '100%',
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullAction: {
    width: '100%',
  },
  primaryAction: {
    borderWidth: 0,
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  secondaryAction: {
    flex: 1,
    minWidth: 110,
  },
  ghostAction: {
    minHeight: 44,
  },
});
