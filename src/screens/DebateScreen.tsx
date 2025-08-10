import React, { useState, useRef, useEffect } from 'react';
import {
  View,
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
          <View style={styles.aiHeader}>
            <Text style={styles.aiName}>{message.sender}</Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isHost ? styles.hostBubble : styles.aiBubble,
        ]}>
          <Text style={[styles.messageText, isHost && styles.hostText]}>
            {message.content}
          </Text>
        </View>
      </Animated.View>
    );
  }, (prevProps, nextProps) => prevProps.message.id === nextProps.message.id);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎭 AI Debate Arena</Text>
        <View style={styles.headerRight}>
          {debateStarted && (
            <Text style={styles.roundText}>Round {currentRound}/{maxRounds}</Text>
          )}
        </View>
      </View>

      {/* Topic Selector */}
      {showTopicPicker && (
        <Animated.View entering={FadeInDown} style={styles.topicSelector}>
          <Text style={styles.sectionTitle}>Choose Your Battle!</Text>
          
          {/* Topic Mode Selector */}
          <View style={styles.topicModeContainer}>
            <TouchableOpacity
              style={[styles.topicModeButton, topicMode === 'preset' && styles.topicModeButtonActive]}
              onPress={() => {
                setTopicMode('preset');
                setSelectedTopic('');
                setCustomTopic('');
              }}
            >
              <Text style={[styles.topicModeText, topicMode === 'preset' && styles.topicModeTextActive]}>
                📋 Select Topic
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.topicModeButton, topicMode === 'custom' && styles.topicModeButtonActive]}
              onPress={() => {
                setTopicMode('custom');
                setSelectedTopic('');
              }}
            >
              <Text style={[styles.topicModeText, topicMode === 'custom' && styles.topicModeTextActive]}>
                ✏️ Custom Topic
              </Text>
            </TouchableOpacity>
          </View>

          {topicMode === 'preset' ? (
            <>
              {/* Dropdown Selector */}
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowTopicDropdown(!showTopicDropdown)}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedTopic || 'Select a debate topic...'}
                </Text>
                <Text style={styles.dropdownArrow}>{showTopicDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {/* Dropdown List */}
              {showTopicDropdown && (
                <Animated.View entering={FadeIn} style={styles.dropdownList}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                    {DEBATE_TOPICS.map((topic, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedTopic(topic);
                          setShowTopicDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{topic}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Animated.View>
              )}

              {/* Random Topic Button */}
              <TouchableOpacity style={styles.randomButton} onPress={() => {
                selectRandomTopic();
                setShowTopicDropdown(false);
              }}>
                <Text style={styles.randomButtonText}>🎲 Surprise Me!</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Custom Topic Input */}
              <TextInput
                style={styles.customTopicInput}
                placeholder="Enter your debate topic..."
                placeholderTextColor="#999999"
                value={customTopic}
                onChangeText={setCustomTopic}
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity
                style={[styles.useCustomButton, !customTopic && styles.useCustomButtonDisabled]}
                onPress={() => customTopic && setSelectedTopic(customTopic)}
                disabled={!customTopic}
              >
                <Text style={styles.useCustomButtonText}>Use This Topic</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}

      {/* Selected Topic Display */}
      {((topicMode === 'preset' && selectedTopic) || (topicMode === 'custom' && customTopic)) && !debateStarted && (
        <View style={styles.selectedTopicDisplay}>
          <Text style={styles.selectedTopicLabel}>Topic:</Text>
          <Text style={styles.selectedTopicDisplayText}>"{topicMode === 'custom' ? customTopic : selectedTopic}"</Text>
        </View>
      )}

      {/* Personality Selector */}
      {!debateStarted && ((topicMode === 'preset' && selectedTopic) || (topicMode === 'custom' && customTopic)) && (
        <Animated.View entering={FadeInDown.delay(200)} style={styles.personalitySection}>
          <Text style={styles.sectionTitle}>Choose Personalities</Text>
          {selectedAIs.map((ai) => (
            <View key={ai.id} style={styles.personalityRow}>
              <Text style={styles.aiLabel}>{ai.name}:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {AI_PERSONALITIES[ai.id as keyof typeof AI_PERSONALITIES]?.map((personality) => (
                  <TouchableOpacity
                    key={personality.id}
                    style={[
                      styles.personalityChip,
                      aiPersonalities[ai.id] === personality.id && styles.selectedPersonalityChip,
                    ]}
                    onPress={() => setAiPersonalities({
                      ...aiPersonalities,
                      [ai.id]: personality.id,
                    })}
                  >
                    <Text style={[
                      styles.personalityText,
                      aiPersonalities[ai.id] === personality.id && styles.selectedPersonalityText,
                    ]}>
                      {personality.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Start Button */}
      {!debateStarted && ((topicMode === 'preset' && selectedTopic) || (topicMode === 'custom' && customTopic)) && (
        <>
          <TouchableOpacity style={styles.startButton} onPress={startDebate}>
            <Text style={styles.startButtonText}>🤜 Start the Debate! 🤛</Text>
          </TouchableOpacity>
          <Text style={styles.rateNote}>
            Note: Debates have built-in delays to respect API rate limits
          </Text>
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
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>
                {typingAIs[0]} is thinking... 🤔
              </Text>
            </View>
          )}

          {/* Reactions */}
          <View style={styles.reactionsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DEBATE_REACTIONS.map((reaction) => (
                <TouchableOpacity
                  key={reaction.emoji}
                  style={styles.reactionButton}
                  onPress={() => addReaction(reaction.emoji)}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  <Text style={styles.reactionLabel}>{reaction.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

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
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 28,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerRight: {
    minWidth: 80,
  },
  roundText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  topicSelector: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  topicChip: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedTopicChip: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  topicText: {
    color: '#666666',
    fontSize: 14,
  },
  selectedTopicText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  randomButton: {
    backgroundColor: '#FFE066',
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 12,
    alignItems: 'center',
  },
  randomButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedTopicDisplay: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedTopicLabel: {
    color: '#007AFF',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  selectedTopicDisplayText: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '600',
  },
  personalitySection: {
    padding: 16,
  },
  personalityRow: {
    marginBottom: 12,
  },
  aiLabel: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  personalityChip: {
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedPersonalityChip: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  personalityText: {
    color: '#666666',
    fontSize: 13,
  },
  selectedPersonalityText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
  aiName: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
  },
  hostBubble: {
    backgroundColor: '#FFE066',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  messageText: {
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 22,
  },
  hostText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#856404',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    color: '#007AFF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  reactionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  reactionButton: {
    alignItems: 'center',
    marginRight: 16,
  },
  reactionEmoji: {
    fontSize: 28,
  },
  reactionLabel: {
    color: '#999999',
    fontSize: 11,
    marginTop: 4,
  },
  floatingReaction: {
    position: 'absolute',
    fontSize: 40,
    alignSelf: 'center',
  },
  rateNote: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  topicModeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  topicModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  topicModeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  topicModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  topicModeTextActive: {
    color: '#FFFFFF',
  },
  dropdownButton: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 200,
    shadowColor: '#000',
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
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  customTopicInput: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  useCustomButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  useCustomButtonDisabled: {
    backgroundColor: '#C8C8C8',
  },
  useCustomButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default DebateScreen;