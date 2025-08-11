// AI Provider Brand Colors - These are constants, not theme-dependent
export const AI_BRAND_COLORS = {
  claude: {
    50: '#FFF5F0',
    100: '#FFE0CC',
    200: '#FFCC99',
    300: '#FFB366',
    400: '#FF9933',
    500: '#FF7F00', // Claude's brand orange
    600: '#E67300',
    700: '#CC6600',
    800: '#B35900',
    900: '#994D00',
  },
  
  chatgpt: {
    50: '#E6FAFF',
    100: '#B3F0FF',
    200: '#80EEFF',
    300: '#4DE7FF',
    400: '#1AE0FF',
    500: '#00D9FF', // ChatGPT's brand cyan
    600: '#00B8E6',
    700: '#0096CC',
    800: '#0075B3',
    900: '#005399',
  },
  
  gemini: {
    50: '#F3E5F5',
    100: '#E1BEE7',
    200: '#CE93D8',
    300: '#BA68C8',
    400: '#AB47BC',
    500: '#8A2BE2', // Gemini's purple
    600: '#7B1FA2',
    700: '#6A1B9A',
    800: '#5E1A8E',
    900: '#4A148C',
  },
  
  nomi: {
    50: '#FFF9F0',
    100: '#FFE4CC',
    200: '#FFCF99',
    300: '#FFBA66',
    400: '#FFA533',
    500: '#FFA500', // Nomi's orange
    600: '#E69500',
    700: '#CC8400',
    800: '#B37300',
    900: '#996300',
  },
} as const;

export type AIProvider = keyof typeof AI_BRAND_COLORS;