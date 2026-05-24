const TIGHT_OUTPUT_TOKEN_CAP = 2048;

type GeminiThinkingConfig =
  | { thinkingLevel: 'minimal' | 'low' }
  | { thinkingBudget: number };

interface GeminiGenerationConfigOptions {
  model: string;
  temperature: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
}

function normalizeMaxTokens(maxTokens: number | undefined): number | undefined {
  return typeof maxTokens === 'number' && Number.isFinite(maxTokens) && maxTokens > 0
    ? Math.floor(maxTokens)
    : undefined;
}

function getGeminiThinkingConfig(model: string, maxOutputTokens?: number): GeminiThinkingConfig | undefined {
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
  topP,
  topK,
  maxTokens,
}: GeminiGenerationConfigOptions): Record<string, unknown> {
  const resolvedMaxTokens = normalizeMaxTokens(maxTokens);
  const config: Record<string, unknown> = {
    temperature,
  };

  if (typeof topP === 'number') {
    config.topP = topP;
  }

  if (typeof topK === 'number') {
    config.topK = topK;
  }

  if (resolvedMaxTokens) {
    config.maxOutputTokens = resolvedMaxTokens;
  }

  const thinkingConfig = getGeminiThinkingConfig(model, resolvedMaxTokens);
  if (thinkingConfig) {
    config.thinkingConfig = thinkingConfig;
  }

  return config;
}

export function extractGeminiText(parts: Array<{ text?: unknown }> | undefined): string {
  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .filter((part): part is { text: string } => typeof part.text === 'string')
    .map(part => part.text)
    .join('');
}
