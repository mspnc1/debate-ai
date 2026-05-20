import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  RootState,
  updateApiKeys,
  getApiKeyMaskedLabel,
  isApiKeyConfigured,
  ApiKeyStatus,
} from '@/store';
import APIKeyService from '@/services/APIKeyService';
import { API_CONFIG_PROVIDERS } from '@/config/apiConfigProviders';
// Type guards imported for future validation needs

export interface UseAPIKeysReturn {
  apiKeyStatuses: Record<string, ApiKeyStatus | undefined>;
  apiKeys: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  updateKey: (providerId: string, key: string) => Promise<void>;
  deleteKey: (providerId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  hasKey: (providerId: string) => boolean;
  getKeyCount: () => number;
  refreshKeys: () => Promise<void>;
  refreshKeyStatus: (providerId: string) => Promise<void>;
  validateKey: (providerId: string, key: string) => { isValid: boolean; message: string };
  maskKey: (key: string) => string;
}

export const useAPIKeys = (): UseAPIKeysReturn => {
  const dispatch = useDispatch();
  const existingStatuses = useSelector((state: RootState) => state.settings.apiKeys || {});
  
  // Local display state for immediate UI updates. These are masked labels only,
  // never raw provider keys.
  const [localKeys, setLocalKeys] = useState<Record<string, string>>(() => {
    const keys: Record<string, string> = {};
    API_CONFIG_PROVIDERS.forEach(provider => {
      keys[provider.id] = getApiKeyMaskedLabel(existingStatuses?.[provider.id]);
    });
    return keys;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sync local state with Redux when existingKeys change
   */
  useEffect(() => {
    const keys: Record<string, string> = {};
    API_CONFIG_PROVIDERS.forEach(provider => {
      keys[provider.id] = getApiKeyMaskedLabel(existingStatuses?.[provider.id]);
    });
    setLocalKeys(keys);
  }, [existingStatuses]);

  const refreshKeyStatus = useCallback(async (providerId: string) => {
    try {
      const key = await APIKeyService.getKey(providerId);
      dispatch(updateApiKeys({ [providerId]: key || undefined }));
    } catch (err) {
      console.error(`Failed to refresh API key status for ${providerId}:`, err);
      setError(`Failed to refresh ${providerId} API key status`);
    }
  }, [dispatch]);

  /**
   * Update a single API key
   */
  const updateKey = useCallback(async (providerId: string, key: string) => {
    try {
      setError(null);
      
      // Save to secure storage
      await APIKeyService.saveKey(providerId, key);

      // Update Redux state with safe metadata only
      dispatch(updateApiKeys({ [providerId]: key || undefined }));
    } catch (err) {
      console.error(`Failed to update API key for ${providerId}:`, err);
      setError(`Failed to update ${providerId} API key`);
      
      await refreshKeyStatus(providerId);
      
      throw err;
    }
  }, [dispatch, refreshKeyStatus]);

  /**
   * Delete an API key
   */
  const deleteKey = useCallback(async (providerId: string) => {
    try {
      setError(null);
      
      setLocalKeys(prev => ({ ...prev, [providerId]: '' }));

      // Delete from secure storage
      await APIKeyService.deleteKey(providerId);

      dispatch(updateApiKeys({ [providerId]: undefined }));
    } catch (err) {
      console.error(`Failed to delete API key for ${providerId}:`, err);
      setError(`Failed to delete ${providerId} API key`);
      
      await refreshKeyStatus(providerId);
      
      throw err;
    }
  }, [dispatch, refreshKeyStatus]);

  /**
   * Refresh keys from storage
   */
  const refreshKeys = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const keys = await APIKeyService.loadKeys();
      
      // Update local state with all providers
      const updatedKeys: Record<string, string> = {};
      API_CONFIG_PROVIDERS.forEach(provider => {
        updatedKeys[provider.id] = getApiKeyMaskedLabel(keys[provider.id]);
      });
      
      setLocalKeys(updatedKeys);
      
      // Update Redux state
      dispatch(updateApiKeys(keys));
    } catch (err) {
      console.error('Failed to refresh API keys:', err);
      setError('Failed to refresh API keys');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  /**
   * Clear all API keys
   */
  const clearAll = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const emptyKeys: Record<string, string> = {};
      API_CONFIG_PROVIDERS.forEach(provider => {
        emptyKeys[provider.id] = '';
      });
      setLocalKeys(emptyKeys);

      // Clear from secure storage
      await APIKeyService.clearAllKeys();

      // Update Redux state
      dispatch(updateApiKeys({}));
    } catch (err) {
      console.error('Failed to clear all API keys:', err);
      setError('Failed to clear all API keys');
      
      // Revert optimistic update
      await refreshKeys();
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, refreshKeys]);

  /**
   * Check if provider has an API key
   */
  const hasKey = useCallback((providerId: string): boolean => {
    return isApiKeyConfigured(existingStatuses[providerId]);
  }, [existingStatuses]);

  /**
   * Get count of configured API keys
   */
  const getKeyCount = useCallback((): number => {
    return Object.values(existingStatuses).filter(isApiKeyConfigured).length;
  }, [existingStatuses]);

  /**
   * Validate API key format
   */
  const validateKey = useCallback((providerId: string, key: string) => {
    return APIKeyService.validateKeyFormat(providerId, key);
  }, []);

  /**
   * Mask API key for display
   */
  const maskKey = useCallback((key: string): string => {
    return APIKeyService.maskKey(key);
  }, []);

  return {
    apiKeyStatuses: existingStatuses,
    apiKeys: localKeys,
    isLoading,
    error,
    updateKey,
    deleteKey,
    clearAll,
    hasKey,
    getKeyCount,
    refreshKeys,
    refreshKeyStatus,
    validateKey,
    maskKey,
  };
};
