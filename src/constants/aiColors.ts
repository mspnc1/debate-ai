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
  
  openai: {
    50: '#E6FAFF',
    100: '#B3F0FF',
    200: '#80EEFF',
    300: '#4DE7FF',
    400: '#1AE0FF',
    500: '#00D9FF', // OpenAI/ChatGPT's brand cyan
    600: '#00B8E6',
    700: '#0096CC',
    800: '#0075B3',
    900: '#005399',
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
  perplexity: {
    50: '#E6F4F5',
    100: '#BFE5E8',
    200: '#99D6DB',
    300: '#73C7CE',
    400: '#4DB8C1',
    500: '#20808D', // Perplexity's teal
    600: '#1A6670',
    700: '#154D53',
    800: '#0F3336',
    900: '#0A1A1A',
  },
  
  mistral: {
    50: '#FFF4F0',
    100: '#FFE0CC',
    200: '#FFCC99',
    300: '#FFB366',
    400: '#FF9933',
    500: '#FA520F', // Mistral's orange
    600: '#E0490D',
    700: '#C6400C',
    800: '#AC370A',
    900: '#922E09',
  },
  
  cohere: {
    50: '#FFF5F3',
    100: '#FFE0DA',
    200: '#FFCCC1',
    300: '#FFB3A3',
    400: '#FF9985',
    500: '#FF7759', // Cohere's coral
    600: '#E66B50',
    700: '#CC5F47',
    800: '#B3533E',
    900: '#994735',
  },
  
  deepseek: {
    50: '#EEF2FF',
    100: '#D4DBFF',
    200: '#B9C4FF',
    300: '#9FADFF',
    400: '#8596FF',
    500: '#4D6BFE', // DeepSeek's blue
    600: '#4560E5',
    700: '#3D55CB',
    800: '#354AB2',
    900: '#2D3F99',
  },
  
  grok: {
    50: '#F0F0F0',
    100: '#D9D9D9',
    200: '#B3B3B3',
    300: '#8C8C8C',
    400: '#666666',
    500: '#404040', // Grok's dark gray
    600: '#333333',
    700: '#262626',
    800: '#1A1A1A',
    900: '#0D0D0D',
  },
  moonshot: {
    50: '#F0F1F3',
    100: '#D9DCE1',
    200: '#B4BAC5',
    300: '#8E97A8',
    400: '#5F6B80',
    500: '#3B4252',
    600: '#2F3542',
    700: '#242833',
    800: '#16191E',
    900: '#0D0F12',
  },
  zai: {
    50: '#EEF1FF',
    100: '#D6DDFF',
    200: '#B3C0FF',
    300: '#8FA2FF',
    400: '#6C85FF',
    500: '#3859FF',
    600: '#3050E6',
    700: '#2946CC',
    800: '#233CB2',
    900: '#1C3199',
  },
} as const;

export type AIProvider = keyof typeof AI_BRAND_COLORS;

// Brand color object type - represents the color palette for an AI provider
export type BrandColor = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};
