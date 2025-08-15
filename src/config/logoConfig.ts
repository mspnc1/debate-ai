// Logo display configuration for optimal visibility in light/dark modes
export interface LogoConfig {
  providerId: string;
  darkModeStrategy: 'glow' | 'brandBackground' | 'none';
  brandColor?: string;
  glowColor?: string;
  invertInDarkMode?: boolean;
  hasTransparency?: boolean;
}

// Configuration for each provider's logo display requirements
export const LOGO_CONFIGS: Record<string, LogoConfig> = {
  claude: {
    providerId: 'claude',
    darkModeStrategy: 'brandBackground',
    brandColor: '#D97706', // Claude's orange brand color
    hasTransparency: true,
  },
  openai: {
    providerId: 'openai',
    darkModeStrategy: 'brandBackground',
    brandColor: '#10B981', // OpenAI's green
    hasTransparency: true,
  },
  google: {
    providerId: 'google',
    darkModeStrategy: 'glow', // Gemini logo is colorful, add subtle glow
    glowColor: '#4285F4', // Google blue
    hasTransparency: true,
  },
  perplexity: {
    providerId: 'perplexity',
    darkModeStrategy: 'brandBackground',
    brandColor: '#1D4ED8', // Perplexity blue
    hasTransparency: true,
  },
  mistral: {
    providerId: 'mistral',
    darkModeStrategy: 'brandBackground',
    brandColor: '#F59E0B', // Mistral orange/yellow
    hasTransparency: true,
  },
  cohere: {
    providerId: 'cohere',
    darkModeStrategy: 'glow',
    glowColor: '#8B5CF6',
    hasTransparency: true,
  },
  together: {
    providerId: 'together',
    darkModeStrategy: 'glow',
    glowColor: '#06B6D4',
    hasTransparency: true,
  },
  deepseek: {
    providerId: 'deepseek',
    darkModeStrategy: 'none', // DeepSeek logo works well on dark
    hasTransparency: true,
  },
};

export const getLogoConfig = (providerId: string): LogoConfig => {
  return LOGO_CONFIGS[providerId] || {
    providerId,
    darkModeStrategy: 'glow', // Default to subtle glow
    glowColor: '#6B7280', // Neutral gray glow
    hasTransparency: true,
  };
};