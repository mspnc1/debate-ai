import { Platform } from 'react-native';

export const typography = {
  fonts: {
    ios: 'SF Pro Display',
    android: 'Roboto',
    fallback: 'System',
  },
  
  sizes: {
    xs: 12,
    sm: 14,
    md: 15,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  
  lineHeights: {
    tight: 1.1,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.7,
    loose: 2,
  },
} as const;

// Get platform-appropriate font family
export const getFontFamily = (weight: keyof typeof typography.weights = 'regular') => {
  const baseFont = Platform.select({
    ios: typography.fonts.ios,
    android: typography.fonts.android,
    default: typography.fonts.fallback,
  });
  
  // For iOS, we append the weight to the font name
  if (Platform.OS === 'ios') {
    const weightMap = {
      light: '-Light',
      regular: '',
      medium: '-Medium',
      semibold: '-Semibold',  
      bold: '-Bold',
      heavy: '-Heavy',
    };
    return `${baseFont}${weightMap[weight]}`;
  }
  
  return baseFont;
};

export type FontSize = keyof typeof typography.sizes;
export type FontWeight = keyof typeof typography.weights;
export type LineHeight = keyof typeof typography.lineHeights;