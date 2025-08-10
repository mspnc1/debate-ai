import React, { useState } from 'react';
import { ScrollView, View, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GradientHeader, GradientButton, ThemedButton } from '../components/core';
import { AISelector } from '../components/organisms/AISelector';
import { SectionHeader } from '../components/atoms/SectionHeader';

import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useAISelection } from '../hooks/useAISelection';
import { AIConfig } from '../types';
import { DEBATE_TOPICS } from '../constants/debateTopics';

interface DebateSetupScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

// Available AI configurations
const AI_CONFIGS: AIConfig[] = [
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

interface DebateTopicCardProps {
  topic: string;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

const DebateTopicCard: React.FC<DebateTopicCardProps> = ({ 
  topic, 
  isSelected, 
  onPress,
  index,
}) => {
  const { theme } = useTheme();
  
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 50).springify()}
      style={{ marginBottom: theme.spacing.sm }}
    >
      <ThemedButton
        title={topic}
        onPress={onPress}
        variant={isSelected ? 'primary' : 'secondary'}
        style={{
          width: '100%',
          paddingVertical: theme.spacing.md,
        }}
      />
    </Animated.View>
  );
};

const DebateSetupScreen: React.FC<DebateSetupScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { isPremium } = useAuth();
  const { 
    selectedAIs, 
    toggleAI, 
    hasMinimumSelection,
  } = useAISelection({ minSelection: 2, maxSelection: isPremium ? 3 : 2 });
  
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [topicMode, setTopicMode] = useState<'preset' | 'custom'>('preset');
  
  const handleStartDebate = () => {
    if (selectedAIs.length < 2) {
      Alert.alert('Select More AIs', 'You need at least 2 AIs for a debate!');
      return;
    }
    
    const finalTopic = topicMode === 'custom' ? customTopic : selectedTopic;
    if (!finalTopic) {
      Alert.alert('Select a Topic', 'Please choose a debate topic first!');
      return;
    }
    
    navigation.navigate('Debate', { 
      selectedAIs,
      topic: finalTopic,
    });
  };
  
  const selectRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * DEBATE_TOPICS.length);
    setSelectedTopic(DEBATE_TOPICS[randomIndex]);
    setTopicMode('preset');
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <GradientHeader
        title="Debate Mode"
        subtitle="Set up an AI debate"
        gradient={theme.colors.gradients.sunset}
      />
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 2,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Selection */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <AISelector
            availableAIs={AI_CONFIGS}
            selectedAIs={selectedAIs}
            maxAIs={isPremium ? 3 : 2}
            onToggleAI={toggleAI}
            onStartChat={() => {}}
            isPremium={isPremium}
          />
        </View>
        
        {/* Topic Selection */}
        {hasMinimumSelection && (
          <Animated.View 
            entering={FadeInDown.delay(300).springify()}
            style={{ marginBottom: theme.spacing.xl }}
          >
            <SectionHeader
              title="Choose a Topic"
              subtitle="What should the AIs debate?"
              icon="💭"
            />
            
            {/* Topic Mode Toggle */}
            <View style={{ 
              flexDirection: 'row', 
              marginBottom: theme.spacing.md,
              gap: theme.spacing.sm,
            }}>
              <ThemedButton
                title="Preset Topics"
                onPress={() => setTopicMode('preset')}
                variant={topicMode === 'preset' ? 'primary' : 'secondary'}
                style={{ flex: 1 }}
              />
              <ThemedButton
                title="Custom Topic"
                onPress={() => setTopicMode('custom')}
                variant={topicMode === 'custom' ? 'primary' : 'secondary'}
                style={{ flex: 1 }}
              />
            </View>
            
            {topicMode === 'preset' ? (
              <>
                {/* Random Topic Button */}
                <GradientButton
                  title="🎲 Surprise Me!"
                  onPress={selectRandomTopic}
                  gradient={theme.colors.gradients.ocean}
                  fullWidth
                  style={{ marginBottom: theme.spacing.md }}
                />
                
                {/* Topic List */}
                <View>
                  {DEBATE_TOPICS.slice(0, 6).map((topic, index) => (
                    <DebateTopicCard
                      key={topic}
                      topic={topic}
                      isSelected={selectedTopic === topic}
                      onPress={() => setSelectedTopic(topic)}
                      index={index}
                    />
                  ))}
                </View>
              </>
            ) : (
              <TextInput
                style={{
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  color: theme.colors.text.primary,
                  fontSize: 16,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
                placeholder="Enter your custom debate topic..."
                placeholderTextColor={theme.colors.text.disabled}
                value={customTopic}
                onChangeText={setCustomTopic}
                multiline
              />
            )}
          </Animated.View>
        )}
        
        {/* Start Debate Button */}
        {hasMinimumSelection && (
          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <GradientButton
              title="Start Debate"
              onPress={handleStartDebate}
              disabled={!hasMinimumSelection || (!selectedTopic && !customTopic)}
              gradient={theme.colors.gradients.sunset}
              fullWidth
              hapticType="medium"
            />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DebateSetupScreen;