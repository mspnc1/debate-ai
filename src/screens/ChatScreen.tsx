import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import { 
  View, 
  Button, 
  TextInput, 
  SafeAreaView 
} from '../components/atoms';
import { Typography } from '../components/molecules';
import { useTheme } from '../theme';
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
import { useAIService } from '../providers/AIServiceProvider';
import AIServiceLoading from '../components/AIServiceLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPersonality } from '../config/personalities';
import { AI_BRAND_COLORS } from '../constants/aiColors';

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
  const { theme, isDark } = useTheme();

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

  // Get AI-specific color from the message sender
  const getAIColor = () => {
    if (isUser) return null;
    
    // Map AI names to their brand color keys
    const aiName = message.sender.toLowerCase();
    const aiBrandKey = aiName === 'chatgpt' ? 'chatgpt' : 
                       aiName === 'claude' ? 'claude' :
                       aiName === 'gemini' ? 'gemini' :
                       aiName === 'nomi' ? 'nomi' : null;
    
    if (!aiBrandKey) return null;
    
    const brandColors = AI_BRAND_COLORS[aiBrandKey as keyof typeof AI_BRAND_COLORS];
    return {
      light: brandColors[50],
      dark: theme.colors.surface,
      border: brandColors[500],
      text: brandColors[600],
    };
  };
  
  const aiColor = getAIColor();

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
          <Typography 
            variant="caption" 
            weight="semibold"
            style={{ color: aiColor?.border || theme.colors.text.secondary }}
          >
            {message.sender}
          </Typography>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? {
            backgroundColor: theme.colors.primary[500],
            borderBottomRightRadius: 4,
          } : {
            backgroundColor: aiColor ? (isDark ? aiColor.dark : aiColor.light) : theme.colors.card,
            borderBottomLeftRadius: 4,
            borderWidth: 1,
            borderColor: aiColor?.border || theme.colors.border,
          },
        ]}
      >
        <Typography style={{
          fontSize: 16, 
          lineHeight: 22,
          ...(isUser && { color: theme.colors.text.inverse })
        }}>
          {searchTerm ? <HighlightedText text={message.content} searchTerm={searchTerm} /> : highlightMentions(message.content)}
        </Typography>
      </View>
      <Typography 
        variant="caption" 
        color="secondary"
        style={{
          ...styles.timestamp,
          ...(isUser && styles.userTimestamp)
        }}
      >
        {formatTime(message.timestamp)}
      </Typography>
    </Animated.View>
  );
};

// Typing indicator component
const TypingIndicator: React.FC<{ aiName: string }> = ({ aiName }) => {
  const { theme } = useTheme();
  
  return (
    <Animated.View
      entering={FadeIn}
      style={styles.typingContainer}
    >
      <View style={[
        styles.typingBubble,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        }
      ]}>
        <Typography variant="caption" color="secondary">
          {aiName} is thinking
        </Typography>
        <View style={styles.typingDots}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: theme.colors.text.secondary }
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

