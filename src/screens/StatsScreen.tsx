import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientButton, Typography } from '../components/molecules';
import { Box } from '../components/atoms';
import {
  StatsLeaderboard,
  RecentDebatesSection,
  StatsEmptyState,
} from '../components/organisms';
import { useDebateStats } from '../hooks/stats';
import { useTheme } from '../theme';

interface StatsScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const StatsScreen: React.FC<StatsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { history, stats } = useDebateStats();
  
  // Check if we have any AIs with actual debate data
  const hasActiveStats = Object.values(stats).some(ai => 
    ai.totalDebates > 0 || ai.roundsWon > 0 || ai.roundsLost > 0
  );

  const handleStartDebate = () => {
    // Navigate to debate setup - adjust navigation path as needed
    navigation.goBack(); // For now, just go back to navigate to debate
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Box style={[styles.header, { 
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
        <Box style={{ width: 60 }} />
      </Box>
      
      {/* Content */}
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!hasActiveStats && history.length === 0 ? (
          <StatsEmptyState
            title="No debates yet!"
            subtitle="Complete some debates to see AI performance statistics"
            emoji="📊"
            showCTA={true}
            ctaText="Start Your First Debate"
            onCTAPress={handleStartDebate}
            showHelp={true}
            helpText="Debates help you compare different AI personalities and see which ones perform best on various topics."
          />
        ) : (
          <>
            {/* Leaderboard */}
            {hasActiveStats && (
              <StatsLeaderboard
                sortBy="winRate"
                showTopics={true}
                enableAnimations={true}
              />
            )}
            
            {/* Recent Debates */}
            {history.length > 0 && (
              <>
                <Typography variant="title" weight="semibold" style={{ marginTop: 24, marginBottom: 16 }}>
                  📜 Recent Debates
                </Typography>
                <RecentDebatesSection
                  maxDebates={5}
                  showElapsedTime={false}
                  enableAnimations={true}
                  showCount={false}
                />
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
});

export default StatsScreen;