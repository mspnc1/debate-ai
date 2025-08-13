import React, { useState, useMemo, useEffect } from 'react';
import { ScrollView, View, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setAIPersonality, preserveTopic, clearPreservedTopic } from '../store';
import Animated, { FadeInDown, FadeIn, FadeOut, Layout } from 'react-native-reanimated';

import { Box } from '../components/atoms';
import { Button, GradientButton } from '../components/molecules';
import { GradientHeader } from '../components/organisms';
import { DynamicAISelector } from '../components/organisms/DynamicAISelector';
import { AIAvatar } from '../components/organisms/AIAvatar';
import { SectionHeader } from '../components/molecules';

import { useTheme } from '../theme';
import { AIConfig } from '../types';
import { AI_PROVIDERS } from '../config/aiProviders';
import { getAIProviderIcon } from '../utils/aiProviderAssets';
import { DEBATE_TOPICS } from '../constants/debateTopics';
import { UNIVERSAL_PERSONALITIES } from '../config/personalities';
import { Typography } from '../components/molecules';
import { usePreDebateValidation } from '../hooks/debate';
import { RichTopicInput, TextFormatting } from '../components/organisms/debate/RichTopicInput';

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

const DebateTopicCard: React.FC<DebateTopicCardProps> = ({ topic, isSelected, onPress, index }) => {
  const { theme } = useTheme();
  
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity
        onPress={onPress}
        style={{
          backgroundColor: isSelected ? theme.colors.primary[100] : theme.colors.surface,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.sm,
          borderWidth: 1,
          borderColor: isSelected ? theme.colors.primary[500] : theme.colors.border,
        }}
      >
        <Typography 
          variant="body" 
          weight={isSelected ? 'semibold' : 'medium'}
          style={{ color: isSelected ? theme.colors.primary[700] : theme.colors.text.primary }}
        >
          {topic}
        </Typography>
      </TouchableOpacity>
    </Animated.View>
  );
};

