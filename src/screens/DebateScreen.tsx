import React, { useState, useRef, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  TextInput,
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
import { addMessage, setTypingAI, startSession } from '../store';
import { Message, AI } from '../types';
import { AIService } from '../services/aiAdapter';
import { DEBATE_TOPICS, AI_PERSONALITIES, DEBATE_REACTIONS } from '../constants/debateTopics';
import { useTheme } from '../theme';
import { ThemedView, ThemedText, GradientButton, ThemedButton } from '../components/core';

interface DebateScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: {
    params: {
      selectedAIs: AI[];
      topic?: string;
      personalities?: { [key: string]: string };
    };
  };
}

const DebateScreen: React.FC<DebateScreenProps> = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { selectedAIs, topic: initialTopic, personalities: initialPersonalities } = route.params;
  
  const [selectedTopic, setSelectedTopic] = useState(initialTopic || '');
  const [customTopic, setCustomTopic] = useState('');
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [topicMode, setTopicMode] = useState<'preset' | 'custom'>('preset');
  const [aiPersonalities, setAiPersonalities] = useState<{ [key: string]: string }>(
    initialPersonalities || {}
  );
  const [debateStarted, setDebateStarted] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [showTopicPicker, setShowTopicPicker] = useState(!initialTopic);
  const [reactions, setReactions] = useState<string[]>([]);
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [debateEnded, setDebateEnded] = useState(false);
  const [activeTopic, setActiveTopic] = useState('');
  
  const flatListRef = useRef<FlatList>(null);
  const roundCountRef = useRef(0);
  const maxRounds = 3; // 3 complete rounds through all AIs
  const maxMessages = maxRounds * selectedAIs.length; // Total messages allowed
  
  const { currentSession, typingAIs } = useSelector((state: RootState) => state.chat);
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys);
  const messages = currentSession?.messages || [];

  // Initialize AI service
  useEffect(() => {
    const service = new AIService(apiKeys || {});
    setAiService(service);
  }, [apiKeys]);

  const selectRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * DEBATE_TOPICS.length);
    setSelectedTopic(DEBATE_TOPICS[randomIndex]);
  };

  const startDebate = async () => {
    const finalTopic = topicMode === 'custom' ? customTopic : selectedTopic;
    if (!finalTopic) {
      Alert.alert('Select a Topic', 'Please choose a debate topic first!');
      return;
    }

    // Store the active topic for use throughout the debate
    setActiveTopic(finalTopic);

    // Reset state
    setDebateEnded(false);
    roundCountRef.current = 1;
    
    // Create a new session for the debate
    dispatch(startSession({ selectedAIs }));
    setDebateStarted(true);
    setCurrentRound(1);
    setShowTopicPicker(false);

    // Create the opening prompt
    const openingPrompt = `[DEBATE MODE] Topic: "${finalTopic}"\n\nYou are ${selectedAIs[0].name} with a ${aiPersonalities[selectedAIs[0].id] || 'neutral'} personality. Take a strong position on this topic and make your opening argument. Be persuasive and engaging!`;

    // Add user message to start the debate
    const startMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'Debate Host',
      senderType: 'user',
      content: `🎭 DEBATE TOPIC: "${finalTopic}"\n\nLet the debate begin! ${selectedAIs[0].name}, you're up first!`,
      timestamp: Date.now(),
    };
    dispatch(addMessage(startMessage));

    // Start the debate rounds
    await runDebateRound(openingPrompt, 0, 1, finalTopic);
  };

  const runDebateRound = async (prompt: string, aiIndex: number, messageCount: number, topic?: string) => {
    const debateTopic = topic || activeTopic;
    // Check if debate should end
    if (debateEnded || messageCount > maxMessages || !aiService) {
      if (!debateEnded && messageCount > maxMessages) {
        endDebate();
      }
      return;
    }

    const currentAI = selectedAIs[aiIndex];
    const nextAIIndex = (aiIndex + 1) % selectedAIs.length;
    
    // Update round counter - a round is one complete cycle through all AIs
    const newRound = Math.floor((messageCount - 1) / selectedAIs.length) + 1;
    if (newRound !== roundCountRef.current) {
      setCurrentRound(newRound);
      roundCountRef.current = newRound;
    }
    
    dispatch(setTypingAI({ ai: currentAI.name, isTyping: true }));

    try {
      // Add personality to the prompt
      const personality = aiPersonalities[currentAI.id];
      const personalityPrompt = personality 
        ? `Remember, you have a ${personality} personality. `
        : '';
      
      const fullPrompt = personalityPrompt + (prompt || '');

      // Get AI response - only pass messages from current debate session
      const currentDebateMessages = messages.filter(msg => 
        msg.timestamp >= (currentSession?.startTime || Date.now())
      );
      const response = await aiService.sendMessage(
        currentAI.id,
        fullPrompt,
        currentDebateMessages,
        true // isDebateMode
      );

      const aiMessage: Message = {
        id: `msg_${Date.now()}_${currentAI.id}`,
        sender: `${currentAI.name} (${personality || 'neutral'})`,
        senderType: 'ai',
        content: response,
        timestamp: Date.now(),
      };

      dispatch(addMessage(aiMessage));
      
      // Check if we should continue
      const nextMessageCount = messageCount + 1;
      if (nextMessageCount <= maxMessages && !debateEnded) {
        const nextPrompt = `The previous speaker said: "${response}"\n\nRespond to their argument about "${debateTopic}". ${nextMessageCount === maxMessages ? 'Make your final argument!' : 'Continue the debate!'}`;
        
        // Delay before next AI responds (simulate reading time)
        setTimeout(() => {
          if (!debateEnded) {
            runDebateRound(nextPrompt, nextAIIndex, nextMessageCount, debateTopic);
          }
        }, 8000); // 8 seconds - enough time to read the response
      } else {
        // Debate ended
        endDebate();
      }
    } catch (error) {
      console.error(`Error in debate round:`, error);
      
      // Handle rate limit errors specifically
      if (error instanceof Error && error.message?.includes('429')) {
        // Add an error message to the chat
        const errorMessage: Message = {
          id: `msg_${Date.now()}_error`,
          sender: 'Debate Host',
          senderType: 'user',
          content: `⚠️ ${currentAI.name} is taking a breather (rate limit). Continuing debate...`,
          timestamp: Date.now(),
        };
        dispatch(addMessage(errorMessage));
        
        // Continue with next AI after a longer delay
        const nextMessageCount = messageCount + 1;
        if (nextMessageCount <= maxMessages && !debateEnded) {
          setTimeout(() => {
            if (!debateEnded) {
              const nextPrompt = `Continue the debate about "${debateTopic}". Make your argument!`;
              runDebateRound(nextPrompt, nextAIIndex, nextMessageCount, debateTopic);
            }
          }, 10000); // 10 seconds for rate limit recovery + reading time
        } else {
          endDebate();
        }
      } else {
        // Other errors
        Alert.alert('Error', `Failed to get response from ${currentAI.name}. The debate will continue.`);
        
        // Try to continue with next AI
        const nextMessageCount = messageCount + 1;
        if (nextMessageCount <= maxMessages && !debateEnded) {
          setTimeout(() => {
            if (!debateEnded) {
              const nextPrompt = `Continue the debate about "${debateTopic}". Make your argument!`;
              runDebateRound(nextPrompt, nextAIIndex, nextMessageCount, debateTopic);
            }
          }, 6000); // 6 seconds for error recovery + reading time
        } else {
          endDebate();
        }
      }
    } finally {
      dispatch(setTypingAI({ ai: currentAI.name, isTyping: false }));
    }
  };

  const endDebate = () => {
    if (debateEnded) return; // Prevent multiple calls
    
    setDebateEnded(true);
    const endMessage: Message = {
      id: `msg_${Date.now()}_end`,
      sender: 'Debate Host',
      senderType: 'user',
      content: '🎭 DEBATE COMPLETE! 🎭\n\nWho won? That\'s for you to decide! Use the reactions to show your favorite moments!',
      timestamp: Date.now(),
    };
    dispatch(addMessage(endMessage));
  };

  const addReaction = (emoji: string) => {
    setReactions([...reactions, emoji]);
    // Remove reaction after animation
    setTimeout(() => {
      setReactions(prev => prev.filter((_, i) => i !== 0));
    }, 2000);
  };

  const MessageBubble: React.FC<{ message: Message; index: number }> = React.memo(({ message }) => {
    const { theme } = useTheme();
    const isHost = message.sender === 'Debate Host';
    const scale = useSharedValue(0);
    const hasAnimated = useRef(false);

    useEffect(() => {
      // Only animate once when the message first appears
      if (!hasAnimated.current) {
        hasAnimated.current = true;
        // Small delay to ensure proper mounting
        const timer = setTimeout(() => {
          scale.value = withSpring(1, {
            damping: 15,
            stiffness: 150,
          });
        }, 50);
        return () => clearTimeout(timer);
      }
      return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency - only run once on mount

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View style={[styles.messageContainer, animatedStyle]}>
        {!isHost && (
          <ThemedView style={styles.aiHeader}>
            <ThemedText variant="subtitle" color="brand" weight="semibold">
              {message.sender}
            </ThemedText>
          </ThemedView>
        )}
        <ThemedView style={[
          styles.messageBubble,
          isHost ? [
            styles.hostBubble,
            { backgroundColor: theme.colors.warning[50], borderColor: theme.colors.warning[500] }
          ] : [
            styles.aiBubble,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
          ],
        ]}>
          <ThemedText 
            variant="body" 
            style={[
              styles.messageText,
              isHost && { textAlign: 'center', fontWeight: '600', color: theme.colors.warning[600] }
            ]}
          >
            {message.content}
          </ThemedText>
        </ThemedView>
      </Animated.View>
    );
  }, (prevProps, nextProps) => prevProps.message.id === nextProps.message.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <ThemedView style={[styles.header, { 
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border 
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ThemedText style={[styles.backButton, { color: theme.colors.primary[500] }]}>←</ThemedText>
        </TouchableOpacity>
        <ThemedText variant="title" weight="bold">🎭 AI Debate Arena</ThemedText>
        <ThemedView style={styles.headerRight}>
          {debateStarted && (
            <ThemedText variant="body" style={{ color: theme.colors.error[500], fontWeight: '600' }}>
              Round {currentRound}/{maxRounds}
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>

      {/* Topic Selector */}
      {showTopicPicker && (
        <Animated.View entering={FadeInDown} style={[styles.topicSelector, {
          backgroundColor: theme.colors.card,
          borderBottomColor: theme.colors.border
        }]}>
          <ThemedText variant="title" weight="semibold">Choose Your Battle!</ThemedText>
          
          {/* Topic Mode Selector */}
          <ThemedView style={styles.topicModeContainer}>
            <ThemedButton
              title="📋 Select Topic"
              onPress={() => {
                setTopicMode('preset');
                setSelectedTopic('');
                setCustomTopic('');
              }}
              variant={topicMode === 'preset' ? 'primary' : 'secondary'}
              size="medium"
              style={{ flex: 1, marginRight: 4 }}
            />
            
            <ThemedButton
              title="✏️ Custom Topic"
              onPress={() => {
                setTopicMode('custom');
                setSelectedTopic('');
              }}
              variant={topicMode === 'custom' ? 'primary' : 'secondary'}
              size="medium"
              style={{ flex: 1, marginLeft: 4 }}
            />
          </ThemedView>

          {topicMode === 'preset' ? (
            <>
              {/* Dropdown Selector */}
              <TouchableOpacity
                style={[styles.dropdownButton, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border
                }]}
                onPress={() => setShowTopicDropdown(!showTopicDropdown)}
              >
                <ThemedText style={styles.dropdownButtonText}>
                  {selectedTopic || 'Select a debate topic...'}
                </ThemedText>
                <ThemedText style={[styles.dropdownArrow, { color: theme.colors.text.secondary }]}>
                  {showTopicDropdown ? '▲' : '▼'}
                </ThemedText>
              </TouchableOpacity>

              {/* Dropdown List */}
              {showTopicDropdown && (
                <Animated.View entering={FadeIn} style={[styles.dropdownList, {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow
                }]}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    {DEBATE_TOPICS.map((topic, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                        onPress={() => {
                          setSelectedTopic(topic);
                          setShowTopicDropdown(false);
                        }}
                      >
                        <ThemedText style={styles.dropdownItemText}>{topic}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Animated.View>
              )}

              {/* Random Topic Button */}
              <GradientButton
                title="🎲 Surprise Me!"
                onPress={() => {
                  selectRandomTopic();
                  setShowTopicDropdown(false);
                }}
                gradient={theme.colors.gradients.sunset}
                fullWidth
                style={{ marginTop: 12 }}
              />
            </>
          ) : (
            <>
              {/* Custom Topic Input */}
              <TextInput
                style={[styles.customTopicInput, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text.primary
                }]}
                placeholder="Enter your debate topic..."
                placeholderTextColor={theme.colors.text.disabled}
                value={customTopic}
                onChangeText={setCustomTopic}
                multiline
                numberOfLines={2}
              />
              <GradientButton
                title="Use This Topic"
                onPress={() => customTopic && setSelectedTopic(customTopic)}
                disabled={!customTopic}
                gradient={theme.colors.gradients.primary}
                fullWidth
                style={{ marginTop: 12 }}
              />
            </>
          )}
        </Animated.View>
      )}

      {/* Selected Topic Display */}
      {((topicMode === 'preset' && selectedTopic) || (topicMode === 'custom' && customTopic)) && !debateStarted && (
        <ThemedView style={[styles.selectedTopicDisplay, {
          backgroundColor: theme.colors.card,
          shadowColor: theme.colors.shadow
        }]}>
          <ThemedText variant="caption" color="brand" weight="medium">Topic:</ThemedText>
          <ThemedText variant="title" weight="semibold">
            "{topicMode === 'custom' ? customTopic : selectedTopic}"
          </ThemedText>
        </ThemedView>
      )}

      {/* Personality Selector */}
      {!debateStarted && ((topicMode === 'preset' && selectedTopic) || (topicMode === 'custom' && customTopic)) && (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.personalitySection}>
          <ThemedText variant="title" weight="semibold">Choose Personalities</ThemedText>
          {selectedAIs.map((ai) => (
            <ThemedView key={ai.id} style={styles.personalityRow}>
              <ThemedText variant="subtitle" color="brand" weight="semibold">{ai.name}:</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {AI_PERSONALITIES[ai.id as keyof typeof AI_PERSONALITIES]?.map((personality) => (
                  <ThemedButton
                    key={personality.id}
                    title={personality.name}
                    onPress={() => setAiPersonalities({
                      ...aiPersonalities,
                      [ai.id]: personality.id,
                    })}
                    variant={aiPersonalities[ai.id] === personality.id ? 'primary' : 'secondary'}
                    size="small"
                    style={{ marginRight: 8 }}
                  />
                ))}
              </ScrollView>
            </ThemedView>
          ))}
        </Animated.View>
      )}

      {/* Start Button */}
      {!debateStarted && ((topicMode === 'preset' && selectedTopic) || (topicMode === 'custom' && customTopic)) && (
        <>
          <GradientButton
            title="🤜 Start the Debate! 🤛"
            onPress={startDebate}
            gradient={theme.colors.gradients.ocean}
            fullWidth
            style={{ marginHorizontal: 16, marginBottom: 16 }}
          />
          <ThemedText variant="caption" color="secondary" align="center" style={styles.rateNote}>
            Note: Debates have built-in delays to respect API rate limits
          </ThemedText>
        </>
      )}

      {/* Debate Messages */}
      {debateStarted && (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <MessageBubble message={item} index={index} />
            )}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          />

          {/* Typing Indicator */}
          {typingAIs.length > 0 && (
            <ThemedView style={styles.typingIndicator}>
              <ThemedText variant="body" color="brand" style={{ fontStyle: 'italic' }}>
                {typingAIs[0]} is thinking... 🤔
              </ThemedText>
            </ThemedView>
          )}

          {/* Reactions */}
          <ThemedView style={[styles.reactionsContainer, {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border
          }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DEBATE_REACTIONS.map((reaction) => (
                <TouchableOpacity
                  key={reaction.emoji}
                  style={styles.reactionButton}
                  onPress={() => addReaction(reaction.emoji)}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <ThemedText variant="caption" color="secondary">{reaction.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </ThemedView>

          {/* Floating Reactions */}
          {reactions.map((emoji, index) => (
            <Animated.Text
              key={`${emoji}-${index}`}
              entering={FadeIn}
              style={[styles.floatingReaction, { bottom: 100 + index * 30 }]}
            >
              {emoji}
            </Animated.Text>
          ))}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    fontSize: 28,
  },
  headerRight: {
    minWidth: 80,
  },
  topicSelector: {
    padding: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  topicModeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dropdownButton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 15,
  },
  dropdownArrow: {
    fontSize: 14,
    marginLeft: 8,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
  },
  customTopicInput: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  selectedTopicDisplay: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  personalitySection: {
    padding: 16,
  },
  personalityRow: {
    marginBottom: 12,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  aiHeader: {
    marginBottom: 4,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
  },
  hostBubble: {
    alignSelf: 'center',
    borderWidth: 1,
  },
  aiBubble: {
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reactionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  reactionButton: {
    alignItems: 'center',
    marginRight: 16,
  },
  reactionEmoji: {
    fontSize: 28,
  },
  floatingReaction: {
    position: 'absolute',
    fontSize: 40,
    alignSelf: 'center',
  },
  rateNote: {
    marginTop: -8,
    marginBottom: 16,
  },
});

export default DebateScreen;