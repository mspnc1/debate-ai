export interface ModelPricing {
  inputPer1M: number;  // Cost per 1M input tokens
  outputPer1M: number; // Cost per 1M output tokens
  freeMessages?: number; // Number of free messages per month (if applicable)
  freeTokens?: number; // Free tokens per month (if applicable)
}

export interface ProviderPricing {
  [modelId: string]: ModelPricing;
}

// Pricing as of August 2025
export const MODEL_PRICING: { [provider: string]: ProviderPricing } = {
  nomi: {
    'default': {
      inputPer1M: 0,
      outputPer1M: 0,
      freeMessages: -1, // Unlimited with subscription
    },
  },
  replika: {
    'default': {
      inputPer1M: 0,
      outputPer1M: 0,
      freeMessages: -1, // Unlimited with subscription
    },
  },
  character: {
    'default': {
      inputPer1M: 0,
      outputPer1M: 0,
      freeMessages: -1, // Unlimited with subscription
    },
  },
  claude: {
    'claude-opus-4-1': {
      inputPer1M: 15.00,
      outputPer1M: 75.00,
    },
    'claude-sonnet-4': {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
    },
    'claude-3-5-sonnet-20241022': {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
    },
    'claude-3-5-haiku-20241022': {
      inputPer1M: 0.25,
      outputPer1M: 1.25,
    },
  },
  openai: {
    'gpt-5-pro': {
      inputPer1M: 2.50,  // Premium pricing - double the standard GPT-5
      outputPer1M: 20.00,
    },
    'gpt-5': {
      inputPer1M: 1.25,
      outputPer1M: 10.00,
    },
    'gpt-5-mini': {
      inputPer1M: 0.25,
      outputPer1M: 2.00,
    },
    'gpt-5-nano': {
      inputPer1M: 0.05,
      outputPer1M: 0.40,
    },
    'gpt-4o': {
      inputPer1M: 5.00,
      outputPer1M: 20.00,
    },
    'gpt-4o-mini': {
      inputPer1M: 2.00, // 60% cheaper than GPT-4o
      outputPer1M: 8.00,
    },
  },
  google: {
    'gemini-2-5-pro': {
      inputPer1M: 0.00, // Pricing TBD
      outputPer1M: 0.00,
      freeMessages: 50, // Free tier: 50 messages/month
    },
    'gemini-2-5-flash': {
      inputPer1M: 0.00, // Pricing TBD
      outputPer1M: 0.00,
      freeMessages: 1500, // Free tier: 1500 messages/month
    },
    'gemini-2-0-flash': {
      inputPer1M: 0.075,
      outputPer1M: 0.30,
      freeMessages: 1500,
    },
    'gemini-1.5-pro-002': {
      inputPer1M: 3.50,
      outputPer1M: 10.50,
      freeMessages: 50,
    },
    'gemini-1.5-flash': {
      inputPer1M: 0.075,
      outputPer1M: 0.30,
      freeMessages: 1500,
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
    const cost = calculateMessageCost(provider, modelId, avgInputTokens, avgOutputTokens);
    return formatCost(cost);
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