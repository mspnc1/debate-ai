import { useMemo } from 'react';
import { useDebateStats } from './useDebateStats';
import { sortByWinRate, sortByTotalDebates, sortByRoundWinRate, filterActiveAIs } from '../../services/stats';
import { SortedAIStats } from '../../types/stats';

export type StatsSortOption = 'winRate' | 'totalDebates' | 'roundWinRate';

/**
 * Custom hook for sorted AI statistics
 * Provides memoized sorting and ranking functionality
 */
export const useSortedStats = (sortBy: StatsSortOption = 'winRate') => {
  const { stats, hasStats } = useDebateStats();
  
  // Filter and sort stats based on selected option
  const sortedStats = useMemo((): SortedAIStats[] => {
    if (!hasStats) return [];
    
    const activeStats = filterActiveAIs(stats);
    
    switch (sortBy) {
      case 'totalDebates':
        return sortByTotalDebates(activeStats);
      case 'roundWinRate':
        return sortByRoundWinRate(activeStats);
      case 'winRate':
      default:
        return sortByWinRate(activeStats);
    }
  }, [stats, hasStats, sortBy]);
  
  // Calculate additional metrics
  const leaderboardMetrics = useMemo(() => {
    if (sortedStats.length === 0) {
      return {
        topPerformer: null,
        averageWinRate: 0,
        totalActiveAIs: 0,
        competitiveBalance: 0, // Measure of how balanced the competition is
      };
    }
    
    const averageWinRate = sortedStats.reduce((sum, item) => sum + item.stats.winRate, 0) / sortedStats.length;
    const winRateStandardDeviation = Math.sqrt(
      sortedStats.reduce((sum, item) => sum + Math.pow(item.stats.winRate - averageWinRate, 2), 0) / sortedStats.length
    );
    
    return {
      topPerformer: sortedStats[0],
      averageWinRate,
      totalActiveAIs: sortedStats.length,
      competitiveBalance: Math.max(0, 100 - winRateStandardDeviation), // Higher means more balanced
    };
  }, [sortedStats]);
  
  // Get top N performers
  const getTopPerformers = useMemo(() => {
    return (count: number) => sortedStats.slice(0, count);
  }, [sortedStats]);
  
  // Get AI rank by ID
  const getAIRank = useMemo(() => {
    const rankMap = new Map<string, number>();
    sortedStats.forEach((item) => {
      rankMap.set(item.aiId, item.rank);
    });
    
    return (aiId: string): number | null => rankMap.get(aiId) || null;
  }, [sortedStats]);
  
  // Check if AI is in top N
  const isInTopN = useMemo(() => {
    return (aiId: string, n: number): boolean => {
      const rank = getAIRank(aiId);
      return rank !== null && rank <= n;
    };
  }, [getAIRank]);
  
  return {
    // Core data
    sortedStats,
    sortBy,
    
    // Metrics
    ...leaderboardMetrics,
    
    // Utility functions
    getTopPerformers,
    getAIRank,
    isInTopN,
    
    // State flags
    isEmpty: sortedStats.length === 0,
    hasSingleAI: sortedStats.length === 1,
    hasMultipleAIs: sortedStats.length > 1,
  };
};