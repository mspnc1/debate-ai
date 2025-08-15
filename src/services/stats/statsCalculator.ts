import { AIStats } from '../../types/stats';

/**
 * Calculate win rate percentage
 * @param wins Number of wins
 * @param total Total number of games
 * @returns Win rate as percentage (0-100)
 */
export const calculateWinRate = (wins: number, total: number): number => {
  if (total === 0) return 0;
  return (wins / total) * 100;
};

/**
 * Calculate round win rate percentage
 * @param roundsWon Number of rounds won
 * @param totalRounds Total number of rounds played
 * @returns Round win rate as percentage (0-100)
 */
export const calculateRoundWinRate = (roundsWon: number, totalRounds: number): number => {
  if (totalRounds === 0) return 0;
  return (roundsWon / totalRounds) * 100;
};

/**
 * Get total number of rounds from stats
 * @param stats AI statistics object
 * @returns Total number of rounds
 */
export const getTotalRounds = (stats: AIStats): number => {
  return stats.roundsWon + stats.roundsLost;
};

/**
 * Calculate topic win rate
 * @param won Number of times won on this topic
 * @param participated Number of times participated in this topic
 * @returns Win rate as percentage (0-100)
 */
export const calculateTopicWinRate = (won: number, participated: number): number => {
  if (participated === 0) return 0;
  return (won / participated) * 100;
};

/**
 * Check if AI has any debate history
 * @param stats AI statistics object
 * @returns True if AI has participated in debates
 */
export const hasDebateHistory = (stats: AIStats): boolean => {
  return stats.totalDebates > 0;
};

/**
 * Calculate draw count (debates that weren't wins or losses)
 * @param stats AI statistics object
 * @returns Number of draws
 */
export const calculateDraws = (stats: AIStats): number => {
  return stats.totalDebates - (stats.overallWins + stats.overallLosses);
};

/**
 * Get performance trend indicator
 * @param recentWinRate Win rate from recent debates
 * @param overallWinRate Overall win rate
 * @returns 'improving' | 'declining' | 'stable'
 */
export const getPerformanceTrend = (
  recentWinRate: number,
  overallWinRate: number
): 'improving' | 'declining' | 'stable' => {
  const difference = recentWinRate - overallWinRate;
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
};

/**
 * Calculate average rounds per debate
 * @param stats AI statistics object
 * @returns Average number of rounds per debate
 */
export const getAverageRoundsPerDebate = (stats: AIStats): number => {
  if (stats.totalDebates === 0) return 0;
  const totalRounds = getTotalRounds(stats);
  return totalRounds / stats.totalDebates;
};