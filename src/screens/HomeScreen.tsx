import React, { useState } from 'react';
import {
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { startSession } from '../store';
import { AIConfig } from '../types';
import { useTheme } from '../theme';
import { ThemedView, ThemedText, GlassCard, GradientButton, AnimatedPressable } from '../components/core';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

// Available AI configurations with personality
const AI_OPTIONS: AIConfig[] = [
  {
    id: 'claude',
    provider: 'claude',
    name: 'Claude',
    personality: 'thoughtful',
    avatar: '🎓',
    color: '#FF6B35',
  },
  {
    id: 'chatgpt',
    provider: 'chatgpt',
    name: 'ChatGPT',
    personality: 'friendly',
    avatar: '💡',
    color: '#10A37F',
  },
  {
    id: 'gemini',
    provider: 'gemini',
    name: 'Gemini',
    personality: 'analytical',
    avatar: '✨',
    color: '#4285F4',
  },
];

// Quick start topics
const QUICK_TOPICS = [
  { id: '1', emoji: '☕', title: 'Morning Chat', subtitle: 'Better than your first coffee' },
  { id: '2', emoji: '🎯', title: 'Brainstorm', subtitle: 'Three AIs, zero bad ideas' },
  { id: '3', emoji: '🎭', title: 'Debate Mode', subtitle: 'Watch AIs argue so you don\'t have to' },
  { id: '4', emoji: '📚', title: 'Learn Stuff', subtitle: 'Get smarter while procrastinating' },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const [selectedAIs, setSelectedAIs] = useState<AIConfig[]>([]);
  // const [showQuickStartWizard, setShowQuickStartWizard] = useState(false);
  // const [selectedTopic, setSelectedTopic] = useState<typeof QUICK_TOPICS[0] | null>(null);
  const subscription = useSelector((state: RootState) => state.user.currentUser?.subscription || 'free');
  
  const maxAIs = subscription === 'free' ? 2 : 3;

  const toggleAI = (ai: AIConfig) => {
    if (selectedAIs.find(selected => selected.id === ai.id)) {
      setSelectedAIs(selectedAIs.filter(selected => selected.id !== ai.id));
    } else if (selectedAIs.length < maxAIs) {
      setSelectedAIs([...selectedAIs, ai]);
    }
  };

  const startChat = (initialPrompt?: string) => {
    if (selectedAIs.length > 0) {
      dispatch(startSession({ selectedAIs }));
      const sessionId = `session_${Date.now()}`;
      const params: Record<string, unknown> = { sessionId };
      // Only add initialPrompt if it's defined
      if (initialPrompt) {
        params.initialPrompt = initialPrompt;
      }
      navigation.navigate('Chat', params);
    }
  };

  const handleQuickStart = (topic: typeof QUICK_TOPICS[0]) => {
    // Don't allow quick start without AIs selected
    if (selectedAIs.length === 0) {
      return;
    }
    
    // Generate a starter prompt based on the topic
    let initialPrompt = '';
    switch(topic.id) {
      case '1': // Morning Chat
        initialPrompt = selectedAIs.length > 1 
          ? "Good morning! Let's have a casual conversation about what's new today. What interesting topics are trending in your respective domains?"
          : "Good morning! Let's have a casual conversation. What's interesting in the world today?";
        break;
      case '2': // Brainstorm
        initialPrompt = selectedAIs.length > 1
          ? "I need help brainstorming ideas. Let's think creatively together about innovative solutions. Each of you bring your unique perspective!"
          : "Help me brainstorm some creative ideas. Let's think outside the box!";
        break;
      case '3': // Debate Mode
        // Navigate to dedicated Debate Screen instead of regular chat
        if (selectedAIs.length < 2) {
          Alert.alert('Select More AIs', 'You need at least 2 AIs for a debate!');
          return;
        }
        navigation.navigate('Debate', { selectedAIs });
        return; // Don't continue to startChat
      case '4': // Learn Stuff
        initialPrompt = selectedAIs.length > 1
          ? "I'm curious to learn something new today. Can you each teach me something fascinating from your area of expertise?"
          : "Teach me something new and interesting today. What's a fascinating fact or concept?";
        break;
    }
    
    startChat(initialPrompt);
  };

  return (
    <ThemedView flex={1} backgroundColor="background">
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: theme.spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <ThemedView paddingHorizontal="lg" paddingVertical="lg">
            <ThemedText variant="heading" color="primary">
              {getGreeting()}
            </ThemedText>
            <ThemedText variant="subtitle" color="secondary">
              Pick your AI squad
            </ThemedText>
          </ThemedView>

          {/* AI Selection */}
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
          >
            <ThemedView paddingHorizontal="lg" marginBottom="xl">
              <ThemedText variant="title" color="primary">
                Select your AIs
              </ThemedText>
              <ThemedView marginBottom="md">
                <ThemedText variant="caption" color="secondary">
                  {subscription === 'free' 
                    ? `Choose up to ${maxAIs} (upgrade for the full crew)`
                    : 'All AIs unlocked and ready'}
                </ThemedText>
              </ThemedView>
              
              <ThemedView flexDirection="row" justifyContent="space-between">
                {AI_OPTIONS.map((ai, index) => {
                  const isSelected = selectedAIs.find(s => s.id === ai.id);
                  const isDisabled = !isSelected && selectedAIs.length >= maxAIs;
                  
                  return (
                    <Animated.View
                      key={ai.id}
                      entering={FadeInDown.delay(200 + index * 100).springify()}
                      style={{ width: (width - 48 - 20) / 3 }}
                    >
                      <GlassCard
                        onPress={() => toggleAI(ai)}
                        disabled={isDisabled}
                        style={{
                          borderColor: isSelected ? ai.color : 'transparent',
                          borderWidth: isSelected ? 2 : 0,
                          opacity: isDisabled ? 0.4 : 1,
                        }}
                        padding="md"
                      >
                        <ThemedView alignItems="center">
                          <ThemedView
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 28,
                              backgroundColor: isSelected ? ai.color + '20' : theme.colors.gray[100],
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginBottom: theme.spacing.sm,
                            }}
                          >
                            <ThemedText style={{ fontSize: 28 }}>
                              {ai.avatar}
                            </ThemedText>
                          </ThemedView>
                          <ThemedText 
                            variant="caption" 
                            weight="semibold"
                            color={isSelected ? 'brand' : 'primary'}
                          >
                            {ai.name}
                          </ThemedText>
                          {isSelected && (
                            <ThemedView
                              style={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: ai.color,
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <ThemedText style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>
                                ✓
                              </ThemedText>
                            </ThemedView>
                          )}
                        </ThemedView>
                      </GlassCard>
                    </Animated.View>
                  );
                })}
              </ThemedView>
            </ThemedView>
          </Animated.View>

          {/* Quick Start Topics */}
          <Animated.View 
            entering={FadeInDown.delay(500).springify()}
          >
            <ThemedView paddingHorizontal="lg" marginBottom="xl">
              <ThemedView flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom="md">
                <ThemedText variant="title" color="primary">
                  Quick starts
                </ThemedText>
                {selectedAIs.length === 0 && (
                  <ThemedText variant="caption" color="secondary" style={{ fontStyle: 'italic' }}>
                    Select AI above to enable
                  </ThemedText>
                )}
              </ThemedView>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
              >
                {QUICK_TOPICS.map((topic) => (
                  <AnimatedPressable
                    key={topic.id} 
                    onPress={() => handleQuickStart(topic)}
                    disabled={selectedAIs.length === 0}
                    hapticFeedback
                    hapticType="light"
                    style={{ marginRight: theme.spacing.sm }}
                  >
                    <GlassCard
                      style={{
                        width: 140,
                        opacity: selectedAIs.length === 0 ? 0.5 : 1,
                      }}
                      padding="md"
                    >
                      <ThemedText style={{ fontSize: 32, marginBottom: theme.spacing.sm }}>
                        {topic.emoji}
                      </ThemedText>
                      <ThemedText variant="subtitle" color="primary" style={{ marginBottom: 4 }}>
                        {topic.title}
                      </ThemedText>
                      <ThemedText variant="caption" color="secondary">
                        {topic.subtitle}
                      </ThemedText>
                    </GlassCard>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </ThemedView>
          </Animated.View>

          {/* Start Button */}
          <Animated.View 
            entering={FadeInDown.delay(700).springify()}
          >
            <ThemedView paddingHorizontal="lg">
              <GradientButton
                title={
                  selectedAIs.length === 0 
                    ? 'Select at least one AI'
                    : selectedAIs.length === 1
                    ? `Chat with ${selectedAIs[0].name}`
                    : `Start ${selectedAIs.length}-way conversation`
                }
                onPress={() => startChat()}
                disabled={selectedAIs.length === 0}
                fullWidth
                hapticType="medium"
              />

              {subscription === 'free' && (
                <AnimatedPressable
                  onPress={() => navigation.navigate('Subscription')}
                  hapticFeedback
                  hapticType="light"
                  style={{ marginTop: theme.spacing.sm, alignItems: 'center' }}
                >
                  <ThemedText variant="body" color="brand">
                    ✨ Unlock all features with Pro
                  </ThemedText>
                </AnimatedPressable>
              )}
            </ThemedView>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export default HomeScreen;