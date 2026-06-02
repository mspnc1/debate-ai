import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Box } from '../components/atoms';
import { Button, Typography } from '../components/molecules';
import { useTheme } from '../theme';
import { useGreeting } from '../hooks/useGreeting';
import { useFocusEffect } from '@react-navigation/native';
import {
  HistorySearchBar,
  HistoryList,
  HistoryStats,
  EmptyHistoryState,
  HistoryListSkeleton,
  SessionDetailPane
} from '../components/organisms/history';
import { ErrorBoundary, Header, HeaderActions } from '../components/organisms';
import {
  useSessionHistory,
  useSessionSearch,
  useSessionActions,
  useSessionStats,
  useSessionPagination
} from '../hooks/history';
import { HistoryScreenNavigationProps } from '../types/history';
import { ChatSession } from '../types';
import { DemoBanner } from '@/components/molecules/subscription/DemoBanner';
import { useDispatch } from 'react-redux';
import { showSheet } from '@/store';
import useFeatureAccess from '@/hooks/useFeatureAccess';
import { useResponsive } from '../hooks/useResponsive';

interface HistoryScreenProps {
  navigation: HistoryScreenNavigationProps;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { canStartTrial } = useFeatureAccess();
  const { isTablet, isLandscape, width } = useResponsive();
  const greeting = useGreeting({ screenCategory: 'history' });
  const [activeTab, setActiveTab] = useState<'all' | 'chat' | 'comparison' | 'debate'>('all');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const hasFocusedOnceRef = useRef(false);

  // Show split view on iPad landscape with sufficient width
  const showSplitView = isTablet && isLandscape && width > 1024;
  
  // Compose hooks for different concerns
  const { sessions, isLoading, isRefreshing, error, refresh } = useSessionHistory();
  const { searchQuery, setSearchQuery, filteredSessions, clearSearch } = useSessionSearch(sessions);
  const { deleteSession, resumeSession, bulkDelete } = useSessionActions(navigation, refresh);
  useSessionStats(sessions); // For future analytics features
  
  // Filter sessions by type
  const typeFilteredSessions = useMemo(() => {
    if (activeTab === 'all') return filteredSessions;
    return filteredSessions.filter(session => {
      // Only show sessions with explicit sessionType matching the filter
      return session.sessionType === activeTab;
    });
  }, [filteredSessions, activeTab]);
  
  // Get counts for each type
  const sessionCounts = useMemo(() => {
    return sessions.reduce((acc, session) => {
      // Only count sessions with explicit sessionType
      if (session.sessionType) {
        acc[session.sessionType] = (acc[session.sessionType] || 0) + 1;
      }
      acc.all = (acc.all || 0) + 1;
      return acc;
    }, { all: 0, chat: 0, comparison: 0, debate: 0 });
  }, [sessions]);
  
  // Memoize total message count to avoid expensive recalculation on every render
  const totalMessageCount = useMemo(() => {
    return sessions.reduce((sum, session) => sum + session.messages.length, 0);
  }, [sessions]);
  
  // Pagination for large datasets (only enable for non-premium users with 100+ sessions or search results)
  const shouldUsePagination = typeFilteredSessions.length > 100 || (!searchQuery && sessions.length > 100);
  const {
    currentPageSessions,
    hasMorePages,
    isLoadingMore,
    loadMore,
    resetPagination
  } = useSessionPagination({
    sessions: typeFilteredSessions,
    pageSize: 20,
    initialPageSize: 15
  });

  // Use paginated sessions if pagination is enabled, otherwise use all filtered sessions
  const displaySessions = shouldUsePagination ? currentPageSessions : typeFilteredSessions;

  const selectedCount = selectedSessionIds.size;
  const allVisibleSelected = displaySessions.length > 0
    && displaySessions.every(session => selectedSessionIds.has(session.id));
  const allMatchingSelected = typeFilteredSessions.length > 0
    && typeFilteredSessions.every(session => selectedSessionIds.has(session.id));

  const clearSelection = useCallback(() => {
    setSelectedSessionIds(new Set());
    setSelectionMode(false);
  }, []);

  const selectSessions = useCallback((targetSessions: ChatSession[]) => {
    if (targetSessions.length === 0) return;
    setSelectionMode(true);
    setSelectedSessionIds(new Set(targetSessions.map(session => session.id)));
  }, []);

  const toggleSessionSelection = useCallback((session: ChatSession) => {
    setSelectedSessionIds(previous => {
      const next = new Set(previous);
      if (next.has(session.id)) {
        next.delete(session.id);
      } else {
        next.add(session.id);
      }
      if (next.size === 0) {
        setSelectionMode(false);
      } else {
        setSelectionMode(true);
      }
      return next;
    });
  }, []);

