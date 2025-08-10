import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { addMessage, setTypingAI } from '../store';
import { Message, ChatSession } from '../types';
import { AIService } from '../services/aiAdapter';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatScreenProps {
  navigation: {
    goBack: () => void;
  };
  route: {
    params: {
      sessionId: string;
      resuming?: boolean;
      searchTerm?: string;
      initialPrompt?: string;
    };
  };
}

// Message bubble component
const MessageBubble: React.FC<{ message: Message; isLast: boolean; searchTerm?: string }> = ({ message, isLast, searchTerm }) => {
  const isUser = message.senderType === 'user';
  const scale = useSharedValue(isLast ? 0 : 1);

  useEffect(() => {
    if (isLast) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
    }
  }, [isLast, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.messageContainer,
        isUser && styles.userMessageContainer,
        animatedStyle,
      ]}
    >
      {!isUser && (
        <View style={styles.aiHeader}>
          <Text style={styles.aiName}>{message.sender}</Text>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {searchTerm ? highlightSearchTerm(message.content, searchTerm) : highlightMentions(message.content)}
        </Text>
      </View>
      <Text style={[styles.timestamp, isUser && styles.userTimestamp]}>
        {formatTime(message.timestamp)}
      </Text>
    </Animated.View>
  );
};

// Typing indicator component
const TypingIndicator: React.FC<{ aiName: string }> = ({ aiName }) => {
  return (
    <Animated.View
      entering={FadeIn}
      style={styles.typingContainer}
    >
      <View style={styles.typingBubble}>
        <Text style={styles.typingText}>{aiName} is thinking</Text>
        <View style={styles.typingDots}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[styles.dot]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

// Helper function to highlight search terms
const highlightSearchTerm = (text: string, searchTerm: string) => {
  if (!searchTerm) return text;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return parts.map((part, index) => {
    if (part.toLowerCase() === searchTerm.toLowerCase()) {
      return (
        <Text key={index} style={{ backgroundColor: '#FFE066', fontWeight: '600' }}>
          {part}
        </Text>
      );
    }
    return part;
  });
};

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const [inputText, setInputText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [aiService, setAiService] = useState<AIService | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const { currentSession, typingAIs } = useSelector((state: RootState) => state.chat);
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys);
  const messages = currentSession?.messages || [];
  const selectedAIs = currentSession?.selectedAIs || [];
  const searchTerm = route.params?.searchTerm;
  const initialPrompt = route.params?.initialPrompt;

  // Initialize AI service when API keys change
  useEffect(() => {
    const service = new AIService(apiKeys || {});
    setAiService(service);
  }, [apiKeys]);

  // Send initial prompt if provided
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (initialPrompt && typeof initialPrompt === 'string' && messages.length === 0 && currentSession) {
      setInputText(initialPrompt);
      // Auto-send after a short delay to let the UI settle
      timeoutId = setTimeout(() => {
        // Call sendMessage with the initial prompt directly
        if (initialPrompt.trim()) {
          handleSendMessage(initialPrompt);
        }
      }, 500);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, currentSession]);

  // Save session to AsyncStorage whenever it changes
  useEffect(() => {
    // console.log('ChatScreen - currentSession changed:', currentSession?.id, 'messages:', currentSession?.messages.length);
    if (currentSession) {
      saveSessionToStorage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession, currentSession?.messages.length]);

  // Scroll to first matching message when search term is present
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (searchTerm && messages.length > 0) {
      const matchIndex = messages.findIndex(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (matchIndex >= 0) {
        // Small delay to ensure list is rendered
        timeoutId = setTimeout(() => {
          flatListRef.current?.scrollToIndex({ 
            index: matchIndex, 
            animated: true,
            viewPosition: 0.5 // Center the message
          });
        }, 100);
      }
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, messages.length]);

  const saveSessionToStorage = async () => {
    if (!currentSession) return;
    
    try {
      // Get existing sessions
      const stored = await AsyncStorage.getItem('chatSessions');
      const sessions = stored ? JSON.parse(stored) as ChatSession[] : [];
      
      // Update or add current session
      const existingIndex = sessions.findIndex(s => s.id === currentSession.id);
      if (existingIndex >= 0) {
        sessions[existingIndex] = currentSession;
      } else {
        sessions.push(currentSession);
      }
      
      // Save back to storage
      await AsyncStorage.setItem('chatSessions', JSON.stringify(sessions));
      // console.log('Session saved to storage:', currentSession.id, 'with', currentSession.messages.length, 'messages');
      // console.log('Total sessions in storage:', sessions.length);
    } catch (error) {
      console.error('Error saving session to storage:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    await handleSendMessage(inputText);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || !currentSession) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'You',
      senderType: 'user',
      content: messageText.trim(),
      timestamp: Date.now(),
      mentions: parseMentions(messageText),
    };

    dispatch(addMessage(userMessage));
    setInputText('');
    Keyboard.dismiss();

    // Determine which AIs should respond
    const mentions = parseMentions(messageText);
    const respondingAIs = mentions.length > 0
      ? selectedAIs.filter(ai => mentions.includes(ai.name.toLowerCase()))
      : selectedAIs;

    // Build conversation context incrementally (round-robin style)
    let conversationContext = [...messages, userMessage];
    
    // Process AI responses sequentially (round-robin)
    for (const ai of respondingAIs) {
      dispatch(setTypingAI({ ai: ai.name, isTyping: true }));

      try {
        // Simulate natural typing delay
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        // Get AI response using service
        if (!aiService) {
          throw new Error('AI service not initialized');
        }

        // For round-robin: Each AI sees the full conversation including previous AI responses
        // The last message in the context is what they're responding to
        const lastMessage = conversationContext[conversationContext.length - 1];
        const promptForAI = lastMessage.content;
        
        // Check if this is debate mode
        const isDebateMode = promptForAI.includes('[DEBATE MODE]') || 
                           (conversationContext.length > 0 && conversationContext[0].content.includes('[DEBATE MODE]'));

        const response = await aiService.sendMessage(
          ai.id,
          promptForAI,
          conversationContext,
          isDebateMode
        );

        const aiMessage: Message = {
          id: `msg_${Date.now()}_${ai.id}`,
          sender: ai.name,
          senderType: 'ai',
          content: response,
          timestamp: Date.now(),
        };

        dispatch(addMessage(aiMessage));
        
        // Add this AI's response to the context for the next AI
        conversationContext = [...conversationContext, aiMessage];
        
      } catch (error) {
        console.error(`Error getting response from ${ai.name}:`, error);
        
        // Add error message to chat
        const errorMessage: Message = {
          id: `msg_${Date.now()}_${ai.id}_error`,
          sender: ai.name,
          senderType: 'ai',
          content: error instanceof Error && error.message.includes('not configured') 
            ? `I'm not configured yet. Please add my API key in Settings → API Configuration.`
            : `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now(),
        };
        dispatch(addMessage(errorMessage));
        
        // Even error messages are part of the conversation context
        conversationContext = [...conversationContext, errorMessage];
      } finally {
        dispatch(setTypingAI({ ai: ai.name, isTyping: false }));
      }
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    // Check for @ mentions
    const lastChar = text[text.length - 1];
    setShowMentions(lastChar === '@' || !!text.match(/@\w*$/));
  };

  const insertMention = (aiName: string) => {
    const updatedText = inputText.replace(/@\w*$/, `@${aiName.toLowerCase()} `);
    setInputText(updatedText);
    setShowMentions(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>AI Conversation</Text>
            <View style={styles.participantsRow}>
              {selectedAIs.map((ai, index) => (
                <Text key={ai.id} style={styles.participantChip}>
                  {ai.name}
                  {index < selectedAIs.length - 1 && ' • '}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MessageBubble 
              message={item} 
              isLast={index === messages.length - 1}
              searchTerm={searchTerm}
            />
          )}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>💭</Text>
              <Text style={styles.emptyStateText}>
                Start the conversation
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Type a message or @ mention specific AIs
              </Text>
            </View>
          }
        />

        {/* Typing indicators */}
        {typingAIs.length > 0 && (
          <View style={styles.typingIndicators}>
            {typingAIs.map((ai) => (
              <TypingIndicator key={ai} aiName={ai} />
            ))}
          </View>
        )}

        {/* Mention suggestions */}
        {showMentions && (
          <Animated.View 
            entering={FadeInDown.springify()}
            style={styles.mentionSuggestions}
          >
            {selectedAIs.map((ai) => (
              <TouchableOpacity
                key={ai.id}
                style={styles.mentionItem}
                onPress={() => insertMention(ai.name)}
              >
                <Text style={styles.mentionText}>@{ai.name.toLowerCase()}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Input bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Type a message..."
            placeholderTextColor="#999999"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Helper functions
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const parseMentions = (text: string): string[] => {
  const mentions = text.match(/@(\w+)/g) || [];
  return mentions.map(m => m.substring(1).toLowerCase());
};

const highlightMentions = (text: string) => {
  // This would ideally return JSX with styled mentions
  // For now, keeping it simple
  return text;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    fontSize: 28,
    color: '#007AFF',
    paddingRight: 16,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  participantsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  participantChip: {
    fontSize: 13,
    color: '#666666',
  },
  headerRight: {
    width: 44,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiHeader: {
    marginBottom: 4,
    marginLeft: 12,
  },
  aiName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1A1A1A',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 11,
    color: '#999999',
    marginTop: 4,
    marginLeft: 12,
  },
  userTimestamp: {
    marginRight: 12,
    marginLeft: 0,
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
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666666',
  },
  typingIndicators: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingContainer: {
    marginBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignSelf: 'flex-start',
  },
  typingText: {
    fontSize: 13,
    color: '#666666',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999999',
    marginHorizontal: 2,
  },
  mentionSuggestions: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    paddingVertical: 8,
  },
  mentionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mentionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
    color: '#1A1A1A',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ChatScreen;