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
import type { AIConfig, DebateVoiceSelection } from '../../../types';
import type { MediaProviderVoiceOption } from '@/types/media';
import {
  ELEVENLABS_DEFAULT_TTS_MODEL,
  ELEVENLABS_FLASH_TTS_MODEL,
  ELEVENLABS_MULTILINGUAL_TTS_MODEL,
} from '@/config/mediaProviders';
import { UNIVERSAL_PERSONALITIES } from '../../../config/personalities';
// PersonalityService removed from this view to simplify UI
import PersonalityModal from './PersonalityModal';

type VoiceModalTarget = { kind: 'debater'; ai: AIConfig } | { kind: 'mc'; ai: AIConfig };
type TeamSide = 'affirmative' | 'negative';

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
  podcastModeEnabled?: boolean;
  podcastMC?: AIConfig | null;
  podcastMCVoice?: DebateVoiceSelection;
  onPodcastMCVoiceSelect?: (voice: MediaProviderVoiceOption) => void;
  onReloadVoices?: () => void;
  ttsModelId?: string;
  onTtsModelChange?: (modelId: string) => void;
  elevenLabsCreditSummary?: string;
}

const TTS_MODEL_OPTIONS = [
  {
    id: ELEVENLABS_FLASH_TTS_MODEL,
    label: 'Flash',
    description: 'Lower-cost default for debate and podcast audio.',
  },
  {
    id: ELEVENLABS_MULTILINGUAL_TTS_MODEL,
    label: 'Multilingual',
    description: 'Higher-quality voiceover model with higher credit use.',
  },
];

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
  podcastModeEnabled = false,
  podcastMC = null,
  podcastMCVoice,
  onPodcastMCVoiceSelect,
  onReloadVoices,
  ttsModelId = ELEVENLABS_DEFAULT_TTS_MODEL,
  onTtsModelChange,
  elevenLabsCreditSummary,
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeAI, setActiveAI] = useState<AIConfig | null>(null);
  const [voiceModalTarget, setVoiceModalTarget] = useState<VoiceModalTarget | null>(null);
  const [voiceSearch, setVoiceSearch] = useState('');
  const voiceModalAI = voiceModalTarget?.ai || null;
  const voicesRequired = podcastModeEnabled;
  const showVoiceControls = voiceConfigAvailable || voicesRequired;
  const voiceControlsActive = voicesRequired || voiceEnabled;
  const voiceOptionsReady = voiceOptions.length > 0 && !voiceLoading && !voiceError;

  const normalizedVoiceSearch = voiceSearch.trim().toLowerCase();
  const filteredVoiceOptions = normalizedVoiceSearch
    ? voiceOptions.filter((voice) => (
      voice.name.toLowerCase().includes(normalizedVoiceSearch) ||
      voice.description?.toLowerCase().includes(normalizedVoiceSearch) ||
      voice.category?.toLowerCase().includes(normalizedVoiceSearch)
    ))
    : voiceOptions;

  const getSlotSide = (index: number): TeamSide => (
    selectedAIs.length <= 2
      ? index === 0 ? 'affirmative' : 'negative'
      : index % 2 === 0 ? 'affirmative' : 'negative'
  );

  const getSlotLabel = (index: number): string => {
    if (selectedAIs.length <= 2) {
      return index === 0 ? 'Affirmative 1' : 'Negative 1';
    }
    return `${index % 2 === 0 ? 'Affirmative' : 'Negative'} ${Math.floor(index / 2) + 1}`;
  };

  const slots = selectedAIs.map((ai, index) => ({
    ai,
    index,
    label: getSlotLabel(index),
    side: getSlotSide(index),
  }));

  const teamGroups = [
    {
      id: 'affirmative' as const,
      title: 'Affirmative',
      subtitle: 'Argues for the motion',
      accentColor: theme.colors.primary[500],
      slots: slots.filter(slot => slot.side === 'affirmative'),
    },
    {
      id: 'negative' as const,
      title: 'Negative',
      subtitle: 'Argues against the motion',
      accentColor: theme.colors.warning[600],
      slots: slots.filter(slot => slot.side === 'negative'),
    },
  ];

  const openVoicePicker = (target: VoiceModalTarget) => {
    if (!voiceControlsActive) {
      onToggleVoiceEnabled?.(true);
    }
    if (!voiceOptionsReady) return;
    setVoiceSearch('');
    setVoiceModalTarget(target);
  };

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
      
      <SectionHeader title="Debater Styles" subtitle="Choose each AI's personality and voice in one place" icon="🎭" />
      
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
      
      {showVoiceControls && (
        <View style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.colors.card, borderRadius: 12, borderWidth: 1, borderColor: voicesRequired ? theme.colors.primary[400] : theme.colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Typography variant="subtitle" weight="semibold">
                Debate Voices
              </Typography>
              <Typography variant="caption" color="secondary">
                {voicesRequired
                  ? 'Podcast Mode requires a voice for every debater and the MC.'
                  : 'Optional debater audio. Leave it off for text-only debate content without an MC.'}
              </Typography>
            </View>
            {voicesRequired ? (
              <View style={{ paddingHorizontal: theme.spacing.sm, paddingVertical: 6, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.primary[500] }}>
                <Typography variant="caption" weight="semibold" style={{ color: theme.colors.text.white }}>
                  Required
                </Typography>
              </View>
            ) : (
              <Button
                title={voiceEnabled ? 'On' : 'Off'}
                onPress={() => onToggleVoiceEnabled?.(!voiceEnabled)}
                variant={voiceEnabled ? 'primary' : 'secondary'}
                size="small"
              />
            )}
          </View>

          {!!elevenLabsCreditSummary && (
            <Typography variant="caption" color="secondary" style={{ marginTop: theme.spacing.sm }}>
              {elevenLabsCreditSummary}
            </Typography>
          )}

          {voiceControlsActive && (
            <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.xs }}>
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

              <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
                <Typography variant="caption" weight="semibold" color="secondary">
                  TTS Model
                </Typography>
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                  {TTS_MODEL_OPTIONS.map((model) => (
                    <Button
                      key={model.id}
                      title={model.label}
                      onPress={() => onTtsModelChange?.(model.id)}
                      variant={ttsModelId === model.id ? 'primary' : 'secondary'}
                      size="small"
                    />
                  ))}
                </View>
                <Typography variant="caption" color="secondary">
                  {TTS_MODEL_OPTIONS.find((model) => model.id === ttsModelId)?.description || TTS_MODEL_OPTIONS[0].description}
                </Typography>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={{ gap: theme.spacing.md }}>
        {teamGroups.map((team) => (
          <View
            key={team.id}
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              gap: theme.spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Typography variant="subtitle" weight="semibold">
                  {team.title}
                </Typography>
                <Typography variant="caption" color="secondary">
                  {team.subtitle}
                </Typography>
              </View>
              <View style={{ paddingHorizontal: theme.spacing.sm, paddingVertical: 6, borderRadius: theme.borderRadius.full, backgroundColor: `${team.accentColor}22` }}>
                <Typography variant="caption" weight="semibold" style={{ color: team.accentColor }}>
                  {team.slots.length}
                </Typography>
              </View>
            </View>

            {team.slots.map((slot) => {
              const { ai } = slot;
              const currentPersonality = aiPersonalities[ai.id] || 'default';
              const personaMeta = UNIVERSAL_PERSONALITIES.find(p => p.id === currentPersonality) || UNIVERSAL_PERSONALITIES[0];
              const selectedVoice = voiceSelections[ai.id];
              const voiceTitle = selectedVoice?.voiceName
                || (voicesRequired ? 'Voice required' : voiceControlsActive ? 'Choose a voice' : 'Optional, currently off');
              const voiceButtonTitle = selectedVoice
                ? 'Change Voice'
                : voiceControlsActive
                  ? 'Choose Voice'
                  : 'Enable Voice';

              return (
                <View
                  key={ai.id}
                  testID={`debater-style-card-${ai.id}`}
                  style={{
                    borderRadius: 12,
                    padding: theme.spacing.md,
                    borderWidth: 1,
                    borderColor: team.accentColor,
                    backgroundColor: theme.colors.surface,
                    gap: theme.spacing.md,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <AIAvatar
                      icon={ai.icon || ai.name.charAt(0)}
                      iconType={ai.iconType || 'letter'}
                      size="large"
                      color={ai.color}
                      isSelected={false}
                    />
                    <View style={{ flex: 1 }}>
                      <Typography variant="body" weight="semibold">
                        {ai.name}
                      </Typography>
                      <Typography variant="caption" color="secondary">
                        {slot.label}
                      </Typography>
                    </View>
                  </View>

                  <View style={{ gap: theme.spacing.xs }}>
                    <Typography variant="caption" weight="semibold" color="secondary">
                      Personality
                    </Typography>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <View style={{ flex: 1 }}>
                        <Typography variant="body" weight="medium">
                          {personaMeta.emoji} {personaMeta.name}
                        </Typography>
                        {personaMeta.tagline && (
                          <Typography variant="caption" color="secondary" numberOfLines={2}>
                            {personaMeta.tagline}
                          </Typography>
                        )}
                      </View>
                      <Button
                        title="Change"
                        onPress={() => {
                          setActiveAI(ai);
                          setModalVisible(true);
                        }}
                        variant="secondary"
                        size="small"
                      />
                    </View>
                  </View>

                  {showVoiceControls && voiceControlsActive && (
                    <View style={{ gap: theme.spacing.xs }}>
                      <Typography variant="caption" weight="semibold" color="secondary">
                        Voice {voicesRequired ? '(required)' : '(optional)'}
                      </Typography>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <Typography variant="body" weight="medium">
                            {voiceTitle}
                          </Typography>
                          <Typography variant="caption" color="secondary">
                            {voicesRequired
                              ? 'Required for the podcast playlist.'
                              : 'Use only if you want generated debater audio.'}
                          </Typography>
                        </View>
                        <Button
                          title={voiceButtonTitle}
                          onPress={() => openVoicePicker({ kind: 'debater', ai })}
                          variant={voiceControlsActive ? 'tonal' : 'secondary'}
                          size="small"
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {showVoiceControls && podcastModeEnabled && podcastMC && (
          <View
            testID="podcast-mc-voice-card"
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.primary[400],
              gap: theme.spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <AIAvatar
                icon="🎙️"
                size="large"
                color={podcastMC.color}
                isSelected={false}
              />
              <View style={{ flex: 1 }}>
                <Typography variant="subtitle" weight="semibold">
                  Podcast MC
                </Typography>
                <Typography variant="caption" color="secondary">
                  Required host voice for intros, segues, and winner announcements.
                </Typography>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Typography variant="caption" weight="semibold" color="secondary">
                  Voice (required)
                </Typography>
                <Typography variant="body" weight="medium">
                  {podcastMCVoice?.voiceName || 'Voice required'}
                </Typography>
              </View>
              <Button
                title={podcastMCVoice ? 'Change Voice' : 'Choose Voice'}
                onPress={() => openVoicePicker({ kind: 'mc', ai: podcastMC })}
                variant="tonal"
                size="small"
              />
            </View>
          </View>
        )}
      </View>

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
        visible={Boolean(voiceModalTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setVoiceModalTarget(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' }}>
          <View style={{ maxHeight: '78%', backgroundColor: theme.colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Typography variant="subtitle" weight="semibold">
                  Choose voice
                </Typography>
                <Typography variant="caption" color="secondary">
                  {voiceModalTarget?.kind === 'mc' ? 'Podcast MC' : voiceModalAI?.name}
                </Typography>
              </View>
              <Button title="Close" onPress={() => setVoiceModalTarget(null)} variant="ghost" size="small" />
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
                const selected = voiceModalTarget?.kind === 'mc'
                  ? podcastMCVoice?.voiceId === item.id
                  : voiceModalAI
                    ? voiceSelections[voiceModalAI.id]?.voiceId === item.id
                    : false;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      if (voiceModalTarget?.kind === 'mc') {
                        onPodcastMCVoiceSelect?.(item);
                      } else if (voiceModalAI) {
                        onVoiceSelect?.(voiceModalAI.id, item);
                      }
                      setVoiceModalTarget(null);
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
