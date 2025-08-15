import { useState, useEffect, useCallback, useMemo } from 'react';
import { sessionFilterService } from '../../services/history';
import { ChatSession } from '../../types';
import { UseSessionSearchReturn, SessionSearchMatch } from '../../types/history';

const SEARCH_DEBOUNCE_MS = 300;

export const useSessionSearch = (sessions: ChatSession[]): UseSessionSearchReturn => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Filter sessions based on search query
   */
  const filteredSessions = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return sessions;
    }

    return sessionFilterService.filterBySearchTerm(sessions, debouncedQuery, {
      searchInAINames: true,
      searchInMessages: true,
      caseSensitive: false,
      matchWholeWord: false
    });
  }, [sessions, debouncedQuery]);

  /**
   * Find detailed search matches
   */
  const searchMatches = useMemo((): SessionSearchMatch[] => {
    if (!debouncedQuery.trim()) {
      return [];
    }

    return sessionFilterService.findSearchMatches(sessions, debouncedQuery);
  }, [sessions, debouncedQuery]);

  /**
   * Check if there are active filters
   */
  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim().length > 0;
  }, [searchQuery]);

  /**
   * Clear search and filters
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  /**
   * Set search query (wrapper for controlled input)
   */
  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Get search statistics
   */
  const searchStats = useMemo(() => {
    const totalSessions = sessions.length;
    const filteredCount = filteredSessions.length;
    const matchCount = searchMatches.length;

    return {
      totalSessions,
      filteredCount,
      matchCount,
      hasResults: filteredCount > 0,
      filteredPercentage: totalSessions > 0 ? Math.round((filteredCount / totalSessions) * 100) : 0
    };
  }, [sessions.length, filteredSessions.length, searchMatches.length]);

  /**
   * Advanced search with multiple criteria
   */
  const advancedSearch = useCallback((options: {
    query?: string;
    aiProviders?: string[];
    dateRange?: { start: Date; end: Date };
    messageCountRange?: { min: number; max: number };
  }) => {
    let results = [...sessions];

    // Apply text search
    if (options.query) {
      results = sessionFilterService.filterBySearchTerm(results, options.query);
    }

    // Apply additional filters
    if (options.aiProviders || options.dateRange || options.messageCountRange) {
      results = sessionFilterService.filterByOptions(results, {
        aiProviders: options.aiProviders,
        dateRange: options.dateRange,
        messageCountRange: options.messageCountRange
      });
    }

    return results;
  }, [sessions]);

  /**
   * Smart search that handles different query types
   */
  const smartSearch = useCallback((query: string) => {
    if (!query.trim()) {
      return sessions;
    }

    return sessionFilterService.smartSearch(sessions, query);
  }, [sessions]);

  return {
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    filteredSessions,
    searchMatches,
    hasActiveFilters,
    clearSearch,
    searchStats,
    advancedSearch,
    smartSearch,
    isSearching: searchQuery !== debouncedQuery // True while debouncing
  };
};