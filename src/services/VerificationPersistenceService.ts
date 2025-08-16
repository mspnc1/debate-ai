/**
 * VerificationPersistenceService - Persist API verification data
 * Stores verification status, timestamps, and models for API providers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VerificationData {
  verifiedProviders: string[];
  verificationTimestamps: Record<string, number>;
  verificationModels: Record<string, string>;
}

class VerificationPersistenceService {
  private static instance: VerificationPersistenceService;
  private static readonly STORAGE_KEY = '@api_verification_data';

  static getInstance(): VerificationPersistenceService {
    if (!VerificationPersistenceService.instance) {
      VerificationPersistenceService.instance = new VerificationPersistenceService();
    }
    return VerificationPersistenceService.instance;
  }

  /**
   * Save verification data to AsyncStorage
   */
  async saveVerificationData(data: VerificationData): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      await AsyncStorage.setItem(VerificationPersistenceService.STORAGE_KEY, jsonData);
    } catch (error) {
      console.error('Failed to save verification data:', error);
      throw error;
    }
  }

  /**
   * Load verification data from AsyncStorage
   */
  async loadVerificationData(): Promise<VerificationData | null> {
    try {
      const jsonData = await AsyncStorage.getItem(VerificationPersistenceService.STORAGE_KEY);
      if (jsonData) {
        return JSON.parse(jsonData) as VerificationData;
      }
      return null;
    } catch (error) {
      console.error('Failed to load verification data:', error);
      return null;
    }
  }

  /**
   * Clear all verification data
   */
  async clearVerificationData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(VerificationPersistenceService.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear verification data:', error);
      throw error;
    }
  }

  /**
   * Add a verified provider
   */
  async addVerifiedProvider(providerId: string, model?: string): Promise<void> {
    try {
      const currentData = await this.loadVerificationData() || {
        verifiedProviders: [],
        verificationTimestamps: {},
        verificationModels: {}
      };

      if (!currentData.verifiedProviders.includes(providerId)) {
        currentData.verifiedProviders.push(providerId);
      }
      
      currentData.verificationTimestamps[providerId] = Date.now();
      
      if (model) {
        currentData.verificationModels[providerId] = model;
      }

      await this.saveVerificationData(currentData);
    } catch (error) {
      console.error('Failed to add verified provider:', error);
      throw error;
    }
  }

  /**
   * Remove a verified provider
   */
  async removeVerifiedProvider(providerId: string): Promise<void> {
    try {
      const currentData = await this.loadVerificationData();
      if (!currentData) return;

      currentData.verifiedProviders = currentData.verifiedProviders.filter(id => id !== providerId);
      delete currentData.verificationTimestamps[providerId];
      delete currentData.verificationModels[providerId];

      await this.saveVerificationData(currentData);
    } catch (error) {
      console.error('Failed to remove verified provider:', error);
      throw error;
    }
  }

  /**
   * Check if a provider is verified
   */
  async isProviderVerified(providerId: string): Promise<boolean> {
    try {
      const data = await this.loadVerificationData();
      return data ? data.verifiedProviders.includes(providerId) : false;
    } catch (error) {
      console.error('Failed to check provider verification:', error);
      return false;
    }
  }

  /**
   * Get verification timestamp for a provider
   */
  async getVerificationTimestamp(providerId: string): Promise<number | null> {
    try {
      const data = await this.loadVerificationData();
      return data ? (data.verificationTimestamps[providerId] || null) : null;
    } catch (error) {
      console.error('Failed to get verification timestamp:', error);
      return null;
    }
  }

  /**
   * Get verification model for a provider
   */
  async getVerificationModel(providerId: string): Promise<string | null> {
    try {
      const data = await this.loadVerificationData();
      return data ? (data.verificationModels[providerId] || null) : null;
    } catch (error) {
      console.error('Failed to get verification model:', error);
      return null;
    }
  }
}

export default VerificationPersistenceService.getInstance();