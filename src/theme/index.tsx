import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme as useRNColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from './types';
import type { Theme, ThemeMode } from './types';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useRNColorScheme();
  // Initialize with system preference to avoid flash
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    systemColorScheme === 'dark' ? 'dark' : 'auto'
  );
  
  // Determine active theme
  const isDark = themeMode === 'auto' 
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
    
  const theme = isDark ? darkTheme : lightTheme;
  
  // Load theme preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((mode) => {
      if (mode && (mode === 'light' || mode === 'dark' || mode === 'auto')) {
        setThemeModeState(mode as ThemeMode);
      }
    }).catch(() => {
      // Ignore errors, use default
    });
  }, []);
  
  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {
      // Ignore storage errors
    });
  };
  
  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(() => {
      // Force re-render when system theme changes and we're in auto mode
      if (themeMode === 'auto') {
        setThemeModeState('auto');
      }
    });
    
    return () => subscription.remove();
  }, [themeMode]);
  
  const contextValue: ThemeContextValue = {
    theme,
    themeMode,
    setThemeMode,
    isDark,
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Export theme objects for direct usage if needed
export { lightTheme, darkTheme };
export { getFontFamily } from './typography';
export type { Theme, ThemeMode };