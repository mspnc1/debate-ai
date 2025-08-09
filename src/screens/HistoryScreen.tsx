import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  style: object 
}> = ({ text, searchTerm, style }) => {
  if (!searchTerm) {
    return <Text style={style}>{text}</Text>;
  }

  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return (
    <Text style={style}>
      {parts.map((part, index) => 
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <Text key={index} style={{ backgroundColor: '#FFE066', fontWeight: '600' }}>
            {part}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        )
      )}
    </Text>
  );
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
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
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
      return;
    }

    const searchLower = searchQuery.toLowerCase().trim();
    const filtered = sessions.filter(session => {
      // Search in messages content and sender names
      const messageMatch = session.messages.some(msg => 
        msg.content.toLowerCase().includes(searchLower) ||
        msg.sender.toLowerCase().includes(searchLower)
      );
      
      // Search in AI names
      const aiMatch = session.selectedAIs.some(ai =>
        ai.name.toLowerCase().includes(searchLower)
      );
      
      return messageMatch || aiMatch;
    });
    
    // console.log(`Search for "${searchQuery}": found ${filtered.length} of ${sessions.length} sessions`);
    setFilteredSessions(filtered);
  };

  const resumeSession = (session: ChatSession) => {
    dispatch(loadSession(session));
    navigation.navigate('Chat', { 
      sessionId: session.id, 
      resuming: true,
      searchTerm: searchQuery.trim() // Pass search term for highlighting
    });
  };

  const deleteSession = async (sessionId: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const newSessions = sessions.filter(s => s.id !== sessionId);
              setSessions(newSessions);
              await AsyncStorage.setItem('chatSessions', JSON.stringify(newSessions));
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
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getSessionSummary = (session: ChatSession) => {
    if (session.messages.length === 0) return 'No messages';
    
    // If searching, try to show the matching message
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim();
      const matchingMessage = session.messages.find(msg => 
        msg.content.toLowerCase().includes(searchLower)
      );
      
      if (matchingMessage) {
        const content = matchingMessage.content;
        const matchIndex = content.toLowerCase().indexOf(searchLower);
        
        // Show context around the match
        const contextStart = Math.max(0, matchIndex - 20);
        const contextEnd = Math.min(content.length, matchIndex + searchQuery.length + 30);
        
        let preview = '';
        if (contextStart > 0) preview += '...';
        preview += content.substring(contextStart, contextEnd);
        if (contextEnd < content.length) preview += '...';
        
        return preview;
      }
    }
    
    // Default to showing last message
    const lastMessage = session.messages[session.messages.length - 1];
    return lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 50) + '...'
      : lastMessage.content;
  };

  const getSessionTitle = (session: ChatSession) => {
    const aiNames = session.selectedAIs.map(ai => ai.name).join(', ');
    return `Chat with ${aiNames}`;
  };

  const renderRightActions = (sessionId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteSession(sessionId)}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const renderSession = ({ item, index }: { item: ChatSession; index: number }) => {
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item.id)}
        overshootRight={false}
      >
        <Animated.View
          entering={FadeInDown.delay(index * 100).springify()}
        >
          <TouchableOpacity
            style={styles.sessionCard}
            onPress={() => resumeSession(item)}
            activeOpacity={0.7}
          >
            <View style={styles.sessionHeader}>
              <View style={styles.aiAvatars}>
                {item.selectedAIs.map((ai, idx) => (
                  <View key={ai.id} style={[styles.avatar, { marginLeft: idx > 0 ? -8 : 0 }]}>
                    <Text style={styles.avatarText}>{ai.avatar || '🤖'}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.sessionDate}>{formatDate(item.createdAt)}</Text>
            </View>
            
            <Text style={styles.sessionTitle}>{getSessionTitle(item)}</Text>
            <SessionPreview 
              text={getSessionSummary(item)} 
              searchTerm={searchQuery.trim()}
              style={styles.sessionPreview}
            />
            
            <View style={styles.sessionFooter}>
              <Text style={styles.messageCount}>
                {item.messages.length} messages
              </Text>
              {item.isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Swipeable>
    );
  };

  // Debug function to test storage
  const testStorage = async () => {
    const testSession: ChatSession = {
      id: 'test_' + Date.now(),
      selectedAIs: [{ id: 'test', provider: 'claude', name: 'Test AI' }],
      messages: [
        {
          id: 'msg1',
          sender: 'You',
          senderType: 'user',
          content: 'Test message',
          timestamp: Date.now()
        }
      ],
      isActive: false,
      createdAt: Date.now()
    };
    
    try {
      const stored = await AsyncStorage.getItem('chatSessions');
      const sessions = stored ? JSON.parse(stored) : [];
      sessions.push(testSession);
      await AsyncStorage.setItem('chatSessions', JSON.stringify(sessions));
      // console.log('Test session saved');
      loadChatHistory();
    } catch (error) {
      console.error('Test storage error:', error);
    }
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateEmoji}>💬</Text>
      <Text style={styles.emptyStateTitle}>No conversations yet</Text>
      <Text style={styles.emptyStateText}>
        Start a new chat to see your history here
      </Text>
      <TouchableOpacity
        style={styles.startChatButton}
        onPress={() => navigation.navigate('NewChat')}
      >
        <Text style={styles.startChatButtonText}>Start New Chat</Text>
      </TouchableOpacity>
      {/* Debug button - remove in production */}
      <TouchableOpacity
        style={[styles.startChatButton, { marginTop: 10, backgroundColor: '#666' }]}
        onPress={testStorage}
      >
        <Text style={styles.startChatButtonText}>Test Storage (Debug)</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat History</Text>
        {subscription === 'free' && sessions.length >= maxSessions && (
          <TouchableOpacity 
            style={styles.upgradeBanner}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.upgradeBannerText}>
              🔒 Showing last {maxSessions} chats • Upgrade for unlimited
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {sessions.length > 0 && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for keywords in your chats..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Text style={styles.searchResultCount}>
              {filteredSessions.length} result{filteredSessions.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}

      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSession}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={sessions.length === 0 ? <EmptyState /> : (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No conversations match your search</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  upgradeBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 10,
  },
  upgradeBannerText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchResultCount: {
    fontSize: 12,
    color: '#666666',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiAvatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 14,
  },
  sessionDate: {
    fontSize: 13,
    color: '#999999',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  sessionPreview: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageCount: {
    fontSize: 12,
    color: '#999999',
  },
  activeBadge: {
    backgroundColor: '#D4EDDA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 11,
    color: '#155724',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 16,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  startChatButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  startChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  noResults: {
    paddingTop: 50,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#999999',
  },
});

export default HistoryScreen;