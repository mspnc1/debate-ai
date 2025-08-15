import { ChatSession } from '../../types';
import { SessionSortStrategy, SortOptions } from '../../types/history';

export class SessionSortService {
  private static instance: SessionSortService;
  private strategies: Map<string, SessionSortStrategy> = new Map();

  static getInstance(): SessionSortService {
    if (!SessionSortService.instance) {
      SessionSortService.instance = new SessionSortService();
    }
    return SessionSortService.instance;
  }

  constructor() {
    this.initializeDefaultStrategies();
  }

  /**
   * Sort sessions by date (most recent first - default)
   */
  sortByDate(sessions: ChatSession[], direction: 'asc' | 'desc' = 'desc'): ChatSession[] {
    return [...sessions].sort((a, b) => {
      const comparison = b.createdAt - a.createdAt;
      return direction === 'desc' ? comparison : -comparison;
    });
  }

  /**
   * Sort sessions by last message timestamp
   */
  sortByLastActivity(sessions: ChatSession[], direction: 'asc' | 'desc' = 'desc'): ChatSession[] {
    return [...sessions].sort((a, b) => {
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      const comparison = bTime - aTime;
      return direction === 'desc' ? comparison : -comparison;
    });
  }

  /**
   * Sort sessions by message count
   */
  sortByMessageCount(sessions: ChatSession[], direction: 'asc' | 'desc' = 'desc'): ChatSession[] {
    return [...sessions].sort((a, b) => {
      const comparison = b.messages.length - a.messages.length;
      return direction === 'desc' ? comparison : -comparison;
    });
  }

  /**
   * Sort sessions by AI count (diversity)
   */
  sortByAICount(sessions: ChatSession[], direction: 'asc' | 'desc' = 'desc'): ChatSession[] {
    return [...sessions].sort((a, b) => {
      const comparison = b.selectedAIs.length - a.selectedAIs.length;
      return direction === 'desc' ? comparison : -comparison;
    });
  }

