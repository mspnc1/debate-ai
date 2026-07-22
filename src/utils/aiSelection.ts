import { AIConfig } from '../types';
import { AISelectionConfig } from '../types/aiSelection';
import { AIConfigurationService } from '../services/home/AIConfigurationService';
import { getProviderById } from '../config/aiProviders';
import { resolveProviderModelId } from '../config/modelConfigs';
import { getPersonality } from '../config/personalities';

/** Structural shape of the settings slice's expertMode map. */
export type ExpertModeMap = Record<string, { enabled?: boolean; selectedModel?: string } | undefined>;

export interface AISelectionContext {
  expertMode?: ExpertModeMap;
  isDemo?: boolean;
}

/**
 * Seed a config for a newly added provider pill: the saved default model
 * wins (regardless of the Expert Mode toggle, which only gates parameters),
 * then the provider default (demo-aware). Returns null for unknown provider
 * ids.
 */
export const createDefaultAISelectionConfig = (
  providerId: string,
  context: AISelectionContext = {}
): AISelectionConfig | null => {
  const provider = getProviderById(providerId);
  if (!provider) return null;
  const base = AIConfigurationService.transformProviderToConfig(provider, context.isDemo);
  const expert = context.expertMode?.[providerId];
  const expertModelId = expert?.selectedModel
    ? resolveProviderModelId(providerId, expert.selectedModel)
    : undefined;
  return {
    providerId,
    modelId: expertModelId || base.model,
    personalityId: 'default',
  };
};

/**
 * Translate a composer config into the session AIConfig shape consumed by
 * startSession/route params. Demo mode forces the demo sample model so
 * scripted content stays consistent. Returns null for unknown provider ids.
 */
export const toAIConfig = (
  config: AISelectionConfig,
  isDemo?: boolean
): AIConfig | null => {
  const provider = getProviderById(config.providerId);
  if (!provider) return null;
  const base = AIConfigurationService.transformProviderToConfig(provider, isDemo);
  const model = isDemo
    ? base.model
    : resolveProviderModelId(config.providerId, config.modelId) || base.model;
  const personalityId = getPersonality(config.personalityId) ? config.personalityId : 'default';
  return {
    ...base,
    model,
    personality: personalityId,
    ...(config.parameters ? { parameters: config.parameters } : {}),
  };
};

/** Reverse mapping, e.g. Compare rematch route params carry AIConfig. */
export const fromAIConfig = (ai: AIConfig): AISelectionConfig => ({
  providerId: ai.provider,
  modelId: ai.model,
  personalityId: ai.personality || 'default',
  ...(ai.parameters ? { parameters: ai.parameters } : {}),
});

/**
 * Re-resolve a config's model (aliases and retired models fall back to the
 * provider default) and personality (unknown ids fall back to 'default').
 */
export const normalizeAISelectionConfig = (config: AISelectionConfig): AISelectionConfig => ({
  ...config,
  modelId: resolveProviderModelId(config.providerId, config.modelId) || config.modelId,
  personalityId: getPersonality(config.personalityId) ? config.personalityId : 'default',
});

/**
 * Read-time validation of persisted configs. Non-destructive: callers keep the
 * raw slice state and render only what survives, so a pill hidden by a removed
 * API key reappears when the key returns.
 */
export const validateAISelectionConfigs = (
  configs: AISelectionConfig[],
  apiKeys: Record<string, unknown>,
  context: AISelectionContext = {}
): AISelectionConfig[] => {
  const configuredIds = new Set(
    AIConfigurationService.getConfiguredAIs(apiKeys, context.isDemo).map(ai => ai.id)
  );
  return configs
    .filter(config => configuredIds.has(config.providerId))
    .map(normalizeAISelectionConfig);
};

/**
 * Build the personality/model maps startSession seeds a chat session with.
 * Maps are keyed by aiId (=== providerId), which is why chat forbids
 * duplicate providers.
 */
export const buildSessionMaps = (
  configs: AISelectionConfig[]
): { personalities: { [aiId: string]: string }; models: { [aiId: string]: string } } => {
  const personalities: { [aiId: string]: string } = {};
  const models: { [aiId: string]: string } = {};
  configs.forEach(config => {
    personalities[config.providerId] = config.personalityId;
    models[config.providerId] = config.modelId;
  });
  return { personalities, models };
};
