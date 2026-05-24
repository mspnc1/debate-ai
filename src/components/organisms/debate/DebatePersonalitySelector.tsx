/**
 * DebatePersonalitySelector Organism
 * Handles personality selection for each AI in the debate (Premium feature)
 */

import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../../theme';
import { Typography, GradientButton, Button, SectionHeader } from '../../molecules';
import { AIAvatar } from '@/components/organisms/common/AIAvatar';
import { AIConfig, type DebateVoiceSelection } from '../../../types';
import type { MediaProviderVoiceOption } from '@/types/media';
import { UNIVERSAL_PERSONALITIES } from '../../../config/personalities';
// PersonalityService removed from this view to simplify UI
import PersonalityModal from './PersonalityModal';

interface DebatePersonalitySelectorProps {
  selectedTopic: string;
  customTopic: string;
  topicMode: 'preset' | 'custom' | 'surprise';
  selectedAIs: AIConfig[];
  aiPersonalities: Record<string, string>;
  onPersonalityChange: (aiId: string, personalityId: string) => void;
  onStartDebate: () => void;
  onBack: () => void;
  civility: 1|2|3|4|5;
  onChangeCivility: (v: 1|2|3|4|5) => void;
  voiceConfigAvailable?: boolean;
  voiceEnabled?: boolean;
  voiceOptions?: MediaProviderVoiceOption[];
  voiceSelections?: Record<string, DebateVoiceSelection>;
  voiceLoading?: boolean;
  voiceError?: string | null;
  onToggleVoiceEnabled?: (enabled: boolean) => void;
  onVoiceSelect?: (aiId: string, voice: MediaProviderVoiceOption) => void;
  onReloadVoices?: () => void;
}