  /**
   * Sort sessions alphabetically by AI names
   */
  sortByAINames(sessions: ChatSession[], direction: 'asc' | 'desc' = 'asc'): ChatSession[] {
    return [...sessions].sort((a, b) => {
      const aNames = a.selectedAIs.map(ai => ai.name).join(' ').toLowerCase();
      const bNames = b.selectedAIs.map(ai => ai.name).join(' ').toLowerCase();
      const comparison = aNames.localeCompare(bNames);
      return direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Sort sessions by conversation quality (messages per AI ratio)
   */
  sortByConversationQuality(sessions: ChatSession[], direction: 'asc' | 'desc' = 'desc'): ChatSession[] {
    return [...sessions].sort((a, b) => {
      const aQuality = a.selectedAIs.length > 0 ? a.messages.length / a.selectedAIs.length : 0;
      const bQuality = b.selectedAIs.length > 0 ? b.messages.length / b.selectedAIs.length : 0;
      const comparison = bQuality - aQuality;
      return direction === 'desc' ? comparison : -comparison;
    });
  }

  /**
   * Generic sort using options
   */
  sort(sessions: ChatSession[], options: SortOptions): ChatSession[] {
    switch (options.field) {
      case 'createdAt':
        return this.sortByDate(sessions, options.direction);
      
      case 'lastMessageAt':
        return this.sortByLastActivity(sessions, options.direction);
      
      case 'messageCount':
        return this.sortByMessageCount(sessions, options.direction);
      
      case 'aiCount':
        return this.sortByAICount(sessions, options.direction);
      
      default:
        return this.sortByDate(sessions, options.direction);
    }
  }

  /**
   * Custom sort using a registered strategy
   */
  sortByStrategy(sessions: ChatSession[], strategyName: string): ChatSession[] {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      console.warn(`Sort strategy '${strategyName}' not found, using default date sort`);
      return this.sortByDate(sessions);
    }

    if (strategy.compareFn) {
      return [...sessions].sort(strategy.compareFn);
    }

    // Fallback to field-based sorting with type safety
    const validSortFields = ['createdAt', 'lastMessageAt', 'messageCount', 'aiCount'] as const;
    type ValidSortField = typeof validSortFields[number];
    
    // Validate strategy field against known sort fields to prevent runtime errors
    // If invalid field provided, default to 'createdAt' for consistent behavior
    const field = validSortFields.includes(strategy.field as ValidSortField) 
      ? strategy.field as ValidSortField
      : 'createdAt'; // Safe default ensures app doesn't crash
      
    return this.sort(sessions, {
      field,
      direction: strategy.direction
    });
  }

  /**
   * Register a custom sort strategy
   */
  registerStrategy(strategy: SessionSortStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Get all available sort strategies
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Multi-level sort (sort by multiple criteria)
   */
  multiSort(
    sessions: ChatSession[], 
    sortCriteria: Array<{ field: 'createdAt' | 'lastMessageAt' | 'messageCount' | 'aiCount', direction: 'asc' | 'desc' }>
  ): ChatSession[] {
    return [...sessions].sort((a, b) => {
      for (const criterion of sortCriteria) {
        let comparison = 0;

        switch (criterion.field) {
          case 'createdAt':
            comparison = a.createdAt - b.createdAt;
            break;
          
          case 'lastMessageAt': {
            const aTime = a.lastMessageAt || a.createdAt;
            const bTime = b.lastMessageAt || b.createdAt;
            comparison = aTime - bTime;
            break;
          }
          
          case 'messageCount':
            comparison = a.messages.length - b.messages.length;
            break;
          
          case 'aiCount':
            comparison = a.selectedAIs.length - b.selectedAIs.length;
            break;
        }

        if (comparison !== 0) {
          return criterion.direction === 'desc' ? -comparison : comparison;
        }
      }

      return 0;
    });
  }

  /**
   * Smart sort that considers multiple factors with weights
   */
  smartSort(sessions: ChatSession[]): ChatSession[] {
    return [...sessions].sort((a, b) => {
      // Factors with weights
      const factors = [
        { 
          weight: 0.5, 
          value: (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt) // Recency
        },
        { 
          weight: 0.3, 
          value: b.messages.length - a.messages.length // Activity
        },
        { 
          weight: 0.2, 
          value: b.selectedAIs.length - a.selectedAIs.length // Complexity
        }
      ];

      const score = factors.reduce((sum, factor) => sum + (factor.weight * factor.value), 0);
      return score > 0 ? -1 : score < 0 ? 1 : 0;
    });
  }

  /**
   * Sort sessions into groups by date
   */
  groupByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
    const groups: Record<string, ChatSession[]> = {};
    const now = new Date();
    
    sessions.forEach(session => {
      const sessionDate = new Date(session.createdAt);
      const diffDays = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let groupKey: string;
      if (diffDays === 0) {
        groupKey = 'Today';
      } else if (diffDays === 1) {
        groupKey = 'Yesterday';
      } else if (diffDays < 7) {
        groupKey = 'This Week';
      } else if (diffDays < 30) {
        groupKey = 'This Month';
      } else if (diffDays < 365) {
        groupKey = sessionDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      } else {
        groupKey = sessionDate.getFullYear().toString();
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(session);
    });

    // Sort within each group
    Object.keys(groups).forEach(key => {
      groups[key] = this.sortByDate(groups[key], 'desc');
    });

    return groups;
  }

  private initializeDefaultStrategies(): void {
    // Most Recent First (Default)
    this.registerStrategy({
      name: 'recent',
      field: 'createdAt',
      direction: 'desc'
    });

    // Most Active (by message count)
    this.registerStrategy({
      name: 'active',
      field: 'messageCount',
      direction: 'desc'
    });

    // Most Complex (by AI count)
    this.registerStrategy({
      name: 'complex',
      field: 'aiCount',
      direction: 'desc'
    });

    // Oldest First
    this.registerStrategy({
      name: 'oldest',
      field: 'createdAt',
      direction: 'asc'
    });

    // Recently Active
    this.registerStrategy({
      name: 'recently-active',
      field: 'lastMessageAt',
      direction: 'desc'
    });

    // Alphabetical by AI names
    this.registerStrategy({
      name: 'alphabetical',
      field: 'aiCount', // placeholder, uses custom compareFn
      direction: 'asc',
      compareFn: (a: ChatSession, b: ChatSession) => {
        const aNames = a.selectedAIs.map(ai => ai.name).join(' ').toLowerCase();
        const bNames = b.selectedAIs.map(ai => ai.name).join(' ').toLowerCase();
        return aNames.localeCompare(bNames);
      }
    });

    // Quality Score (balanced activity and complexity)
    this.registerStrategy({
      name: 'quality',
      field: 'messageCount', // placeholder, uses custom compareFn
      direction: 'desc',
      compareFn: (a: ChatSession, b: ChatSession) => {
        const aScore = (a.messages.length * 0.7) + (a.selectedAIs.length * 0.3);
        const bScore = (b.messages.length * 0.7) + (b.selectedAIs.length * 0.3);
        return bScore - aScore;
      }
    });
  }
}

export default SessionSortService.getInstance();