// Helper component to highlight search terms
const HighlightedText: React.FC<{ text: string; searchTerm: string }> = ({ text, searchTerm }) => {
  const { theme } = useTheme();
  
  if (!searchTerm) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.toLowerCase() === searchTerm.toLowerCase()) {
          return (
            <Typography key={index} style={{ backgroundColor: theme.colors.warning[50], fontWeight: '600' }}>
              {part}
            </Typography>
          );
        }
        return part;
      })}
    </>
  );
};

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [inputText, setInputText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [initialPromptSent, setInitialPromptSent] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { aiService, isInitialized, isLoading, error } = useAIService();
  const { currentSession, typingAIs, aiPersonalities } = useSelector((state: RootState) => state.chat);
  const messages = currentSession?.messages || [];
  const selectedAIs = currentSession?.selectedAIs || [];
  const searchTerm = route.params?.searchTerm;
  const initialPrompt = route.params?.initialPrompt;


  // Send initial prompt if provided - only when service is ready and not sent before
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (
      initialPrompt && 
      typeof initialPrompt === 'string' && 
      messages.length === 0 && 
      currentSession && 
      isInitialized && 
      aiService && 
      !initialPromptSent
    ) {
      setInputText(initialPrompt);
      setInitialPromptSent(true);
      
      // Auto-send after a short delay to let the UI settle
      timeoutId = setTimeout(() => {
        if (initialPrompt.trim()) {
          handleSendMessage(initialPrompt);
        }
      }, 800); // Slightly longer delay to ensure service is fully ready
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, currentSession, isInitialized, aiService, initialPromptSent, messages.length]);

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
    
    // If mentions, only those AIs respond
    // If no mentions, pick one random AI to start, then another to respond
    let respondingAIs: typeof selectedAIs;
    if (mentions.length > 0) {
      respondingAIs = selectedAIs.filter(ai => mentions.includes(ai.name.toLowerCase()));
    } else if (selectedAIs.length > 1) {
      // Pick two different random AIs for a back-and-forth
      const firstAI = selectedAIs[Math.floor(Math.random() * selectedAIs.length)];
      const remainingAIs = selectedAIs.filter(ai => ai.id !== firstAI.id);
      const secondAI = remainingAIs[Math.floor(Math.random() * remainingAIs.length)];
      respondingAIs = [firstAI, secondAI];
    } else {
      respondingAIs = selectedAIs;
    }

    // Build conversation context incrementally (round-robin style)
    let conversationContext = [...messages, userMessage];
    
    // Process AI responses sequentially (round-robin)
    for (const ai of respondingAIs) {
      dispatch(setTypingAI({ ai: ai.name, isTyping: true }));

      try {
        // Simulate natural typing delay
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

        // Get AI response using service
        if (!aiService || !isInitialized) {
          throw new Error('AI service not ready. Please wait for initialization to complete.');
        }

        // Apply personality if set
        const personalityId = aiPersonalities[ai.id] || 'default';
        const personality = getPersonality(personalityId);
        if (personality) {
          aiService.setPersonality(ai.id, personality);
        }

        // For round-robin: Each AI sees the full conversation including previous AI responses
        const isDebateMode = conversationContext.some(msg => msg.content.includes('[DEBATE MODE]'));
        
        // Build the prompt based on position in conversation
        const isFirstAI = conversationContext[conversationContext.length - 1].senderType === 'user';
        let promptForAI: string;
        let historyToPass: Message[];
        
        if (isFirstAI) {
          // First AI responds directly to the user's message
          promptForAI = userMessage.content;
          historyToPass = conversationContext.slice(0, -1); // Don't include the current user message
        } else {
          // Subsequent AIs should engage with the previous AI's response
          const lastSpeaker = conversationContext[conversationContext.length - 1].sender;
          const lastMessage = conversationContext[conversationContext.length - 1].content;
          
          // Make it VERY clear what we want the AI to do
          promptForAI = `You are in a multi-AI conversation. ${lastSpeaker} just responded to the user's message. 

${lastSpeaker} said: "${lastMessage}"

Please respond to ${lastSpeaker}'s comment above. You can agree, disagree, add new perspectives, or take the conversation in a new direction. Do NOT respond directly to the original user message - respond to what ${lastSpeaker} just said.`;
          
          // Include full history so they understand context
          historyToPass = conversationContext.slice(0, -1);
        }
        
        const response = await aiService.sendMessage(
          ai.id,
          promptForAI,
          historyToPass,
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

  // Show loading screen while AI service is initializing
  if (isLoading || !isInitialized) {
    return <AIServiceLoading error={error} />;
  }

  return (
    <SafeAreaView>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[
          styles.header,
          { 
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          }
        ]}>
          <Button 
            onPress={() => navigation.goBack()}
            variant="ghost"
            style={{ borderWidth: 0, minWidth: 44 }}
          >
            <Typography variant="title" color="primary">←</Typography>
          </Button>
          <View style={styles.headerCenter}>
            <Typography variant="subtitle" weight="semibold">
              AI Conversation
            </Typography>
            <View style={styles.participantsRow}>
              {selectedAIs.map((ai, index) => (
                <Typography key={ai.id} variant="caption" color="secondary">
                  {ai.name}
                  {index < selectedAIs.length - 1 && ' • '}
                </Typography>
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
          style={{ backgroundColor: theme.colors.background }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Typography style={styles.emptyStateEmoji}>💭</Typography>
              <Typography variant="title" align="center" style={{ marginBottom: 8 }}>
                Start the conversation
              </Typography>
              <Typography variant="body" color="secondary" align="center">
                Type a message or @ mention specific AIs
              </Typography>
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
            style={[
              styles.mentionSuggestions,
              {
                backgroundColor: theme.colors.card,
                shadowColor: theme.colors.shadow,
              }
            ]}
          >
            {selectedAIs.map((ai) => (
              <Button
                key={ai.id}
                variant="ghost"
                style={{ ...styles.mentionItem, borderWidth: 0 }}
                onPress={() => insertMention(ai.name)}
              >
                <Typography color="primary" weight="medium">
                  @{ai.name.toLowerCase()}
                </Typography>
              </Button>
            ))}
          </Animated.View>
        )}

        {/* Input bar */}
        <View style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          }
        ]}>
          <TextInput
            style={{
              ...styles.input,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.xl,
            }}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Type a message..."
            multiline
            variant="filled"
          />
          <TouchableOpacity
            style={{
              ...styles.sendButton,
              borderRadius: 18,
              backgroundColor: (!inputText.trim()) ? theme.colors.gray[400] : theme.colors.primary[500],
            }}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <RNText style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>↑</RNText>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
  },
  participantsRow: {
    flexDirection: 'row',
    marginTop: 2,
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
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  timestamp: {
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
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  typingDots: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  mentionSuggestions: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    borderRadius: 12,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;