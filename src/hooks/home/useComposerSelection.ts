import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { RootState, setModeSelection } from '../../store';
import { AISelectionConfig, AISelectionMode } from '../../types/aiSelection';
import {
  createDefaultAISelectionConfig,
  toAIConfig,
  validateAISelectionConfigs,
  buildSessionMaps,
} from '../../utils/aiSelection';
import AISelectionPersistenceService from '../../services/home/AISelectionPersistenceService';
import { AIConfigurationService } from '../../services/home/AIConfigurationService';
import useFeatureAccess from '@/hooks/useFeatureAccess';
import { AIConfig } from '../../types';

export interface ComposerSelectionLimits {
  minAIs: number;
  maxAIs: number;
}

/**
 * Draft AI selection for a composer-first screen (Home/CompareSetup).
 *
 * Reads are non-destructive: persisted configs whose provider currently lacks
 * an API key are hidden, not deleted. Writes rewrite the mode's array from the
 * visible list, so indices passed to update/remove always refer to `configs`.
 */
export const useComposerSelection = (mode: AISelectionMode, limits: ComposerSelectionLimits) => {
  const dispatch = useDispatch();
  const reduxStore = useStore<RootState>();
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const expertMode = useSelector((state: RootState) => state.settings.expertMode || {});
  const rawConfigs = useSelector((state: RootState) => state.aiSelection[mode]);
  const hydrated = useSelector((state: RootState) => state.aiSelection.hydrated);
  const { isDemo } = useFeatureAccess();

  const configuredAIs = useMemo(
    () => AIConfigurationService.getConfiguredAIs(apiKeys, isDemo),
    [apiKeys, isDemo]
  );

  const configs = useMemo(
    () => validateAISelectionConfigs(rawConfigs, apiKeys, { expertMode, isDemo }),
    [rawConfigs, apiKeys, expertMode, isDemo]
  );

  const commit = useCallback(
    (next: AISelectionConfig[]) => {
      dispatch(setModeSelection({ mode, configs: next }));
      // Demo-mode lineups are restricted and simulated — never let them
      // overwrite the user's real persisted selection.
      if (!isDemo) {
        const { chat, compare } = reduxStore.getState().aiSelection;
        AISelectionPersistenceService.save({ chat, compare });
      }
    },
    [dispatch, mode, isDemo, reduxStore]
  );

  const addProvider = useCallback(
    (providerId: string) => {
      if (configs.length >= limits.maxAIs) return;
      if (mode === 'chat' && configs.some(c => c.providerId === providerId)) return;
      const config = createDefaultAISelectionConfig(providerId, { expertMode, isDemo });
      if (!config) return;
      commit([...configs, config]);
    },
    [configs, limits.maxAIs, mode, expertMode, isDemo, commit]
  );

  const updateConfig = useCallback(
    (index: number, patch: Partial<AISelectionConfig>) => {
      if (index < 0 || index >= configs.length) return;
      commit(configs.map((config, i) => (i === index ? { ...config, ...patch } : config)));
    },
    [configs, commit]
  );

  const removeConfig = useCallback(
    (index: number) => {
      commit(configs.filter((_, i) => i !== index));
    },
    [configs, commit]
  );

  const replaceConfigs = useCallback(
    (next: AISelectionConfig[]) => {
      commit(next.slice(0, limits.maxAIs));
    },
    [commit, limits.maxAIs]
  );

  /** Session-shaped AIConfigs for createSession / route params. */
  const selectedAIConfigs = useMemo(
    () => configs.map(config => toAIConfig(config, isDemo)).filter((ai): ai is AIConfig => ai !== null),
    [configs, isDemo]
  );

  /** Personality/model maps for createSession overrides. */
  const sessionMaps = useMemo(() => buildSessionMaps(configs), [configs]);

  const hasEnoughAIs = configs.length >= limits.minAIs;

  return {
    configs,
    configuredAIs,
    addProvider,
    updateConfig,
    removeConfig,
    replaceConfigs,
    selectedAIConfigs,
    sessionMaps,
    hasEnoughAIs,
    hydrated,
    isDemo,
  };
};
