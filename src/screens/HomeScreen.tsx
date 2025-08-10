import React, { useState, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, startSession } from '../store';

import { GradientHeader } from '../components/core';
import { DynamicAISelector } from '../components/organisms/DynamicAISelector';
import { QuickStartsSection, QuickStartTopic } from '../components/organisms/QuickStartsSection';
import { PromptWizard } from '../components/organisms/PromptWizard';

import { useTheme } from '../theme';
import { AIConfig } from '../types';
import { AI_PROVIDERS } from '../config/aiProviders';

interface HomeScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}


const QUICK_START_TOPICS: QuickStartTopic[] = [
  { id: 'morning', emoji: '☀️', title: 'Morning Check-in', subtitle: 'Start your day right' },
  { id: 'brainstorm', emoji: '💡', title: 'Brainstorming', subtitle: 'Generate fresh ideas' },
  { id: 'learn', emoji: '📚', title: 'Learn Something', subtitle: 'Explore new topics' },
  { id: 'creative', emoji: '🎨', title: 'Creative Writing', subtitle: 'Tell a story together' },
  { id: 'problem', emoji: '🧩', title: 'Problem Solving', subtitle: 'Work through challenges' },
  { id: 'fun', emoji: '🎮', title: 'Just for Fun', subtitle: 'Games and entertainment' },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  
  const [selectedAIs, setSelectedAIs] = useState<AIConfig[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<QuickStartTopic | null>(null);
  const [showPromptWizard, setShowPromptWizard] = useState(false);
  
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
  
  const maxAIs = isPremium ? configuredAIs.length : Math.min(2, configuredAIs.length);
  
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
  
  const handleStartChat = () => {
    if (selectedAIs.length > 0) {
      dispatch(startSession({ selectedAIs }));
      const sessionId = `session_${Date.now()}`;
      navigation.navigate('Chat', { sessionId });
    }
  };
  
  const handleSelectTopic = (topic: QuickStartTopic) => {
    if (selectedAIs.length === 0) {
      return; // Don't open wizard if no AIs selected
    }
    setSelectedTopic(topic);
    setShowPromptWizard(true);
  };
  
  const handleCompleteWizard = (prompt: string) => {
    setShowPromptWizard(false);
    if (selectedAIs.length > 0) {
      dispatch(startSession({ selectedAIs }));
      const sessionId = `session_${Date.now()}`;
      navigation.navigate('Chat', { 
        sessionId,
        initialPrompt: prompt,
      });
    }
  };
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <GradientHeader
        title={getGreeting()}
        subtitle={`Welcome back${user?.email ? `, ${user.email.split('@')[0]}` : ''}!`}
        gradient={theme.colors.gradients.ocean}
      />
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 2,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary: AI Selection & Chat */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <DynamicAISelector
            configuredAIs={configuredAIs}
            selectedAIs={selectedAIs}
            maxAIs={maxAIs}
            onToggleAI={handleToggleAI}
            onStartChat={handleStartChat}
            onAddAI={() => navigation.navigate('APIConfig')}
            isPremium={isPremium}
          />
        </View>
        
        {/* Quick Starts - Guided Chat */}
        <QuickStartsSection
          topics={QUICK_START_TOPICS}
          onSelectTopic={handleSelectTopic}
          disabled={selectedAIs.length === 0}
        />
      </ScrollView>
      
      {/* Prompt Wizard Modal */}
      <PromptWizard
        visible={showPromptWizard}
        topic={selectedTopic}
        onClose={() => setShowPromptWizard(false)}
        onComplete={handleCompleteWizard}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;