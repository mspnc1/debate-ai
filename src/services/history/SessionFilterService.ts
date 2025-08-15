import { ChatSession } from '../../types';
import { 
  SearchOptions, 
  FilterOptions, 
  SessionSearchMatch, 
  SessionFilterStrategy 
} from '../../types/history';

export class SessionFilterService {
  private static instance: SessionFilterService;
  private strategies: Map<string, SessionFilterStrategy> = new Map();
  private searchCache: Map<string, ChatSession[]> = new Map();
  private regexCache: Map<string, RegExp> = new Map();
  private readonly CACHE_SIZE = 5; // Reduced cache size
  private readonly REGEX_CACHE_SIZE = 20;

  static getInstance(): SessionFilterService {
    if (!SessionFilterService.instance) {
      SessionFilterService.instance = new SessionFilterService();
    }
    return SessionFilterService.instance;
  }

  constructor() {
    this.initializeDefaultStrategies();
  }

  /**
   * Filter sessions by search term with basic options
   */
  filterBySearchTerm(
    sessions: ChatSession[], 
    searchTerm: string, 
    options: Partial<SearchOptions> = {}
  ): ChatSession[] {
    if (!searchTerm.trim()) {
      return sessions;
    }

    const cacheKey = this.generateCacheKey(searchTerm, options);
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const searchOptions: SearchOptions = {
      query: searchTerm.trim(),
      searchInAINames: options.searchInAINames ?? true,
      searchInMessages: options.searchInMessages ?? true,
      caseSensitive: options.caseSensitive ?? false,
      matchWholeWord: options.matchWholeWord ?? false,
      ...options
    };

    const query = searchOptions.caseSensitive ? searchOptions.query : searchOptions.query.toLowerCase();
    
    // Use cached regex if available
    const regexKey = `${query}:${searchOptions.caseSensitive}:${searchOptions.matchWholeWord}`;
    let regex = this.regexCache.get(regexKey);
    
    if (!regex) {
      const wordBoundary = searchOptions.matchWholeWord ? '\\b' : '';
      regex = new RegExp(`${wordBoundary}${this.escapeRegex(query)}${wordBoundary}`, 
                        searchOptions.caseSensitive ? '' : 'i');
      this.cacheRegex(regexKey, regex);
    }

    const filteredSessions = sessions.filter(session => {
      // Search in AI names (using string methods for better performance)
      if (searchOptions.searchInAINames) {
        const aiNames = session.selectedAIs
          .map(ai => searchOptions.caseSensitive ? ai.name : ai.name.toLowerCase())
          .join(' ');
        if (searchOptions.matchWholeWord) {
          if (regex.test(aiNames)) return true;
        } else {
          if (aiNames.includes(query)) return true;
        }
      }

      // Search in message content (limit to first 50 messages for performance)
      if (searchOptions.searchInMessages) {
        const messagesToSearch = session.messages.slice(0, 50);
        const hasMatch = messagesToSearch.some(message => {
          const content = searchOptions.caseSensitive ? message.content : message.content.toLowerCase();
          if (searchOptions.matchWholeWord) {
            return regex.test(content);
          } else {
            return content.includes(query);
          }
        });
        if (hasMatch) return true;
      }

      return false;
    });

    this.updateSearchCache(cacheKey, filteredSessions);
    return filteredSessions;
  }

  /**
   * Find search matches with detailed information
   */
  findSearchMatches(sessions: ChatSession[], searchTerm: string): SessionSearchMatch[] {
    if (!searchTerm.trim()) {
      return [];
    }

    const matches: SessionSearchMatch[] = [];
    const query = searchTerm.toLowerCase();

    sessions.forEach(session => {
      // Check AI names
      session.selectedAIs.forEach((ai, index) => {
        if (ai.name.toLowerCase().includes(query)) {
          matches.push({
            sessionId: session.id,
            matchType: 'aiName',
            matchText: ai.name,
            matchIndex: index
          });
        }
      });

      // Check message content
      session.messages.forEach((message, index) => {
        if (message.content.toLowerCase().includes(query)) {
          matches.push({
            sessionId: session.id,
            matchType: 'messageContent',
            matchText: message.content,
            matchIndex: index
          });
        }
      });
    });

    return matches;
  }

