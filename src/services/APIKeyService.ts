/**
 * APIKeyService - Secure API key management
 * Extracted from APIConfigScreen for better separation of concerns
 */

import secureStorage from './secureStorage';
import { ErrorService } from '@/services/errors/ErrorService';
import { cleanKeyRecord, normalizeStoredKey } from './apiKeys/apiKeyStorageCore';

const RUNWAY_API_KEY_PATTERN = /^[Kk]ey_[0-9a-f]{128}$/;

export interface APIKeyValidationResult {
  isValid: boolean;
  message: string;
}

export class APIKeyService {
  private static instance: APIKeyService;

  static getInstance(): APIKeyService {
    if (!APIKeyService.instance) {
      APIKeyService.instance = new APIKeyService();
    }
    return APIKeyService.instance;
  }

  /**
   * Save API key for a specific provider
   */
  async saveKey(providerId: string, key: string): Promise<void> {
    try {
      const normalizedKey = normalizeStoredKey(providerId, key);
      if (!normalizedKey) {
        // If key is empty, remove it
        await this.deleteKey(providerId);
        return;
      }

      // Get existing keys
      const existingKeys = await this.loadKeys();
      const cleanedKeys = cleanKeyRecord({ ...existingKeys, [providerId]: normalizedKey });

      await secureStorage.saveApiKeys(cleanedKeys);
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'saveKey', providerId });
      throw error;
    }
  }

  /**
   * Load all API keys from secure storage
   */
  async loadKeys(): Promise<Record<string, string>> {
    try {
      const keys = await secureStorage.getApiKeys();
      return keys ? cleanKeyRecord(keys) : {};
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'loadKeys' });
      return {};
    }
  }

  /**
   * Delete API key for a specific provider
   */
  async deleteKey(providerId: string): Promise<void> {
    try {
      const existingKeys = await this.loadKeys();
      const updatedKeys = { ...existingKeys };
      delete updatedKeys[providerId];

      await secureStorage.saveApiKeys(cleanKeyRecord(updatedKeys));
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'deleteKey', providerId });
      throw error;
    }
  }

  /**
   * Clear all API keys
   */
  async clearAllKeys(): Promise<void> {
    try {
      await secureStorage.clearApiKeys();
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'clearAllKeys' });
      throw error;
    }
  }

  /**
   * Check if a provider has an API key stored
   */
  async hasKey(providerId: string): Promise<boolean> {
    try {
      const keys = await this.loadKeys();
      return Boolean(keys[providerId]);
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'hasKey', providerId });
      return false;
    }
  }

  /**
   * Get API key for a specific provider
   */
  async getKey(providerId: string): Promise<string | null> {
    try {
      const keys = await this.loadKeys();
      return keys[providerId] || null;
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'getKey', providerId });
      return null;
    }
  }

  /**
   * Check if any API keys are stored
   */
  async hasAnyKeys(): Promise<boolean> {
    try {
      return await secureStorage.hasApiKeys();
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'hasAnyKeys' });
      return false;
    }
  }

  /**
   * Get count of stored API keys
   */
  async getKeyCount(): Promise<number> {
    try {
      const keys = await this.loadKeys();
      return Object.keys(keys).length;
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'getKeyCount' });
      return 0;
    }
  }

  /**
   * Validate API key format (basic validation)
   */
  validateKeyFormat(providerId: string, key: string): APIKeyValidationResult {
    const normalizedKey = normalizeStoredKey(providerId, key);
    if (!normalizedKey) {
      return {
        isValid: false,
        message: 'API key cannot be empty'
      };
    }

    // Basic length validation
    if (normalizedKey.length < 10) {
      return {
        isValid: false,
        message: 'API key seems too short'
      };
    }

    // Provider-specific validation could be added here
    switch (providerId) {
      case 'openai':
        if (!normalizedKey.startsWith('sk-')) {
          return {
            isValid: false,
            message: 'OpenAI API keys should start with "sk-"'
          };
        }
        break;
      case 'claude':
        // Anthropic keys typically have a specific format
        if (normalizedKey.length < 40) {
          return {
            isValid: false,
            message: 'Claude API key seems too short'
          };
        }
        break;
      case 'google':
        // Google API keys have different format
        if (normalizedKey.length < 20) {
          return {
            isValid: false,
            message: 'Google API key seems too short'
          };
        }
        break;
      case 'runway':
        if (!RUNWAY_API_KEY_PATTERN.test(normalizedKey)) {
          return {
            isValid: false,
            message: 'Runway API keys should start with "key_" or "Key_" followed by 128 lowercase hex characters'
          };
        }
        break;
      case 'elevenlabs':
        if (!/^[A-Za-z0-9_-]{20,}$/.test(normalizedKey)) {
          return {
            isValid: false,
            message: 'ElevenLabs API keys should be long token strings'
          };
        }
        break;
    }

    return {
      isValid: true,
      message: 'Key format appears valid'
    };
  }

  /**
   * Mask API key for display (show only first 4 and last 4 characters)
   */
  maskKey(key: string): string {
    if (!key || key.length <= 8) {
      return key ? '••••••••' : '';
    }

    const start = key.substring(0, 4);
    const end = key.substring(key.length - 4);
    const middle = '•'.repeat(Math.min(key.length - 8, 12));

    return `${start}${middle}${end}`;
  }

  /**
   * Get list of provider IDs that have keys stored
   */
  async getProvidersWithKeys(): Promise<string[]> {
    try {
      const keys = await this.loadKeys();
      return Object.keys(keys).filter(providerId => !!keys[providerId]);
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'getProvidersWithKeys' });
      return [];
    }
  }

  /**
   * Bulk update multiple API keys
   */
  async updateMultipleKeys(keys: Record<string, string>): Promise<void> {
    try {
      const existingKeys = await this.loadKeys();
      const cleanedKeys = cleanKeyRecord({ ...existingKeys, ...keys });

      await secureStorage.saveApiKeys(cleanedKeys);
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'updateMultipleKeys' });
      throw error;
    }
  }
}

export default APIKeyService.getInstance();
