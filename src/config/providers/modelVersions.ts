/**
 * Model Version Management Configuration
 * 
 * This file contains mappings for model versioning and easy updates.
 * Update this file when new model versions are released.
 * 
 * Last updated: August 2025
 */

export interface ModelVersionInfo {
  id: string;
  version: string;
  releaseDate: string;
  isLatest: boolean;
  isDeprecated?: boolean;
  deprecationDate?: string;
  replacedBy?: string;
}

export interface ProviderVersions {
  [providerId: string]: {
    [modelFamily: string]: ModelVersionInfo[];
  };
}

/**
 * Current model versions by provider and family
 * This makes it easy to update model versions without changing business logic
 */
export const MODEL_VERSIONS: ProviderVersions = {
  claude: {
    premium: [
      {
        id: 'claude-opus-4-1-20250805',
        version: '4.1-opus',
        releaseDate: '2025-08-05',
        isLatest: true,
      },
      {
        id: 'claude-sonnet-4-20250514',
        version: '4.0-sonnet',
        releaseDate: '2025-05-14',
        isLatest: false,
      },
      {
        id: 'claude-3-opus-20240229',
        version: '3.0-opus',
        releaseDate: '2024-02-29',
        isLatest: false,
        isDeprecated: true,
        deprecationDate: '2025-06-30',
        replacedBy: 'claude-opus-4-1-20250805',
      },
    ],
    balanced: [
      {
        id: 'claude-3-7-sonnet-20250219',
        version: '3.7-sonnet',
        releaseDate: '2025-02-19',
        isLatest: true,
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        version: '3.5-sonnet',
        releaseDate: '2024-10-22',
        isLatest: false,
      },
    ],
    economy: [
      {
        id: 'claude-3-5-haiku-20241022',
        version: '3.5-haiku',
        releaseDate: '2024-10-22',
        isLatest: true,
      },
      {
        id: 'claude-3-haiku-20240307',
        version: '3.0-haiku',
        releaseDate: '2024-03-07',
        isLatest: false,
      },
    ],
  },
  openai: {
    flagship: [
      {
        id: 'gpt-5',
        version: '5.0',
        releaseDate: '2025-06-01',
        isLatest: true,
      },
      {
        id: 'gpt-4o-2025',
        version: '4o-2025',
        releaseDate: '2025-03-01',
        isLatest: false,
      },
    ],
    efficient: [
      {
        id: 'gpt-4o-mini-2025',
        version: '4o-mini-2025',
        releaseDate: '2025-03-01',
        isLatest: true,
      },
    ],
    reasoning: [
      {
        id: 'o1-2025',
        version: 'o1-2025',
        releaseDate: '2025-04-01',
        isLatest: true,
      },
      {
        id: 'o1-mini-2025',
        version: 'o1-mini-2025',
        releaseDate: '2025-04-01',
        isLatest: false,
      },
    ],
  },
  google: {
    flagship: [
      {
        id: 'gemini-2.5-pro',
        version: '2.5',
        releaseDate: '2025-06-17',
        isLatest: true,
      },
      {
        id: 'gemini-1.5-pro',
        version: '001',
        releaseDate: '2024-05-01',
        isLatest: false,
      },
    ],
    fast: [
      {
        id: 'gemini-2.5-flash',
        version: '001',
        releaseDate: '2025-06-01',
        isLatest: true,
      },
      {
        id: 'gemini-2.5-flash-lite',
        version: '001',
        releaseDate: '2025-07-01',
        isLatest: false,
      },
      {
        id: 'gemini-2.0-flash',
        version: '2.0',
        releaseDate: '2025-01-01',
        isLatest: false,
      },
      {
        id: 'gemini-1.5-flash',
        version: '001',
        releaseDate: '2024-05-01',
        isLatest: false,
      },
      {
        id: 'gemini-1.5-flash-8b',
        version: '001',
        releaseDate: '2024-10-01',
        isLatest: false,
      },
    ],
  },
  grok: {
    main: [
      {
        id: 'grok-beta',
        version: 'beta',
        releaseDate: '2025-06-01',
        isLatest: true,
      },
    ],
    vision: [
      {
        id: 'grok-vision-beta',
        version: 'vision-beta',
        releaseDate: '2025-07-01',
        isLatest: true,
      },
    ],
  },
  perplexity: {
    online: [
      {
        id: 'llama-3.1-sonar-large-128k-online',
        version: '3.1-large',
        releaseDate: '2025-05-01',
        isLatest: true,
      },
      {
        id: 'llama-3.1-sonar-small-128k-online',
        version: '3.1-small',
        releaseDate: '2025-05-01',
        isLatest: false,
      },
      {
        id: 'llama-3.1-sonar-huge-128k-online',
        version: '3.1-huge',
        releaseDate: '2025-06-01',
        isLatest: false,
      },
    ],
  },
  mistral: {
    large: [
      {
        id: 'mistral-large-2407',
        version: '2407',
        releaseDate: '2025-07-01',
        isLatest: true,
      },
    ],
    small: [
      {
        id: 'mistral-small-2402',
        version: '2402',
        releaseDate: '2025-02-01',
        isLatest: true,
      },
    ],
    mixtral: [
      {
        id: 'mixtral-8x22b-32768',
        version: '8x22b',
        releaseDate: '2025-04-01',
        isLatest: true,
      },
      {
        id: 'mixtral-8x7b-32768',
        version: '8x7b',
        releaseDate: '2024-12-01',
        isLatest: false,
      },
    ],
  },
  cohere: {
    command: [
      {
        id: 'command-r-plus-08-2024',
        version: 'r-plus-08-2024',
        releaseDate: '2024-08-01',
        isLatest: true,
      },
      {
        id: 'command-r-08-2024',
        version: 'r-08-2024',
        releaseDate: '2024-08-01',
        isLatest: false,
      },
      {
        id: 'command-light',
        version: 'light',
        releaseDate: '2024-06-01',
        isLatest: false,
      },
    ],
  },
  together: {
    llama: [
      {
        id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
        version: '3.1-405B',
        releaseDate: '2024-07-01',
        isLatest: true,
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        version: '3.1-70B',
        releaseDate: '2024-07-01',
        isLatest: false,
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        version: '3.1-8B',
        releaseDate: '2024-07-01',
        isLatest: false,
      },
    ],
    qwen: [
      {
        id: 'Qwen/Qwen2.5-72B-Instruct-Turbo',
        version: '2.5-72B',
        releaseDate: '2024-09-01',
        isLatest: true,
      },
    ],
  },
  deepseek: {
    chat: [
      {
        id: 'deepseek-chat',
        version: 'v2',
        releaseDate: '2025-01-01',
        isLatest: true,
      },
    ],
    coder: [
      {
        id: 'deepseek-coder',
        version: 'v2',
        releaseDate: '2025-01-01',
        isLatest: true,
      },
    ],
    reasoning: [
      {
        id: 'deepseek-reasoning',
        version: 'v1',
        releaseDate: '2025-06-01',
        isLatest: true,
      },
    ],
  },
};

