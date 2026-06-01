import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setAIPersonality, setAIModel, preserveTopic, clearPreservedTopic, setGlobalStreaming, isApiKeyConfigured } from '../store';
import { setProviderStreamingPreference } from '../store/streamingSlice';

import { Box, ResponsiveContainer } from '../components/atoms';
import { Button, Typography, GradientButton, InfoButton } from '../components/molecules';
import { useResponsive } from '../hooks/useResponsive';
import { Header, HeaderActions } from '../components/organisms';
// Legacy premium gating replaced by useFeatureAccess
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import {
  DebateTopicSelector,
  DebateAISelector,
  DebatePersonalitySelector,
  DebateStepIndicator,
} from '../components/organisms/debate';

import { useTheme } from '../theme';
import { AIConfig, type DebateVoiceConfig, type DebateVoiceSelection } from '../types';
import type { ElevenLabsSharedVoiceQuery, ElevenLabsVoiceListQuery, MediaProviderOptionsResponse, MediaProviderVoiceOption } from '@/types/media';
import type { DemoDebate } from '@/types/demo';
import { AI_PROVIDERS } from '../config/aiProviders';
import { FormatModal } from '../components/organisms/debate/FormatModal';
import { TopicService } from '../services/debate/TopicService';
import { getProviderDefaultModel, resolveProviderModelId } from '@/config/modelConfigs';
import { getAIProviderIcon } from '../utils/aiProviderAssets';
import { isValidProviderId } from '../utils/typeGuards';
// import { DEBATE_TOPICS } from '../constants/debateTopics';
import { usePreDebateValidation } from '../hooks/debate';
import { Card } from '@/components/molecules';
import { FORMATS, getPresetForFormat, getPresetIdForRounds, type DebateFormatId, type PresetConfig } from '../config/debate/formats';
import { TrialBanner } from '@/components/molecules/subscription/TrialBanner';
import { DemoBanner } from '@/components/molecules/subscription/DemoBanner';
import { showSheet } from '@/store';
import { RecordController } from '@/services/demo/RecordController';
import { DebateRecordPickerModal } from '@/components/organisms/demo/DebateRecordPickerModal';
import { DemoDebatePickerModal } from '@/components/organisms/demo/DemoDebatePickerModal';
import { DemoContentService } from '@/services/demo/DemoContentService';
import APIKeyService from '@/services/APIKeyService';
import MediaGenerationService from '@/services/media/MediaGenerationService';
import { ErrorService } from '@/services/errors/ErrorService';
import { ELEVENLABS_DEFAULT_TTS_MODEL } from '@/config/mediaProviders';
import {
  formatElevenLabsCreditSummary,
  type ElevenLabsSubscriptionInfo,
} from '@/services/media/elevenLabsCredits';

interface DebateSetupScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route?: {
    params?: {
      preselectedAIs?: AIConfig[];
      prefilledTopic?: string;
      resetDebateSetup?: boolean;
      resetKey?: string;
    };
  };
}

const PRESET_BUTTON_LABELS: Record<string, string> = {
  short: 'Short',
  standard: 'Standard',
  long: 'Extended',
};

const DEFAULT_DEBATE_VOICE_QUERY: ElevenLabsVoiceListQuery = {
  pageSize: 50,
  includeTotalCount: true,
  includeModels: false,
  sort: 'name',
  sortDirection: 'asc',
  voiceType: 'non-community',
};

function getDebateVoiceSourceRank(voice: MediaProviderVoiceOption): number {
  if (voice.sourceVoiceType === 'non-community' || voice.isOwner || voice.is_owner) return 0;
  if (voice.sourceVoiceType === 'saved' || voice.isBookmarked || voice.is_bookmarked) return 1;
  if (voice.sourceVoiceType === 'default') return 2;
  return 3;
}

function getDebateVoiceRoleRank(voice: MediaProviderVoiceOption, role: 'debater' | 'mc'): number {
  if (role === 'mc') {
    if (voice.category === 'professional') return 0;
    if (voice.category === 'premade') return 1;
  }
  if (voice.category === 'cloned' || voice.category === 'generated') return 0;
  if (voice.category === 'professional') return 1;
  if (voice.category === 'premade') return 2;
  return 3;
}

function sortDebateVoicesForRole(
  voices: MediaProviderVoiceOption[],
  role: 'debater' | 'mc'
): MediaProviderVoiceOption[] {
  return [...voices].sort((a, b) => (
    getDebateVoiceSourceRank(a) - getDebateVoiceSourceRank(b)
    || getDebateVoiceRoleRank(a, role) - getDebateVoiceRoleRank(b, role)
    || a.name.localeCompare(b.name)
  ));
}

function mergeDebateVoiceOptions(
  existing: MediaProviderVoiceOption[],
  incoming: MediaProviderVoiceOption[]
): MediaProviderVoiceOption[] {
  const voicesById = new Map(existing.map((voice) => [voice.id, voice]));
  incoming.forEach((voice) => {
    const current = voicesById.get(voice.id);
    if (!current) {
      voicesById.set(voice.id, voice);
      return;
    }

    const preferIncomingSource = getDebateVoiceSourceRank(voice) <= getDebateVoiceSourceRank(current);
    voicesById.set(voice.id, {
      ...current,
      ...voice,
      sourceVoiceType: preferIncomingSource ? voice.sourceVoiceType : current.sourceVoiceType,
    });
  });
  return sortDebateVoicesForRole(Array.from(voicesById.values()), 'debater');
}

type PresetFlowStep = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const getPresetFlowSteps = (formatId: DebateFormatId, preset: PresetConfig): PresetFlowStep[] => {
  if (preset.voteModel === 'audience_stance') {
    return [
      { label: 'Opening stance', icon: 'person-circle-outline' },
      {
        label: preset.audienceQuestionCheckpoint ? 'Audience Q&A' : 'Speeches',
        icon: preset.audienceQuestionCheckpoint ? 'chatbubbles-outline' : 'mic-outline',
      },
      { label: 'Final vote', icon: 'flag-outline' },
    ];
  }

  const includesCrossExamination = preset.messages.some((message) => message.phase === 'cross_examination');

  if (formatId === 'lincoln_douglas') {
    return [
      { label: 'Constructives', icon: 'book-outline' },
      ...(includesCrossExamination ? [{ label: 'Cross-examination', icon: 'help-circle-outline' } as PresetFlowStep] : []),
      { label: 'Value rebuttals', icon: 'scale-outline' },
      { label: 'Final ballot', icon: 'checkmark-circle-outline' },
    ];
  }

  if (formatId === 'policy') {
    return [
      { label: 'Plan case', icon: 'document-text-outline' },
      ...(includesCrossExamination ? [{ label: 'Cross-examination', icon: 'help-circle-outline' } as PresetFlowStep] : []),
      { label: 'Rebuttal block', icon: 'git-compare-outline' },
      { label: '2AR ballot', icon: 'checkmark-circle-outline' },
    ];
  }

  return preset.messages
    .filter((message) => message.voteAfter)
    .map((message): PresetFlowStep => ({
      label: message.votingLabel || message.label,
      icon: 'checkmark-circle-outline',
    }));
};