const DebateSetupScreen: React.FC<DebateSetupScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const aiPersonalities = useSelector((state: RootState) => state.chat.aiPersonalities);
  const preservedTopic = useSelector((state: RootState) => state.debateStats.preservedTopic);
  const preservedTopicMode = useSelector((state: RootState) => state.debateStats.preservedTopicMode);
  
  // Pre-debate validation
  const validation = usePreDebateValidation(navigation);
  
  // TODO: Remove true || for production - defaulting to premium for development
  // eslint-disable-next-line no-constant-binary-expression
  const isPremium = true || user?.subscription === 'pro' || user?.subscription === 'business';
  
  // Get configured AIs based on which ones have API keys
  const configuredAIs = useMemo(() => {
    return AI_PROVIDERS
      .filter(provider => provider.enabled && apiKeys[provider.id as keyof typeof apiKeys])
      .map(provider => {
        const iconData = getAIProviderIcon(provider.id);
        return {
          id: provider.id,
          provider: provider.id,
          name: provider.name,
          personality: 'balanced',
          avatar: iconData.icon, // Keep for backwards compatibility
          icon: iconData.icon,
          iconType: iconData.iconType,
          color: provider.color,
        } as AIConfig;
      });
  }, [apiKeys]);
  
  const [currentStep, setCurrentStep] = useState<'topic' | 'ai' | 'personality'>('topic');
  const [selectedAIs, setSelectedAIs] = useState<AIConfig[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>(preservedTopic || '');
  const [customTopic, setCustomTopic] = useState(preservedTopicMode === 'custom' ? (preservedTopic || '') : '');
  const [topicMode, setTopicMode] = useState<'preset' | 'custom' | 'surprise'>(preservedTopicMode || 'preset');
  
  // Debate mode always requires exactly 2 AIs
  const maxAIs = 2;
  
  // Check validation on mount
  useEffect(() => {
    if (!validation.isReady) {
      validation.checkReadiness();
    }
  }, [validation]);
  
  // Save topic when navigating away
  useEffect(() => {
    return () => {
      const currentTopic = topicMode === 'custom' ? customTopic : selectedTopic;
      const preserveMode = topicMode === 'surprise' ? 'preset' : topicMode;
      if (currentTopic) {
        dispatch(preserveTopic({ topic: currentTopic, mode: preserveMode }));
      }
    };
  }, [selectedTopic, customTopic, topicMode, dispatch]);
  
  // Clear preserved topic when debate starts
  const clearPreservedData = () => {
    dispatch(clearPreservedTopic());
  };
  
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
  
  const handlePersonalityChange = (aiId: string, personalityId: string) => {
    dispatch(setAIPersonality({ aiId, personalityId }));
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
    
    // Clear preserved topic since we're starting the debate
    clearPreservedData();
    
    navigation.navigate('Debate', { 
      selectedAIs,
      topic: finalTopic,
      personalities: aiPersonalities,
    });
  };
  
  const selectRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * DEBATE_TOPICS.length);
    const randomTopic = DEBATE_TOPICS[randomIndex];
    setSelectedTopic(randomTopic);
    setCustomTopic('');
  };
  
  const handleTopicNext = () => {
    const finalTopic = topicMode === 'custom' ? customTopic : selectedTopic;
    if (!finalTopic) {
      Alert.alert('Select a Topic', 'Please choose or enter a debate topic first!');
      return;
    }
    setCurrentStep('ai');
  };
  
  const handleAINext = () => {
    if (selectedAIs.length < 2) {
      Alert.alert('Select 2 AIs', 'Please select exactly 2 AIs for the debate!');
      return;
    }
    if (isPremium) {
      setCurrentStep('personality');
    } else {
      handleStartDebate();
    }
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top', 'left', 'right']}>
      <GradientHeader
        title="Debate Arena"
        subtitle="What should AIs debate today?"
      />
      
      {/* Stats Button */}
      <Box style={{ 
        position: 'absolute', 
        top: 60, 
        right: 16,
        zIndex: 10,
      }}>
        <Button
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
      </Box>
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 2,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: Topic Selection */}
        {currentStep === 'topic' && (
          <Animated.View entering={FadeIn}>
            <SectionHeader
              title="Step 1: Choose a Topic"
              subtitle="What should the AIs debate?"
              icon="💭"
            />
            
            {/* Three Main Action Buttons */}
            <View style={{ marginBottom: theme.spacing.lg }}>
              <View style={{ 
                flexDirection: 'row', 
                marginBottom: theme.spacing.sm,
                gap: theme.spacing.sm,
              }}>
                <TouchableOpacity
                  onPress={() => {
                    setTopicMode('preset');
                    setCustomTopic('');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.lg,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: topicMode === 'preset' ? theme.colors.primary[500] : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: topicMode === 'preset' ? theme.colors.primary[500] : theme.colors.border,
                  }}
                >
                  <Typography 
                    variant="body" 
                    weight="semibold" 
                    align="center"
                    style={{ color: topicMode === 'preset' ? '#fff' : theme.colors.text.primary }}
                  >
                    Preset Topics
                  </Typography>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setTopicMode('custom');
                    setSelectedTopic('');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.lg,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: topicMode === 'custom' ? theme.colors.primary[500] : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: topicMode === 'custom' ? theme.colors.primary[500] : theme.colors.border,
                  }}
                >
                  <Typography 
                    variant="body" 
                    weight="semibold" 
                    align="center"
                    style={{ color: topicMode === 'custom' ? '#fff' : theme.colors.text.primary }}
                  >
                    Custom Topic
                  </Typography>
                </TouchableOpacity>
              </View>
              
              {/* Surprise Me Button - Always Visible */}
              <GradientButton
                title="🎲 Surprise Me!"
                onPress={() => {
                  selectRandomTopic();
                  setTopicMode('surprise');
                  setCustomTopic('');
                }}
                gradient={theme.colors.gradients.ocean}
                fullWidth
              />
            </View>
            
            {/* Content Area - Changes based on selection */}
            <Animated.View layout={Layout.duration(300)} style={{ minHeight: 200 }}>
              {/* Preset Topics List - Unfurls when selected */}
              {topicMode === 'preset' && (
                <Animated.View 
                  entering={FadeInDown.duration(300)}
                  exiting={FadeOut.duration(200)}
                  style={{ marginBottom: theme.spacing.xl }}
                >
                  {DEBATE_TOPICS.slice(0, 6).map((topic, index) => (
                    <DebateTopicCard
                      key={topic}
                      topic={topic}
                      isSelected={selectedTopic === topic}
                      onPress={() => setSelectedTopic(topic)}
                      index={index}
                    />
                  ))}
                </Animated.View>
              )}
              
              {/* Custom Topic Input - Fades in when selected */}
              {topicMode === 'custom' && (
                <Animated.View 
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                  style={{ marginBottom: theme.spacing.xl }}
                >
                  <RichTopicInput
                    value={customTopic}
                    onChange={(text: string, _formatting: TextFormatting) => {
                      setCustomTopic(text);
                    }}
                    maxLength={200}
                    placeholder="Enter your custom debate topic..."
                  />
                </Animated.View>
              )}
              
              {/* Surprise Topic Display - Shows selected random topic */}
              {topicMode === 'surprise' && selectedTopic && (
                <Animated.View 
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                  style={{ marginBottom: theme.spacing.xl }}
                >
                  <View style={{
                    backgroundColor: theme.colors.primary[50],
                    borderRadius: theme.borderRadius.lg,
                    padding: theme.spacing.lg,
                    borderWidth: 2,
                    borderColor: theme.colors.primary[300],
                  }}>
                    <Typography variant="caption" color="secondary" style={{ marginBottom: 8 }}>
                      🎲 Random Topic Selected:
                    </Typography>
                    <Typography variant="body" weight="semibold">
                      {selectedTopic}
                    </Typography>
                    <Typography variant="caption" color="secondary" style={{ marginTop: 12, fontStyle: 'italic' }}>
                      Press "Surprise Me!" again for a different topic
                    </Typography>
                  </View>
                </Animated.View>
              )}
            </Animated.View>
            
            {/* Next Button */}
            <GradientButton
              title="Next: Choose Debaters →"
              onPress={handleTopicNext}
              disabled={!selectedTopic && !customTopic}
              gradient={theme.colors.gradients.primary}
              fullWidth
            />
          </Animated.View>
        )}
        
        {/* Step 2: AI Selection */}
        {currentStep === 'ai' && (
          <Animated.View entering={FadeIn}>
            {/* Back Button */}
            <TouchableOpacity 
              onPress={() => setCurrentStep('topic')}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                marginBottom: theme.spacing.md,
              }}
            >
              <Typography variant="body" style={{ marginRight: 8 }}>←</Typography>
              <Typography variant="body" color="secondary">Back to Topic</Typography>
            </TouchableOpacity>
            
            {/* Selected Topic Display */}
            <View style={{
              backgroundColor: theme.colors.primary[50],
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.primary[200],
            }}>
              <Typography variant="caption" color="secondary" style={{ marginBottom: 4 }}>
                Selected Topic:
              </Typography>
              <Typography variant="body" weight="semibold">
                {topicMode === 'custom' ? customTopic : selectedTopic}
              </Typography>
            </View>
            
            <DynamicAISelector
              configuredAIs={configuredAIs}
              selectedAIs={selectedAIs}
              maxAIs={maxAIs}
              onToggleAI={handleToggleAI}
              onAddAI={() => navigation.navigate('APIConfig')}
              isPremium={isPremium}
              customSubtitle="Select exactly 2 AIs for the debate"
              hideStartButton={true}
              aiPersonalities={aiPersonalities}
              onPersonalityChange={handlePersonalityChange}
            />
            
            {/* Next Button */}
            <GradientButton
              title={isPremium ? "Next: Set the Tone →" : "Start Debate ⚔️"}
              onPress={handleAINext}
              disabled={selectedAIs.length !== 2}
              gradient={theme.colors.gradients.primary}
              fullWidth
              style={{ marginTop: theme.spacing.lg }}
            />
            
            {/* Secondary Back Button */}
            <Button
              title="← Back to Topic Selection"
              onPress={() => setCurrentStep('topic')}
              variant="ghost"
              fullWidth
              style={{ marginTop: theme.spacing.md }}
            />
          </Animated.View>
        )}
        
        {/* Step 3: Personality Selection (Premium Only) */}
        {currentStep === 'personality' && isPremium && (
          <Animated.View entering={FadeIn}>
            {/* Back Button */}
            <TouchableOpacity 
              onPress={() => setCurrentStep('ai')}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                marginBottom: theme.spacing.md,
              }}
            >
              <Typography variant="body" style={{ marginRight: 8 }}>←</Typography>
              <Typography variant="body" color="secondary">Back to AI Selection</Typography>
            </TouchableOpacity>
            
            <SectionHeader
              title="Step 3: Set the Tone"
              subtitle="Choose personality styles for the debate"
              icon="🎭"
            />
            
            {/* Topic & AIs Summary */}
            <View style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}>
              <Typography variant="caption" color="secondary" style={{ marginBottom: 8 }}>
                Debate Preview:
              </Typography>
              <Typography variant="body" weight="semibold" style={{ marginBottom: 4 }}>
                "{topicMode === 'custom' ? customTopic : selectedTopic}"
              </Typography>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {selectedAIs.map((ai) => (
                  <View 
                    key={ai.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary[50],
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <Typography variant="caption" weight="semibold">{ai.name}</Typography>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Personality Selection for Each AI */}
            <View style={{ gap: theme.spacing.md }}>
              {selectedAIs.map((ai) => {
                const currentPersonality = aiPersonalities[ai.id] || 'default';
                return (
                  <View 
                    key={ai.id}
                    style={{
                      backgroundColor: theme.colors.card,
                      borderRadius: theme.borderRadius.lg,
                      padding: theme.spacing.md,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
                      <View style={{ marginRight: theme.spacing.md }}>
                        <AIAvatar
                          icon={ai.icon || ai.name.charAt(0)}
                          iconType={ai.iconType || 'letter'}
                          size="large"
                          color={ai.color}
                          isSelected={false}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Typography variant="body" weight="medium" style={{ marginBottom: 4 }}>
                          Personality Selection
                        </Typography>
                        <Typography variant="caption" color="secondary">
                          Selected: {UNIVERSAL_PERSONALITIES.find(p => p.id === currentPersonality)?.name || 'Default'}
                        </Typography>
                      </View>
                    </View>
                    
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                      {UNIVERSAL_PERSONALITIES.map((personality) => {
                        const isSelected = currentPersonality === personality.id;
                        return (
                          <TouchableOpacity
                            key={personality.id}
                            onPress={() => handlePersonalityChange(ai.id, personality.id)}
                            style={{
                              paddingHorizontal: theme.spacing.md,
                              paddingVertical: theme.spacing.sm,
                              borderRadius: theme.borderRadius.full,
                              backgroundColor: isSelected ? ai.color : theme.colors.surface,
                              borderWidth: 1,
                              borderColor: isSelected ? ai.color : theme.colors.border,
                            }}
                          >
                            <Typography 
                              variant="caption" 
                              weight={isSelected ? 'bold' : 'medium'}
                              style={{ 
                                color: isSelected ? '#fff' : theme.colors.text.primary 
                              }}
                            >
                              {personality.name}
                            </Typography>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
            
            {/* Start Debate Button */}
            <GradientButton
              title="Start Debate ⚔️"
              onPress={handleStartDebate}
              gradient={theme.colors.gradients.sunset}
              fullWidth
              hapticType="medium"
              style={{ marginTop: theme.spacing.xl }}
            />
            
            {/* Secondary Back Button */}
            <Button
              title="← Back to AI Selection"
              onPress={() => setCurrentStep('ai')}
              variant="ghost"
              fullWidth
              style={{ marginTop: theme.spacing.md }}
            />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DebateSetupScreen;