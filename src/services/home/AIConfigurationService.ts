import { AIConfig } from '../../types';
import { AI_PROVIDERS } from '../../config/aiProviders';
import { getAIProviderIcon } from '../../utils/aiProviderAssets';

/**
 * Service for managing AI configuration, provider detection, and availability checks.
 * Handles transformation of provider data into AI configuration objects.
 */
export class AIConfigurationService {
  /**
   * Gets all configured AIs based on available API keys.
   * 
   * @param apiKeys - Object containing API keys for different providers
   * @returns Array of configured AI configurations
   */
  static getConfiguredAIs(apiKeys: Record<string, unknown>): AIConfig[] {
    return AI_PROVIDERS
      .filter(provider => this.isProviderAvailable(provider, apiKeys))
      .map(provider => this.transformProviderToConfig(provider));
  }

  /**
   * Checks if a provider is available based on enabled status and API key presence.
   * 
   * @param provider - AI provider configuration
   * @param apiKeys - Object containing API keys
   * @returns True if provider is available, false otherwise
   */
  static isProviderAvailable(
    provider: typeof AI_PROVIDERS[0], 
    apiKeys: Record<string, unknown>
  ): boolean {
    return provider.enabled && !!apiKeys[provider.id as keyof typeof apiKeys];
  }

  /**
   * Transforms an AI provider configuration into an AIConfig object.
   * 
   * @param provider - AI provider configuration from AI_PROVIDERS
   * @returns AIConfig object ready for use in the application
   */
  static transformProviderToConfig(provider: typeof AI_PROVIDERS[0]): AIConfig {
    const iconData = getAIProviderIcon(provider.id);
    
    return {
      id: provider.id,
      provider: provider.id,
      name: provider.name,
      personality: 'balanced', // Default personality
      avatar: iconData.icon, // Keep for backwards compatibility
      icon: iconData.icon,
      iconType: iconData.iconType,
      color: provider.color,
    } as AIConfig;
  }

  /**
   * Validates AI configuration completeness.
   * 
   * @param aiConfig - AI configuration to validate
   * @returns True if configuration is valid, false otherwise
   */
  static validateAIConfiguration(aiConfig: AIConfig): boolean {
    const requiredFields = ['id', 'provider', 'name', 'personality'];
    return requiredFields.every(field => aiConfig[field as keyof AIConfig]);
  }

  /**
   * Checks if API key is present for a specific provider.
   * 
   * @param providerId - ID of the provider to check
   * @param apiKeys - Object containing API keys
   * @returns True if API key exists, false otherwise
   */
  static hasAPIKey(providerId: string, apiKeys: Record<string, unknown>): boolean {
    return !!apiKeys[providerId as keyof typeof apiKeys];
  }

  /**
   * Gets icon data for a specific provider.
   * 
   * @param providerId - ID of the provider
   * @returns Icon data object with icon and iconType
   */
  static getProviderIconData(providerId: string) {
    return getAIProviderIcon(providerId);
  }

  /**
   * Maps provider colors for theming.
   * 
   * @param providers - Array of AI providers
   * @returns Object mapping provider IDs to colors
   */
  static mapProviderColors(providers: typeof AI_PROVIDERS): Record<string, string> {
    return providers.reduce((colorMap, provider) => {
      colorMap[provider.id] = provider.color;
      return colorMap;
    }, {} as Record<string, string>);
  }

  /**
   * Filters providers by availability status.
   * 
   * @param providers - Array of AI providers
   * @param apiKeys - Object containing API keys
   * @returns Array of available providers
   */
  static getAvailableProviders(
    providers: typeof AI_PROVIDERS, 
    apiKeys: Record<string, unknown>
  ) {
    return providers.filter(provider => this.isProviderAvailable(provider, apiKeys));
  }

  /**
   * Gets count of available AIs based on API keys.
   * 
   * @param apiKeys - Object containing API keys
   * @returns Number of available AI providers
   */
  static getAvailableAICount(apiKeys: Record<string, unknown>): number {
    return this.getConfiguredAIs(apiKeys).length;
  }
}