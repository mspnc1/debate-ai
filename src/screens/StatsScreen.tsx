import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { GradientButton, Typography } from '../components/molecules';
import { View as ThemedView } from '../components/atoms';
import { useTheme } from '../theme';
import { AI_PROVIDERS } from '../config/aiProviders';
import { AI_BRAND_COLORS } from '../constants/aiColors';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface StatsScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const StatsScreen: React.FC<StatsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const debateStats = useSelector((state: RootState) => state.debateStats);
  
  // Get AI provider info for display
  const getAIInfo = (aiId: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === aiId);
    if (!provider) return { name: aiId, color: theme.colors.primary };
    
    const colorKey = aiId === 'openai' ? 'chatgpt' : aiId;
    const brandColors = AI_BRAND_COLORS[colorKey as keyof typeof AI_BRAND_COLORS];
    return {
      name: provider.name,
      color: brandColors || theme.colors.primary,
    };
  };
  
  // Sort AIs by win rate
  const sortedAIs = Object.entries(debateStats.stats)
    .sort(([, a], [, b]) => b.winRate - a.winRate);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ThemedView style={[styles.header, { 
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border 
      }]}>
        <GradientButton
          title="← Back"
          onPress={() => navigation.goBack()}
          gradient={theme.colors.gradients.primary}
          size="small"
        />
        <Typography variant="title" weight="bold">📊 AI Performance Stats</Typography>
        <View style={{ width: 60 }} />
      </ThemedView>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {sortedAIs.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <Typography variant="title" align="center" color="secondary">
              No debates yet!
            </Typography>
            <Typography variant="caption" align="center" color="secondary" style={{ marginTop: 8 }}>
              Complete some debates to see AI performance statistics
            </Typography>
          </ThemedView>
        ) : (
          <>
            <Typography variant="title" weight="semibold" style={{ marginBottom: 16 }}>
              🏆 Leaderboard
            </Typography>
            
            {sortedAIs.map(([aiId, stats], index) => {
              const aiInfo = getAIInfo(aiId);
              const brandColor = aiInfo.color as typeof AI_BRAND_COLORS.claude;
              
              return (
                <Animated.View
                  key={aiId}
                  entering={FadeInDown.delay(index * 100)}
                  style={[
                    styles.statsCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: brandColor[500],
                      borderLeftWidth: 4,
                    }
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.rankBadge}>
                      <Typography variant="title" weight="bold">
                        #{index + 1}
                      </Typography>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Typography 
                        variant="body" 
                        weight="bold"
                        style={{ color: brandColor[600] }}
                      >
                        {aiInfo.name}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        Last debated: {new Date(stats.lastDebated).toLocaleDateString()}
                      </Typography>
                    </View>
                    <View style={styles.winRateBox}>
                      <Typography 
                        variant="title" 
                        weight="bold"
                        style={{ color: brandColor[500] }}
                      >
                        {stats.winRate.toFixed(0)}%
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        Overall
                      </Typography>
                      <Typography 
                        variant="caption" 
                        weight="semibold"
                        style={{ color: brandColor[400], marginTop: 2 }}
                      >
                        {stats.roundWinRate.toFixed(0)}%
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        Rounds
                      </Typography>
                    </View>
                  </View>
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Typography variant="title" weight="semibold">
                        {stats.totalDebates}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        Debates
                      </Typography>
                    </View>
                    <View style={styles.statItem}>
                      <Typography variant="title" weight="semibold" style={{ color: theme.colors.success[600] }}>
                        {stats.overallWins}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        Wins
                      </Typography>
                    </View>
                    <View style={styles.statItem}>
                      <Typography variant="title" weight="semibold" style={{ color: theme.colors.error[600] }}>
                        {stats.overallLosses}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        Losses
                      </Typography>
                    </View>
                  </View>
                  
                  <View style={[styles.divider, { backgroundColor: theme.colors.border, marginVertical: 8 }]} />
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Typography variant="body" weight="semibold">
                        {stats.roundsWon + stats.roundsLost}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        Total Rounds
                      </Typography>
                    </View>
                    <View style={styles.statItem}>
                      <Typography variant="body" weight="semibold" style={{ color: theme.colors.success[500] }}>
                        {stats.roundsWon}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        Rounds Won
                      </Typography>
                    </View>
                    <View style={styles.statItem}>
                      <Typography variant="body" weight="semibold" style={{ color: theme.colors.error[500] }}>
                        {stats.roundsLost}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        Rounds Lost
                      </Typography>
                    </View>
                  </View>
                  
                  {Object.keys(stats.topics).length > 0 && (
                    <>
                      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                      <Typography variant="caption" weight="semibold" style={{ color: theme.colors.primary[500] }}>
                        Top Topics:
                      </Typography>
                      <View style={styles.topicsContainer}>
                        {Object.entries(stats.topics)
                          .sort(([, a], [, b]) => b.won - a.won)
                          .slice(0, 3)
                          .map(([topic, topicStats]) => (
                            <View key={topic} style={[
                              styles.topicBadge,
                              { backgroundColor: brandColor[50] }
                            ]}>
                              <Typography 
                                variant="caption" 
                                weight="medium"
                                style={{ color: brandColor[700] }}
                              >
                                {topic.slice(0, 20)}...
                              </Typography>
                              <Typography 
                                variant="caption" 
                                weight="bold"
                                style={{ color: brandColor[600] }}
                              >
                                {topicStats.won}/{topicStats.participated}
                              </Typography>
                            </View>
                          ))}
                      </View>
                    </>
                  )}
                </Animated.View>
              );
            })}
            
            {/* Recent Debates History */}
            {debateStats.history.length > 0 && (
              <>
                <Typography 
                  variant="title" 
                  weight="semibold" 
                  style={{ marginTop: 24, marginBottom: 16 }}
                >
                  📜 Recent Debates
                </Typography>
                
                {debateStats.history.slice(-5).reverse().map((debate, index) => {
                  const winner = debate.overallWinner ? getAIInfo(debate.overallWinner) : null;
                  
                  return (
                    <Animated.View
                      key={debate.debateId}
                      entering={FadeInDown.delay(index * 50)}
                      style={[
                        styles.historyCard,
                        {
                          backgroundColor: theme.colors.card,
                          borderColor: theme.colors.border,
                        }
                      ]}
                    >
                      <Typography variant="caption" color="secondary">
                        {new Date(debate.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" weight="medium" style={{ marginTop: 4 }}>
                        "{debate.topic}"
                      </Typography>
                      {winner && (
                        <Typography 
                          variant="caption" 
                          weight="bold"
                          style={{ 
                            marginTop: 8,
                            color: (winner.color as typeof AI_BRAND_COLORS.claude)[600]
                          }}
                        >
                          🏆 Winner: {winner.name}
                        </Typography>
                      )}
                    </Animated.View>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    paddingVertical: 64,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankBadge: {
    marginRight: 12,
  },
  winRateBox: {
    alignItems: 'center',
    padding: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  topicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
});

export default StatsScreen;