const TIGHT_OUTPUT_TOKEN_CAP = 2048;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

type GeminiThinkingConfig =
  | { thinkingLevel: 'minimal' | 'low' }
  | { thinkingBudget: number };

interface GeminiGenerationConfigOptions {
  model: string;
  temperature: number;
  maxTokens?: number;
}

function normalizeMaxTokens(maxTokens: number | undefined): number | undefined {
  return typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0
    ? Math.floor(maxTokens)
    : undefined;
}

export function getGeminiThinkingConfig(
  model: string,
  maxOutputTokens?: number
): GeminiThinkingConfig | undefined {
  if (!maxOutputTokens || maxOutputTokens > TIGHT_OUTPUT_TOKEN_CAP) {
    return undefined;
  }

  const normalizedModel = model.toLowerCase();
  if (!normalizedModel.includes('gemini')) {
    return undefined;
  }

  if (normalizedModel.includes('gemini-2.5-pro') && maxOutputTokens > 128) {
    return { thinkingBudget: 128 };
  }

  if (normalizedModel.includes('gemini-2.5-flash')) {
    return { thinkingBudget: 0 };
  }

  if (normalizedModel.includes('gemini-3')) {
    if (normalizedModel.includes('flash') || normalizedModel.includes('lite')) {
      return { thinkingLevel: 'minimal' };
    }
    return { thinkingLevel: 'low' };
  }

  return undefined;
}

export function buildGeminiGenerationConfig({
  model,
  temperature,
  maxTokens,
}: GeminiGenerationConfigOptions): Record<string, unknown> {
  const resolvedMaxTokens = normalizeMaxTokens(maxTokens);
  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: resolvedMaxTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
  };

  const thinkingConfig = getGeminiThinkingConfig(model, resolvedMaxTokens);
  if (thinkingConfig) {
    generationConfig.thinkingConfig = thinkingConfig;
  }

  return generationConfig;
}