export const DebatePersonalitySelector: React.FC<DebatePersonalitySelectorProps> = ({
  // selectedTopic,
  // customTopic,
  // topicMode,
  selectedAIs,
  aiPersonalities,
  onPersonalityChange,
  onStartDebate,
  onBack,
  civility,
  onChangeCivility,
  voiceConfigAvailable = false,
  voiceEnabled = false,
  voiceOptions = [],
  voiceSelections = {},
  voiceLoading = false,
  voiceError = null,
  onToggleVoiceEnabled,
  onVoiceSelect,
  onReloadVoices,
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeAI, setActiveAI] = useState<AIConfig | null>(null);
  const [voiceModalAI, setVoiceModalAI] = useState<AIConfig | null>(null);
  const [voiceSearch, setVoiceSearch] = useState('');

  const normalizedVoiceSearch = voiceSearch.trim().toLowerCase();
  const filteredVoiceOptions = normalizedVoiceSearch
    ? voiceOptions.filter((voice) => (
      voice.name.toLowerCase().includes(normalizedVoiceSearch) ||
      voice.description?.toLowerCase().includes(normalizedVoiceSearch) ||
      voice.category?.toLowerCase().includes(normalizedVoiceSearch)
    ))
    : voiceOptions;

  // Topic not displayed in this step per latest requirements

  return (
    <Animated.View entering={FadeIn}>
      {/* Back Button */}
      <TouchableOpacity 
        onPress={onBack}
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          marginBottom: theme.spacing.md,
        }}
      >
        <Typography variant="body" style={{ marginRight: 8 }}>←</Typography>
        <Typography variant="body" color="secondary">Back to AI Selection</Typography>
      </TouchableOpacity>
      
      <SectionHeader title="Set the Tone" subtitle="Choose personality styles for the debate" icon="🎭" />
      
      {/* Debate intensity selector under headline */}
      <View style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.colors.card, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
        <Typography variant="subtitle" weight="semibold">Debate Intensity</Typography>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.sm }}>
          <Button title="Friendly" onPress={() => onChangeCivility(1)} variant={civility === 1 ? 'primary' : 'secondary'} size="small" />
          <Button title="Neutral" onPress={() => onChangeCivility(3)} variant={civility === 3 ? 'primary' : 'secondary'} size="small" />
          <Button title="Hostile" onPress={() => onChangeCivility(5)} variant={civility === 5 ? 'primary' : 'secondary'} size="small" />
        </View>
        <Typography variant="caption" color="secondary" style={{ marginTop: 8 }}>
          Controls how confrontational the arguments are; hostile still forbids insults and personal attacks.
        </Typography>
      </View>
      
      {/* Personality Selection for Each AI (launch modal) */}
      <View style={{ gap: theme.spacing.md }}>
        {selectedAIs.map((ai) => {
          const currentPersonality = aiPersonalities[ai.id] || 'default';
          const personaMeta = UNIVERSAL_PERSONALITIES.find(p => p.id === currentPersonality) || UNIVERSAL_PERSONALITIES[0];
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
                    Selected: {personaMeta.emoji} {personaMeta.name}
                  </Typography>
                  {personaMeta.tagline && (
                    <Typography variant="caption" color="disabled">
                      {personaMeta.tagline}
                    </Typography>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setActiveAI(ai);
                  setModalVisible(true);
                }}
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: theme.colors.surface,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Typography variant="caption" weight="medium">
                  Choose Personality →
                </Typography>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {voiceConfigAvailable && (
        <View style={{ marginTop: theme.spacing.lg }}>
          <SectionHeader title="Voiced Debate" subtitle="Use your ElevenLabs key for manual playback" icon="🗣️" />
          <View style={{ backgroundColor: theme.colors.card, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Typography variant="body" weight="semibold">
                  ElevenLabs voices
                </Typography>
                <Typography variant="caption" color="secondary">
                  Your ElevenLabs account is billed for generated debate audio.
                </Typography>
              </View>
              <Button
                title={voiceEnabled ? 'On' : 'Off'}
                onPress={() => onToggleVoiceEnabled?.(!voiceEnabled)}
                variant={voiceEnabled ? 'primary' : 'secondary'}
                size="small"
              />
            </View>

            {voiceEnabled && (
              <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
                {voiceLoading && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                    <Typography variant="caption" color="secondary">
                      Loading ElevenLabs voices...
                    </Typography>
                  </View>
                )}

                {voiceError && (
                  <View style={{ gap: theme.spacing.xs }}>
                    <Typography variant="caption" style={{ color: theme.colors.error[600] }}>
                      {voiceError}
                    </Typography>
                    <Button title="Retry voices" onPress={() => onReloadVoices?.()} variant="secondary" size="small" />
                  </View>
                )}

                {!voiceLoading && !voiceError && voiceOptions.length === 0 && (
                  <View style={{ gap: theme.spacing.xs }}>
                    <Typography variant="caption" color="secondary">
                      No ElevenLabs voices were available for this key.
                    </Typography>
                    <Button title="Reload voices" onPress={() => onReloadVoices?.()} variant="secondary" size="small" />
                  </View>
                )}

                {voiceOptions.length > 0 && selectedAIs.map((ai) => {
                  const selectedVoice = voiceSelections[ai.id];
                  return (
                    <View
                      key={`voice-${ai.id}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                        paddingVertical: theme.spacing.sm,
                        borderTopWidth: 1,
                        borderTopColor: theme.colors.border,
                      }}
                    >
                      <AIAvatar
                        icon={ai.icon || ai.name.charAt(0)}
                        iconType={ai.iconType || 'letter'}
                        size="small"
                        color={ai.color}
                        isSelected={false}
                      />
                      <View style={{ flex: 1 }}>
                        <Typography variant="caption" weight="semibold">
                          {ai.name}
                        </Typography>
                        <Typography variant="caption" color="secondary">
                          {selectedVoice?.voiceName || 'Choose a voice'}
                        </Typography>
                      </View>
                      <Button
                        title="Choose"
                        onPress={() => {
                          setVoiceSearch('');
                          setVoiceModalAI(ai);
                        }}
                        variant="tonal"
                        size="small"
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Modal */}
      <PersonalityModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={(personalityId) => {
          if (activeAI) {
            onPersonalityChange(activeAI.id, personalityId);
          }
          setModalVisible(false);
        }}
        selectedPersonalityId={activeAI ? aiPersonalities[activeAI.id] || 'default' : 'default'}
        availablePersonalities={UNIVERSAL_PERSONALITIES}
        aiName={activeAI?.name}
      />

      <Modal
        visible={Boolean(voiceModalAI)}
        transparent
        animationType="fade"
        onRequestClose={() => setVoiceModalAI(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' }}>
          <View style={{ maxHeight: '78%', backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Typography variant="subtitle" weight="semibold">
                  Choose voice
                </Typography>
                <Typography variant="caption" color="secondary">
                  {voiceModalAI?.name}
                </Typography>
              </View>
              <Button title="Close" onPress={() => setVoiceModalAI(null)} variant="ghost" size="small" />
            </View>
            <TextInput
              value={voiceSearch}
              onChangeText={setVoiceSearch}
              placeholder="Search voices"
              placeholderTextColor={theme.colors.text.disabled}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 12,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.surface,
                marginBottom: theme.spacing.md,
              }}
              testID="debate-voice-search-input"
            />
            <FlatList
              data={filteredVoiceOptions}
              keyExtractor={(voice) => voice.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = voiceModalAI ? voiceSelections[voiceModalAI.id]?.voiceId === item.id : false;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (voiceModalAI) {
                        onVoiceSelect?.(voiceModalAI.id, item);
                      }
                      setVoiceModalAI(null);
                    }}
                    style={{
                      paddingVertical: theme.spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    testID={`debate-voice-option-${item.id}`}
                  >
                    <Typography variant="body" weight={selected ? 'semibold' : 'normal'}>
                      {item.name}
                    </Typography>
                    {!!(item.description || item.category) && (
                      <Typography variant="caption" color="secondary">
                        {item.description || item.category}
                      </Typography>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={(
                <Typography variant="caption" color="secondary" align="center" style={{ paddingVertical: theme.spacing.lg }}>
                  No loaded voices match this search.
                </Typography>
              )}
            />
          </View>
        </View>
      </Modal>
      
      {/* Start Debate Button */}
      <GradientButton
        title="Start Debate ⚔️"
        onPress={onStartDebate}
        gradient={theme.colors.gradients.sunset}
        fullWidth
        hapticType="medium"
        style={{ marginTop: theme.spacing.xl }}
      />
      
      {/* Secondary Back Button */}
      <Button
        title="← Back to AI Selection"
        onPress={onBack}
        variant="ghost"
        fullWidth
        style={{ marginTop: theme.spacing.md }}
      />
    </Animated.View>
  );
};