  const handleSelectVisible = useCallback(() => {
    if (displaySessions.length === 0) return;
    if (allVisibleSelected) {
      setSelectedSessionIds(previous => {
        const next = new Set(previous);
        displaySessions.forEach(session => next.delete(session.id));
        if (next.size === 0) {
          setSelectionMode(false);
        }
        return next;
      });
    } else {
      setSelectionMode(true);
      setSelectedSessionIds(previous => {
        const next = new Set(previous);
        displaySessions.forEach(session => next.add(session.id));
        return next;
      });
    }
  }, [allVisibleSelected, displaySessions]);

  const handleSelectAllMatching = useCallback(() => {
    if (allMatchingSelected) {
      clearSelection();
    } else {
      selectSessions(typeFilteredSessions);
    }
  }, [allMatchingSelected, clearSelection, selectSessions, typeFilteredSessions]);

  const handleDeleteSelected = useCallback(async () => {
    const ids = Array.from(selectedSessionIds);
    if (ids.length === 0) return;
    const deleted = await bulkDelete(ids);
    if (deleted) {
      clearSelection();
    }
  }, [bulkDelete, clearSelection, selectedSessionIds]);

  // Reset pagination when search query or tab changes
  useEffect(() => {
    resetPagination();
    clearSelection();
  }, [searchQuery, activeTab, resetPagination, clearSelection]);

  useEffect(() => {
    setSelectedSessionIds(previous => {
      if (previous.size === 0) return previous;
      const validIds = new Set(typeFilteredSessions.map(session => session.id));
      const next = new Set(Array.from(previous).filter(id => validIds.has(id)));
      if (next.size === 0) {
        setSelectionMode(false);
      }
      return next;
    });
  }, [typeFilteredSessions]);

  // Refresh sessions when screen comes into focus (tab navigation)
  useFocusEffect(
    React.useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return undefined;
      }

