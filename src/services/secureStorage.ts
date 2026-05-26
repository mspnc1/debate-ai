import { ErrorService } from '@/services/errors/ErrorService';
import {
  deleteStoredApiKeys,
  readStoredApiKeys,
  writeStoredApiKeys,
  type StoredApiKeys,
} from './apiKeys/apiKeyStorageCore';

// Dynamic interface to support all providers

class SecureStorageService {
  // Save API keys securely
  async saveApiKeys(keys: StoredApiKeys): Promise<void> {
    try {
      await writeStoredApiKeys(keys);
      // API keys saved securely
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'saveApiKeys' });
      throw error;
    }
  }

  // Retrieve API keys
  async getApiKeys(): Promise<StoredApiKeys | null> {
    try {
      return await readStoredApiKeys();
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'getApiKeys' });
      return null;
    }
  }

  // Update a single API key
  async updateApiKey(provider: string, key: string): Promise<void> {
    try {
      const currentKeys = await this.getApiKeys() || {};
      currentKeys[provider] = key;
      await this.saveApiKeys(currentKeys);
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'updateApiKey', provider });
      throw error;
    }
  }

  // Remove all API keys
  async clearApiKeys(): Promise<void> {
    try {
      await deleteStoredApiKeys();
      // API keys cleared
    } catch (error) {
      ErrorService.handleSilent(error, { action: 'clearApiKeys' });
    }
  }

  // Check if we have any keys stored
  async hasApiKeys(): Promise<boolean> {
    const keys = await this.getApiKeys();
    return keys !== null && Object.keys(keys).length > 0;
  }
}

export default new SecureStorageService();