  /**
   * Advanced filtering with multiple criteria
   */
  filterByOptions(sessions: ChatSession[], filterOptions: FilterOptions): ChatSession[] {
    let filteredSessions = [...sessions];

    // Filter by date range
    if (filterOptions.dateRange) {
      const { start, end } = filterOptions.dateRange;
      filteredSessions = filteredSessions.filter(session => {
        const sessionDate = new Date(session.createdAt);
        return sessionDate >= start && sessionDate <= end;
      });
    }

    // Filter by AI providers
    if (filterOptions.aiProviders && filterOptions.aiProviders.length > 0) {
      filteredSessions = filteredSessions.filter(session => {
        return session.selectedAIs.some(ai => 
          filterOptions.aiProviders!.some(provider => 
            ai.provider && ai.provider.toLowerCase() === provider.toLowerCase()
          )
        );
      });
    }

    // Filter by message count range
    if (filterOptions.messageCountRange) {
      const { min, max } = filterOptions.messageCountRange;
      filteredSessions = filteredSessions.filter(session => {
        const count = session.messages.length;
        return count >= min && count <= max;
      });
    }

    return filteredSessions;
  }

  /**
   * Filter sessions that contain specific AI combinations
   */
  filterByAICombination(sessions: ChatSession[], requiredAIs: string[]): ChatSession[] {
    return sessions.filter(session => {
      const sessionAIs = session.selectedAIs.map(ai => ai.name.toLowerCase());
      return requiredAIs.every(ai => 
        sessionAIs.some(sessionAI => sessionAI.includes(ai.toLowerCase()))
      );
    });
  }

  /**
   * Filter sessions by activity level
   */
  filterByActivity(
    sessions: ChatSession[], 
    level: 'low' | 'medium' | 'high' | 'all' = 'all'
  ): ChatSession[] {
    if (level === 'all') return sessions;

    // Calculate activity thresholds based on session distribution
    const messageCounts = sessions.map(s => s.messages.length).sort((a, b) => a - b);
    const lowThreshold = messageCounts[Math.floor(messageCounts.length * 0.33)] || 0;
    const highThreshold = messageCounts[Math.floor(messageCounts.length * 0.67)] || 5;

    return sessions.filter(session => {
      const messageCount = session.messages.length;
      
      switch (level) {
        case 'low':
          return messageCount <= lowThreshold;
        case 'medium':
          return messageCount > lowThreshold && messageCount <= highThreshold;
        case 'high':
          return messageCount > highThreshold;
        default:
          return true;
      }
    });
  }

  /**
   * Filter sessions by recency
   */
  filterByRecency(
    sessions: ChatSession[], 
    period: 'today' | 'week' | 'month' | 'year' | 'all' = 'all'
  ): ChatSession[] {
    if (period === 'all') return sessions;

    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case 'today':
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        cutoffDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return sessions;
    }