const getPresetParticipationSummary = (formatId: DebateFormatId, preset: PresetConfig): string => {
  if (preset.voteModel === 'audience_stance') {
    return preset.audienceQuestionCheckpoint
      ? 'Vote before the debate, ask one question per side, then cast the final ballot.'
      : 'Choose an opening stance, hear the speeches, then cast the final ballot.';
  }

  if (formatId === 'lincoln_douglas') {
    return 'Judge the value clash as each side defines, tests, and weighs its criterion.';
  }

  if (formatId === 'policy') {
    return 'Track the plan, burdens, solvency, impacts, and final ballot story.';
  }

  const momentText = preset.voteCount === 1 ? 'moment' : 'moments';
  return `Judge ${preset.voteCount} ${momentText} as the round develops.`;
};

const DEBATE_SLOT_ID_MARKER = '-debater-slot-';

const isDebateSlotId = (id: string): boolean => id.includes(DEBATE_SLOT_ID_MARKER);

const createDebateSlotId = (provider: AIConfig['provider'], counter: number): string =>
  `${provider}${DEBATE_SLOT_ID_MARKER}${Date.now()}-${counter}`;

const getBaseProviderName = (ai: AIConfig, configuredAIs: AIConfig[]): string =>
  configuredAIs.find((configured) => configured.provider === ai.provider)?.name || ai.name.replace(/\s+\d+$/, '');

const normalizeDebateSlotNames = (ais: AIConfig[], configuredAIs: AIConfig[]): AIConfig[] => {
  const providerCounts = ais.reduce<Record<string, number>>((acc, ai) => {
    acc[ai.provider] = (acc[ai.provider] || 0) + 1;
    return acc;
  }, {});
  const seenCounts: Record<string, number> = {};

  return ais.map((ai) => {
    const baseName = getBaseProviderName(ai, configuredAIs);
    if ((providerCounts[ai.provider] || 0) <= 1) {
      return { ...ai, name: baseName };
    }

    seenCounts[ai.provider] = (seenCounts[ai.provider] || 0) + 1;
    return { ...ai, name: `${baseName} ${seenCounts[ai.provider]}` };
  });
};

type DebaterSlot = AIConfig | null;
type PendingSelectionTarget = { kind: 'debater'; index: number } | { kind: 'mc' };

const getRequiredDebaterCountForPreset = (preset: PresetConfig): number => (preset.teamSize || 1) * 2;

const normalizeDebateSlots = (slots: DebaterSlot[], configuredAIs: AIConfig[]): DebaterSlot[] => {
  const filledSlots = slots.filter((slot): slot is AIConfig => Boolean(slot));
  const normalizedFilledSlots = normalizeDebateSlotNames(filledSlots, configuredAIs);
  let filledIndex = 0;

  return slots.map((slot) => {
    if (!slot) return null;
    const normalized = normalizedFilledSlots[filledIndex];
    filledIndex += 1;
    return normalized || slot;
  });
};

const buildDebaterSlotsFromAIs = (
  ais: AIConfig[],
  slotCount: number,
  configuredAIs: AIConfig[],
): DebaterSlot[] => {
  const normalizedAIs = normalizeDebateSlotNames(ais.slice(0, slotCount), configuredAIs);
  return Array.from({ length: slotCount }, (_, index) => normalizedAIs[index] || null);
};

const DEFAULT_DEBATER_SLOT_COUNT = getRequiredDebaterCountForPreset(
  getPresetForFormat('oxford', getPresetIdForRounds(3))
);

