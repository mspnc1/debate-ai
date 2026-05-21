/**
 * Model Version Management Configuration
 * 
 * This file contains mappings for model versioning and easy updates.
 * Update this file when new model versions are released.
 * 
 * Last updated: May 2026
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
        id: 'claude-opus-4-7',
        version: '4.7-opus',
        releaseDate: '2026-03-01',
        isLatest: true,
      },
      {
        id: 'claude-opus-4-6',
        version: '4.6-opus',
        releaseDate: '2026-03-01',
        isLatest: false,
      },
      {
        id: 'claude-opus-4-5-20251101',
        version: '4.5-opus',
        releaseDate: '2025-11-01',
        isLatest: false,
      },
      {
        id: 'claude-opus-4-1-20250805',
        version: '4.1-opus',
        releaseDate: '2025-08-05',
        isLatest: false,
      },
      {
        id: 'claude-3-opus-20240229',
        version: '3.0-opus',
        releaseDate: '2024-02-29',
        isLatest: false,
        isDeprecated: true,
        deprecationDate: '2025-06-30',
        replacedBy: 'claude-opus-4-7',
      },
    ],
    balanced: [
      {
        id: 'claude-sonnet-4-6',
        version: '4.6-sonnet',
        releaseDate: '2026-03-01',
        isLatest: true,
      },
      {
        id: 'claude-sonnet-4-5-20250929',
        version: '4.5-sonnet',
        releaseDate: '2025-09-29',
        isLatest: false,
      },
      {
        id: 'claude-sonnet-4-20250514',
        version: '4.0-sonnet',
        releaseDate: '2025-05-14',
        isLatest: false,
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        version: '3.7-sonnet',
        releaseDate: '2025-02-19',
        isLatest: false,
        isDeprecated: true,
        replacedBy: 'claude-sonnet-4-6',
      },
    ],
    economy: [
      {
        id: 'claude-haiku-4-5-20251001',
        version: '4.5-haiku',
        releaseDate: '2025-10-01',
        isLatest: true,
      },
      {
        id: 'claude-3-5-haiku-20241022',
        version: '3.5-haiku',
        releaseDate: '2024-10-22',
        isLatest: false,
      },
    ],
  },
  openai: {
    flagship: [
      {
        id: 'gpt-5.5',
        version: '5.5',
        releaseDate: '2026-04-23',
        isLatest: true,
      },
      {
        id: 'gpt-5.5-pro',
        version: '5.5-pro',
        releaseDate: '2026-04-23',
        isLatest: false,
      },
      {
        id: 'gpt-5.4',
        version: '5.4',
        releaseDate: '2026-03-01',
        isLatest: false,
      },
      {
        id: 'gpt-5.2',
        version: '5.2',
        releaseDate: '2025-12-01',
        isLatest: false,
      },
      {
        id: 'gpt-5',
        version: '5.0',
        releaseDate: '2025-08-01',
        isLatest: false,
      },
      {
        id: 'gpt-4.1',
        version: '4.1',
        releaseDate: '2025-04-01',
        isLatest: false,
      },
    ],
    efficient: [
      {
        id: 'gpt-5.4-mini',
        version: '5.4-mini',
        releaseDate: '2026-03-17',
        isLatest: true,
      },
      {
        id: 'gpt-5.4-nano',
        version: '5.4-nano',
        releaseDate: '2026-03-17',
        isLatest: false,
      },
      {
        id: 'gpt-5-mini',
        version: '5-mini',
        releaseDate: '2025-08-01',
        isLatest: false,
      },
      {
        id: 'gpt-5-nano',
        version: '5-nano',
        releaseDate: '2025-08-01',
        isLatest: false,
      },
    ],
    reasoning: [
      {
        id: 'o3',
        version: 'o3',
        releaseDate: '2025-04-01',
        isLatest: true,
      },
      {
        id: 'o4-mini',
        version: 'o4-mini',
        releaseDate: '2025-04-01',
        isLatest: false,
      },
      {
        id: 'o1',
        version: 'o1',
        releaseDate: '2024-12-01',
        isLatest: false,
      },
    ],
  },
  google: {
    flagship: [
      {
        id: 'gemini-3.1-pro-preview',
        version: '3.1-pro-preview',
        releaseDate: '2026-03-01',
        isLatest: true,
      },
      {
        id: 'gemini-2.5-pro',
        version: '2.5',
        releaseDate: '2025-06-17',
        isLatest: false,
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
        id: 'gemini-3.5-flash',
        version: '3.5-flash',
        releaseDate: '2026-05-19',
        isLatest: true,
      },
      {
        id: 'gemini-3-flash-preview',
        version: '3-flash-preview',
        releaseDate: '2026-03-01',
        isLatest: false,
      },
      {
        id: 'gemini-3.1-flash-lite',
        version: '3.1-flash-lite',
        releaseDate: '2026-05-19',
        isLatest: false,
      },
      {
        id: 'gemini-3.1-flash-lite-preview',
        version: '3.1-flash-lite-preview',
        releaseDate: '2026-03-01',
        isLatest: false,
        isDeprecated: true,
        deprecationDate: '2026-05-25',
        replacedBy: 'gemini-3.1-flash-lite',
      },
      {
        id: 'gemini-2.5-flash',
        version: '001',
        releaseDate: '2025-06-01',
        isLatest: false,
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
        id: 'grok-4.20-0309-non-reasoning',
        version: '4.20-non-reasoning',
        releaseDate: '2026-03-09',
        isLatest: true,
      },
      {
        id: 'grok-4.20-0309-reasoning',
        version: '4.20-reasoning',
        releaseDate: '2026-03-09',
        isLatest: false,
      },
      {
        id: 'grok-4-1-fast-non-reasoning',
        version: '4.1-fast-non-reasoning',
        releaseDate: '2026-04-01',
        isLatest: false,
      },
      {
        id: 'grok-4-1-fast-reasoning',
        version: '4.1-fast-reasoning',
        releaseDate: '2026-04-01',
        isLatest: false,
      },
      {
        id: 'grok-4-0709',
        version: '4',
        releaseDate: '2025-07-09',
        isLatest: false,
      },
      {
        id: 'grok-3',
        version: '3',
        releaseDate: '2025-02-01',
        isLatest: false,
      },
    ],
    vision: [
      {
        id: 'grok-imagine-image',
        version: 'imagine',
        releaseDate: '2025-01-01',
        isLatest: true,
      },
    ],
  },
  perplexity: {
    online: [
      {
        id: 'sonar-pro',
        version: 'pro',
        releaseDate: '2025-01-01',
        isLatest: true,
      },
      {
        id: 'sonar',
        version: 'standard',
        releaseDate: '2025-01-01',
        isLatest: false,
      },
      {
        id: 'sonar-reasoning-pro',
        version: 'reasoning-pro',
        releaseDate: '2025-01-01',
        isLatest: false,
      },
    ],
  },
  mistral: {
    large: [
      {
        id: 'mistral-large-2512',
        version: '2512',
        releaseDate: '2025-12-01',
        isLatest: true,
      },
    ],
    small: [
      {
        id: 'mistral-small-2603',
        version: '2603',
        releaseDate: '2026-03-01',
        isLatest: true,
      },
    ],
    reasoning: [
      {
        id: 'magistral-medium-2509',
        version: '2509',
        releaseDate: '2025-09-01',
        isLatest: true,
      },
    ],
    coding: [
      {
        id: 'codestral-2508',
        version: '2508',
        releaseDate: '2025-08-01',
        isLatest: true,
      },
    ],
  },
  cohere: {
    command: [
      {
        id: 'command-a-plus-05-2026',
        version: 'a-plus-05-2026',
        releaseDate: '2026-05-20',
        isLatest: true,
      },
      {
        id: 'command-a-reasoning-08-2025',
        version: 'a-reasoning-08-2025',
        releaseDate: '2025-08-01',
        isLatest: false,
      },
      {
        id: 'command-a-vision-07-2025',
        version: 'a-vision-07-2025',
        releaseDate: '2025-07-01',
        isLatest: false,
      },
      {
        id: 'command-r-08-2024',
        version: 'r-08-2024',
        releaseDate: '2024-08-01',
        isLatest: false,
      },
      {
        id: 'command-r7b-12-2024',
        version: 'r7b-12-2024',
        releaseDate: '2024-12-01',
        isLatest: false,
      },
    ],
  },
  deepseek: {
    chat: [
      {
        id: 'deepseek-v4-flash',
        version: 'v4-flash',
        releaseDate: '2026-04-24',
        isLatest: true,
      },
    ],
    pro: [
      {
        id: 'deepseek-v4-pro',
        version: 'v4-pro',
        releaseDate: '2026-04-24',
        isLatest: true,
      },
    ],
    reasoning: [
      {
        id: 'deepseek-v4-flash',
        version: 'v4-flash-thinking',
        releaseDate: '2026-04-24',
        isLatest: true,
      },
      {
        id: 'deepseek-reasoner',
        version: 'reasoner',
        releaseDate: '2025-06-01',
        isLatest: false,
        isDeprecated: true,
        replacedBy: 'deepseek-v4-flash',
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