      // Increased delay to ensure storage operations complete
      const timer = setTimeout(() => {
        refresh();
      }, 300);
      return () => clearTimeout(timer);
    }, [refresh])
  );

  // Handle loading state
  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ErrorBoundary>
          <Box style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Header
              variant="gradient"
              slim
              title="The Archives"
              rightElement={<HeaderActions variant="gradient" helpTopicId="history" />}
            />

            {/* Witty loading line (relocated from the header greeting) */}
            <Typography
              variant="body"
              color="secondary"
              style={{ textAlign: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg }}
            >
              {greeting.timeBasedGreeting}
            </Typography>

            {/* Skeleton loading */}
            <HistoryListSkeleton count={4} />
          </Box>
        </ErrorBoundary>
      </SafeAreaView>
    );
  }

  // Handle error state
  if (error) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <EmptyHistoryState
          type="loading-error"
          onRetry={refresh}
        />
      </SafeAreaView>
    );
  }

  // Determine empty state type
  const getEmptyStateType = () => {
    if (searchQuery && typeFilteredSessions.length === 0) {
      return 'no-results';
    }
    return 'no-sessions';
  };

  // Handle navigation based on active tab
  const handleStartNew = () => {
    switch (activeTab) {
      case 'debate':
        navigation.navigate('MainTabs', { screen: 'DebateTab' });
        break;
      case 'comparison':
        navigation.navigate('MainTabs', { screen: 'CompareTab' });
        break;
      case 'chat':
      case 'all':
      default:
        navigation.navigate('Home');
        break;
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    clearSearch();
    clearSelection();
  };

  // Handle session press - preview in split view, navigate otherwise
  const handleSessionPress = (session: ChatSession) => {
    if (selectionMode) {
      toggleSessionSelection(session);
      return;
    }
    if (showSplitView) {
      setSelectedSession(session);
    } else {
      resumeSession(session);
    }
  };

  const handleSessionLongPress = (session: ChatSession) => {
    toggleSessionSelection(session);
  };

  // Handle opening session from detail pane
  const handleOpenSession = (session: ChatSession) => {
    resumeSession(session);
  };

  // Render the session list content (used in both layouts)
  const renderSessionList = () => (
    <>
      <HistoryList
        sessions={displaySessions}
        onSessionPress={handleSessionPress}
        onSessionLongPress={handleSessionLongPress}
        onSessionDelete={deleteSession}
        selectedSessionIds={selectedSessionIds}
        selectionMode={selectionMode}
        searchTerm={searchQuery}
        refreshing={isRefreshing}
        onRefresh={refresh}
        testID="history-session-list"
        onLoadMore={shouldUsePagination ? loadMore : undefined}
        hasMorePages={shouldUsePagination ? hasMorePages : false}
        isLoadingMore={shouldUsePagination ? isLoadingMore : false}
        totalSessions={shouldUsePagination ? filteredSessions.length : undefined}
        ListEmptyComponent={
          <EmptyHistoryState
            type={getEmptyStateType()}
            searchTerm={searchQuery}
            onStartChat={handleStartNew}
            onRetry={refresh}
            onClearSearch={handleClearSearch}
            emptyStateConfig={
              activeTab === 'debate' ? {
                icon: 'sword-cross',
                iconLibrary: 'material-community',
                title: greeting.timeBasedGreeting,
                message: 'Start a debate to see it here',
                actionText: 'Start Debating'
              } : activeTab === 'comparison' ? {
                icon: 'git-compare-outline',
                iconLibrary: 'ionicons',
                title: greeting.timeBasedGreeting,
                message: 'Compare AI responses to see them here',
                actionText: 'Start Comparing'
              } : activeTab === 'chat' ? {
                icon: 'chatbubbles-outline',
                iconLibrary: 'ionicons',
                title: greeting.timeBasedGreeting,
                message: 'Start a conversation to see it here',
                actionText: 'Start Chatting'
              } : {
                title: greeting.timeBasedGreeting,
                message: greeting.welcomeMessage,
              }
            }
          />
        }
      />
      {selectionMode && (
        <View style={[styles.selectionToolbar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <Typography variant="caption" weight="semibold" color="secondary">
            {selectedCount} selected
          </Typography>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectionActions}
          >
            <Button
              title={allVisibleSelected ? 'Unselect Visible' : 'Select Visible'}
              onPress={handleSelectVisible}
              variant="secondary"
              size="small"
            />
            <Button
              title={allMatchingSelected ? 'Unselect Matching' : 'Select Matching'}
              onPress={handleSelectAllMatching}
              variant="secondary"
              size="small"
            />
            <Button
              title={`Delete (${selectedCount})`}
              onPress={handleDeleteSelected}
              variant="danger"
              size="small"
              disabled={selectedCount === 0}
            />
            <Button
              title="Cancel"
              onPress={clearSelection}
              variant="ghost"
              size="small"
            />
          </ScrollView>
        </View>
      )}
      {/* Stats bar - only show when there are sessions and no search */}
      <HistoryStats
        sessionCount={sessions.length}
        messageCount={totalMessageCount}
        visible={!selectionMode && !searchQuery && sessions.length > 0}
      />
    </>
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ErrorBoundary>
        <Box style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <Header
            variant="gradient"
            slim
            title="The Archives"
            rightElement={<HeaderActions variant="gradient" helpTopicId="history" />}
          />

          <DemoBanner
            subtitle={
              canStartTrial
                ? 'Demo Mode: Replay samples only. Start a free trial to continue.'
                : 'Demo Mode: Replay samples only. Upgrade to Premium to continue.'
            }
            onPress={() => dispatch(showSheet({ sheet: 'subscription' }))}
          />

          {/* Search bar */}
          <HistorySearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={handleClearSearch}
            placeholder="Search messages or AI names..."
          />

          {/* Type filter tabs */}
          <View style={{ height: 50 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
            >
              {(['all', 'chat', 'comparison', 'debate'] as const).map(tab => {
                const label = tab === 'comparison' ? 'Compare' : tab.charAt(0).toUpperCase() + tab.slice(1);
                const count = sessionCounts[tab];
                const isActive = activeTab === tab;

                return (
                  <Button
                    key={tab}
                    title={`${label}${count > 0 ? ` (${count})` : ''}`}
                    onPress={() => setActiveTab(tab)}
                    variant={isActive ? 'primary' : 'ghost'}
                    size="small"
                    style={{ minWidth: 100, paddingHorizontal: 16 }}
                  />
                );
              })}
            </ScrollView>
          </View>

          {/* Main content area - split view on iPad landscape */}
          {showSplitView ? (
            <View style={iPadStyles.splitContainer}>
              {/* Left pane: Session list */}
              <View style={[iPadStyles.masterPane, { borderRightColor: theme.colors.border }]}>
                {renderSessionList()}
              </View>
              {/* Right pane: Session detail */}
              <View style={iPadStyles.detailPane}>
                <SessionDetailPane
                  session={selectedSession}
                  onOpenSession={handleOpenSession}
                />
              </View>
            </View>
          ) : (
            // Phone/tablet portrait: standard single-column layout
            renderSessionList()
          )}
        </Box>
      </ErrorBoundary>
    </SafeAreaView>
  );
};

// iPad-specific styles for split view layout
const iPadStyles = StyleSheet.create({
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  masterPane: {
    width: '35%',
    borderRightWidth: 1,
  },
  detailPane: {
    flex: 1,
  },
});

const styles = StyleSheet.create({
  selectionToolbar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  selectionActions: {
    gap: 8,
    paddingRight: 16,
  },
});

export default HistoryScreen;
