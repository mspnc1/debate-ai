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
      // gemini-3.7+ rejects thinkingLevel "minimal" ("Thinking level MINIMAL
      // is not supported for this model"; live-verified 2026-08-17 — 3.6
      // still accepts it and 3.7 accepts "low").
      return supportsMinimalThinkingLevel(normalizedModel)
        ? { thinkingLevel: 'minimal' }
        : { thinkingLevel: 'low' };
    }
    return { thinkingLevel: 'low' };
  }

  return undefined;
}

function supportsMinimalThinkingLevel(normalizedModel: string): boolean {
  const version = /gemini-(\d+)(?:\.(\d+))?/.exec(normalizedModel);
  if (!version) {
    return true;
  }
  const major = Number(version[1]);
  const minor = Number(version[2] ?? '0');
  return major < 3 || (major === 3 && minor < 7);
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
