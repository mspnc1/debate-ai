import { AIStats, DebateRound, SortedAIStats, FormattedDebate, TopicPerformance, AIInfo } from '../../types/stats';

/**
 * Statistics transformation utilities
 * Pure functions for transforming and sorting data
 */

/**
 * Sort AI statistics by win rate in descending order
 * @param stats Object with AI IDs as keys and AIStats as values
 * @returns Array of sorted AI stats with ranks
 */
export const sortByWinRate = (stats: { [aiId: string]: AIStats }): SortedAIStats[] => {
  return Object.entries(stats)
    .sort(([, a], [, b]) => b.winRate - a.winRate)
    .map(([aiId, aiStats], index) => ({
      aiId,
      stats: aiStats,
      rank: index + 1,
    }));
};

/**
 * Sort AI statistics by total debates in descending order
 * @param stats Object with AI IDs as keys and AIStats as values
 * @returns Array of sorted AI stats with ranks
 */
export const sortByTotalDebates = (stats: { [aiId: string]: AIStats }): SortedAIStats[] => {
  return Object.entries(stats)
    .sort(([, a], [, b]) => b.totalDebates - a.totalDebates)
    .map(([aiId, aiStats], index) => ({
      aiId,
      stats: aiStats,
      rank: index + 1,
    }));
};

/**
 * Sort AI statistics by round win rate in descending order
 * @param stats Object with AI IDs as keys and AIStats as values
 * @returns Array of sorted AI stats with ranks
 */
export const sortByRoundWinRate = (stats: { [aiId: string]: AIStats }): SortedAIStats[] => {
  return Object.entries(stats)
    .sort(([, a], [, b]) => b.roundWinRate - a.roundWinRate)
    .map(([aiId, aiStats], index) => ({
      aiId,
      stats: aiStats,
      rank: index + 1,
    }));
};

/**
 * Get top performing topics for an AI
 * @param topics Topic statistics object
 * @param limit Maximum number of topics to return
 * @returns Array of top topics sorted by wins
 */
export const getTopTopics = (
  topics: { [topic: string]: { participated: number; won: number } },
  limit: number = 3
): TopicPerformance[] => {
  return Object.entries(topics)
    .map(([topic, stats]) => ({
      topic,
      won: stats.won,
      participated: stats.participated,
      winRate: stats.participated > 0 ? (stats.won / stats.participated) * 100 : 0,
    }))
    .sort((a, b) => {
      // Primary sort: by wins (descending)
      if (b.won !== a.won) return b.won - a.won;
      // Secondary sort: by win rate (descending)
      return b.winRate - a.winRate;
    })
    .slice(0, limit);
};

/**
 * Transform debate history into formatted debate objects
 * @param history Array of debate rounds
 * @param getAIInfo Function to resolve AI info from ID
 * @returns Array of formatted debate objects
 */
export const transformDebateHistory = (
  history: DebateRound[],
  getAIInfo: (aiId: string) => AIInfo
): FormattedDebate[] => {
  return history.map(debate => ({
    debateId: debate.debateId,
    topic: debate.topic,
    timestamp: debate.timestamp,
    formattedDate: new Date(debate.timestamp).toLocaleString(),
    winner: debate.overallWinner ? getAIInfo(debate.overallWinner) : null,
  }));
};

/**
 * Get recent debates (last N debates in reverse chronological order)
 * @param history Array of debate rounds
 * @param limit Maximum number of debates to return (default: 5)
 * @returns Array of recent debates, newest first
 */
export const getRecentDebates = (history: DebateRound[], limit: number = 5): DebateRound[] => {
  return history
    .slice(-limit)
    .reverse();
};

/**
 * Filter AI stats to only include AIs with debate history
 * @param stats Object with AI IDs as keys and AIStats as values
 * @returns Filtered stats object with only active AIs
 */
export const filterActiveAIs = (stats: { [aiId: string]: AIStats }): { [aiId: string]: AIStats } => {
  return Object.fromEntries(
    Object.entries(stats).filter(([, aiStats]) => 
      aiStats.totalDebates > 0 || 
      aiStats.roundsWon > 0 || 
      aiStats.roundsLost > 0
    )
  );
};

/**
 * Calculate leaderboard statistics summary
 * @param stats Object with AI IDs as keys and AIStats as values
 * @returns Summary statistics object
 */
export const calculateLeaderboardSummary = (stats: { [aiId: string]: AIStats }) => {
  const activeAIs = filterActiveAIs(stats);
  const sortedAIs = sortByWinRate(activeAIs);
  
  const totalDebates = Object.values(activeAIs).reduce((sum, ai) => sum + ai.totalDebates, 0);
  const totalRounds = Object.values(activeAIs).reduce(
    (sum, ai) => sum + ai.roundsWon + ai.roundsLost, 
    0
  );
  
  return {
    totalAIs: Object.keys(activeAIs).length,
    totalDebates,
    totalRounds,
    topPerformer: sortedAIs.length > 0 ? sortedAIs[0] : null,
    averageWinRate: sortedAIs.length > 0 
      ? sortedAIs.reduce((sum, ai) => sum + ai.stats.winRate, 0) / sortedAIs.length 
      : 0,
  };
};

/**
 * Group debates by time period
 * @param history Array of debate rounds
 * @param period Time period ('day' | 'week' | 'month')
 * @returns Object with time periods as keys and debate arrays as values
 */
export const groupDebatesByPeriod = (
  history: DebateRound[],
  period: 'day' | 'week' | 'month'
): { [key: string]: DebateRound[] } => {
  const groups: { [key: string]: DebateRound[] } = {};
  
  history.forEach(debate => {
    const date = new Date(debate.timestamp);
    let key: string;
    
    switch (period) {
      case 'day': {
        key = date.toISOString().split('T')[0];
        break;
      }
      case 'week': {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
        break;
      }
      case 'month': {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      }
      default: {
        key = date.toISOString().split('T')[0];
        break;
      }
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(debate);
  });
  
  return groups;
};

/**
 * Calculate AI head-to-head statistics
 * @param history Array of debate rounds
 * @param ai1Id First AI identifier
 * @param ai2Id Second AI identifier
 * @returns Head-to-head statistics
 */
export const calculateHeadToHead = (
  history: DebateRound[],
  ai1Id: string,
  ai2Id: string
) => {
  const headToHeadDebates = history.filter(debate => 
    debate.participants.includes(ai1Id) && debate.participants.includes(ai2Id)
  );
  
  let ai1Wins = 0;
  let ai2Wins = 0;
  let draws = 0;
  
  headToHeadDebates.forEach(debate => {
    if (debate.overallWinner === ai1Id) ai1Wins++;
    else if (debate.overallWinner === ai2Id) ai2Wins++;
    else draws++;
  });
  
  return {
    totalDebates: headToHeadDebates.length,
    ai1Wins,
    ai2Wins,
    draws,
    ai1WinRate: headToHeadDebates.length > 0 ? (ai1Wins / headToHeadDebates.length) * 100 : 0,
    ai2WinRate: headToHeadDebates.length > 0 ? (ai2Wins / headToHeadDebates.length) * 100 : 0,
  };
};