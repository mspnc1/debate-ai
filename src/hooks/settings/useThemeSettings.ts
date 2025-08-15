import { useState, useEffect, useCallback } from 'react';
import { themeService, ThemeMode, ResolvedTheme } from '../../services/settings';
import { useTheme } from '../../theme';

interface UseThemeSettingsReturn {
  themeMode: ThemeMode;
  isDark: boolean;
  isLight: boolean;
  isSystemMode: boolean;
  systemTheme: ResolvedTheme;
  isLoading: boolean;
  error: string | null;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  resetToSystemTheme: () => Promise<void>;
}

export const useThemeSettings = (): UseThemeSettingsReturn => {
  const { setThemeMode: setContextThemeMode, isDark: contextIsDark } = useTheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get system theme directly from service
  const systemTheme = themeService.getSystemTheme();

  /**
   * Load current theme mode from storage
   */
  const loadThemeMode = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const mode = await themeService.getThemeMode();
      setThemeModeState(mode);
      
      // Initialize theme in context if not already done
      await themeService.initializeTheme();
    } catch (err) {
      console.error('Failed to load theme mode:', err);
      setError('Failed to load theme settings');
      setThemeModeState('system');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set theme mode and persist it
   */
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      setError(null);
      
      // Optimistically update state
      setThemeModeState(mode);
      
      // Update service and context
      await themeService.setThemeMode(mode);
      
      // Update theme context
      if (mode === 'system') {
        setContextThemeMode(systemTheme);
      } else {
        setContextThemeMode(mode);
      }
    } catch (err) {
      console.error('Failed to set theme mode:', err);
      setError('Failed to change theme');
      
      // Revert optimistic update
      await loadThemeMode();
      
      throw err;
    }
  }, [systemTheme, setContextThemeMode, loadThemeMode]);

  /**
   * Toggle between light and dark mode
   */
  const toggleDarkMode = useCallback(async () => {
    try {
      setError(null);
      
      if (themeMode === 'system') {
        // If in system mode, toggle to opposite of current system theme
        const newMode = systemTheme === 'light' ? 'dark' : 'light';
        await setThemeMode(newMode);
      } else {
        // Toggle between light and dark
        const newMode = themeMode === 'light' ? 'dark' : 'light';
        await setThemeMode(newMode);
      }
    } catch (err) {
      console.error('Failed to toggle theme:', err);
      setError('Failed to toggle theme');
      throw err;
    }
  }, [themeMode, systemTheme, setThemeMode]);

  /**
   * Reset to system theme
   */
  const resetToSystemTheme = useCallback(async () => {
    try {
      setError(null);
      await setThemeMode('system');
    } catch (err) {
      console.error('Failed to reset to system theme:', err);
      setError('Failed to reset theme');
      throw err;
    }
  }, [setThemeMode]);

  // Load theme mode on mount
  useEffect(() => {
    loadThemeMode();
  }, [loadThemeMode]);

  // Set up theme change listener
  useEffect(() => {
    const unsubscribe = themeService.addThemeChangeListener((resolvedTheme) => {
      // Update context theme when service theme changes
      setContextThemeMode(resolvedTheme);
    });

    return unsubscribe;
  }, [setContextThemeMode]);

  // Computed values
  const isDark = contextIsDark;
  const isLight = !contextIsDark;
  const isSystemMode = themeMode === 'system';

  return {
    themeMode,
    isDark,
    isLight,
    isSystemMode,
    systemTheme,
    isLoading,
    error,
    setThemeMode,
    toggleDarkMode,
    resetToSystemTheme,
  };
};