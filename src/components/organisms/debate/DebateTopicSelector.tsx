/**
 * DebateTopicSelector Organism
 * Handles topic selection including preset topics, custom input, and surprise mode
 */

import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import Animated, { FadeInDown, FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { useTheme } from '../../../theme';
import { Typography, GradientButton, DebateTopicCard } from '../../molecules';
import { RichTopicInput } from './RichTopicInput';
import { DEBATE_TOPICS } from '../../../constants/debateTopics';

interface DebateTopicSelectorProps {
  selectedTopic: string;
  customTopic: string;
  topicMode: 'preset' | 'custom' | 'surprise';
  onTopicSelect: (topic: string) => void;
  onCustomTopicChange: (topic: string) => void;
  onTopicModeChange: (mode: 'preset' | 'custom' | 'surprise') => void;
  onNext: () => void;
  onSurpriseMe: () => void;
}

export const DebateTopicSelector: React.FC<DebateTopicSelectorProps> = ({
  selectedTopic,
  customTopic,
  topicMode,
  onTopicSelect,
  onCustomTopicChange,
  onTopicModeChange,
  onNext,
  onSurpriseMe,
}) => {
  const { theme } = useTheme();

  const handleNext = () => {
    const finalTopic = topicMode === 'custom' ? customTopic : selectedTopic;
    if (!finalTopic) {
      Alert.alert('Select a Topic', 'Please choose or enter a debate topic first!');
      return;
    }
    onNext();
  };

  const isNextEnabled = Boolean(
    (topicMode === 'preset' && selectedTopic) ||
    (topicMode === 'custom' && customTopic) ||
    (topicMode === 'surprise' && selectedTopic)
  );

  return (
    <Animated.View entering={FadeIn}>
      {/* Topic Selection Question */}
      <View style={{ marginBottom: theme.spacing.lg }}>
        <Typography 
          variant="subtitle" 
          weight="semibold" 
          align="center"
          style={{ 
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          }}
        >
          💭 What should the AIs debate?
        </Typography>
      </View>
      
      {/* Three Main Action Buttons */}
      <View style={{ marginBottom: theme.spacing.lg }}>
        <View style={{ 
          flexDirection: 'row', 
          marginBottom: theme.spacing.sm,
          gap: theme.spacing.sm,
        }}>
          <TouchableOpacity
            onPress={() => {
              onTopicModeChange('preset');
              onCustomTopicChange('');
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
              onTopicModeChange('custom');
              onTopicSelect('');
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
          onPress={onSurpriseMe}
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
                onPress={() => onTopicSelect(topic)}
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
              onChange={onCustomTopicChange}
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
        onPress={handleNext}
        disabled={!isNextEnabled}
        gradient={theme.colors.gradients.primary}
        fullWidth
      />
    </Animated.View>
  );
};