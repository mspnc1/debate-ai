import * as SecureStore from 'expo-secure-store';

const API_KEYS_STORAGE_KEY = 'my_ai_friends_api_keys';

interface StoredApiKeys {
  claude?: string;
  openai?: string;
  google?: string;
}

class SecureStorageService {
  // Save API keys securely
  async saveApiKeys(keys: StoredApiKeys): Promise<void> {
    try {
      const jsonValue = JSON.stringify(keys);
      await SecureStore.setItemAsync(API_KEYS_STORAGE_KEY, jsonValue);
      // API keys saved securely
    } catch (error) {
      console.error('Error saving API keys:', error);
      throw error;
    }
  }

  // Retrieve API keys
  async getApiKeys(): Promise<StoredApiKeys | null> {
    try {
      const jsonValue = await SecureStore.getItemAsync(API_KEYS_STORAGE_KEY);
      if (jsonValue) {
        return JSON.parse(jsonValue);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving API keys:', error);
      return null;
    }
  }

  // Update a single API key
  async updateApiKey(provider: 'claude' | 'openai' | 'google', key: string): Promise<void> {
    try {
      const currentKeys = await this.getApiKeys() || {};
      currentKeys[provider] = key;
      await this.saveApiKeys(currentKeys);
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  }

  // Remove all API keys
  async clearApiKeys(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(API_KEYS_STORAGE_KEY);
      // API keys cleared
    } catch (error) {
      console.error('Error clearing API keys:', error);
    }
  }

  // Check if we have any keys stored
  async hasApiKeys(): Promise<boolean> {
    const keys = await this.getApiKeys();
    return keys !== null && (!!keys.claude || !!keys.openai || !!keys.google);
  }
}

export default new SecureStorageService();