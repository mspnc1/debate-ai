import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Typography, SegmentedControl, SheetHeader, InfoButton } from '@/components/molecules';
import { DebateVoicePicker } from '../debate/DebateVoicePicker';
import { CreateSheetShell } from './CreateSheetShell';
import { DiscreteSlider, OutputControlGroup } from './createControls';
import {
  ELEVENLABS_DEFAULT_VOICE_ID,
  ELEVENLABS_OUTPUT_FORMATS,
  getMediaModels,
} from '@/config/mediaProviders';
import type { HelpTopicId } from '@/config/help/types';
import type {
  ElevenLabsSharedVoiceQuery,
  ElevenLabsVoiceListQuery,
  MediaProviderModelOption,
  MediaProviderOptionsResponse,
  MediaProviderVoiceOption,
} from '@/types/media';
import type { CreateAudioOperation, CreateAudioOptions } from '@/types/createSelection';

type AudioPickerType = 'voice' | 'model' | 'format';

const AUDIO_DURATION_OPTIONS = [undefined, 1, 3, 5, 8, 10, 15, 20] as const;
const PROMPT_INFLUENCE_OPTIONS = [0.2, 0.3, 0.5, 0.7] as const;

interface AudioConfigSheetProps {
  visible: boolean;
  onClose: () => void;
  options: CreateAudioOptions;
  onChange: (patch: Partial<CreateAudioOptions>) => void;
  voices: MediaProviderVoiceOption[];
  models: MediaProviderModelOption[];
  voiceTotalCount?: number;
  loadingVoices: boolean;
  creditSummary?: string;
  elevenLabsTier?: string;
  onLoadVoices: (query: ElevenLabsVoiceListQuery) => Promise<MediaProviderOptionsResponse>;
  onLoadSharedVoices: (query: ElevenLabsSharedVoiceQuery) => Promise<MediaProviderOptionsResponse>;
  onAddSharedVoice: (voice: MediaProviderVoiceOption) => Promise<MediaProviderVoiceOption>;
  /** Keeps an externally-picked voice visible in the loaded list. */
  onVoicePicked: (voice: MediaProviderVoiceOption) => void;
  testID?: string;
}

/**
 * ElevenLabs pill config sheet: operation (voiceover / sound effect), voice,
 * model, output format, and sound-effect duration/influence — everything the
 * audio tab's settings sheet and pickers used to hold.
 */
