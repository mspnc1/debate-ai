import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { addMessage, setTypingAI, startSession, startDebate, recordRoundWinner, recordOverallWinner } from '../store';
import { Message, AI } from '../types';
import { AIService } from '../services/aiAdapter';
import { DEBATE_TOPICS } from '../constants/debateTopics';
import { UNIVERSAL_PERSONALITIES, getDebatePrompt } from '../config/personalities';
import { AI_BRAND_COLORS } from '../constants/aiColors';
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

// Smooth animated typing dots component
const TypingDots: React.FC = () => {
  const { theme } = useTheme();
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  React.useLayoutEffect(() => {
    // Smooth wave animation for dots
    dot1.value = withRepeat(
      withSequence(
        withDelay(0, withSpring(1, { damping: 15, stiffness: 200 })),
        withSpring(0, { damping: 15, stiffness: 200 })
      ),
      -1,
      false
    );
    dot2.value = withRepeat(
      withSequence(
        withDelay(150, withSpring(1, { damping: 15, stiffness: 200 })),
        withSpring(0, { damping: 15, stiffness: 200 })
      ),
      -1,
      false
    );
    dot3.value = withRepeat(
      withSequence(
        withDelay(300, withSpring(1, { damping: 15, stiffness: 200 })),
        withSpring(0, { damping: 15, stiffness: 200 })
      ),
      -1,
      false
    );
  }, [dot1, dot2, dot3]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: 0.4 + dot1.value * 0.6,
    transform: [{ translateY: -dot1.value * 4 }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: 0.4 + dot2.value * 0.6,
    transform: [{ translateY: -dot2.value * 4 }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: 0.4 + dot3.value * 0.6,
    transform: [{ translateY: -dot3.value * 4 }],
  }));

  const dotBaseStyle = {
    fontSize: 20,
    color: theme.colors.text.secondary,
  };

  return (
    <View style={{ 
      flexDirection: 'row', 
      gap: theme.spacing.xs, 
      marginLeft: theme.spacing.sm, 
      alignItems: 'center' 
    }}>
      <Animated.Text style={[dotBaseStyle, dot1Style]}>•</Animated.Text>
      <Animated.Text style={[dotBaseStyle, dot2Style]}>•</Animated.Text>
      <Animated.Text style={[dotBaseStyle, dot3Style]}>•</Animated.Text>
    </View>
  );
};

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
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [debateEnded, setDebateEnded] = useState(false);
  const [activeTopic, setActiveTopic] = useState('');
  const [votes, setVotes] = useState<{ [round: number]: string }>({});
  const [showVoting, setShowVoting] = useState(false);
  const [votingRound, setVotingRound] = useState(0);
  const [isFinalVote, setIsFinalVote] = useState(false);
  const [isOverallVote, setIsOverallVote] = useState(false);
  const [pendingNextRound, setPendingNextRound] = useState<{prompt: string, aiIndex: number, messageCount: number, topic: string} | null>(null);
  
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

  const startDebateFlow = async () => {
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
    setVotes({});
    
    // Create a new session for the debate
    dispatch(startSession({ selectedAIs }));
    setDebateStarted(true);
    setCurrentRound(1);
    setShowTopicPicker(false);
    
    // Initialize debate stats
    const debateId = `debate_${Date.now()}`;
    dispatch(startDebate({ 
      debateId, 
      topic: finalTopic, 
      participants: selectedAIs.map(ai => ai.id) 
    }));

    // Create the opening prompt with personality
    const personalityId = aiPersonalities[selectedAIs[0].id] || 'default';
    const personalityPrompt = getDebatePrompt(personalityId);
    const openingPrompt = `[DEBATE MODE] Topic: "${finalTopic}"\n\n${personalityPrompt}\n\nYou are ${selectedAIs[0].name}. Take a strong position on this topic and make your opening argument. Be persuasive and engaging!`;

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
    
    // Check if we're starting a new round
    const currentMessageRound = Math.floor((messageCount - 1) / selectedAIs.length) + 1;
    const isNewRound = currentMessageRound !== roundCountRef.current;
    const isFirstAIInRound = aiIndex === 0;
    
    // If it's a new round and we need to vote on the previous round
    if (isNewRound && roundCountRef.current > 0 && !votes[roundCountRef.current] && isFirstAIInRound) {
      // Store the next round info to continue after voting
      setPendingNextRound({ prompt, aiIndex, messageCount, topic: debateTopic });
      
      // Show voting for the previous round
      setVotingRound(roundCountRef.current);
      setIsFinalVote(false);
      setShowVoting(true);
      
      // Update the round counter for next time
      setCurrentRound(currentMessageRound);
      roundCountRef.current = currentMessageRound;
      
      // Don't continue the debate - wait for voting
      return;
    }
    
    // Update round counter if needed
    if (isNewRound) {
      setCurrentRound(currentMessageRound);
      roundCountRef.current = currentMessageRound;
      
      // Announce new round
      if (currentMessageRound < maxRounds) {
        const roundMessage: Message = {
          id: `msg_${Date.now()}_round_start_${currentMessageRound}`,
          sender: 'Debate Host',
          senderType: 'user',
          content: `📢 ROUND ${currentMessageRound} BEGINS!`,
          timestamp: Date.now(),
        };
        dispatch(addMessage(roundMessage));
      } else if (currentMessageRound === maxRounds) {
        const finalRoundMessage: Message = {
          id: `msg_${Date.now()}_final_round`,
          sender: 'Debate Host',
          senderType: 'user',
          content: `🔔 FINAL ROUND! Make your strongest arguments!`,
          timestamp: Date.now(),
        };
        dispatch(addMessage(finalRoundMessage));
      }
    }
    
    dispatch(setTypingAI({ ai: currentAI.name, isTyping: true }));

    try {
      // Add personality to the prompt
      const personalityId = aiPersonalities[currentAI.id] || 'default';
      const personalityPrompt = getDebatePrompt(personalityId);
      
      const fullPrompt = `${personalityPrompt}\n\n${prompt || ''}`;

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

      const personalityName = UNIVERSAL_PERSONALITIES.find(p => p.id === personalityId)?.name || 'Default';
      const aiMessage: Message = {
        id: `msg_${Date.now()}_${currentAI.id}`,
        sender: `${currentAI.name} (${personalityName})`,
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
      content: '🎭 DEBATE COMPLETE! 🎭\n\nTime to vote on the final round!',
      timestamp: Date.now(),
    };
    dispatch(addMessage(endMessage));
    
    // Show voting for the final round first
    setVotingRound(maxRounds);
    setIsFinalVote(true);
    setIsOverallVote(false);
    setShowVoting(true);
  };

  const handleVote = (aiId: string) => {
    if (isOverallVote) {
      // Overall winner vote
      setVotes(prev => ({ ...prev, overall: aiId }));
      setShowVoting(false);
      setIsOverallVote(false);
      
      // Record overall winner in stats
      dispatch(recordOverallWinner({ winnerId: aiId }));
      
      // Show final results
      const winner = selectedAIs.find(ai => ai.id === aiId);
      const finalMessage: Message = {
        id: `msg_${Date.now()}_winner`,
        sender: 'Debate Host',
        senderType: 'user',
        content: `🏆 OVERALL WINNER: ${winner?.name}! 🏆\n\nThanks for participating in this debate!`,
        timestamp: Date.now(),
      };
      dispatch(addMessage(finalMessage));
    } else if (isFinalVote) {
      // Final round vote
      setVotes(prev => ({ ...prev, [votingRound]: aiId }));
      setShowVoting(false);
      setIsFinalVote(false);
      
      // Record round winner in stats
      dispatch(recordRoundWinner({ round: votingRound, winnerId: aiId }));
      
      // Announce final round winner
      const winner = selectedAIs.find(ai => ai.id === aiId);
      const roundMessage: Message = {
        id: `msg_${Date.now()}_round_${votingRound}`,
        sender: 'Debate Host',
        senderType: 'user',
        content: `🏅 Final Round Winner: ${winner?.name}!`,
        timestamp: Date.now(),
      };
      dispatch(addMessage(roundMessage));
      
      // Now show overall winner vote
      setTimeout(() => {
        setVotingRound(maxRounds + 1); // Special round for overall
        setIsOverallVote(true);
        setShowVoting(true);
      }, 1500);
    } else {
      // Regular round vote
      setVotes(prev => ({ ...prev, [votingRound]: aiId }));
      setShowVoting(false);
      
      // Record round winner in stats
      dispatch(recordRoundWinner({ round: votingRound, winnerId: aiId }));
      
      // Announce round winner
      const winner = selectedAIs.find(ai => ai.id === aiId);
      const roundMessage: Message = {
        id: `msg_${Date.now()}_round_${votingRound}`,
        sender: 'Debate Host',
        senderType: 'user',
        content: `🏅 Round ${votingRound} Winner: ${winner?.name}!`,
        timestamp: Date.now(),
      };
      dispatch(addMessage(roundMessage));
      
      // Continue with the next round if there's one pending
      if (pendingNextRound) {
        const { prompt, aiIndex, messageCount, topic } = pendingNextRound;
        setPendingNextRound(null);
        
        // Small delay before continuing
        setTimeout(() => {
          runDebateRound(prompt, aiIndex, messageCount, topic);
        }, 2000);
      }
    }
  };

  // Typing indicator as a message-like component
  const TypingIndicator: React.FC<{ aiName: string }> = ({ aiName }) => {
    const { theme } = useTheme();
    return (
      <Animated.View 
        entering={FadeIn.duration(200)}
        style={[styles.messageContainer, { marginBottom: theme.spacing.sm }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText variant="body" color="brand" style={{ fontStyle: 'italic' }}>
            {aiName} is thinking
          </ThemedText>
          <TypingDots />
        </View>
      </Animated.View>
    );
  };

  const MessageBubble: React.FC<{ message: Message; index: number }> = React.memo(({ message }) => {
    const { theme, isDark } = useTheme();
    const isHost = message.sender === 'Debate Host';
    
    // Get AI-specific color from the message sender using theme brand colors
    const getAIColor = () => {
      if (isHost) return null;
      
      // Extract AI name from sender (format: "AI Name (Personality)")
      const aiName = message.sender.split(' (')[0].toLowerCase();
      
      // Map AI names to their brand color keys
      const aiBrandKey = aiName === 'chatgpt' ? 'chatgpt' : 
                         aiName === 'claude' ? 'claude' :
                         aiName === 'gemini' ? 'gemini' :
                         aiName === 'nomi' ? 'nomi' : null;
      
      if (!aiBrandKey) return null;
      
      const brandColors = AI_BRAND_COLORS[aiBrandKey as keyof typeof AI_BRAND_COLORS];
      return {
        light: brandColors[50],
        dark: theme.colors.surface, // Use surface color with tinted border in dark mode
        border: brandColors[500],
      };
    };
    
    const aiColor = getAIColor();
    
    // Simple fade-in
    const opacity = useSharedValue(0);

    useEffect(() => {
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    return (
      <Animated.View style={[styles.messageContainer, animatedStyle]}>
        {!isHost && (
          <ThemedView style={styles.aiHeader}>
            <ThemedText 
              variant="subtitle" 
              weight="semibold"
              style={{ color: aiColor?.border || theme.colors.primary[500] }}
            >
              {message.sender}
            </ThemedText>
          </ThemedView>
        )}
        <ThemedView style={[
          styles.messageBubble,
          isHost ? [
            styles.hostBubble,
            { 
              backgroundColor: theme.colors.warning[50], 
              borderColor: theme.colors.warning[500] 
            }
          ] : [
            styles.aiBubble,
            { 
              backgroundColor: aiColor ? (isDark ? aiColor.dark : aiColor.light) : theme.colors.card, 
              borderColor: aiColor?.border || theme.colors.border,
              borderWidth: 1,
            }
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {UNIVERSAL_PERSONALITIES.map((personality) => (
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
            onPress={startDebateFlow}
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
            ListFooterComponent={
              typingAIs.length > 0 ? <TypingIndicator aiName={typingAIs[0]} /> : null
            }
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => {
              // Auto-scroll to show new messages
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            showsVerticalScrollIndicator={false}
          />

          {/* Voting Interface */}
          {showVoting && (
            <Animated.View 
              entering={FadeInDown.duration(300)}
              style={[styles.votingContainer, {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border
              }]}
            >
              <ThemedText variant="title" weight="bold" align="center" style={{ marginBottom: theme.spacing.md }}>
                {isOverallVote ? '🏆 Vote for Overall Winner!' : 
                 isFinalVote ? `🏅 Who won the Final Round?` : 
                 `🏅 Who won Round ${votingRound}?`}
              </ThemedText>
              
              {/* Show current scores during overall vote */}
              {isOverallVote && (
                <View style={[styles.currentScores, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <ThemedText variant="caption" weight="semibold" color="brand">Current Scores:</ThemedText>
                  <View style={styles.scoreRow}>
                    {selectedAIs.map((ai) => {
                      const roundsWon = Object.entries(votes)
                        .filter(([key, value]) => key !== 'overall' && value === ai.id)
                        .length;
                      const aiColor = ai.id === 'chatgpt' ? AI_BRAND_COLORS.chatgpt :
                                      ai.id === 'claude' ? AI_BRAND_COLORS.claude :
                                      ai.id === 'gemini' ? AI_BRAND_COLORS.gemini :
                                      ai.id === 'nomi' ? AI_BRAND_COLORS.nomi :
                                      theme.colors.primary;
                      
                      return (
                        <View key={ai.id} style={styles.scoreItem}>
                          <ThemedText 
                            variant="body" 
                            weight="semibold"
                            style={{ color: aiColor[600] }}
                          >
                            {ai.name}
                          </ThemedText>
                          <ThemedText variant="title" weight="bold">
                            {roundsWon}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                  <ThemedText variant="caption" color="secondary" align="center" style={{ marginTop: 8 }}>
                    Despite the scores, you can crown any AI as the overall winner!
                  </ThemedText>
                </View>
              )}
              <View style={styles.votingButtons}>
                {selectedAIs.map((ai) => {
                  const aiColor = ai.id === 'chatgpt' ? AI_BRAND_COLORS.chatgpt :
                                  ai.id === 'claude' ? AI_BRAND_COLORS.claude :
                                  ai.id === 'gemini' ? AI_BRAND_COLORS.gemini :
                                  ai.id === 'nomi' ? AI_BRAND_COLORS.nomi :
                                  theme.colors.primary;
                  
                  return (
                    <TouchableOpacity
                      key={ai.id}
                      style={[
                        styles.voteButton,
                        {
                          backgroundColor: aiColor[50],
                          borderColor: aiColor[500],
                          borderWidth: 2,
                        }
                      ]}
                      onPress={() => handleVote(ai.id)}
                    >
                      <ThemedText 
                        variant="subtitle" 
                        weight="bold" 
                        align="center"
                        style={{ color: aiColor[700] }}
                      >
                        {ai.name}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}
          
          {/* Score Display */}
          {Object.keys(votes).length > 0 && !showVoting && (
            <ThemedView style={[styles.scoreContainer, {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border
            }]}>
              <ThemedText variant="caption" weight="semibold" color="brand">Current Scores:</ThemedText>
              <View style={styles.scoreRow}>
                {selectedAIs.map((ai) => {
                  const roundsWon = Object.values(votes).filter(v => v === ai.id && v !== 'overall').length;
                  const aiColor = ai.id === 'chatgpt' ? AI_BRAND_COLORS.chatgpt :
                                  ai.id === 'claude' ? AI_BRAND_COLORS.claude :
                                  ai.id === 'gemini' ? AI_BRAND_COLORS.gemini :
                                  ai.id === 'nomi' ? AI_BRAND_COLORS.nomi :
                                  theme.colors.primary;
                  
                  return (
                    <View key={ai.id} style={styles.scoreItem}>
                      <ThemedText 
                        variant="body" 
                        weight="semibold"
                        style={{ color: aiColor[600] }}
                      >
                        {ai.name}
                      </ThemedText>
                      <ThemedText variant="title" weight="bold">
                        {roundsWon}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </ThemedView>
          )}
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
  votingContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  votingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  scoreItem: {
    alignItems: 'center',
  },
  currentScores: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  rateNote: {
    marginTop: -8,
    marginBottom: 16,
  },
});

export default DebateScreen;