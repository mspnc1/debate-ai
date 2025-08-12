import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TextInput,
} from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Box } from '../atoms';
import { Button } from '../molecules';
import { GradientButton, Typography } from '../molecules';
import { SectionHeader } from '../molecules';
import { QuickStartTopic } from './QuickStartsSection';
import { useTheme } from '../../theme';
import * as Haptics from 'expo-haptics';

interface PromptWizardProps {
  visible: boolean;
  topic: QuickStartTopic | null;
  onClose: () => void;
  onComplete: (prompt: string) => void;
}

type WizardStep = 'refine' | 'tone' | 'context';

const TONES = [
  { id: 'casual', label: 'Casual', emoji: '😊' },
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'academic', label: 'Academic', emoji: '🎓' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'funny', label: 'Funny', emoji: '😄' },
  { id: 'curious', label: 'Curious', emoji: '🤔' },
  { id: 'supportive', label: 'Supportive', emoji: '🤗' },
  { id: 'analytical', label: 'Analytical', emoji: '📊' },
];

const CONTEXTS_BY_TOPIC: { [key: string]: Array<{ id: string; label: string; emoji: string }> } = {
  morning: [
    { id: 'productive', label: 'Productive Day', emoji: '⚡' },
    { id: 'relaxed', label: 'Relaxed Day', emoji: '☕' },
    { id: 'motivated', label: 'Need Motivation', emoji: '💪' },
    { id: 'planning', label: 'Planning Ahead', emoji: '📅' },
  ],
  brainstorm: [
    { id: 'business', label: 'Business Ideas', emoji: '💼' },
    { id: 'creative', label: 'Creative Projects', emoji: '🎨' },
    { id: 'technical', label: 'Tech Solutions', emoji: '💻' },
    { id: 'personal', label: 'Personal Goals', emoji: '🎯' },
  ],
  learn: [
    { id: 'science', label: 'Science & Tech', emoji: '🔬' },
    { id: 'history', label: 'History & Culture', emoji: '🏛️' },
    { id: 'skills', label: 'Practical Skills', emoji: '🛠️' },
    { id: 'languages', label: 'Languages', emoji: '🗣️' },
  ],
  creative: [
    { id: 'story', label: 'Story Writing', emoji: '📖' },
    { id: 'poetry', label: 'Poetry', emoji: '✍️' },
    { id: 'worldbuilding', label: 'World Building', emoji: '🌍' },
    { id: 'characters', label: 'Character Development', emoji: '👥' },
  ],
  problem: [
    { id: 'technical', label: 'Technical Issue', emoji: '🔧' },
    { id: 'personal', label: 'Personal Challenge', emoji: '💭' },
    { id: 'work', label: 'Work Related', emoji: '💼' },
    { id: 'creative', label: 'Creative Block', emoji: '🎨' },
  ],
  fun: [
    { id: 'games', label: 'Word Games', emoji: '🎲' },
    { id: 'trivia', label: 'Trivia & Facts', emoji: '🧠' },
    { id: 'jokes', label: 'Jokes & Humor', emoji: '😂' },
    { id: 'roleplay', label: 'Role Playing', emoji: '🎭' },
  ],
};

