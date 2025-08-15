import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

/**
 * Custom hook for accessing debate statistics from Redux store
 * Provides memoized selection to prevent unnecessary re-renders
 */
export const useDebateStats = () => {
  const debateStatsState = useSelector((state: RootState) => state.debateStats);
  
  // Memoized selectors to prevent unnecessary re-computations
  const stats = useMemo(() => debateStatsState.stats, [debateStatsState.stats]);
  const history = useMemo(() => debateStatsState.history, [debateStatsState.history]);
  const currentDebate = useMemo(() => debateStatsState.currentDebate, [debateStatsState.currentDebate]);
  
  // Derived state
  const hasStats = useMemo(() => Object.keys(stats).length > 0, [stats]);
  const hasHistory = useMemo(() => history.length > 0, [history]);
  const totalActiveAIs = useMemo(() => {
    return Object.values(stats).filter(aiStats => aiStats.totalDebates > 0).length;
  }, [stats]);
  
  const totalDebates = useMemo(() => {
    return Object.values(stats).reduce((total, aiStats) => total + aiStats.totalDebates, 0) / 2; // Divide by 2 since each debate involves 2 AIs
  }, [stats]);
  
  const totalRounds = useMemo(() => {
    return Object.values(stats).reduce((total, aiStats) => total + aiStats.roundsWon + aiStats.roundsLost, 0) / 2; // Divide by 2 since each round involves 2 AIs
  }, [stats]);
  
  return {
    // Raw data
    stats,
    history,
    currentDebate,
    
    // Derived state
    hasStats,
    hasHistory,
    totalActiveAIs,
    totalDebates,
    totalRounds,
    
    // Preserved topic state
    preservedTopic: debateStatsState.preservedTopic,
    preservedTopicMode: debateStatsState.preservedTopicMode,
  };
};