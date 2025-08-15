import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EntryExitAnimationFunction } from 'react-native-reanimated';
import { 
  StatsCard,
  StatsCardHeader,
  StatsCardRow,
  StatItem,
  WinRateDisplay,
  RankBadge,
  TopicBadgeList,
  Typography,
} from '../molecules';
import { useTheme } from '../../theme';
import { useSortedStats, useAIProviderInfo, useStatsAnimations } from '../../hooks/stats';
import { getTopTopics } from '../../services/stats';
import { formatDate } from '../../services/stats';
import { AIInfo, AIStats } from '../../types/stats';
import { BrandColor } from '../../constants/aiColors';

export interface StatsLeaderboardProps {
  /** Sort option for the leaderboard */
  sortBy?: 'winRate' | 'totalDebates' | 'roundWinRate';
  /** Maximum number of AIs to show */
  maxItems?: number;
  /** Show topic badges on cards */
  showTopics?: boolean;
  /** Enable animations */
  enableAnimations?: boolean;
}

/**
 * StatsLeaderboard - Complete AI performance leaderboard
 * Displays sorted AI statistics with cards and animations
 */
export const StatsLeaderboard: React.FC<StatsLeaderboardProps> = ({
  sortBy = 'winRate',
  maxItems,
  showTopics = true,
  enableAnimations = true,
}) => {
  const { sortedStats, isEmpty } = useSortedStats(sortBy);
  const { getAIInfo } = useAIProviderInfo();
  const { getLeaderboardAnimation, shouldUseAnimations, getSimpleAnimation } = useStatsAnimations();

  const displayStats = maxItems ? sortedStats.slice(0, maxItems) : sortedStats;
  const useAnimations = enableAnimations && shouldUseAnimations(displayStats.length);

  if (isEmpty) {
    return null; // Let parent handle empty state
  }

  return (
    <View style={styles.container}>
      <Typography variant="title" weight="semibold" style={styles.title}>
        🏆 Leaderboard
      </Typography>
      
      {displayStats.map((item, index) => {
        const aiInfo = getAIInfo(item.aiId);
        const animation = useAnimations 
          ? getLeaderboardAnimation(index) 
          : getSimpleAnimation();

        return (
          <StatsLeaderboardItem
            key={item.aiId}
            rank={item.rank}
            aiId={item.aiId}
            aiInfo={aiInfo}
            stats={item.stats}
            showTopics={showTopics}
            entering={animation.entering}
          />
        );
      })}
    </View>
  );
};

export interface StatsLeaderboardItemProps {
  /** AI rank */
  rank: number;
  /** AI identifier */
  aiId: string;
  /** AI information (name, color) */
  aiInfo: AIInfo;
  /** AI statistics */
  stats: AIStats;
  /** Show topic badges */
  showTopics?: boolean;
  /** Animation prop */
  entering?: EntryExitAnimationFunction;
}

/**
 * StatsLeaderboardItem - Individual leaderboard entry
 * Complete card with all AI performance data
 */
export const StatsLeaderboardItem: React.FC<StatsLeaderboardItemProps> = ({
  rank,
  aiInfo,
  stats,
  showTopics = true,
  entering,
}) => {
  const { theme } = useTheme();
  const brandColor: BrandColor = typeof aiInfo.color === 'object' 
    ? aiInfo.color as BrandColor
    : { 
        50: '#F0F0F0', 100: '#E0E0E0', 200: '#D0D0D0', 300: '#C0C0C0', 
        400: '#B0B0B0', 500: aiInfo.color, 600: '#909090', 
        700: '#808080', 800: '#707070', 900: '#606060' 
      };

  // Get top topics for this AI
  const topTopics = showTopics ? getTopTopics(stats.topics, 3) : [];

  return (
    <StatsCard
      borderColor={brandColor[500]}
      entering={entering}
    >
      {/* Header with rank, name, and win rates */}
      <StatsCardHeader
        rank={<RankBadge rank={rank} />}
        title={
          <Typography 
            variant="body" 
            weight="bold"
            style={{ color: brandColor[600] }}
          >
            {aiInfo.name}
          </Typography>
        }
        subtitle={
          <Typography variant="caption" color="secondary">
            Last debated: {formatDate(stats.lastDebated)}
          </Typography>
        }
        rightContent={
          <WinRateDisplay
            overallRate={stats.winRate}
            roundRate={stats.roundWinRate}
            color={brandColor[500]}
          />
        }
      />
      
      {/* Main statistics row */}
      <StatsCardRow>
        <StatItem
          value={stats.totalDebates}
          label="Debates"
        />
        <StatItem
          value={stats.overallWins}
          label="Wins"
          valueColor={theme.colors.success[600]}
        />
        <StatItem
          value={stats.overallLosses}
          label="Losses"
          valueColor={theme.colors.error[600]}
        />
      </StatsCardRow>
      
      {/* Rounds statistics row */}
      <StatsCardRow showDivider>
        <StatItem
          value={stats.roundsWon + stats.roundsLost}
          label="Rounds Played"
          valueVariant="body"
        />
        <StatItem
          value={stats.roundsWon}
          label="Rounds Won"
          valueColor={theme.colors.success[500]}
          valueVariant="body"
        />
        <StatItem
          value={stats.roundsLost}
          label="Rounds Lost"
          valueColor={theme.colors.error[500]}
          valueVariant="body"
        />
      </StatsCardRow>
      
      {/* Topic badges */}
      {showTopics && topTopics.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.topicsSection}>
            <Typography 
              variant="caption" 
              weight="semibold" 
              style={{ color: theme.colors.primary[500], marginBottom: 8 }}
            >
              Top Topics:
            </Typography>
            <TopicBadgeList
              topics={topTopics.map(topic => ({
                topic: topic.topic,
                wins: topic.won,
                participations: topic.participated,
              }))}
              color={brandColor}
              maxTopics={3}
              size="medium"
            />
          </View>
        </>
      )}
    </StatsCard>
  );
};

