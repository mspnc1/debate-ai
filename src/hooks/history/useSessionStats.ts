import { useMemo } from 'react';
import { ChatSession } from '../../types';
import { UseSessionStatsReturn, SessionStats } from '../../types/history';

export const useSessionStats = (sessions: ChatSession[]): UseSessionStatsReturn => {
  const [isCalculating] = [false]; // Future: could add loading state for complex calculations

  /**
   * Calculate comprehensive session statistics
   */
  const stats = useMemo((): SessionStats => {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        averageMessagesPerSession: 0,
        usageByProvider: {}
      };
    }

    // Basic counts
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
    const averageMessagesPerSession = totalMessages / totalSessions;

    // Find most/least active sessions without creating new arrays
    let mostActiveSession = sessions[0];
    let oldestSession = sessions[0];
    let newestSession = sessions[0];
    
    // Single pass to find extremes
    for (const session of sessions) {
      if (!mostActiveSession || session.messages.length > mostActiveSession.messages.length) {
        mostActiveSession = session;
      }
      if (!oldestSession || session.createdAt < oldestSession.createdAt) {
        oldestSession = session;
      }
      if (!newestSession || session.createdAt > newestSession.createdAt) {
        newestSession = session;
      }
    }

    // Usage by AI provider
    const usageByProvider: Record<string, number> = {};
    sessions.forEach(session => {
      session.selectedAIs.forEach(ai => {
        const provider = ai.provider || ai.name; // Fallback to name if no provider
        usageByProvider[provider] = (usageByProvider[provider] || 0) + 1;
      });
    });

    return {
      totalSessions,
      totalMessages,
      averageMessagesPerSession: Math.round(averageMessagesPerSession * 10) / 10, // Round to 1 decimal
      mostActiveSession,
      oldestSession,
      newestSession,
      usageByProvider
    };
  }, [sessions]);

  /**
   * Get formatted statistics for display
   */
  const formattedStats = useMemo(() => {
    const { totalSessions, totalMessages, averageMessagesPerSession } = stats;
    
    return {
      sessionsText: `${totalSessions} conversation${totalSessions !== 1 ? 's' : ''}`,
      messagesText: `${totalMessages} total message${totalMessages !== 1 ? 's' : ''}`,
      averageText: `${averageMessagesPerSession} avg per conversation`,
      summaryText: `${totalSessions} conversation${totalSessions !== 1 ? 's' : ''} • ${totalMessages} total messages`
    };
  }, [stats]);

  /**
   * Get activity insights
   */
  const activityInsights = useMemo(() => {
    if (sessions.length === 0) {
      return {
        hasActivity: false,
        trend: 'none' as const,
        insight: 'No conversations yet'
      };
    }

    // Calculate activity trend (last 7 days vs previous 7 days)
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);

    const recentSessions = sessions.filter(s => s.createdAt > sevenDaysAgo);
    const previousSessions = sessions.filter(s => 
      s.createdAt <= sevenDaysAgo && s.createdAt > fourteenDaysAgo
    );

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentSessions.length > previousSessions.length) trend = 'up';
    if (recentSessions.length < previousSessions.length) trend = 'down';

    // Generate insight text
    let insight = '';
    if (recentSessions.length === 0) {
      insight = 'No recent activity';
    } else if (trend === 'up') {
      insight = `${recentSessions.length} conversations this week - trending up!`;
    } else if (trend === 'down') {
      insight = `${recentSessions.length} conversations this week - slowing down`;
    } else {
      insight = `${recentSessions.length} conversations this week - steady activity`;
    }

    return {
      hasActivity: recentSessions.length > 0,
      trend,
      insight,
      recentCount: recentSessions.length,
      previousCount: previousSessions.length
    };
  }, [sessions]);

  /**
   * Get usage patterns
   */
  const usagePatterns = useMemo(() => {
    if (sessions.length === 0) {
      return {
        mostUsedAI: null,
        preferredSessionSize: 'small',
        averageAIsPerSession: 0,
        multiAIPreference: 0
      };
    }

    // Find most used AI
    const aiUsage: Record<string, number> = {};
    sessions.forEach(session => {
      session.selectedAIs.forEach(ai => {
        aiUsage[ai.name] = (aiUsage[ai.name] || 0) + 1;
      });
    });

    const mostUsedAI = Object.entries(aiUsage)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // Calculate stats in a single pass
    let totalAIs = 0;
    let multiAISessionCount = 0;
    const messageCounts: number[] = [];
    
    for (const session of sessions) {
      totalAIs += session.selectedAIs.length;
      if (session.selectedAIs.length > 1) {
        multiAISessionCount++;
      }
      messageCounts.push(session.messages.length);
    }
    
    const averageAIsPerSession = totalAIs / sessions.length;
    const multiAIPreference = (multiAISessionCount / sessions.length) * 100;
    
    // Sort once for median calculation
    messageCounts.sort((a, b) => a - b);
    const medianMessages = messageCounts[Math.floor(messageCounts.length / 2)] || 0;
    
    let preferredSessionSize: 'small' | 'medium' | 'large' = 'small';
    if (medianMessages > 20) preferredSessionSize = 'large';
    else if (medianMessages > 10) preferredSessionSize = 'medium';

    return {
      mostUsedAI,
      preferredSessionSize,
      averageAIsPerSession: Math.round(averageAIsPerSession * 10) / 10,
      multiAIPreference: Math.round(multiAIPreference),
      medianMessages
    };
  }, [sessions]);

  /**
   * Manual refresh function (for future use with complex calculations)
   */
  const refresh = () => {
    // Future: could trigger recalculation of expensive stats
    // For now, stats are automatically recalculated via useMemo dependencies
  };

  return {
    stats,
    formattedStats,
    activityInsights,
    usagePatterns,
    isCalculating,
    refresh
  };
};