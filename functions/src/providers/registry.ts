/**
 * Provider Registry
 *
 * Central registry for accessing provider runtimes.
 * Returns the appropriate runtime based on provider ID.
 */

import type { ProviderRuntime } from './types';
import { getClaudeRuntime } from './claude/runtime';
import { getOpenAIRuntime } from './openai/runtime';
import { getGoogleRuntime } from './google/runtime';
import { getCohereRuntime } from './cohere/runtime';

/**
 * Providers supported by the V2 endpoint
 */
export type SupportedProvider =
  | 'claude'
  | 'openai'
  | 'google'
  | 'mistral'
  | 'deepseek'
  | 'grok'
  | 'cohere'
  | 'moonshot'
  | 'zai';

/**
 * Check if a provider is supported by the V2 endpoint
 */
export function isV2Supported(providerId: string): providerId is SupportedProvider {
  return [
    'claude',
    'openai',
    'google',
    'mistral',
    'deepseek',
    'grok',
    'cohere',
    'moonshot',
    'zai',
  ].includes(providerId);
}

/**
 * Provider Registry
 *
 * Manages and returns provider runtime instances.
 */
export class ProviderRegistry {
  /**
   * Get the runtime for a specific provider
   *
   * @param providerId - The provider identifier
   * @returns The provider runtime
   * @throws Error if provider is not supported
   */
  static get(providerId: string): ProviderRuntime {
    switch (providerId) {
      case 'claude':
        return getClaudeRuntime();

      case 'google':
        return getGoogleRuntime();

      case 'cohere':
        return getCohereRuntime();

      case 'openai':
        return getOpenAIRuntime('openai');

      case 'mistral':
        return getOpenAIRuntime('mistral');

      case 'deepseek':
        return getOpenAIRuntime('deepseek');

      case 'grok':
        return getOpenAIRuntime('grok');

      case 'moonshot':
        return getOpenAIRuntime('moonshot');

      case 'zai':
        return getOpenAIRuntime('zai');

      default:
        throw new Error(`Provider '${providerId}' is not supported by V2 endpoint`);
    }
  }

  /**
   * Check if a provider supports tool calling
   */
  static supportsTools(providerId: string): boolean {
    try {
      const runtime = this.get(providerId);
      return runtime.supportsTools;
    } catch {
      return false;
    }
  }

  /**
   * Get all supported provider IDs
   */
  static getSupportedProviders(): SupportedProvider[] {
    return ['claude', 'openai', 'google', 'mistral', 'deepseek', 'grok', 'cohere', 'moonshot', 'zai'];
  }
}
