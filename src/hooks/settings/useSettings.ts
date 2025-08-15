import { useState, useEffect, useCallback } from 'react';
import { settingsService, AppSettings, DEFAULT_SETTINGS } from '../../services/settings';

interface UseSettingsReturn {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => Promise<void>;
  resetSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (settingsJson: string) => Promise<void>;
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load settings from storage
   */
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loadedSettings = await settingsService.loadSettings();
      setSettings(loadedSettings);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update a specific setting
   */
  const updateSetting = useCallback(async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    try {
      setError(null);
      
      // Optimistically update UI
      setSettings(prev => ({
        ...prev,
        [key]: value,
      }));

      // Persist to storage
      await settingsService.updateSetting(key, value);
    } catch (err) {
      console.error(`Failed to update setting ${key}:`, err);
      setError(`Failed to update ${key} setting`);
      
      // Revert optimistic update
      await loadSettings();
      
      throw err;
    }
  }, [loadSettings]);

  /**
   * Reset all settings to defaults
   */
  const resetSettings = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      await settingsService.resetSettings();
      setSettings(DEFAULT_SETTINGS);
    } catch (err) {
      console.error('Failed to reset settings:', err);
      setError('Failed to reset settings');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh settings from storage
   */
  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  /**
   * Export settings as JSON string
   */
  const exportSettings = useCallback(async (): Promise<string> => {
    try {
      setError(null);
      return await settingsService.exportSettings();
    } catch (err) {
      console.error('Failed to export settings:', err);
      setError('Failed to export settings');
      throw err;
    }
  }, []);

  /**
   * Import settings from JSON string
   */
  const importSettings = useCallback(async (settingsJson: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      await settingsService.importSettings(settingsJson);
      await loadSettings();
    } catch (err) {
      console.error('Failed to import settings:', err);
      setError('Failed to import settings');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSettings]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSetting,
    resetSettings,
    refreshSettings,
    exportSettings,
    importSettings,
  };
};