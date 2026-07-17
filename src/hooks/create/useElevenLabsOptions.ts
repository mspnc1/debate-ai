import { useCallback, useEffect, useState } from 'react';
import type {
  ElevenLabsSharedVoiceQuery,
  ElevenLabsVoiceListQuery,
  MediaProviderModelOption,
  MediaProviderOptionsResponse,
  MediaProviderVoiceOption,
} from '../../types/media';
import { getMediaModels } from '../../config/mediaProviders';
import APIKeyService from '../../services/APIKeyService';
import MediaGenerationService from '../../services/media/MediaGenerationService';
import {
  formatElevenLabsCreditSummary,
  type ElevenLabsSubscriptionInfo,
} from '../../services/media/elevenLabsCredits';
import { ErrorService } from '../../services/errors/ErrorService';

const mergeVoiceLists = (
  existing: MediaProviderVoiceOption[],
  incoming: MediaProviderVoiceOption[]
): MediaProviderVoiceOption[] => {
  const voicesById = new Map(existing.map(voice => [voice.id, voice]));
  incoming.forEach(voice => {
    voicesById.set(voice.id, voice);
  });
  return Array.from(voicesById.values());
};

const mergeModelLists = (
  existing: MediaProviderModelOption[],
  incoming: MediaProviderModelOption[]
): MediaProviderModelOption[] => {
  const modelsById = new Map(existing.map(model => [model.id, model]));
  incoming.forEach(model => {
    modelsById.set(model.id, model);
  });
  return Array.from(modelsById.values());
};

/**
 * ElevenLabs voice/model catalog + subscription state for the Studio's audio
 * tab. Ephemeral fetch state only — the chosen voice/model/format are durable
 * and live in createSelectionSlice. Fetches lazily while `enabled` (audio tab
 * focused with a configured key).
 */
export const useElevenLabsOptions = ({ enabled }: { enabled: boolean }) => {
  const [voices, setVoices] = useState<MediaProviderVoiceOption[]>([]);
  const [models, setModels] = useState<MediaProviderModelOption[]>([]);
  const [voiceTotalCount, setVoiceTotalCount] = useState<number | undefined>();
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [subscription, setSubscription] = useState<ElevenLabsSubscriptionInfo | undefined>();
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setSubscription(undefined);
      setSubscriptionLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setSubscriptionLoading(true);
    APIKeyService.getKey('elevenlabs')
      .then(key => (key ? MediaGenerationService.getElevenLabsSubscription(key) : undefined))
      .then(info => {
        if (!cancelled) setSubscription(info);
      })
      .catch(() => {
        if (!cancelled) setSubscription(undefined);
      })
      .finally(() => {
        if (!cancelled) setSubscriptionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    const loadOptions = async () => {
      if (!enabled || loadingOptions || voices.length > 0) return;

      setLoadingOptions(true);
      try {
        const key = await APIKeyService.getKey('elevenlabs');
        if (!key) return;
        const options = await MediaGenerationService.listElevenLabsOptions(key, {
          pageSize: 100,
          includeTotalCount: true,
          sort: 'name',
          sortDirection: 'asc',
        });
        setVoices(options.voices || []);
        setModels(mergeModelLists(getMediaModels('elevenlabs'), options.models || []));
        setVoiceTotalCount(options.voiceTotalCount);
      } catch (error) {
        ErrorService.handleWithToast(error, { feature: 'create', provider: 'elevenlabs' });
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [enabled, loadingOptions, voices.length]);

  // Voice-picker callbacks (shared with the debate path's DebateVoicePicker).
  const loadVoices = useCallback(
    async (query: ElevenLabsVoiceListQuery): Promise<MediaProviderOptionsResponse> => {
      const key = await APIKeyService.getKey('elevenlabs');
      if (!key) throw new Error('Add an ElevenLabs API key to browse voices.');
      return MediaGenerationService.listElevenLabsOptions(key, query);
    },
    []
  );

  const loadSharedVoices = useCallback(
    async (query: ElevenLabsSharedVoiceQuery): Promise<MediaProviderOptionsResponse> => {
      const key = await APIKeyService.getKey('elevenlabs');
      if (!key) throw new Error('Add an ElevenLabs API key to browse community voices.');
      return MediaGenerationService.listElevenLabsSharedVoices(key, query);
    },
    []
  );

  const addSharedVoice = useCallback(
    async (voice: MediaProviderVoiceOption): Promise<MediaProviderVoiceOption> => {
      const publicOwnerId = voice.publicOwnerId || voice.public_owner_id;
      if (!publicOwnerId) throw new Error('This community voice cannot be added.');
      const key = await APIKeyService.getKey('elevenlabs');
      if (!key) throw new Error('Add an ElevenLabs API key before adding voices.');
      try {
        const newVoiceId = await MediaGenerationService.addElevenLabsSharedVoice(
          key,
          publicOwnerId,
          voice.id,
          voice.name
        );
        const addedVoice: MediaProviderVoiceOption = {
          ...voice,
          id: newVoiceId,
          voice_id: newVoiceId,
          isCommunity: false,
          sourceVoiceType: 'personal',
          isAddedByUser: true,
          is_added_by_user: true,
        };
        setVoices(current => mergeVoiceLists(current, [addedVoice]));
        return addedVoice;
      } catch (error) {
        ErrorService.handleWithToast(error, { feature: 'create', provider: 'elevenlabs' });
        throw error;
      }
    },
    []
  );

  /** Keep an externally-picked voice visible in the loaded list. */
  const mergeVoice = useCallback((voice: MediaProviderVoiceOption) => {
    setVoices(current => mergeVoiceLists(current, [voice]));
  }, []);

  const creditSummary = formatElevenLabsCreditSummary(subscription, subscriptionLoading);

  return {
    voices,
    models,
    voiceTotalCount,
    loadingOptions,
    subscription,
    subscriptionLoading,
    creditSummary,
    loadVoices,
    loadSharedVoices,
    addSharedVoice,
    mergeVoice,
  };
};

export default useElevenLabsOptions;
