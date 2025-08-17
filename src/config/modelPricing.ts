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
  claude: {
    'claude-4-20250801': {
      inputPer1M: 8.00,
      outputPer1M: 24.00,
    },
    'claude-4-fast-20250801': {
      inputPer1M: 4.00,
      outputPer1M: 12.00,
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
    'gpt-5': {
      inputPer1M: 20.00,
      outputPer1M: 60.00,
    },
    'gpt-4o-2025': {
      inputPer1M: 2.50,
      outputPer1M: 10.00,
    },
    'gpt-4o-mini-2025': {
      inputPer1M: 0.15,
      outputPer1M: 0.60,
    },
    'o1-2025': {
      inputPer1M: 15.00,
      outputPer1M: 60.00,
    },
    'o1-mini-2025': {
      inputPer1M: 3.00,
      outputPer1M: 12.00,
    },
  },
  google: {
    'gemini-2.5-pro': {
      inputPer1M: 5.00,
      outputPer1M: 15.00,
      freeMessages: 30,
    },
    'gemini-2.5-flash': {
      inputPer1M: 0.10,
      outputPer1M: 0.40,
      freeMessages: 1000,
    },
    'gemini-1.5-pro-002': {
      inputPer1M: 3.50,
      outputPer1M: 10.50,
      freeMessages: 50,
    },
    'gemini-1.5-flash-002': {
      inputPer1M: 0.075,
      outputPer1M: 0.30,
      freeMessages: 1500,
    },
  },
  perplexity: {
    'llama-3.1-sonar-large-128k-online': {
      inputPer1M: 1.00,
      outputPer1M: 1.00,
    },
    'llama-3.1-sonar-small-128k-online': {
      inputPer1M: 0.20,
      outputPer1M: 0.20,
    },
    'llama-3.1-sonar-huge-128k-online': {
      inputPer1M: 5.00,
      outputPer1M: 5.00,
    },
  },
  mistral: {
    'mistral-large-2407': {
      inputPer1M: 3.00,
      outputPer1M: 9.00,
    },
    'mistral-small-2402': {
      inputPer1M: 1.00,
      outputPer1M: 3.00,
    },
    'mixtral-8x7b-32768': {
      inputPer1M: 0.70,
      outputPer1M: 0.70,
    },
    'mixtral-8x22b-32768': {
      inputPer1M: 1.20,
      outputPer1M: 1.20,
    },
  },
  cohere: {
    'command-r-plus-08-2024': {
      inputPer1M: 3.00,
      outputPer1M: 15.00,
    },
    'command-r-08-2024': {
      inputPer1M: 0.50,
      outputPer1M: 1.50,
    },
    'command-light': {
      inputPer1M: 0.30,
      outputPer1M: 0.60,
    },
  },
  together: {
    'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo': {
      inputPer1M: 5.00,
      outputPer1M: 15.00,
    },
    'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': {
      inputPer1M: 0.88,
      outputPer1M: 0.88,
    },
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': {
      inputPer1M: 0.20,
      outputPer1M: 0.20,
    },
    'Qwen/Qwen2.5-72B-Instruct-Turbo': {
      inputPer1M: 1.20,
      outputPer1M: 1.20,
    },
  },
  deepseek: {
    'deepseek-chat': {
      inputPer1M: 0.14,
      outputPer1M: 0.28,
    },
    'deepseek-coder': {
      inputPer1M: 0.14,
      outputPer1M: 0.28,
    },
    'deepseek-reasoning': {
      inputPer1M: 0.55,
      outputPer1M: 2.19,
    },
  },
  grok: {
    'grok-beta': {
      inputPer1M: 5.00,
      outputPer1M: 15.00,
    },
    'grok-vision-beta': {
      inputPer1M: 10.00,
      outputPer1M: 30.00,
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