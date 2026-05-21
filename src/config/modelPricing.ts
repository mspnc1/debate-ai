export interface ModelPricing {
  inputPer1M: number;  // Cost per 1M input tokens
  outputPer1M: number; // Cost per 1M output tokens
  freeMessages?: number; // Number of free messages per month (if applicable)
  freeTokens?: number; // Free tokens per month (if applicable)
}

export interface ProviderPricing {
  [modelId: string]: ModelPricing;
}

// Pricing verified from current official provider pricing docs where the
// provider exposes token-based rates compatible with this structure.
export const MODEL_PRICING: { [provider: string]: ProviderPricing } = {
  claude: {
    'claude-opus-4-7': {
      inputPer1M: 5.0,
      outputPer1M: 25.0,
    },
    'claude-opus-4-6': {
      inputPer1M: 5.0,
      outputPer1M: 25.0,
    },
    'claude-sonnet-4-6': {
      inputPer1M: 3.0,
      outputPer1M: 15.0,
    },
    'claude-opus-4-5-20251101': {
      inputPer1M: 5.0,
      outputPer1M: 25.0,
    },
    'claude-sonnet-4-5-20250929': {
      inputPer1M: 3.0,
      outputPer1M: 15.0,
    },
    'claude-haiku-4-5-20251001': {
      inputPer1M: 1.0,
      outputPer1M: 5.0,
    },
    'claude-opus-4-1-20250805': {
      inputPer1M: 15.0,
      outputPer1M: 75.0,
    },
    'claude-sonnet-4-20250514': {
      inputPer1M: 3.0,
      outputPer1M: 15.0,
    },
    'claude-3-7-sonnet-20250219': {
      inputPer1M: 3.0,
      outputPer1M: 15.0,
    },
    'claude-3-5-haiku-20241022': {
      inputPer1M: 0.8,
      outputPer1M: 4.0,
    },
  },
  openai: {
    'gpt-5.5': {
      inputPer1M: 5.0,
      outputPer1M: 30.0,
    },
    'gpt-5.5-pro': {
      inputPer1M: 30.0,
      outputPer1M: 180.0,
    },
    'gpt-5.4': {
      inputPer1M: 2.5,
      outputPer1M: 15.0,
    },
    'gpt-5.4-mini': {
      inputPer1M: 0.75,
      outputPer1M: 4.5,
    },
    'gpt-5.4-nano': {
      inputPer1M: 0.2,
      outputPer1M: 1.25,
    },
    'gpt-5': {
      inputPer1M: 1.25,
      outputPer1M: 10.0,
    },
    'gpt-5-mini': {
      inputPer1M: 0.25,
      outputPer1M: 2.0,
    },
    'gpt-5-nano': {
      inputPer1M: 0.05,
      outputPer1M: 0.4,
    },
    'gpt-4.1': {
      inputPer1M: 2.0,
      outputPer1M: 8.0,
    },
    'gpt-4.1-mini': {
      inputPer1M: 0.4,
      outputPer1M: 1.6,
    },
    'gpt-4.1-nano': {
      inputPer1M: 0.1,
      outputPer1M: 0.4,
    },
    'gpt-4o': {
      inputPer1M: 2.5,
      outputPer1M: 10.0,
    },
    'gpt-4o-mini': {
      inputPer1M: 0.15,
      outputPer1M: 0.6,
    },
    'o3': {
      inputPer1M: 2.0,
      outputPer1M: 8.0,
    },
    'o4-mini': {
      inputPer1M: 1.1,
      outputPer1M: 4.4,
    },
    'o3-mini': {
      inputPer1M: 1.1,
      outputPer1M: 4.4,
    },
    'o1': {
      inputPer1M: 15.0,
      outputPer1M: 60.0,
    },
  },
  google: {
    'gemini-3.5-flash': {
      inputPer1M: 1.5,
      outputPer1M: 9.0,
    },
    'gemini-3.1-pro-preview': {
      inputPer1M: 2.0,
      outputPer1M: 12.0,
    },
    'gemini-3.1-flash-lite': {
      inputPer1M: 0.25,
      outputPer1M: 1.5,
    },
    'gemini-2.5-flash': {
      inputPer1M: 0.3,
      outputPer1M: 2.5,
    },
    'gemini-2.5-pro': {
      inputPer1M: 1.25,
      outputPer1M: 10.0,
    },
    'gemini-2.5-flash-lite': {
      inputPer1M: 0.1,
      outputPer1M: 0.4,
    },
    'gemini-2.0-flash': {
      inputPer1M: 0.1,
      outputPer1M: 0.4,
    },
  },
  mistral: {
    'mistral-large-2512': {
      inputPer1M: 2.0,
      outputPer1M: 6.0,
    },
    'magistral-medium-2509': {
      inputPer1M: 2.0,
      outputPer1M: 5.0,
    },
    'mistral-small-2603': {
      inputPer1M: 0.1,
      outputPer1M: 0.3,
    },
    'codestral-2508': {
      inputPer1M: 0.3,
      outputPer1M: 0.9,
    },
    'mistral-medium-latest': {
      inputPer1M: 0.4,
      outputPer1M: 2.0,
    },
    'mistral-small-latest': {
      inputPer1M: 0.1,
      outputPer1M: 0.3,
    },
    'pixtral-large-latest': {
      inputPer1M: 2.0,
      outputPer1M: 6.0,
    },
    'codestral-latest': {
      inputPer1M: 0.3,
      outputPer1M: 0.9,
    },
  },
  cohere: {
    'command-r-08-2024': {
      inputPer1M: 0.15,
      outputPer1M: 0.6,
    },
    'command-r7b-12-2024': {
      inputPer1M: 0.0375,
      outputPer1M: 0.15,
    },
  },
  grok: {
    'grok-3': {
      inputPer1M: 3.0,
      outputPer1M: 15.0,
    },
  },
};

export function calculateMessageCost(
  provider: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[provider]?.[modelId];
  if (!pricing) return 0;
  
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  
  return inputCost + outputCost;
}

export function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 0.001) return '<$0.001';
  if (cost < 0.01) return `$${cost.toFixed(3)}`;
  if (cost < 0.10) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

export function getEstimatedCostPerMessage(
  provider: string,
  modelId: string,
  avgInputTokens: number = 200,  // Average prompt (~50 words)
  avgOutputTokens: number = 800  // Average response (~200 words)
): string {
  // Check for specific model or default pricing
  const pricing = MODEL_PRICING[provider]?.[modelId] || MODEL_PRICING[provider]?.['default'];
  if (!pricing) {
    return 'Pricing unavailable';
  }
  
  // Calculate cost for this specific pricing
  const inputCost = (avgInputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (avgOutputTokens / 1_000_000) * pricing.outputPer1M;
  return formatCost(inputCost + outputCost);
}

export function getFreeMessageInfo(provider: string, modelId: string): string | null {
  const pricing = MODEL_PRICING[provider]?.[modelId] || MODEL_PRICING[provider]?.['default'];
  if (!pricing?.freeMessages) return null;
  
  if (pricing.freeMessages === -1) {
    return 'Unlimited with subscription';
  }
  
  return `${pricing.freeMessages} free messages/month`;
}
