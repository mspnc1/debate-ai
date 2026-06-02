import { useState, useEffect, useCallback, useRef } from 'react';
import { StorageService } from '../../services/chat';
import { ChatSession } from '../../types';
import { UseSessionHistoryReturn, SessionValidationResult } from '../../types/history';

export const useSessionHistory = (): UseSessionHistoryReturn => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [validationResult] = useState<SessionValidationResult | undefined>(undefined);
  const hasLoadedOnceRef = useRef(false);
  const loadRequestIdRef = useRef(0);


  /**
   * Load sessions from storage
   */
  const loadSessions = useCallback(async (showRefreshIndicator = false) => {
    const requestId = ++loadRequestIdRef.current;
    const isInitialLoad = !hasLoadedOnceRef.current;

    try {
      if (isInitialLoad) {
        setIsLoading(true);
      } else if (showRefreshIndicator) {
        setIsRefreshing(true);
      }
      setError(null);

      // Simple direct load with timeout
      
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Loading sessions timed out after 3 seconds')), 3000)
      );
      
      let allSessions: ChatSession[] = [];
      try {
        allSessions = await Promise.race([
          StorageService.getAllSessions(),
          timeoutPromise
        ]) as ChatSession[];
      } catch {
        allSessions = [];
      }

      // Don't limit here - storage already enforces per-type limits
      // Free users get 3 chats + 3 comparisons + 3 debates = 9 total possible
      const limitedSessions = allSessions;

      if (requestId === loadRequestIdRef.current) {
        setSessions(limitedSessions);
        hasLoadedOnceRef.current = true;
      }

    } catch (err) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      const error = err instanceof Error ? err : new Error('Failed to load sessions');
      setError(error);
      console.error('Error loading chat history:', error);
      // Set empty array on error to prevent crashes
      setSessions([]);
      hasLoadedOnceRef.current = true;
    } finally {
      if (requestId === loadRequestIdRef.current) {
        if (isInitialLoad) {
          setIsLoading(false);
        }
        if (!isInitialLoad && showRefreshIndicator) {
          setIsRefreshing(false);
        }
      }
    }
  }, []);

  /**
   * Refresh sessions (public API for manual refresh)
   */
  const refresh = useCallback(async () => {
    await loadSessions(true);
  }, [loadSessions]);

  /**
   * Clear all session history
   */
  const clearHistory = useCallback(async () => {
    try {
      setError(null);
      await StorageService.clearAllSessions();
      setSessions([]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear history');
      setError(error);
      console.error('Error clearing history:', error);
      throw error;
    }
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    isLoading,
    isRefreshing,
    error,
    refresh,
    clearHistory,
    validationResult
  };
};
