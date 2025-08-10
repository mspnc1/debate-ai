import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()}
          </Text>
          <Text style={styles.subGreeting}>
            Pick your AI squad
          </Text>
        </View>

        {/* AI Selection */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.aiSection}
        >
          <Text style={styles.sectionTitle}>Select your AIs</Text>
          <Text style={styles.sectionSubtitle}>
            {subscription === 'free' 
              ? `Choose up to ${maxAIs} (upgrade for the full crew)`
              : 'All AIs unlocked and ready'}
          </Text>
          
          <View style={styles.aiGrid}>
            {AI_OPTIONS.map((ai, index) => {
              const isSelected = selectedAIs.find(s => s.id === ai.id);
              const isDisabled = !isSelected && selectedAIs.length >= maxAIs;
              
              return (
                <Animated.View
                  key={ai.id}
                  entering={FadeInDown.delay(200 + index * 100).springify()}
                >
                  <TouchableOpacity
                    style={[
                      styles.aiCard,
                      isSelected && styles.aiCardSelected,
                      isSelected && { borderColor: ai.color },
                      isDisabled && styles.aiCardDisabled,
                    ]}
                    onPress={() => toggleAI(ai)}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    <View style={[
                      styles.aiAvatar,
                      isSelected && { backgroundColor: ai.color + '20' }
                    ]}>
                      <Text style={styles.aiEmoji}>{ai.avatar}</Text>
                    </View>
                    <Text style={[
                      styles.aiName,
                      isSelected && { color: ai.color }
                    ]}>
                      {ai.name}
                    </Text>
                    {isSelected && (
                      <View style={[styles.selectedBadge, { backgroundColor: ai.color }]}>
                        <Text style={styles.selectedBadgeText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* Quick Start Topics */}
        <Animated.View 
          entering={FadeInDown.delay(500).springify()}
          style={styles.topicsSection}
        >
          <View style={styles.quickStartHeader}>
            <Text style={styles.sectionTitle}>Quick starts</Text>
            {selectedAIs.length === 0 && (
              <Text style={styles.quickStartHint}>Select AI above to enable</Text>
            )}
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicsScroll}
          >
            {QUICK_TOPICS.map((topic) => (
              <TouchableOpacity 
                key={topic.id} 
                style={[
                  styles.topicCard,
                  selectedAIs.length === 0 && styles.topicCardDisabled
                ]}
                activeOpacity={selectedAIs.length === 0 ? 1 : 0.7}
                onPress={() => handleQuickStart(topic)}
                disabled={selectedAIs.length === 0}
              >
                <Text style={[
                  styles.topicEmoji,
                  selectedAIs.length === 0 && styles.topicTextDisabled
                ]}>{topic.emoji}</Text>
                <Text style={[
                  styles.topicTitle,
                  selectedAIs.length === 0 && styles.topicTextDisabled
                ]}>{topic.title}</Text>
                <Text style={[
                  styles.topicSubtitle,
                  selectedAIs.length === 0 && styles.topicTextDisabled
                ]}>{topic.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Start Button */}
        <Animated.View 
          entering={FadeInDown.delay(700).springify()}
          style={styles.buttonContainer}
        >
          <TouchableOpacity
            style={[
              styles.startButton,
              selectedAIs.length === 0 && styles.startButtonDisabled
            ]}
            onPress={() => startChat()}
            activeOpacity={0.8}
            disabled={selectedAIs.length === 0}
          >
            <Text style={styles.startButtonText}>
              {selectedAIs.length === 0 
                ? 'Select at least one AI'
                : selectedAIs.length === 1
                ? `Chat with ${selectedAIs[0].name}`
                : `Start ${selectedAIs.length}-way conversation`}
            </Text>
          </TouchableOpacity>

          {subscription === 'free' && (
            <TouchableOpacity 
              style={styles.upgradeHint}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={styles.upgradeHintText}>
                ✨ Unlock all features with Pro
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 17,
    color: '#666666',
  },
  aiSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 16,
  },
  aiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aiCard: {
    width: (width - 48 - 20) / 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  aiCardSelected: {
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  aiCardDisabled: {
    opacity: 0.4,
  },
  aiAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiEmoji: {
    fontSize: 28,
  },
  aiName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  topicsSection: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  quickStartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickStartHint: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
  },
  topicsScroll: {
    // Remove horizontal padding since the section already has it
  },
  topicCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topicCardDisabled: {
    backgroundColor: '#F5F5F5',
    shadowOpacity: 0,
    elevation: 0,
  },
  topicTextDisabled: {
    opacity: 0.4,
  },
  topicEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  topicSubtitle: {
    fontSize: 12,
    color: '#999999',
  },
  buttonContainer: {
    paddingHorizontal: 24,
  },
  startButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  upgradeHint: {
    marginTop: 12,
    alignItems: 'center',
  },
  upgradeHintText: {
    fontSize: 14,
    color: '#007AFF',
  },
});

export default HomeScreen;