export const PromptWizard: React.FC<PromptWizardProps> = ({
  visible,
  topic,
  onClose,
  onComplete,
}) => {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState<WizardStep>('refine');
  const [refinement, setRefinement] = useState('');
  const [selectedTone, setSelectedTone] = useState('casual');
  const [context, setContext] = useState('');
  const [selectedContext, setSelectedContext] = useState('');
  
  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentStep === 'refine') {
      setCurrentStep('tone');
    } else if (currentStep === 'tone') {
      setCurrentStep('context');
    } else {
      // Generate the final prompt
      const prompt = generatePrompt();
      onComplete(prompt);
      resetWizard();
    }
  };
  
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentStep === 'tone') {
      setCurrentStep('refine');
    } else if (currentStep === 'context') {
      setCurrentStep('tone');
    }
  };
  
  const resetWizard = () => {
    setCurrentStep('refine');
    setRefinement('');
    setSelectedTone('casual');
    setContext('');
    setSelectedContext('');
  };
  
  const generatePrompt = () => {
    let prompt = '';
    const toneText = TONES.find(t => t.id === selectedTone)?.label.toLowerCase() || 'casual';
    const contextOption = topic && CONTEXTS_BY_TOPIC[topic.id]?.find(c => c.id === selectedContext);
    
    switch(topic?.id) {
      case 'morning':
        prompt = `Let's have a ${toneText} morning conversation. `;
        if (refinement) prompt += `I'd like to discuss ${refinement}. `;
        if (contextOption) {
          if (selectedContext === 'productive') prompt += "I'm planning a productive day ahead. ";
          else if (selectedContext === 'relaxed') prompt += "I'm looking for a relaxed start to my day. ";
          else if (selectedContext === 'motivated') prompt += "I need some motivation to get going. ";
          else if (selectedContext === 'planning') prompt += "Help me plan my day effectively. ";
        }
        break;
      case 'brainstorm':
        prompt = `I need help brainstorming in a ${toneText} way. `;
        if (refinement) prompt += `The topic is: ${refinement}. `;
        if (contextOption) {
          if (selectedContext === 'business') prompt += "Focus on business and entrepreneurial ideas. ";
          else if (selectedContext === 'creative') prompt += "Let's explore creative and artistic possibilities. ";
          else if (selectedContext === 'technical') prompt += "I need technical and engineering solutions. ";
          else if (selectedContext === 'personal') prompt += "This is for personal growth and goals. ";
        }
        break;
      case 'learn':
        prompt = `Teach me something new in a ${toneText} manner. `;
        if (refinement) prompt += `I'm interested in learning about ${refinement}. `;
        if (contextOption) {
          if (selectedContext === 'science') prompt += "Focus on science and technology topics. ";
          else if (selectedContext === 'history') prompt += "I'd love to learn about history and culture. ";
          else if (selectedContext === 'skills') prompt += "Teach me practical skills I can use. ";
          else if (selectedContext === 'languages') prompt += "Help me with language learning. ";
        }
        break;
      case 'creative':
        prompt = `Let's do some creative writing together in a ${toneText} style. `;
        if (refinement) prompt += `The theme is: ${refinement}. `;
        if (contextOption) {
          if (selectedContext === 'story') prompt += "Let's create an engaging story. ";
          else if (selectedContext === 'poetry') prompt += "Help me write beautiful poetry. ";
          else if (selectedContext === 'worldbuilding') prompt += "Let's build an imaginary world. ";
          else if (selectedContext === 'characters') prompt += "Help me develop interesting characters. ";
        }
        break;
      case 'problem':
        prompt = `Help me solve a problem using a ${toneText} approach. `;
        if (refinement) prompt += `The problem is: ${refinement}. `;
        if (contextOption) {
          if (selectedContext === 'technical') prompt += "This is a technical/engineering challenge. ";
          else if (selectedContext === 'personal') prompt += "This is a personal life challenge. ";
          else if (selectedContext === 'work') prompt += "This is work/career related. ";
          else if (selectedContext === 'creative') prompt += "I'm facing a creative block. ";
        }
        break;
      case 'fun':
        prompt = `Let's have some fun with a ${toneText} vibe! `;
        if (refinement) prompt += `${refinement} `;
        if (contextOption) {
          if (selectedContext === 'games') prompt += "Let's play word games and puzzles. ";
          else if (selectedContext === 'trivia') prompt += "Share interesting trivia and facts. ";
          else if (selectedContext === 'jokes') prompt += "Tell me jokes and funny stories. ";
          else if (selectedContext === 'roleplay') prompt += "Let's do some fun roleplay. ";
        }
        break;
      default:
        prompt = `Let's have a ${toneText} conversation. `;
        if (refinement) prompt += refinement + ' ';
    }
    
    if (context) {
      prompt += `Additional details: ${context}`;
    }
    
    return prompt.trim();
  };
  
  if (!topic) return null;
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View
            entering={FadeIn}
            style={{
              backgroundColor: theme.colors.background,
              borderTopLeftRadius: theme.borderRadius.xl,
              borderTopRightRadius: theme.borderRadius.xl,
              maxHeight: '90%',
            }}
          >
            {/* Header */}
            <Box 
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: theme.spacing.lg,
                paddingTop: theme.spacing.lg,
                paddingBottom: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <Typography variant="title" weight="bold">
                {topic.emoji} {topic.title}
              </Typography>
              <Button
                title="✕"
                onPress={onClose}
                variant="ghost"
                size="small"
              />
            </Box>
            
            <ScrollView 
              style={{ 
                paddingHorizontal: theme.spacing.lg,
                paddingTop: theme.spacing.md,
                paddingBottom: theme.spacing.lg,
                maxHeight: 400,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* Step Content */}
              {currentStep === 'refine' && (
                <Animated.View entering={SlideInRight}>
                  <SectionHeader
                    title="What specifically?"
                    subtitle="Refine your topic (optional)"
                  />
                  <TextInput
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                      color: theme.colors.text.primary,
                      fontSize: 16,
                      height: 80,
                      textAlignVertical: 'top',
                    }}
                    placeholder="e.g., AI technology, weekend plans, creative ideas..."
                    placeholderTextColor={theme.colors.text.disabled}
                    value={refinement}
                    onChangeText={setRefinement}
                    multiline
                    numberOfLines={3}
                  />
                </Animated.View>
              )}
              
              {currentStep === 'tone' && (
                <Animated.View entering={SlideInRight}>
                  <SectionHeader
                    title="Set the tone"
                    subtitle="How should the conversation feel?"
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {TONES.map(tone => (
                      <Button
                        key={tone.id}
                        title={`${tone.emoji} ${tone.label}`}
                        onPress={() => setSelectedTone(tone.id)}
                        variant={selectedTone === tone.id ? 'primary' : 'secondary'}
                        style={{ 
                          marginRight: theme.spacing.sm,
                          marginBottom: theme.spacing.sm,
                        }}
                      />
                    ))}
                  </View>
                </Animated.View>
              )}
              
              {currentStep === 'context' && (
                <Animated.View entering={SlideInRight}>
                  <SectionHeader
                    title="Add context"
                    subtitle="What's your focus?"
                  />
                  
                  {/* Context Options */}
                  {topic && CONTEXTS_BY_TOPIC[topic.id] && (
                    <View style={{ marginBottom: theme.spacing.md }}>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {CONTEXTS_BY_TOPIC[topic.id].map(ctx => (
                          <Button
                            key={ctx.id}
                            title={`${ctx.emoji} ${ctx.label}`}
                            onPress={() => setSelectedContext(ctx.id)}
                            variant={selectedContext === ctx.id ? 'primary' : 'secondary'}
                            style={{ 
                              marginRight: theme.spacing.sm,
                              marginBottom: theme.spacing.sm,
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                  
                  {/* Additional Context */}
                  <TextInput
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing.md,
                      color: theme.colors.text.primary,
                      fontSize: 16,
                      height: 60,
                      textAlignVertical: 'top',
                    }}
                    placeholder="Any additional details... (optional)"
                    placeholderTextColor={theme.colors.text.disabled}
                    value={context}
                    onChangeText={setContext}
                    multiline
                    numberOfLines={2}
                  />
                </Animated.View>
              )}
            </ScrollView>
            
            {/* Navigation Buttons */}
            <Box 
              style={{
                flexDirection: 'row',
                padding: theme.spacing.lg,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
                gap: theme.spacing.md,
              }}
            >
              {currentStep !== 'refine' && (
                <Button
                  title="Back"
                  onPress={handleBack}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
              )}
              <GradientButton
                title={currentStep === 'context' ? 'Start Chat' : 'Next'}
                onPress={handleNext}
                gradient={theme.colors.gradients.ocean}
                style={{ flex: 1 }}
              />
            </Box>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};