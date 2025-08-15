import { useState, useCallback, useMemo } from 'react';
import { ChatSession } from '../../types';

export interface UseSessionPaginationReturn {
  currentPageSessions: ChatSession[];
  hasMorePages: boolean;
  isLoadingMore: boolean;
  currentPage: number;
  totalPages: number;
  loadMore: () => void;
  resetPagination: () => void;
  paginationInfo: {
    showing: number;
    total: number;
    pageSize: number;
  };
}

interface UseSessionPaginationProps {
  sessions: ChatSession[];
  pageSize?: number;
  initialPageSize?: number;
}

export const useSessionPagination = ({
  sessions,
  pageSize = 20,
  initialPageSize = 10
}: UseSessionPaginationProps): UseSessionPaginationReturn => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Calculate pagination values
  const totalSessions = sessions.length;
  const shouldUsePagination = totalSessions > initialPageSize;
  const totalPages = shouldUsePagination ? Math.ceil(totalSessions / pageSize) : 1;
  const hasMorePages = shouldUsePagination && currentPage < totalPages;

  // Get current page sessions
  const currentPageSessions = useMemo(() => {
    if (!shouldUsePagination) {
      return sessions;
    }

    // For initial load, show initialPageSize items
    if (currentPage === 1) {
      const firstPageSize = Math.min(initialPageSize, totalSessions);
      return sessions.slice(0, firstPageSize);
    }

    // For subsequent pages, show cumulative items
    const itemsToShow = initialPageSize + ((currentPage - 1) * pageSize);
    return sessions.slice(0, Math.min(itemsToShow, totalSessions));
  }, [sessions, currentPage, pageSize, initialPageSize, shouldUsePagination, totalSessions]);

  // Load more items
  const loadMore = useCallback(() => {
    if (!hasMorePages || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setCurrentPage(prev => prev + 1);
      setIsLoadingMore(false);
    }, 300);
  }, [hasMorePages, isLoadingMore]);

  // Reset pagination when sessions change
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setIsLoadingMore(false);
  }, []);

  // Pagination info for UI display
  const paginationInfo = useMemo(() => ({
    showing: currentPageSessions.length,
    total: totalSessions,
    pageSize: currentPage === 1 ? initialPageSize : pageSize,
  }), [currentPageSessions.length, totalSessions, currentPage, initialPageSize, pageSize]);

  return {
    currentPageSessions,
    hasMorePages,
    isLoadingMore,
    currentPage,
    totalPages,
    loadMore,
    resetPagination,
    paginationInfo,
  };
};