/**
 * Helper functions for model version management
 */

export const getLatestModelInFamily = (providerId: string, family: string): string | null => {
  const providerVersions = MODEL_VERSIONS[providerId];
  if (!providerVersions) return null;
  
  const familyVersions = providerVersions[family];
  if (!familyVersions) return null;
  
  const latestModel = familyVersions.find(model => model.isLatest);
  return latestModel ? latestModel.id : null;
};

export const getAllModelsForProvider = (providerId: string): ModelVersionInfo[] => {
  const providerVersions = MODEL_VERSIONS[providerId];
  if (!providerVersions) return [];
  
  return Object.values(providerVersions).flat();
};

export const getModelInfo = (modelId: string): ModelVersionInfo | null => {
  for (const provider of Object.values(MODEL_VERSIONS)) {
    for (const family of Object.values(provider)) {
      const model = family.find(m => m.id === modelId);
      if (model) return model;
    }
  }
  return null;
};

export const isModelDeprecated = (modelId: string): boolean => {
  const modelInfo = getModelInfo(modelId);
  return modelInfo?.isDeprecated === true;
};

/**
 * Migration guide for updating models:
 * 
 * 1. Add new model to appropriate family in MODEL_VERSIONS
 * 2. Set isLatest: true for the new model
 * 3. Set isLatest: false for the previous model
 * 4. Update MODEL_ALIASES in modelRegistry.ts if needed
 * 5. Update pricing in modelPricing.ts
 * 6. Add model to AI_MODELS in modelConfigs.ts
 * 7. Test with TypeScript and ESLint
 */