const DebateSetupScreen: React.FC<DebateSetupScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const scrollViewRef = useRef<ScrollView>(null);
  const debaterSlotCounterRef = useRef(0);
  const currentScrollYRef = useRef(0);
  const selectionReturnScrollYRef = useRef<number | null>(null);
  const handledResetKeyRef = useRef<string | null>(null);
  const { rs } = useResponsive();
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const verifiedProviders = useSelector((state: RootState) => state.settings.verifiedProviders || []);
  const expertMode = useSelector((state: RootState) => state.settings.expertMode || {});
  const aiPersonalities = useSelector((state: RootState) => state.chat.aiPersonalities);
  const selectedModelsFromStore = useSelector((state: RootState) => state.chat.selectedModels);
  const preservedTopic = useSelector((state: RootState) => state.debateStats.preservedTopic);
  const preservedTopicMode = useSelector((state: RootState) => state.debateStats.preservedTopicMode);
  const access = useFeatureAccess();
  const streamingState = useSelector((state: RootState) => state.streaming);
  const recordModeEnabled = useSelector((state: RootState) => state.settings.recordModeEnabled ?? false);
  
  // Pre-debate validation (no side effects - just state)
  const validation = usePreDebateValidation();
  const routeParams = route?.params;
  
  // Get configured AIs based on which ones have API keys
  const configuredAIs = useMemo(() => {
    const DEMO_ALLOWED = new Set(['claude', 'openai', 'google']);
    const isDemo = access.isDemo;
    const providers = isDemo
      ? AI_PROVIDERS.filter(p => p.enabled && DEMO_ALLOWED.has(p.id))
      : AI_PROVIDERS.filter(provider => provider.enabled && isApiKeyConfigured(apiKeys[provider.id]));

    return providers.map(provider => {
      const iconData = getAIProviderIcon(provider.id);
      const providerDefault = isDemo
        ? ({ google: 'gemini-3.5-flash', openai: 'gpt-5', claude: 'opus-4.1' } as Record<string, string>)[provider.id] || ''
        : (getProviderDefaultModel(provider.id)?.id || '');
      const expertCfg = (expertMode as Record<string, { enabled?: boolean; selectedModel?: string }>)[provider.id];
      const defaultModel = (!isDemo && expertCfg?.enabled && expertCfg.selectedModel)
        ? (resolveProviderModelId(provider.id, expertCfg.selectedModel) || providerDefault)
        : providerDefault;
      return {
        id: provider.id,
        provider: provider.id,
        name: provider.name,
        model: defaultModel,
        personality: 'default',
        avatar: iconData.icon,
        icon: iconData.icon,
        iconType: iconData.iconType,
        color: provider.color,
      } as AIConfig;
    });
  }, [apiKeys, expertMode, access.isDemo]);

  const [currentStep, setCurrentStep] = useState<'topic' | 'ai' | 'personality'>('topic');
  const [debaterSlots, setDebaterSlots] = useState<DebaterSlot[]>(
    buildDebaterSlotsFromAIs((routeParams?.preselectedAIs || [])
      .filter(ai => isValidProviderId(ai.provider))
      .map((ai, index) => ({
        ...ai,
        id: isDebateSlotId(ai.id) ? ai.id : createDebateSlotId(ai.provider, index),
        model: selectedModelsFromStore?.[ai.id] || selectedModelsFromStore?.[ai.provider] || ai.model,
        personality: ai.personality || 'default',
      })), DEFAULT_DEBATER_SLOT_COUNT, configuredAIs)
  );
  const debaterSlotsRef = useRef<DebaterSlot[]>(debaterSlots);
  const [selectedTopic, setSelectedTopic] = useState<string>(routeParams?.prefilledTopic || preservedTopic || '');
  const [customTopic, setCustomTopic] = useState(
    routeParams?.prefilledTopic || (preservedTopicMode === 'custom' ? (preservedTopic || '') : '')
  );
  const [topicMode, setTopicMode] = useState<'preset' | 'custom' | 'surprise'>(preservedTopicMode || 'preset');
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>(selectedModelsFromStore || {});
  // New configuration toggles
  const [formatId, setFormatId] = useState<DebateFormatId>('oxford');
  const [exchanges, setExchanges] = useState<number>(3);
  // Removed: category/preset inline picker (using DebateTopicSelector instead)
  const [civility, setCivility] = useState<1|2|3|4|5>(3);
  const [formatModalVisible, setFormatModalVisible] = useState(false);
  // Removed category UI for now to prioritize proven UX
  const [recordPickerVisible, setRecordPickerVisible] = useState(false);
  const [recordMeta, setRecordMeta] = useState<{
    aiConfigs: AIConfig[];
    defaultTopic: string;
    providersKey: string;
    personaKey: string;
    voiceConfig?: DebateVoiceConfig;
  } | null>(null);
  const [demoPickerVisible, setDemoPickerVisible] = useState(false);
  const [demoSamplesLoading, setDemoSamplesLoading] = useState(false);
  const [demoSamples, setDemoSamples] = useState<Array<{ id: string; title: string; topic: string }>>([]);
  const [demoMeta, setDemoMeta] = useState<{
    aiConfigs: AIConfig[];
    personaKey: string;
  } | null>(null);
  const [voiceDebateEnabled, setVoiceDebateEnabled] = useState(false);
  const [podcastModeEnabled, setPodcastModeEnabled] = useState(false);
  const [podcastMC, setPodcastMC] = useState<AIConfig | null>(null);
  const [podcastMCVoice, setPodcastMCVoice] = useState<DebateVoiceSelection | undefined>(undefined);
  const [debateTtsModelId, setDebateTtsModelId] = useState(ELEVENLABS_DEFAULT_TTS_MODEL);
  const [pendingSelectionTarget, setPendingSelectionTarget] = useState<PendingSelectionTarget | null>(null);
  const teamGridYRef = useRef(0);
  const providerSelectorYRef = useRef(0);
  const [debateVoiceOptions, setDebateVoiceOptions] = useState<MediaProviderVoiceOption[]>([]);
  const [debateVoiceSelections, setDebateVoiceSelections] = useState<Record<string, DebateVoiceSelection>>({});
  const [debateVoicesLoading, setDebateVoicesLoading] = useState(false);
  const [debateVoiceError, setDebateVoiceError] = useState<string | null>(null);
  const [debateVoicesLoadAttempted, setDebateVoicesLoadAttempted] = useState(false);
  const [elevenLabsSubscription, setElevenLabsSubscription] = useState<ElevenLabsSubscriptionInfo | undefined>();
  const [elevenLabsSubscriptionLoading, setElevenLabsSubscriptionLoading] = useState(false);

  const presetOptions = useMemo(() => [3, 5, 7].map((rounds) => ({
    rounds,
    preset: getPresetForFormat(formatId, getPresetIdForRounds(rounds)),
  })), [formatId]);
  const selectedPreset = getPresetForFormat(formatId, getPresetIdForRounds(exchanges));
  const requiredDebaterCount = getRequiredDebaterCountForPreset(selectedPreset);
  const presetFlowSteps = useMemo(() => getPresetFlowSteps(formatId, selectedPreset), [formatId, selectedPreset]);
  const presetParticipationSummary = useMemo(() => getPresetParticipationSummary(formatId, selectedPreset), [formatId, selectedPreset]);
  const presetFlowLabel = selectedPreset.voteModel === 'audience_stance' ? 'Your role' : 'Judge focus';
  const presetUnitLabel = selectedPreset.voteModel === 'audience_stance' && !selectedPreset.audienceQuestionCheckpoint
    ? 'speeches'
    : 'turns';
  const presetVoteLabel = selectedPreset.voteModel === 'audience_stance'
    ? 'Audience votes'
    : `${selectedPreset.voteCount} judge ${selectedPreset.voteCount === 1 ? 'moment' : 'moments'}`;
  const selectedPresetTitle = formatId === 'oxford'
    ? `${selectedPreset.label} Oxford`
    : selectedPreset.label;
  
  const maxAIs = requiredDebaterCount;
  const selectedAIs = useMemo(
    () => debaterSlots.filter((slot): slot is AIConfig => Boolean(slot)).slice(0, maxAIs),
    [debaterSlots, maxAIs],
  );
  const areRequiredDebaterSlotsFilled = useMemo(
    () => {
      const requiredSlots = debaterSlots.slice(0, maxAIs);
      return requiredSlots.length === maxAIs && requiredSlots.every(Boolean);
    },
    [debaterSlots, maxAIs],
  );
  const hasVerifiedElevenLabs = isApiKeyConfigured(apiKeys.elevenlabs) && verifiedProviders.includes('elevenlabs');
  const elevenLabsCreditSummary = formatElevenLabsCreditSummary(elevenLabsSubscription, elevenLabsSubscriptionLoading);
  const selectedStreamingProviders = useMemo(() => {
    const seen = new Set<string>();
    return selectedAIs.filter((ai) => {
      if (seen.has(ai.provider)) return false;
      seen.add(ai.provider);
      return true;
    });
  }, [selectedAIs]);

  useEffect(() => {
    debaterSlotsRef.current = debaterSlots;
  }, [debaterSlots]);

  useEffect(() => {
    debaterSlotsRef.current.slice(maxAIs).forEach((slot) => {
      if (!slot) return;
      setSelectedModels(prev => {
        if (!(slot.id in prev)) return prev;
        const next = { ...prev };
        delete next[slot.id];
        return next;
      });
      setDebateVoiceSelections(prev => {
        if (!(slot.id in prev)) return prev;
        const next = { ...prev };
        delete next[slot.id];
        return next;
      });
      dispatch(setAIPersonality({ aiId: slot.id, personalityId: 'default' }));
    });
    setDebaterSlots((current) => {
      const resized = Array.from({ length: maxAIs }, (_, index) => current[index] || null);
      return normalizeDebateSlots(resized, configuredAIs);
    });
  }, [configuredAIs, dispatch, maxAIs]);

  const loadDebateVoices = useCallback(async (
    query: ElevenLabsVoiceListQuery = DEFAULT_DEBATE_VOICE_QUERY
  ): Promise<MediaProviderOptionsResponse> => {
    if (!hasVerifiedElevenLabs) {
      throw new Error('Add and verify an ElevenLabs API key before loading voices.');
    }
    try {
      setDebateVoicesLoadAttempted(true);
      setDebateVoicesLoading(true);
      setDebateVoiceError(null);
      const key = await APIKeyService.getKey('elevenlabs');
      if (!key) {
        throw new Error('Add an ElevenLabs API key before enabling voiced debates.');
      }
      const options = await MediaGenerationService.listElevenLabsOptions(key, query);
      const voices = (options.voices || []).map((voice) => ({
        ...voice,
        sourceVoiceType: voice.sourceVoiceType || query.voiceType,
      }));
      setDebateVoiceOptions((current) => mergeDebateVoiceOptions(current, voices));
      return {
        ...options,
        voices,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load ElevenLabs voices.';
      setDebateVoiceError(message);
      ErrorService.handleWithToast(error, { feature: 'debate', provider: 'elevenlabs' });
      throw error;
    } finally {
      setDebateVoicesLoading(false);
    }
  }, [hasVerifiedElevenLabs]);

  const loadDebateSharedVoices = useCallback(async (
    query: ElevenLabsSharedVoiceQuery = {}
  ): Promise<MediaProviderOptionsResponse> => {
    if (!hasVerifiedElevenLabs) {
      throw new Error('Add and verify an ElevenLabs API key before browsing community voices.');
    }
    const key = await APIKeyService.getKey('elevenlabs');
    if (!key) {
      throw new Error('Add an ElevenLabs API key before browsing community voices.');
    }
    return MediaGenerationService.listElevenLabsSharedVoices(key, query);
  }, [hasVerifiedElevenLabs]);

  const addDebateSharedVoice = useCallback(async (
    voice: MediaProviderVoiceOption
  ): Promise<MediaProviderVoiceOption> => {
    const publicOwnerId = voice.publicOwnerId || voice.public_owner_id;
    if (!publicOwnerId) {
      throw new Error('This community voice cannot be added to your library.');
    }
    const key = await APIKeyService.getKey('elevenlabs');
    if (!key) {
      throw new Error('Add an ElevenLabs API key before adding voices.');
    }
    try {
      const newVoiceId = await MediaGenerationService.addElevenLabsSharedVoice(
        key,
        publicOwnerId,
        voice.id,
        voice.name
      );
      // The added voice now lives in the account library with a new id usable for TTS.
      const addedVoice: MediaProviderVoiceOption = {
        ...voice,
        id: newVoiceId,
        voice_id: newVoiceId,
        isCommunity: false,
        sourceVoiceType: 'personal',
        isAddedByUser: true,
        is_added_by_user: true,
      };
      setDebateVoiceOptions((current) => mergeDebateVoiceOptions(current, [addedVoice]));
      return addedVoice;
    } catch (error) {
      ErrorService.handleWithToast(error, { feature: 'debate', provider: 'elevenlabs' });
      throw error;
    }
  }, []);

  const loadInitialDebateVoices = useCallback(async () => {
    const preferredSources: ElevenLabsVoiceListQuery[] = [
      DEFAULT_DEBATE_VOICE_QUERY,
      { ...DEFAULT_DEBATE_VOICE_QUERY, voiceType: 'saved' },
      { ...DEFAULT_DEBATE_VOICE_QUERY, voiceType: 'default' },
    ];

    for (const query of preferredSources) {
      const options = await loadDebateVoices(query);
      if ((options.voices || []).length > 0) return options;
    }

    return {
      success: true,
      providerId: 'elevenlabs',
      voices: [],
      voiceHasMore: false,
      voiceNextPageToken: null,
    } as MediaProviderOptionsResponse;
  }, [loadDebateVoices]);

  useEffect(() => {
    if (!hasVerifiedElevenLabs) {
      setVoiceDebateEnabled(false);
      setDebateVoiceSelections({});
      setPodcastMCVoice(undefined);
      setDebateVoicesLoadAttempted(false);
      return;
    }
    if (
      currentStep === 'personality'
      && debateVoiceOptions.length === 0
      && !debateVoicesLoading
      && !debateVoicesLoadAttempted
    ) {
      void loadInitialDebateVoices().catch(() => {});
    }
  }, [
    currentStep,
    debateVoiceOptions.length,
    debateVoicesLoadAttempted,
    debateVoicesLoading,
    hasVerifiedElevenLabs,
    loadInitialDebateVoices,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!hasVerifiedElevenLabs || currentStep !== 'personality') {
      setElevenLabsSubscription(undefined);
      setElevenLabsSubscriptionLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setElevenLabsSubscriptionLoading(true);
    APIKeyService.getKey('elevenlabs')
      .then((key) => key ? MediaGenerationService.getElevenLabsSubscription(key) : undefined)
      .then((subscription) => {
        if (!cancelled) setElevenLabsSubscription(subscription);
      })
      .catch(() => {
        if (!cancelled) setElevenLabsSubscription(undefined);
      })
      .finally(() => {
        if (!cancelled) setElevenLabsSubscriptionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentStep, hasVerifiedElevenLabs]);

  useEffect(() => {
    if (!hasVerifiedElevenLabs || debateVoiceOptions.length === 0) return;
    setDebateVoiceSelections((current) => {
      const next: Record<string, DebateVoiceSelection> = {};
      const sortedVoices = sortDebateVoicesForRole(debateVoiceOptions, 'debater');
      const usedVoiceIds = new Set<string>();
      selectedAIs.forEach((ai, index) => {
        const existing = current[ai.id];
        if (existing) {
          next[ai.id] = existing;
          usedVoiceIds.add(existing.voiceId);
          return;
        }
        const fallbackVoice = sortedVoices.find((voice) => !usedVoiceIds.has(voice.id))
          || sortedVoices[index % sortedVoices.length];
        if (fallbackVoice) {
          usedVoiceIds.add(fallbackVoice.id);
          next[ai.id] = {
            voiceId: fallbackVoice.id,
            voiceName: fallbackVoice.name,
          };
        }
      });

      const currentKeys = Object.keys(current).sort().join('|');
      const nextKeys = Object.keys(next).sort().join('|');
      if (currentKeys === nextKeys && Object.keys(next).every((key) => current[key]?.voiceId === next[key]?.voiceId)) {
        return current;
      }
      return next;
    });
  }, [debateVoiceOptions, hasVerifiedElevenLabs, selectedAIs]);

  useEffect(() => {
    if (!podcastModeEnabled || !hasVerifiedElevenLabs || debateVoiceOptions.length === 0) return;
    setPodcastMCVoice((current) => {
      if (current) return current;
      const debaterVoiceIds = new Set(Object.values(debateVoiceSelections).map((selection) => selection.voiceId));
      const sortedVoices = sortDebateVoicesForRole(debateVoiceOptions, 'mc');
      const fallbackVoice = sortedVoices.find((voice) => !debaterVoiceIds.has(voice.id)) || sortedVoices[0];
      return fallbackVoice ? {
        voiceId: fallbackVoice.id,
        voiceName: fallbackVoice.name,
      } : current;
    });
  }, [debateVoiceOptions, debateVoiceSelections, hasVerifiedElevenLabs, podcastModeEnabled]);

  const handleVoiceDebateToggle = useCallback((enabled: boolean) => {
    setVoiceDebateEnabled(enabled);
    if (enabled && debateVoiceOptions.length === 0) {
      void loadInitialDebateVoices().catch(() => {});
    }
  }, [debateVoiceOptions.length, loadInitialDebateVoices]);

  const handlePodcastModeToggle = useCallback((enabled: boolean) => {
    setPodcastModeEnabled(enabled);
    if (enabled) {
      setVoiceDebateEnabled(true);
      if (debateVoiceOptions.length === 0) {
        void loadInitialDebateVoices().catch(() => {});
      }
    } else {
      setPendingSelectionTarget((current) => current?.kind === 'mc' ? null : current);
      setPodcastMC(null);
      setPodcastMCVoice(undefined);
    }
  }, [debateVoiceOptions.length, loadInitialDebateVoices]);

  const handleDebateVoiceSelect = useCallback((aiId: string, voice: MediaProviderVoiceOption) => {
    setDebateVoiceSelections((current) => ({
      ...current,
      [aiId]: {
        voiceId: voice.id,
        voiceName: voice.name,
      },
    }));
  }, []);

  const handlePodcastMCVoiceSelect = useCallback((voice: MediaProviderVoiceOption) => {
    setPodcastMCVoice({
      voiceId: voice.id,
      voiceName: voice.name,
    });
  }, []);

  const buildDebateVoiceConfig = useCallback((): DebateVoiceConfig | undefined => {
    if ((!voiceDebateEnabled && !podcastModeEnabled) || !hasVerifiedElevenLabs) return undefined;
    const debaterVoices: Record<string, DebateVoiceSelection> = {};
    selectedAIs.forEach((ai) => {
      const selection = debateVoiceSelections[ai.id];
      if (selection) {
        debaterVoices[ai.id] = selection;
      }
    });

    return {
      enabled: true,
      providerId: 'elevenlabs',
      ttsModelId: debateTtsModelId,
      debaterVoices,
      ...(podcastModeEnabled && podcastMC && podcastMCVoice ? {
        podcast: {
          enabled: true,
          scriptMode: 'byok_ai',
          outputMode: 'playlist',
          mc: {
            id: podcastMC.id,
            provider: podcastMC.provider,
            name: podcastMC.name,
            model: resolveProviderModelId(podcastMC.provider, selectedModels[podcastMC.id] || selectedModels[podcastMC.provider] || podcastMC.model) || podcastMC.model,
          },
          mcVoice: podcastMCVoice,
        },
      } : {}),
    };
  }, [
    debateTtsModelId,
    debateVoiceSelections,
    hasVerifiedElevenLabs,
    podcastMC,
    podcastMCVoice,
    podcastModeEnabled,
    selectedAIs,
    selectedModels,
    voiceDebateEnabled,
  ]);

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

  const scrollSetupToTop = useCallback((animated = false) => {
    scrollViewRef.current?.scrollTo({ y: 0, animated });
  }, []);

  useEffect(() => {
    if (currentStep !== 'ai') return;

    const scrollTimer = setTimeout(() => {
      scrollSetupToTop(false);
    }, 0);

    return () => {
      clearTimeout(scrollTimer);
    };
  }, [currentStep, scrollSetupToTop]);

  useEffect(() => {
    const params = routeParams;
    if (!params) return;

    if (params.resetDebateSetup) {
      const resetKey = params.resetKey ?? 'unkeyed-reset';
      if (handledResetKeyRef.current === resetKey) {
        return;
      }
      handledResetKeyRef.current = resetKey;

      setCurrentStep('topic');
      setDebaterSlots(Array.from({ length: DEFAULT_DEBATER_SLOT_COUNT }, () => null));
      setSelectedTopic('');
      setCustomTopic('');
      setTopicMode('preset');
      setSelectedModels(selectedModelsFromStore || {});
      setFormatId('oxford');
      setExchanges(3);
      setCivility(3);
      setVoiceDebateEnabled(false);
      setPodcastModeEnabled(false);
      setPodcastMC(null);
      setPodcastMCVoice(undefined);
      setDebateTtsModelId(ELEVENLABS_DEFAULT_TTS_MODEL);
      setDebateVoicesLoadAttempted(false);
      setPendingSelectionTarget(null);
      setDebateVoiceSelections({});
      dispatch(clearPreservedTopic());
      scrollSetupToTop(false);
      return;
    }

    if (params.preselectedAIs || typeof params.prefilledTopic === 'string') {
      const validPreselectedAIs = normalizeDebateSlotNames((params.preselectedAIs || [])
        .filter(ai => isValidProviderId(ai.provider))
        .map((ai, index) => ({
          ...ai,
          id: isDebateSlotId(ai.id) ? ai.id : createDebateSlotId(ai.provider, index),
          model: selectedModelsFromStore?.[ai.id] || selectedModelsFromStore?.[ai.provider] || ai.model,
          personality: ai.personality || 'default',
        })), configuredAIs);

      if (validPreselectedAIs.length > 0) {
        setDebaterSlots(buildDebaterSlotsFromAIs(validPreselectedAIs, maxAIs, configuredAIs));
      }

      if (typeof params.prefilledTopic === 'string') {
        setSelectedTopic(params.prefilledTopic);
        setCustomTopic(params.prefilledTopic);
      }

      setCurrentStep('topic');
      scrollSetupToTop(false);
    }
  }, [
    configuredAIs,
    dispatch,
    maxAIs,
    routeParams,
    selectedModelsFromStore,
    scrollSetupToTop,
  ]);

  const scrollToTeamGrid = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: Math.max(teamGridYRef.current - 16, 0), animated: true });
  }, []);

  const scrollToProviderSelector = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: Math.max(providerSelectorYRef.current - 16, 0), animated: true });
  }, []);

  const scrollToSelectionReturnPoint = useCallback((fallback: () => void) => {
    const returnY = selectionReturnScrollYRef.current;
    selectionReturnScrollYRef.current = null;
    if (returnY === null) {
      fallback();
      return;
    }
    scrollViewRef.current?.scrollTo({ y: Math.max(returnY, 0), animated: true });
  }, []);

  const buildSlotAI = useCallback((ai: AIConfig): AIConfig => {
    const slotId = createDebateSlotId(ai.provider, debaterSlotCounterRef.current++);
    const selectedModel = selectedModels[ai.id] || selectedModels[ai.provider] || ai.model;
    return {
      ...ai,
      id: slotId,
      model: selectedModel,
      personality: aiPersonalities[ai.id] || ai.personality || 'default',
    };
  }, [aiPersonalities, selectedModels]);

  const clearSlotState = useCallback((slotId?: string) => {
    if (!slotId) return;
    setSelectedModels(prev => {
      if (!(slotId in prev)) return prev;
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setDebateVoiceSelections(prev => {
      if (!(slotId in prev)) return prev;
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    dispatch(setAIPersonality({ aiId: slotId, personalityId: 'default' }));
  }, [dispatch]);

  const handleRequestDebaterSlot = useCallback((index: number) => {
    selectionReturnScrollYRef.current = currentScrollYRef.current;
    setPendingSelectionTarget({ kind: 'debater', index });
    setTimeout(scrollToProviderSelector, 50);
  }, [scrollToProviderSelector]);

  const handleRequestPodcastMC = useCallback(() => {
    selectionReturnScrollYRef.current = currentScrollYRef.current;
    setPendingSelectionTarget({ kind: 'mc' });
    setTimeout(scrollToProviderSelector, 50);
  }, [scrollToProviderSelector]);

  const handleProviderSelection = useCallback((ai: AIConfig) => {
    const target = pendingSelectionTarget || {
      kind: 'debater' as const,
      index: debaterSlots.findIndex(slot => !slot),
    };

    if (target.kind === 'mc') {
      const mcId = createDebateSlotId(ai.provider, debaterSlotCounterRef.current++);
      const selectedModel = selectedModels[ai.id] || selectedModels[ai.provider] || ai.model;
      clearSlotState(podcastMC?.id);
      setPodcastMC({
        ...ai,
        id: mcId,
        model: selectedModel,
        personality: 'default',
      });
    } else if (target.index >= 0 && target.index < maxAIs) {
      const nextSlot = buildSlotAI(ai);
      const replacedSlotId = debaterSlots[target.index]?.id;
      clearSlotState(replacedSlotId);
      setDebaterSlots(prev => {
        const next = Array.from({ length: maxAIs }, (_, index) => prev[index] || null);
        next[target.index] = nextSlot;
        return normalizeDebateSlots(next, configuredAIs);
      });
    }

    setPendingSelectionTarget(null);
    setTimeout(() => scrollToSelectionReturnPoint(scrollToTeamGrid), 75);
  }, [
    buildSlotAI,
    clearSlotState,
    configuredAIs,
    debaterSlots,
    maxAIs,
    pendingSelectionTarget,
    podcastMC?.id,
    scrollToSelectionReturnPoint,
    scrollToTeamGrid,
    selectedModels,
  ]);

  const handleRemoveDebaterSlot = useCallback((index: number) => {
    const removedSlotId = debaterSlots[index]?.id;
    clearSlotState(removedSlotId);
    setDebaterSlots(prev => {
      const next = Array.from({ length: maxAIs }, (_, slotIndex) => prev[slotIndex] || null);
      next[index] = null;
      return normalizeDebateSlots(next, configuredAIs);
    });
    setPendingSelectionTarget(current => current?.kind === 'debater' && current.index === index ? null : current);
  }, [clearSlotState, configuredAIs, debaterSlots, maxAIs]);

  const handleRemovePodcastMC = useCallback(() => {
    clearSlotState(podcastMC?.id);
    setPodcastMC(null);
    setPendingSelectionTarget(current => current?.kind === 'mc' ? null : current);
  }, [clearSlotState, podcastMC?.id]);

  const handlePersonalityChange = (aiId: string, personalityId: string) => {
    dispatch(setAIPersonality({ aiId, personalityId: personalityId || 'default' }));
  };
  
  const handleModelChange = (aiId: string, modelId: string) => {
    const providerId = debaterSlots.find(ai => ai?.id === aiId)?.provider
      || (podcastMC?.id === aiId ? podcastMC.provider : undefined)
      || (isValidProviderId(aiId) ? aiId : undefined);
    const resolvedModelId = providerId
      ? resolveProviderModelId(providerId, modelId) || modelId
      : modelId;
    dispatch(setAIModel({ aiId, modelId: resolvedModelId }));
    setSelectedModels(prev => ({
      ...prev,
      [aiId]: resolvedModelId
    }));
  };
  
  const computePersonaKey = (configs: AIConfig[]) => {
    const joined = configs
      .map(ai => (ai.personality || 'default').toLowerCase())
      .join(' ');
    if (joined.includes('george')) return 'George';
    if (joined.includes('sage')) return 'Prof. Sage';
    return 'default';
  };

  const startDebateNavigation = (
    topic: string,
    aiConfigs: AIConfig[],
    options?: { demoSampleId?: string; demoSample?: DemoDebate; voiceConfig?: DebateVoiceConfig }
  ) => {
    clearPreservedData();
    navigation.navigate('Debate', {
      selectedAIs: aiConfigs,
      topic,
      personalities: aiPersonalities,
      formatId,
      rounds: exchanges,
      civility,
      demoDebateId: options?.demoSampleId,
      demoSample: options?.demoSample,
      voiceConfig: options?.voiceConfig,
    });
  };

  const mapSelectedAIsWithModels = () => selectedAIs.map(ai => ({
    ...ai,
    model: resolveProviderModelId(ai.provider, selectedModels[ai.id] || selectedModels[ai.provider] || ai.model) || ai.model,
    personality: aiPersonalities[ai.id] || ai.personality || 'default',
  }));

  const handleStartDebate = () => {
    if (!areRequiredDebaterSlotsFilled) {
      Alert.alert('Fill Debate Slots', `${selectedPreset.shortLabel} requires ${requiredDebaterCount} debaters.`);
      return;
    }

    const finalTopic = topicMode === 'custom' ? customTopic : selectedTopic;
    if (!finalTopic) {
      Alert.alert('Select a Motion', 'Please choose a debate motion first!');
      return;
    }

    // Update AIs with selected models
    const aiConfigsWithModels = mapSelectedAIsWithModels();
    const voiceConfig = buildDebateVoiceConfig();
    if (podcastModeEnabled) {
      if (!podcastMC) {
        Alert.alert('Choose an MC', 'Podcast Mode requires an MC text provider.');
        return;
      }
      if (!hasVerifiedElevenLabs) {
        Alert.alert('Verify ElevenLabs', 'Podcast Mode requires a verified ElevenLabs API key for the MC voice.');
        return;
      }
      if (!voiceConfig?.podcast?.mcVoice) {
        Alert.alert('Choose an MC Voice', 'Choose an ElevenLabs voice for the podcast MC before starting.');
        return;
      }
      const missingDebaterVoices = aiConfigsWithModels.filter((ai) => !voiceConfig?.debaterVoices[ai.id]);
      if (missingDebaterVoices.length > 0) {
        Alert.alert('Choose Voices', 'Podcast Mode requires an ElevenLabs voice for each debater before starting.');
        return;
      }
    }
    if (voiceDebateEnabled) {
      const missingVoices = aiConfigsWithModels.filter((ai) => !voiceConfig?.debaterVoices[ai.id]);
      if (!hasVerifiedElevenLabs) {
        Alert.alert('Verify ElevenLabs', 'Voiced debates require a verified ElevenLabs API key.');
        return;
      }
      if (missingVoices.length > 0) {
        Alert.alert('Choose Voices', 'Choose an ElevenLabs voice for each debater before starting a voiced debate.');
        return;
      }
    }

    if (recordModeEnabled) {
      const providersKey = aiConfigsWithModels.map(ai => ai.provider).sort().join('+');
      const personaKey = computePersonaKey(aiConfigsWithModels);
      setRecordMeta({
        aiConfigs: aiConfigsWithModels,
        defaultTopic: finalTopic,
        providersKey,
        personaKey,
        voiceConfig,
      });
      setRecordPickerVisible(true);
      return;
    }

    startDebateNavigation(finalTopic, aiConfigsWithModels, { voiceConfig });
  };
  
  // Deprecated: selectRandomTopic (superseded by inline Surprise Me handler)
  
  const handleTopicModeChange = (mode: 'preset' | 'custom' | 'surprise') => {
    // No gating: allow custom topics for all users
    setTopicMode(mode);
    // Auto-scroll to show the content when mode changes
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 300, animated: true });
    }, 100);
  };
  
  const handleTopicNext = () => {
    const finalTopic = topicMode === 'custom' ? customTopic : selectedTopic;
    if (!finalTopic) {
      Alert.alert('Select a Motion', 'Please choose or enter a debate motion first!');
      return;
    }
    setCurrentStep('ai');
  };
  
  const openDemoPicker = async (aiConfigs: AIConfig[], personaKey: string) => {
    try {
      setDemoSamplesLoading(true);
      const providers = aiConfigs.map(ai => ai.provider);
      const list = await DemoContentService.listDebateSamples(providers, personaKey);
      setDemoSamples(list);
    } catch {
      setDemoSamples([]);
    } finally {
      setDemoSamplesLoading(false);
      setDemoPickerVisible(true);
    }
  };

  const handleAINext = () => {
    if (!areRequiredDebaterSlotsFilled) {
      Alert.alert(`Fill ${requiredDebaterCount} Slots`, `Please fill ${requiredDebaterCount} debater slots for ${selectedPreset.shortLabel}.`);
      return;
    }
    if (podcastModeEnabled && !podcastMC) {
      Alert.alert('Choose an MC', 'Podcast Mode requires an MC text provider.');
      return;
    }
    if (access.isDemo) {
      const finalTopic = topicMode === 'custom' ? customTopic : selectedTopic;
      if (!finalTopic) {
        Alert.alert('Select a Motion', 'Please choose or enter a debate motion first!');
        return;
      }
      const aiConfigsWithModels = mapSelectedAIsWithModels();
      const personaKey = computePersonaKey(aiConfigsWithModels);
      setDemoMeta({ aiConfigs: aiConfigsWithModels, personaKey });
      void openDemoPicker(aiConfigsWithModels, personaKey);
      return;
    }
    // Premium / live flow continues to personality configuration
    setCurrentStep('personality');
    scrollSetupToTop(false);
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right']}>
      <Header
        variant="gradient"
        slim
        title="Settle an Argument"
        rightElement={<HeaderActions variant="gradient" helpTopicId="debate-formats" />}
      />
      <TrialBanner />

      {access.isDemo && (
        <DemoBanner
          subtitle={access.canStartTrial
            ? 'Pre-recorded demo debates only. Start a trial for custom debates.'
            : 'Pre-recorded demo debates only. Upgrade to Premium for custom debates.'}
          onPress={() => dispatch(showSheet({ sheet: 'subscription' }))}
        />
      )}
      
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: rs('lg'),
          paddingTop: rs('sm'),
          paddingBottom: rs('xl') * 3,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          currentScrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <ResponsiveContainer maxWidth="lg" center>
          {/* Step Indicator */}
          <DebateStepIndicator
            currentStep={currentStep}
            completedSteps={currentStep === 'ai' ? ['topic'] : currentStep === 'personality' ? ['topic', 'ai'] : []}
            isPremium={access.isPremium || access.isInTrial}
            showPersonalityStep={!access.isDemo}
            compact
          />

        {/* Warning: Insufficient AIs configured (non-blocking inline card) */}
        {!validation.isReady && (
          <Box style={{
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.md,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.warning[100],
            borderRadius: theme.borderRadius.lg,
          }}>
            <Typography variant="body" style={{ textAlign: 'center', color: theme.colors.warning[900] }}>
              Add at least one AI provider to start a debate. You can reuse that provider for multiple debater slots.
            </Typography>
            <Button
              title="Add AI Keys"
              onPress={() => navigation.navigate('APIConfig')}
              variant="secondary"
              size="medium"
              style={{ marginTop: theme.spacing.md }}
            />
          </Box>
        )}

        {/* Step 1: Format, Rounds, Topic (clean and minimal) */}
        {currentStep === 'topic' && (
          <>
            {/* Topic card first */}
            <Card shadow style={{ marginBottom: theme.spacing.md }}>
              <Box style={{ marginBottom: theme.spacing.sm }}>
                <Typography variant="subtitle" weight="semibold" style={{ marginBottom: 4 }}>
                  💭 Motion
                </Typography>
              </Box>
              <DebateTopicSelector
                selectedTopic={selectedTopic}
                customTopic={customTopic}
                topicMode={topicMode}
                onTopicSelect={setSelectedTopic}
                onCustomTopicChange={setCustomTopic}
                onTopicModeChange={handleTopicModeChange}
                onSurpriseMe={() => {
                  const t = TopicService.generateRandomTopicString();
                  setSelectedTopic(t);
                  setTopicMode('surprise');
                }}
                showHeading={false}
                compact
              />
            </Card>

            {/* Debate Configuration card second */}
            <Card shadow style={{ marginBottom: theme.spacing.lg }}>
              {/* Header */}
              <Box style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
                <Box style={{ flex: 1 }}>
                  <Typography variant="subtitle" weight="semibold" style={{ marginBottom: 4 }}>
                    ⚙️ Debate
                  </Typography>
                </Box>
                <Button
                  title="Stats"
                  onPress={() => navigation.navigate('Stats')}
                  variant="ghost"
                  size="small"
                  style={{ minHeight: 36 }}
                />
              </Box>

              {/* Format row */}
              <Box style={{ marginBottom: theme.spacing.sm }}>
                <Box style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
                  <Box style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Typography variant="body" weight="semibold">Format</Typography>
                    <InfoButton topicId="debate-formats" size="small" />
                  </Box>
                </Box>
                <Box style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Button
                    title={FORMATS[formatId].name}
                    onPress={() => setFormatModalVisible(true)}
                    variant="tonal"
                    size="medium"
                    textAlign="left"
                    style={{ flex: 1 }}
                    rightIcon="chevron-down"
                  />
                </Box>
              </Box>

              {/* Preset selector (legacy 3, 5, 7 values still route through rounds) */}
              <Box>
                <Typography variant="body" weight="semibold" style={{ marginBottom: theme.spacing.xs }}>
                  {FORMATS[formatId].stepLabel === 'Exchanges' ? 'Exchanges' : 'Preset'}
                </Typography>
                <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {presetOptions.map(({ rounds: n, preset }) => (
                    <Button
                      key={n}
                      title={formatId === 'oxford' ? preset.label : PRESET_BUTTON_LABELS[preset.id] || preset.label}
                      onPress={() => setExchanges(n)}
                      variant={n === exchanges ? 'primary' : 'tonal'}
                      size="small"
                      style={{ minWidth: 96, flexGrow: 1 }}
                    />
                  ))}
                </Box>
                <Box
                  style={{
                    marginTop: theme.spacing.sm,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.overlays.soft,
                    padding: theme.spacing.sm,
                    gap: theme.spacing.sm,
                  }}
                >
                  <Box style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                    <Box style={{ flex: 1 }}>
                      <Typography
                        variant="caption"
                        color="secondary"
                        weight="semibold"
                        style={{ textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}
                      >
                        Selected preset
                      </Typography>
                      <Typography variant="body" weight="semibold" numberOfLines={1}>
                        {selectedPresetTitle}
                      </Typography>
                    </Box>
                    <Box
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.primary[400],
                        borderRadius: theme.borderRadius.full,
                        backgroundColor: theme.colors.semantic.primary,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        weight="semibold"
                        numberOfLines={1}
                        style={{ color: theme.colors.primary[400] }}
                      >
                        {selectedPreset.messages.length} {presetUnitLabel}
                      </Typography>
                    </Box>
                  </Box>

                  <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    <Box
                      style={{
                        borderRadius: theme.borderRadius.full,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                      }}
                    >
                      <Typography variant="caption" color="secondary" numberOfLines={1}>
                        {requiredDebaterCount} debaters
                      </Typography>
                    </Box>
                    <Box
                      style={{
                        borderRadius: theme.borderRadius.full,
                        backgroundColor: theme.colors.surface,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                      }}
                    >
                      <Typography variant="caption" color="secondary" numberOfLines={1}>
                        {presetVoteLabel}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="caption" color="secondary">
                    {presetParticipationSummary}
                  </Typography>

                  <Box style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm }}>
                    <Typography
                      variant="caption"
                      color="secondary"
                      weight="semibold"
                      style={{ textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}
                    >
                      {presetFlowLabel}
                    </Typography>
                    <Box style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                      {presetFlowSteps.map((step, index) => (
                        <React.Fragment key={`${step.label}-${index}`}>
                          <Box
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              minHeight: 34,
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                              borderRadius: theme.borderRadius.sm,
                              backgroundColor: theme.colors.surface,
                              paddingHorizontal: 8,
                              paddingVertical: 6,
                              maxWidth: 160,
                            }}
                          >
                            <Box
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: theme.borderRadius.full,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: theme.colors.semantic.info,
                              }}
                            >
                              <Ionicons name={step.icon} size={14} color={theme.colors.primary[400]} />
                            </Box>
                            <Typography variant="caption" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
                              {step.label}
                            </Typography>
                          </Box>
                          {index < presetFlowSteps.length - 1 && (
                            <Ionicons name="chevron-forward" size={14} color={theme.colors.text.secondary} />
                          )}
                        </React.Fragment>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Card>

            {/* Bottom CTA: Next */}
            <Box style={{ marginTop: theme.spacing.md }}>
              <GradientButton
                title="Next: Choose Debaters →"
                onPress={handleTopicNext}
                disabled={!((topicMode === 'preset' && !!selectedTopic) || (topicMode === 'custom' && !!customTopic) || (topicMode === 'surprise' && !!selectedTopic))}
                gradient={theme.colors.gradients.primary}
                fullWidth
              />
            </Box>
          </>
        )}
        
        {/* Step 2: AI Selection */}
        {currentStep === 'ai' && (
          <DebateAISelector
            selectedTopic={selectedTopic}
            customTopic={customTopic}
            topicMode={topicMode}
            configuredAIs={configuredAIs}
            debaterSlots={debaterSlots}
            selectedAIs={selectedAIs}
            maxAIs={maxAIs}
            isPremium={access.isPremium || access.isInTrial}
            aiPersonalities={aiPersonalities}
            selectedModels={selectedModels}
            pendingSelectionTarget={pendingSelectionTarget}
            podcastModeEnabled={podcastModeEnabled}
            podcastMC={podcastMC}
            onTogglePodcastMode={handlePodcastModeToggle}
            onRequestDebaterSlot={handleRequestDebaterSlot}
            onRemoveDebaterSlot={handleRemoveDebaterSlot}
            onRequestPodcastMC={handleRequestPodcastMC}
            onRemovePodcastMC={handleRemovePodcastMC}
            onSelectProvider={handleProviderSelection}
            onPersonalityChange={handlePersonalityChange}
            onModelChange={handleModelChange}
            onAddAI={() => navigation.navigate('APIConfig')}
            onNext={handleAINext}
            onBack={() => setCurrentStep('topic')}
            onTeamGridLayout={(y) => { teamGridYRef.current = y; }}
            onProviderSelectorLayout={(y) => { providerSelectorYRef.current = y; }}
          />
        )}

        {/* Civility UI moved into DebatePersonalitySelector */}

        {/* Format modal */}
        <FormatModal visible={formatModalVisible} selected={formatId} onSelect={(id) => setFormatId(id)} onClose={() => setFormatModalVisible(false)} />
        
        {/* Streaming Settings (per-provider) */}
        {currentStep === 'ai' && selectedAIs.length > 0 && (
          <Box
            style={{
              marginTop: theme.spacing.lg,
              padding: theme.spacing.md,
              borderRadius: 12,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            {/* Global streaming toggle */}
            <Box style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Button
                title={streamingState?.globalStreamingEnabled ? 'Streaming: On' : 'Streaming: Off'}
                onPress={() => dispatch(setGlobalStreaming(!(streamingState?.globalStreamingEnabled ?? true)))}
                variant={streamingState?.globalStreamingEnabled ? 'primary' : 'secondary'}
                size="small"
                style={{ alignSelf: 'flex-start' }}
              />
            </Box>
            {selectedStreamingProviders.map(ai => {
              const providerId = ai.provider;
              const providerPref = streamingState?.streamingPreferences?.[providerId]?.enabled ?? true;
              const hasVerificationError = !!streamingState?.providerVerificationErrors?.[providerId];
              const willStream = (streamingState?.globalStreamingEnabled ?? true) && providerPref && !hasVerificationError;
              const statusText = hasVerificationError
                ? 'Won’t stream (verification required)'
                : willStream
                  ? 'Will stream'
                  : 'Won’t stream';
              return (
                <Box key={providerId} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                }}>
                  <Box>
                    <Button
                      title={`${ai.name}: ${statusText}`}
                      onPress={() => {}}
                      variant="ghost"
                      size="small"
                      disabled
                    />
                  </Box>
                  <Box>
                    <Button
                      title={providerPref ? 'Streaming On' : 'Streaming Off'}
                      onPress={() => dispatch(setProviderStreamingPreference({ providerId, enabled: !providerPref }))}
                      variant={providerPref ? 'secondary' : 'ghost'}
                      size="small"
                      disabled={!!hasVerificationError}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        
        {/* Step 3: Personality Selection (Premium only) */}
        {!access.isDemo && currentStep === 'personality' && (
          <DebatePersonalitySelector
            selectedTopic={selectedTopic}
            customTopic={customTopic}
            topicMode={topicMode}
            selectedAIs={selectedAIs}
            aiPersonalities={aiPersonalities}
            onPersonalityChange={handlePersonalityChange}
            onStartDebate={handleStartDebate}
            onBack={() => setCurrentStep('ai')}
            civility={civility}
            onChangeCivility={(v)=>setCivility(v)}
            voiceConfigAvailable={hasVerifiedElevenLabs || podcastModeEnabled}
            voiceEnabled={voiceDebateEnabled}
            voiceOptions={debateVoiceOptions}
            voiceSelections={debateVoiceSelections}
            voiceLoading={debateVoicesLoading}
            voiceError={debateVoiceError}
            onToggleVoiceEnabled={handleVoiceDebateToggle}
            onVoiceSelect={handleDebateVoiceSelect}
            podcastModeEnabled={podcastModeEnabled}
            podcastMC={podcastMC}
            podcastMCVoice={podcastMCVoice}
            onPodcastMCVoiceSelect={handlePodcastMCVoiceSelect}
            onReloadVoices={() => {
              void loadInitialDebateVoices().catch(() => {});
            }}
            onLoadVoices={loadDebateVoices}
            onLoadSharedVoices={loadDebateSharedVoices}
            onAddSharedVoice={addDebateSharedVoice}
            elevenLabsTier={elevenLabsSubscription?.tier}
            ttsModelId={debateTtsModelId}
            onTtsModelChange={setDebateTtsModelId}
            elevenLabsCreditSummary={elevenLabsCreditSummary}
          />
        )}
        </ResponsiveContainer>
      </ScrollView>

      {recordModeEnabled && recordMeta && (
        <DebateRecordPickerModal
          visible={recordPickerVisible}
          providersKey={recordMeta.providersKey}
          personaKey={recordMeta.personaKey}
          defaultTopic={recordMeta.defaultTopic}
          onClose={() => {
            setRecordPickerVisible(false);
            setRecordMeta(null);
          }}
          onSelect={(selection) => {
            setRecordPickerVisible(false);
            if (!recordMeta) return;
            try {
              const { aiConfigs, providersKey, personaKey } = recordMeta;
              const comboKey = `${providersKey}:${personaKey}`;
              const participants = aiConfigs.map(ai => ai.name);
              if (selection.type === 'new') {
                RecordController.startDebate({ id: selection.id, topic: selection.topic, comboKey, participants });
                startDebateNavigation(selection.topic, aiConfigs, { voiceConfig: recordMeta.voiceConfig });
              } else {
                RecordController.startDebate({ id: `${selection.id}_rec_${Date.now()}`, topic: selection.topic, comboKey, participants });
                startDebateNavigation(selection.topic, aiConfigs, { voiceConfig: recordMeta.voiceConfig });
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to start recording';
              Alert.alert('Recording Error', message);
            } finally {
              setRecordMeta(null);
            }
          }}
        />
      )}

      {access.isDemo && (
        <DemoDebatePickerModal
          visible={demoPickerVisible}
          loading={demoSamplesLoading}
          samples={demoSamples}
          onClose={() => {
            setDemoPickerVisible(false);
            setDemoMeta(null);
          }}
          onSelect={async (sample) => {
            if (!demoMeta) {
              setDemoPickerVisible(false);
              return;
            }
            setDemoSamplesLoading(true);
            try {
              const fullSample = await DemoContentService.findDebateById(sample.id);
              if (!fullSample) {
                Alert.alert('Unavailable', 'This demo debate is not available right now.');
                return;
              }
              setSelectedTopic(fullSample.topic);
              setTopicMode('preset');
              startDebateNavigation(fullSample.topic, demoMeta.aiConfigs, { demoSampleId: sample.id, demoSample: fullSample });
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to load demo debate.';
              Alert.alert('Error', message);
            } finally {
              setDemoSamplesLoading(false);
              setDemoPickerVisible(false);
              setDemoMeta(null);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default DebateSetupScreen;