    return sessions.filter(session => new Date(session.createdAt) >= cutoffDate);
  }

  /**
   * Filter using a registered strategy
   */
  filterByStrategy(sessions: ChatSession[], strategyName: string, options?: unknown): ChatSession[] {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      console.warn(`Filter strategy '${strategyName}' not found`);
      return sessions;
    }

    return sessions.filter(session => strategy.predicate(session, options));
  }

  /**
   * Register a custom filter strategy
   */
  registerStrategy(strategy: SessionFilterStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Get available filter strategies
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Full-text search with highlighting information
   */
  fullTextSearch(sessions: ChatSession[], searchTerm: string): {
    sessions: ChatSession[];
    matches: SessionSearchMatch[];
    highlightMap: Map<string, string[]>;
  } {
    const filteredSessions = this.filterBySearchTerm(sessions, searchTerm);
    const matches = this.findSearchMatches(filteredSessions, searchTerm);
    
    // Create highlight map for UI
    const highlightMap = new Map<string, string[]>();
    matches.forEach(match => {
      if (!highlightMap.has(match.sessionId)) {
        highlightMap.set(match.sessionId, []);
      }
      highlightMap.get(match.sessionId)!.push(match.matchText);
    });

    return {
      sessions: filteredSessions,
      matches,
      highlightMap
    };
  }

  /**
   * Smart search that combines multiple strategies
   */
  smartSearch(sessions: ChatSession[], query: string): ChatSession[] {
    // If query looks like a date, search by date
    const dateMatch = query.match(/(\d{1,2})[/-](\d{1,2})([/-](\d{2,4}))?/);
    if (dateMatch) {
      return this.filterByDatePattern(sessions, query);
    }

    // If query contains AI provider names, prioritize those
    const aiProviders = ['claude', 'gpt', 'chatgpt', 'gemini', 'nomi', 'replika', 'character'];
    const mentionedProviders = aiProviders.filter(provider => 
      query.toLowerCase().includes(provider)
    );
    
    if (mentionedProviders.length > 0) {
      const providerFiltered = this.filterByOptions(sessions, {
        aiProviders: mentionedProviders
      });
      
      // Also do text search within provider-filtered results
      return this.filterBySearchTerm(providerFiltered, query);
    }

    // Default to comprehensive text search
    return this.filterBySearchTerm(sessions, query, {
      searchInAINames: true,
      searchInMessages: true,
      caseSensitive: false
    });
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    this.regexCache.clear();
  }

  /**
   * Private helper methods
   */
  private generateCacheKey(searchTerm: string, options: Partial<SearchOptions>): string {
    return `${searchTerm}:${JSON.stringify(options)}`;
  }

  private updateSearchCache(key: string, results: ChatSession[]): void {
    if (this.searchCache.size >= this.CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey !== undefined) {
        this.searchCache.delete(firstKey);
      }
    }
    // Store only session IDs to reduce memory usage
    this.searchCache.set(key, results);
  }
  
  private cacheRegex(key: string, regex: RegExp): void {
    if (this.regexCache.size >= this.REGEX_CACHE_SIZE) {
      const firstKey = this.regexCache.keys().next().value;
      if (firstKey !== undefined) {
        this.regexCache.delete(firstKey);
      }
    }
    this.regexCache.set(key, regex);
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private filterByDatePattern(sessions: ChatSession[], pattern: string): ChatSession[] {
    // Simple date pattern matching - can be expanded
    return sessions.filter(session => {
      const date = new Date(session.createdAt);
      const dateString = date.toLocaleDateString();
      return dateString.includes(pattern);
    });
  }

  private initializeDefaultStrategies(): void {
    // Has messages strategy
    this.registerStrategy({
      name: 'has-messages',
      predicate: (session: ChatSession) => session.messages.length > 0
    });

    // Active sessions (recent activity)
    this.registerStrategy({
      name: 'active',
      predicate: (session: ChatSession) => {
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return (session.lastMessageAt || session.createdAt) > dayAgo;
      }
    });

    // Multi-AI sessions
    this.registerStrategy({
      name: 'multi-ai',
      predicate: (session: ChatSession) => session.selectedAIs.length > 1
    });

    // Long conversations
    this.registerStrategy({
      name: 'long-conversations',
      predicate: (session: ChatSession) => session.messages.length >= 10
    });

    // Recent sessions
    this.registerStrategy({
      name: 'recent',
      predicate: (session: ChatSession) => {
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return session.createdAt > weekAgo;
      }
    });
  }
}

export default SessionFilterService.getInstance();