export const AudioConfigSheet: React.FC<AudioConfigSheetProps> = ({
  visible,
  onClose,
  options,
  onChange,
  voices,
  models,
  voiceTotalCount,
  loadingVoices,
  creditSummary,
  elevenLabsTier,
  onLoadVoices,
  onLoadSharedVoices,
  onAddSharedVoice,
  onVoicePicked,
  testID,
}) => {
  const { theme, isDark } = useTheme();
  const primaryTintBackground = isDark ? theme.colors.overlays.medium : theme.colors.primary[50];
  const [picker, setPicker] = useState<AudioPickerType | null>(null);

  const { operation } = options;
  const activeModelId = operation === 'text_to_speech' ? options.ttsModelId : options.sfxModelId;

  const fallbackModels = getMediaModels('elevenlabs', operation);
  const modelsForOperation = (models.length > 0 ? models : fallbackModels).filter(model =>
    model.operations.includes(operation)
  );
  const voiceOptions: Array<{ id: string; label: string; description?: string }> =
    voices.length > 0
      ? voices.map(voice => ({
          id: voice.id,
          label: voice.name,
          description: voice.description || voice.category || undefined,
        }))
      : [{ id: ELEVENLABS_DEFAULT_VOICE_ID, label: 'Default voice' }];
  const loadedVoiceCount = voices.length || voiceOptions.length;
  const voiceCountLabel = voiceTotalCount
    ? `${loadedVoiceCount} of ${voiceTotalCount} voices loaded`
    : `${loadedVoiceCount} voice${loadedVoiceCount === 1 ? '' : 's'} loaded`;
  const selectedVoice = voiceOptions.find(voice => voice.id === options.voiceId) || voiceOptions[0];
  const selectedModel =
    modelsForOperation.find(model => model.id === activeModelId) || modelsForOperation[0];
  const selectedFormat =
    ELEVENLABS_OUTPUT_FORMATS.find(format => format.id === options.outputFormat) ||
    ELEVENLABS_OUTPUT_FORMATS[0];

  const openPicker = (next: AudioPickerType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPicker(next);
  };

  const handleOperationChange = (next: CreateAudioOperation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPicker(null);
    onChange({ operation: next });
  };

  const renderSelectorRow = ({
    label,
    value,
    description,
    onPress,
    rowTestID,
    helpTopicId,
  }: {
    label: string;
    value: string;
    description?: string;
    onPress: () => void;
    rowTestID: string;
    helpTopicId?: HelpTopicId;
  }) => (
    <View
      style={[
        styles.selectorRow,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <TouchableOpacity
        style={styles.selectorPressable}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID={rowTestID}
      >
        <View style={styles.selectorText}>
          <Typography variant="caption" color="secondary" style={styles.selectorLabel}>
            {label}
          </Typography>
          <Typography variant="body" weight="semibold">
            {value}
          </Typography>
          {description && (
            <Typography
              variant="caption"
              color="secondary"
              numberOfLines={2}
              style={styles.selectorDescription}
            >
              {description}
            </Typography>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
      </TouchableOpacity>
      {helpTopicId && <InfoButton topicId={helpTopicId} size="small" />}
    </View>
  );

  const renderPickerModal = ({
    pickerType,
    title,
    pickerOptions,
    selectedId,
    onSelect,
  }: {
    pickerType: AudioPickerType;
    title: string;
    pickerOptions: Array<{ id: string; label: string; description?: string }>;
    selectedId: string;
    onSelect: (id: string) => void;
  }) => {
    if (picker !== pickerType) return null;

    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.pickerOverlay} testID="create-audio-picker-modal">
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setPicker(null)}
            accessibilityRole="button"
            accessibilityLabel="Close picker"
          />
          <View style={[styles.pickerSheet, { backgroundColor: theme.colors.background }]}>
            <SheetHeader title={title} onClose={() => setPicker(null)} showHandle />
            <FlatList
              data={pickerOptions}
              keyExtractor={option => option.id}
              style={styles.pickerList}
              contentContainerStyle={styles.pickerListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={24}
              windowSize={8}
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <Typography variant="body" color="secondary" style={{ textAlign: 'center' }}>
                    No options available.
                  </Typography>
                </View>
              }
              renderItem={({ item: option }) => {
                const selected = option.id === selectedId;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.pickerOption,
                      {
                        backgroundColor: selected ? primaryTintBackground : theme.colors.surface,
                        borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      onSelect(option.id);
                      setPicker(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    testID={`create-audio-picker-option-${option.id}`}
                  >
                    <View style={styles.pickerOptionText}>
                      <Typography variant="body" weight="semibold">
                        {option.label}
                      </Typography>
                      {option.description && (
                        <Typography variant="caption" color="secondary" numberOfLines={2}>
                          {option.description}
                        </Typography>
                      )}
                    </View>
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={theme.colors.primary[500]}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const stackedModals = (
    <>
      <DebateVoicePicker
        visible={picker === 'voice'}
        target={{ kind: 'single', label: 'Voiceover' }}
        currentVoiceId={options.voiceId}
        elevenLabsTier={elevenLabsTier}
        onClose={() => setPicker(null)}
        onLoadVoices={onLoadVoices}
        onLoadSharedVoices={onLoadSharedVoices}
        onAddSharedVoice={onAddSharedVoice}
        onSelectVoice={voice => {
          onChange({ voiceId: voice.id, voiceName: voice.name });
          onVoicePicked(voice);
        }}
      />
      {renderPickerModal({
        pickerType: 'model',
        title: 'Select Model',
        pickerOptions: modelsForOperation.map(model => ({
          id: model.id,
          label: model.label,
          description: model.description,
        })),
        selectedId: activeModelId,
        onSelect: modelId =>
          onChange(
            operation === 'text_to_speech' ? { ttsModelId: modelId } : { sfxModelId: modelId }
          ),
      })}
      {renderPickerModal({
        pickerType: 'format',
        title: 'Select Format',
        pickerOptions: ELEVENLABS_OUTPUT_FORMATS.map(format => ({
          id: format.id,
          label: format.label,
        })),
        selectedId: options.outputFormat,
        onSelect: outputFormat => onChange({ outputFormat }),
      })}
    </>
  );

  return (
    <CreateSheetShell
      visible={visible}
      title="ElevenLabs"
      onClose={onClose}
      stackedModals={stackedModals}
      testID={testID}
    >
      {creditSummary && (
        <Typography variant="caption" color="secondary">
          {creditSummary}
        </Typography>
      )}

      <OutputControlGroup label="Audio mode" helpTopicId="create-audio-mode">
        <SegmentedControl
          fullWidth
          options={[
            { label: 'Voiceover', value: 'text_to_speech' },
            { label: 'Sound effect', value: 'sound_effect' },
          ]}
          value={operation}
          onChange={next => handleOperationChange(next as CreateAudioOperation)}
        />
      </OutputControlGroup>

      {operation === 'text_to_speech' &&
        renderSelectorRow({
          label: loadingVoices ? 'Voice · loading…' : `Voice · ${voiceCountLabel}`,
          value: options.voiceName || selectedVoice?.label || 'Default voice',
          description: selectedVoice?.description,
          onPress: () => openPicker('voice'),
          rowTestID: 'create-audio-voice-selector',
          helpTopicId: 'create-audio-voice',
        })}

      {renderSelectorRow({
        label: 'Model',
        value: selectedModel?.label || 'Default model',
        description: selectedModel?.description,
        onPress: () => openPicker('model'),
        rowTestID: 'create-audio-model-selector',
        helpTopicId: 'create-audio-model',
      })}

      {renderSelectorRow({
        label: 'Format',
        value: selectedFormat.label,
        onPress: () => openPicker('format'),
        rowTestID: 'create-audio-format-selector',
        helpTopicId: 'create-audio-format',
      })}

      {operation === 'sound_effect' && (
        <>
          <OutputControlGroup label="Duration" helpTopicId="create-audio-duration">
            <DiscreteSlider
              options={AUDIO_DURATION_OPTIONS}
              value={options.durationSeconds}
              getLabel={duration => (duration === undefined ? 'Auto duration' : `${duration}s`)}
              onChange={durationSeconds => onChange({ durationSeconds })}
              testID="create-audio-duration-slider"
            />
          </OutputControlGroup>
          <OutputControlGroup label="Prompt influence" helpTopicId="create-audio-influence">
            <DiscreteSlider
              options={PROMPT_INFLUENCE_OPTIONS}
              value={options.promptInfluence}
              getLabel={value => `Influence ${value}`}
              onChange={promptInfluence => onChange({ promptInfluence })}
              testID="create-audio-influence-slider"
            />
          </OutputControlGroup>
        </>
      )}
    </CreateSheetShell>
  );
};

const styles = StyleSheet.create({
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  selectorPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorText: {
    flex: 1,
  },
  selectorLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorDescription: {
    marginTop: 2,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  pickerSheet: {
    maxHeight: '76%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  pickerList: {
    paddingHorizontal: 16,
  },
  pickerListContent: {
    paddingTop: 12,
    paddingBottom: 32,
    gap: 8,
  },
  pickerEmpty: {
    paddingVertical: 32,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  pickerOptionText: {
    flex: 1,
  },
});

export default AudioConfigSheet;
