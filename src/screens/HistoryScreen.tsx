import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { 
  ThemedView, 
  ThemedText, 
  ThemedButton, 
  ThemedTextInput, 
  ThemedSafeAreaView 
} from '../components/core';
import { useTheme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { loadSession } from '../store';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChatSession } from '../types';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';

interface HistoryScreenProps {
  navigation: {
    navigate: (screen: string, params?: object) => void;
  };
}

// Component to highlight search terms in preview text
const SessionPreview: React.FC<{ 
  text: string; 
  searchTerm: string; 
  style?: object 
}> = ({ text, searchTerm, style }) => {
  const { theme } = useTheme();
  
  if (!searchTerm) {
    return <ThemedText style={style} color="secondary" variant="body">{text}</ThemedText>;
  }

  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return (
    <ThemedText style={style} color="secondary" variant="body">
      {parts.map((part, index) => 
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <ThemedText key={index} style={{ backgroundColor: theme.colors.warning[50], fontWeight: '600' }}>
            {part}
          </ThemedText>
        ) : (
          part
        )
      )}
    </ThemedText>
  );
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const subscription = useSelector((state: RootState) => state.user.currentUser?.subscription || 'free');
  const maxSessions = subscription === 'free' ? 3 : Infinity;

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadChatHistory();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subscription])
  );

  useEffect(() => {
    filterSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sessions]);

  const loadChatHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('chatSessions');
      // console.log('Loading chat history, stored data:', stored);
      if (stored) {
        const allSessions = JSON.parse(stored) as ChatSession[];
        // console.log('Parsed sessions:', allSessions.length, 'sessions');
        // Sort by most recent first
        const sorted = allSessions.sort((a, b) => b.createdAt - a.createdAt);
        // Limit for free users
        const limited = subscription === 'free' ? sorted.slice(0, maxSessions) : sorted;
        setSessions(limited);
        setFilteredSessions(limited);
      } else {
        // console.log('No stored sessions found');
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSessions = () => {
    if (!searchQuery) {
      setFilteredSessions(sessions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = sessions.filter(session => {
      // Search in AI names
      if (session.selectedAIs.some(ai => ai.name.toLowerCase().includes(query))) {
        return true;
      }
      // Search in messages
      return session.messages.some(msg => 
        msg.content.toLowerCase().includes(query)
      );
    });
    
    setFilteredSessions(filtered);
  };

  const resumeSession = (session: ChatSession) => {
    // console.log('Resuming session:', session.id);
    // console.log('Session has', session.messages.length, 'messages');
    dispatch(loadSession(session));
    
    // If searching, pass the search term to highlight it
    const params = searchQuery 
      ? { sessionId: session.id, resuming: true, searchTerm: searchQuery }
      : { sessionId: session.id, resuming: true };
    
    navigation.navigate('Chat', params);
  };

  const deleteSession = async (sessionId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = sessions.filter(s => s.id !== sessionId);
              setSessions(updated);
              await AsyncStorage.setItem('chatSessions', JSON.stringify(updated));
            } catch (error) {
              console.error('Error deleting session:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return `Today, ${date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else if (days === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else if (days < 7) {
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short',
        year: days > 365 ? 'numeric' : undefined
      });
    }
  };

  const renderRightActions = (sessionId: string) => {
    return (
      <ThemedView style={[styles.deleteAction, { backgroundColor: theme.colors.error[500] }]}>
        <ThemedButton
          onPress={() => deleteSession(sessionId)}
          style={{ backgroundColor: 'transparent' }}
        >
          <ThemedText color="inverse" weight="semibold">Delete</ThemedText>
        </ThemedButton>
      </ThemedView>
    );
  };

  const renderSession = ({ item, index }: { item: ChatSession; index: number }) => {
    const lastMessage = item.messages[item.messages.length - 1];
    const preview = lastMessage?.content || 'No messages yet';
    const aiNames = item.selectedAIs.map(ai => ai.name).join(' • ');
    
    // Check if this session contains the search term
    const containsSearchTerm = searchQuery && (
      item.selectedAIs.some(ai => ai.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Swipeable
          renderRightActions={() => renderRightActions(item.id)}
          overshootRight={false}
        >
          <ThemedButton
            onPress={() => resumeSession(item)}
            variant="ghost"
            style={{
              ...styles.sessionCard,
              backgroundColor: theme.colors.card,
              borderColor: containsSearchTerm ? theme.colors.primary[500] : theme.colors.border,
              borderWidth: containsSearchTerm ? 2 : 1,
              shadowColor: theme.colors.shadow,
            }}
          >
            <ThemedView style={styles.sessionContent}>
              <ThemedView style={styles.sessionHeader}>
                <ThemedText variant="subtitle" weight="semibold" numberOfLines={1}>
                  {aiNames}
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  {formatDate(item.createdAt)}
                </ThemedText>
              </ThemedView>
              <SessionPreview 
                text={preview}
                searchTerm={searchQuery}
                style={styles.preview}
              />
              <ThemedView style={styles.sessionFooter}>
                <ThemedText variant="caption" color="secondary">
                  {item.messages.length} messages
                </ThemedText>
                {containsSearchTerm && (
                  <ThemedView style={[styles.matchBadge, { backgroundColor: theme.colors.warning[50] }]}>
                    <ThemedText variant="caption" style={{ color: theme.colors.warning[600] }}>
                      Match found
                    </ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
            </ThemedView>
          </ThemedButton>
        </Swipeable>
      </Animated.View>
    );
  };

  if (isLoading) {
    return (
      <ThemedSafeAreaView edges={['top', 'left', 'right']}>
        <ThemedView style={styles.centered}>
          <ThemedText variant="body" color="secondary">Loading conversations...</ThemedText>
        </ThemedView>
      </ThemedSafeAreaView>
    );
  }

  return (
    <ThemedSafeAreaView>
      <ThemedView flex={1}>
        {/* Header */}
        <ThemedView style={[
          styles.header,
          { 
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          }
        ]}>
          <ThemedText variant="title" weight="bold">
            Chat History
          </ThemedText>
          {subscription === 'free' && (
            <ThemedView style={[
              styles.limitBadge,
              { backgroundColor: theme.colors.warning[50] }
            ]}>
              <ThemedText variant="caption" style={{ color: theme.colors.warning[600] }}>
                {sessions.length}/{maxSessions} chats (Free plan)
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {/* Search Bar */}
        <ThemedView style={[
          styles.searchContainer,
          { backgroundColor: theme.colors.surface }
        ]}>
          <ThemedTextInput
            style={styles.searchInput}
            placeholder="Search messages or AI names..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            variant="filled"
            borderRadius="lg"
          />
        </ThemedView>

        {/* Sessions List */}
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyStateEmoji}>
                {searchQuery ? '🔍' : '💬'}
              </ThemedText>
              <ThemedText variant="title" align="center" style={{ marginBottom: 8 }}>
                {searchQuery ? 'No matches found' : 'No conversations yet'}
              </ThemedText>
              <ThemedText variant="body" color="secondary" align="center">
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Start a new chat to see it here'}
              </ThemedText>
            </ThemedView>
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Stats or Tips */}
        {sessions.length > 0 && !searchQuery && (
          <ThemedView style={[
            styles.statsBar,
            { 
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            }
          ]}>
            <ThemedText variant="caption" color="secondary">
              {sessions.length} conversation{sessions.length !== 1 ? 's' : ''} • 
              {' '}{sessions.reduce((acc, s) => acc + s.messages.length, 0)} total messages
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </ThemedSafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInput: {
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexGrow: 1,
  },
  sessionCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  preview: {
    marginBottom: 8,
    lineHeight: 20,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    marginBottom: 12,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  statsBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
});

export default HistoryScreen;