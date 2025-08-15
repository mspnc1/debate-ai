import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemePreferences {
  mode: ThemeMode;
  lastResolvedTheme: ResolvedTheme;
  systemThemeEnabled: boolean;
}

class ThemeService {
  private static readonly THEME_KEY = '@theme_preferences';
  private currentTheme: ResolvedTheme = 'light';
  private themeChangeListeners: ((theme: ResolvedTheme) => void)[] = [];

  constructor() {
    // Listen for system theme changes
    this.setupSystemThemeListener();
  }

  /**
   * Get current resolved theme (light or dark)
   */
  getCurrentTheme(): ResolvedTheme {
    return this.currentTheme;
  }

  /**
   * Set theme mode and persist it
   */
  async setThemeMode(mode: ThemeMode): Promise<void> {
    try {
      const preferences = await this.loadThemePreferences();
      const updatedPreferences: ThemePreferences = {
        ...preferences,
        mode,
        systemThemeEnabled: mode === 'system',
      };

      await this.saveThemePreferences(updatedPreferences);
      
      // Resolve and apply the new theme
      const resolvedTheme = this.resolveTheme(mode);
      await this.applyTheme(resolvedTheme);
    } catch (error) {
      console.error('Failed to set theme mode:', error);
      throw new Error('Unable to change theme');
    }
  }

  /**
   * Get current theme mode
   */
  async getThemeMode(): Promise<ThemeMode> {
    try {
      const preferences = await this.loadThemePreferences();
      return preferences.mode;
    } catch (error) {
      console.error('Failed to get theme mode:', error);
      return 'system';
    }
  }

  /**
   * Initialize theme from stored preferences
   */
  async initializeTheme(): Promise<ResolvedTheme> {
    try {
      const preferences = await this.loadThemePreferences();
      const resolvedTheme = this.resolveTheme(preferences.mode);
      
      await this.applyTheme(resolvedTheme);
      
      return resolvedTheme;
    } catch (error) {
      console.error('Failed to initialize theme:', error);
      const fallbackTheme: ResolvedTheme = 'light';
      await this.applyTheme(fallbackTheme);
      return fallbackTheme;
    }
  }

  /**
   * Get system theme preference
   */
  getSystemTheme(): ResolvedTheme {
    const systemColorScheme = Appearance.getColorScheme();
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }

  /**
   * Check if current mode follows system theme
   */
  async isSystemThemeEnabled(): Promise<boolean> {
    try {
      const preferences = await this.loadThemePreferences();
      return preferences.systemThemeEnabled;
    } catch (error) {
      console.error('Failed to check system theme status:', error);
      return true; // Default to system theme
    }
  }

  /**
   * Toggle between light and dark mode (non-system)
   */
  async toggleTheme(): Promise<void> {
    try {
      const currentMode = await this.getThemeMode();
      
      if (currentMode === 'system') {
        // If system mode, toggle to opposite of current resolved theme
        const newMode = this.currentTheme === 'light' ? 'dark' : 'light';
        await this.setThemeMode(newMode);
      } else {
        // Toggle between light and dark
        const newMode = currentMode === 'light' ? 'dark' : 'light';
        await this.setThemeMode(newMode);
      }
    } catch (error) {
      console.error('Failed to toggle theme:', error);
      throw new Error('Unable to toggle theme');
    }
  }

  /**
   * Add listener for theme changes
   */
  addThemeChangeListener(listener: (theme: ResolvedTheme) => void): () => void {
    this.themeChangeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.themeChangeListeners.indexOf(listener);
      if (index > -1) {
        this.themeChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Reset theme to system default
   */
  async resetToSystemTheme(): Promise<void> {
    await this.setThemeMode('system');
  }

  /**
   * Load theme preferences from storage
   */
  private async loadThemePreferences(): Promise<ThemePreferences> {
    try {
      const preferencesJson = await AsyncStorage.getItem(ThemeService.THEME_KEY);
      
      if (!preferencesJson) {
        // First time - return defaults
        return {
          mode: 'system',
          lastResolvedTheme: this.getSystemTheme(),
          systemThemeEnabled: true,
        };
      }

      return JSON.parse(preferencesJson) as ThemePreferences;
    } catch (error) {
      console.error('Failed to load theme preferences:', error);
      return {
        mode: 'system',
        lastResolvedTheme: 'light',
        systemThemeEnabled: true,
      };
    }
  }

  /**
   * Save theme preferences to storage
   */
  private async saveThemePreferences(preferences: ThemePreferences): Promise<void> {
    try {
      const preferencesJson = JSON.stringify(preferences);
      await AsyncStorage.setItem(ThemeService.THEME_KEY, preferencesJson);
    } catch (error) {
      console.error('Failed to save theme preferences:', error);
      throw new Error('Unable to save theme preferences');
    }
  }

  /**
   * Resolve theme mode to actual theme
   */
  private resolveTheme(mode: ThemeMode): ResolvedTheme {
    if (mode === 'system') {
      return this.getSystemTheme();
    }
    return mode as ResolvedTheme;
  }

  /**
   * Apply theme and notify listeners
   */
  private async applyTheme(theme: ResolvedTheme): Promise<void> {
    this.currentTheme = theme;
    
    // Update last resolved theme in preferences
    try {
      const preferences = await this.loadThemePreferences();
      await this.saveThemePreferences({
        ...preferences,
        lastResolvedTheme: theme,
      });
    } catch (error) {
      console.error('Failed to update last resolved theme:', error);
    }

    // Notify all listeners
    this.themeChangeListeners.forEach(listener => {
      try {
        listener(theme);
      } catch (error) {
        console.error('Theme change listener error:', error);
      }
    });
  }

  /**
   * Setup system theme change listener
   */
  private setupSystemThemeListener(): void {
    Appearance.addChangeListener(async ({ colorScheme }) => {
      try {
        const preferences = await this.loadThemePreferences();
        
        // Only react to system changes if system theme is enabled
        if (preferences.systemThemeEnabled) {
          const newTheme = colorScheme === 'dark' ? 'dark' : 'light';
          await this.applyTheme(newTheme);
        }
      } catch (error) {
        console.error('Failed to handle system theme change:', error);
      }
    });
  }
}

// Export singleton instance
export const themeService = new ThemeService();
export default themeService;