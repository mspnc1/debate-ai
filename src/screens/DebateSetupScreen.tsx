import React, { useState, useMemo } from 'react';
import { ScrollView, View, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GradientButton, ThemedButton, ThemedView } from '../components/atoms';
import { GradientHeader } from '../components/molecules';
import { DynamicAISelector } from '../components/organisms/DynamicAISelector';
import { SectionHeader } from '../components/atoms/SectionHeader';

import { useTheme } from '../theme';
import { AIConfig } from '../types';
import { AI_PROVIDERS } from '../config/aiProviders';
import { DEBATE_TOPICS } from '../constants/debateTopics';

interface DebateSetupScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

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
  const user = useSelector((state: RootState) => state.user.currentUser);
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  
  // TODO: Remove true || for production - defaulting to premium for development
  // eslint-disable-next-line no-constant-binary-expression
  const isPremium = true || user?.subscription === 'pro' || user?.subscription === 'business';
  
  // Get configured AIs based on which ones have API keys
  const configuredAIs = useMemo(() => {
    return AI_PROVIDERS
      .filter(provider => provider.enabled && apiKeys[provider.id as keyof typeof apiKeys])
      .map(provider => ({
        id: provider.id,
        provider: provider.id,
        name: provider.name,
        personality: 'balanced',
        avatar: provider.icon,
        color: provider.color,
      } as AIConfig));
  }, [apiKeys]);
  
  const [selectedAIs, setSelectedAIs] = useState<AIConfig[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [topicMode, setTopicMode] = useState<'preset' | 'custom'>('preset');
  
  // Debate mode always requires exactly 2 AIs
  const maxAIs = 2;
  
  const handleToggleAI = (ai: AIConfig) => {
    setSelectedAIs(prev => {
      const isSelected = prev.some(s => s.id === ai.id);
      if (isSelected) {
        return prev.filter(s => s.id !== ai.id);
      } else if (prev.length < maxAIs) {
        return [...prev, ai];
      }
      return prev;
    });
  };
  
  const getDebateSubtitle = () => {
    if (configuredAIs.length === 0) {
      return 'No AIs configured yet';
    } else if (configuredAIs.length === 1) {
      return 'Need at least 2 AIs for debate';
    } else {
      return `${configuredAIs.length} AIs ready • Select 2 for debate`;
    }
  };
  
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'left', 'right']}>
      <GradientHeader
        title="Debate Mode"
        subtitle="Set up an AI debate"
      />
      
      {/* Stats Button */}
      <ThemedView style={{ 
        position: 'absolute', 
        top: 60, 
        right: 16,
        zIndex: 10,
      }}>
        <ThemedButton
          title="📊 Stats"
          onPress={() => navigation.navigate('Stats')}
          variant="secondary"
          size="small"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: theme.colors.surface,
          }}
        />
      </ThemedView>
      
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
          <DynamicAISelector
            configuredAIs={configuredAIs}
            selectedAIs={selectedAIs}
            maxAIs={maxAIs}
            onToggleAI={handleToggleAI}
            onAddAI={() => navigation.navigate('APIConfig')}
            isPremium={isPremium}
            customSubtitle={getDebateSubtitle()}
            hideStartButton={true}
          />
        </View>
        
        {/* Topic Selection */}
        {selectedAIs.length >= 2 && (
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
        {selectedAIs.length >= 2 && (
          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <GradientButton
              title="Start Debate"
              onPress={handleStartDebate}
              disabled={selectedAIs.length < 2 || (!selectedTopic && !customTopic)}
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