import { DEFAULT_PARAMETERS, resolveProviderModelId } from '../config/modelConfigs';
import type { ModelParameters } from '../types';

/**
 * Resolve expert mode overrides for a provider.
 * - The saved default model is always returned when set - the Expert Mode
 *   toggle only gates parameter overrides.
 * - If not enabled, parameters are omitted.
 * - If enabled, merges parameters with defaults.
 */
export function getExpertOverrides(
  expertModeConfigs: Record<string, unknown>,
  providerId: string
): { enabled: boolean; model?: string; parameters?: ModelParameters } {
  const cfg = expertModeConfigs?.[providerId] as
    | { enabled?: boolean; selectedModel?: string; parameters?: Partial<ModelParameters> | Record<string, number> }
    | undefined;
  const model = cfg?.selectedModel
    ? resolveProviderModelId(providerId, cfg.selectedModel)
    : undefined;
  if (!cfg || !cfg.enabled) return { enabled: false, model };

  const params: ModelParameters = {
    ...DEFAULT_PARAMETERS,
    ...(cfg.parameters as Partial<ModelParameters> | undefined),
  } as ModelParameters;

  return {
    enabled: true,
    model,
    parameters: params,
  };
}
