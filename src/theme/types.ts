import { colors, lightThemeColors, darkThemeColors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  colors: {
    primary: typeof colors.primary;
    gray: typeof colors.gray;
    success: typeof colors.success;
    warning: typeof colors.warning;
    error: typeof colors.error;
    info: typeof colors.info;
    gradients: typeof colors.gradients;
    glass: typeof colors.glass;
    neumorph: typeof colors.neumorph;
    overlays: typeof colors.overlays.light | typeof colors.overlays.dark;
    semantic: typeof colors.semantic;
    pdf: typeof colors.pdf;
    // Theme-specific colors
    background: string;
    surface: string;
    card: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
      inverse: string;
      white: string;
      black: string;
    };
    secondary: string;
    disabled: string;
    brand: string;
    border: string;
    shadow: string;
    shadowDark: string;
    overlay: string;
  };
  spacing: typeof spacing;
  typography: typeof typography;
  borderRadius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadows: {
    sm: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    md: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    lg: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

// Base theme structure shared between light and dark
export const baseTheme = {
  spacing,
  typography,
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
} as const;

// Light theme
export const lightTheme: Theme = {
  ...baseTheme,
  colors: {
    ...colors,
    ...lightThemeColors,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.16,
      shadowRadius: 3.84,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.19,
      shadowRadius: 5.62,
      elevation: 6,
    },
  },
};

// Dark theme
export const darkTheme: Theme = {
  ...baseTheme,
  colors: {
    ...colors,
    ...darkThemeColors,
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.32,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.28,
      shadowRadius: 3.84,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.32,
      shadowRadius: 5.62,
      elevation: 6,
    },
  },
};