export interface LeaderboardHeaderProps {
  /** Current sort option */
  sortBy: 'winRate' | 'totalDebates' | 'roundWinRate';
  /** Sort change handler */
  onSortChange?: (sort: 'winRate' | 'totalDebates' | 'roundWinRate') => void;
  /** Total number of AIs */
  totalAIs?: number;
  /** Show sort controls */
  showSortControls?: boolean;
}

/**
 * LeaderboardHeader - Header with sorting controls
 * Optional component for advanced leaderboard features
 */
export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  onSortChange,
  totalAIs,
  showSortControls = false,
}) => {

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Typography variant="title" weight="semibold">
          🏆 Leaderboard
        </Typography>
        {totalAIs && (
          <Typography variant="caption" color="secondary">
            ({totalAIs} AIs)
          </Typography>
        )}
      </View>
      
      {showSortControls && onSortChange && (
        <View style={styles.sortControls}>
          <Typography variant="caption" color="secondary" style={styles.sortLabel}>
            Sort by:
          </Typography>
          {/* Add sort buttons here if needed in the future */}
        </View>
      )}
    </View>
  );
};

export interface CompactLeaderboardProps {
  /** Maximum items to show */
  maxItems?: number;
  /** Show only essential info */
  minimal?: boolean;
}

/**
 * CompactLeaderboard - Minimal leaderboard for overview screens
 * Shows only top performers with essential information
 */
export const CompactLeaderboard: React.FC<CompactLeaderboardProps> = ({
  maxItems = 3,
  minimal = false,
}) => {
  const { theme } = useTheme();
  const { sortedStats, isEmpty } = useSortedStats('winRate');
  const { getAIInfo } = useAIProviderInfo();

  if (isEmpty) {
    return null;
  }

  const displayStats = sortedStats.slice(0, maxItems);

  return (
    <View style={styles.compactContainer}>
      {displayStats.map((item) => {
        const aiInfo = getAIInfo(item.aiId);
        const brandColor: BrandColor = typeof aiInfo.color === 'object' 
          ? aiInfo.color as BrandColor
          : { 
              50: '#F0F0F0', 100: '#E0E0E0', 200: '#D0D0D0', 300: '#C0C0C0', 
              400: '#B0B0B0', 500: aiInfo.color, 600: '#909090', 
              700: '#808080', 800: '#707070', 900: '#606060' 
            };

        return (
          <View key={item.aiId} style={[
            styles.compactItem,
            { 
              borderColor: brandColor[300] || theme.colors.primary[300]
            }
          ]}>
            <RankBadge rank={item.rank} size="small" />
            <View style={styles.compactInfo}>
              <Typography
                variant="caption"
                weight="semibold"
                style={{ 
                  color: brandColor[600] || theme.colors.primary[600]
                }}
              >
                {aiInfo.name}
              </Typography>
              {!minimal && (
                <Typography variant="caption" color="secondary">
                  {item.stats.winRate.toFixed(0)}% • {item.stats.totalDebates} debates
                </Typography>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  topicsSection: {
    paddingTop: 4,
  },
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sortLabel: {
    marginRight: 8,
  },
  compactContainer: {
    gap: 8,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  compactInfo: {
    flex: 1,
    marginLeft: 8,
  },
});