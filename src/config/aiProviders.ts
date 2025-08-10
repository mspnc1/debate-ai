export interface AIProvider {
  id: string;
  name: string;
  company: string;
  icon: string;
  color: string;
  gradient: [string, string];
  apiKeyPrefix: string;
  apiKeyPlaceholder: string;
  docsUrl: string;
  getKeyUrl: string;
  description: string;
  features: string[];
  testEndpoint?: string;
  enabled: boolean;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'claude',
    name: 'Claude',
    company: 'Anthropic',
    icon: '🎓',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#FF8E53'],
    apiKeyPrefix: 'sk-ant-',
    apiKeyPlaceholder: 'sk-ant-api03-...',
    docsUrl: 'https://docs.anthropic.com',
    getKeyUrl: 'https://console.anthropic.com/account/keys',
    description: 'Advanced reasoning and analysis',
    features: ['Deep thinking', 'Code generation', 'Creative writing'],
    enabled: true,
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    company: 'OpenAI',
    icon: '💡',
    color: '#00D9FF',
    gradient: ['#00D9FF', '#00A8CC'],
    apiKeyPrefix: 'sk-',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/docs',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    description: 'Versatile and creative AI',
    features: ['General knowledge', 'Problem solving', 'Conversation'],
    enabled: true,
  },
  {
    id: 'google',
    name: 'Gemini',
    company: 'Google',
    icon: '✨',
    color: '#7C3AED',
    gradient: ['#7C3AED', '#A855F7'],
    apiKeyPrefix: 'AI',
    apiKeyPlaceholder: 'AIza...',
    docsUrl: 'https://ai.google.dev/docs',
    getKeyUrl: 'https://makersuite.google.com/app/apikey',
    description: 'Google\'s multimodal AI',
    features: ['Multimodal', 'Fast responses', 'Large context'],
    enabled: true,
  },
  {
    id: 'nomi',
    name: 'Nomi',
    company: 'Nomi.ai',
    icon: '🤖',
    color: '#E91E63',
    gradient: ['#E91E63', '#F06292'],
    apiKeyPrefix: 'nomi_',
    apiKeyPlaceholder: 'nomi_...',
    docsUrl: 'https://nomi.ai/developers',
    getKeyUrl: 'https://beta.nomi.ai/profile/integrations',
    description: 'Emotional AI companion',
    features: ['Emotional intelligence', 'Memory', 'Personality'],
    enabled: true,
  },
  {
    id: 'replika',
    name: 'Replika',
    company: 'Luka Inc',
    icon: '💭',
    color: '#6B5B95',
    gradient: ['#6B5B95', '#8E7AA3'],
    apiKeyPrefix: 'rep_',
    apiKeyPlaceholder: 'rep_...',
    docsUrl: 'https://replika.ai/api',
    getKeyUrl: 'https://replika.ai/developers',
    description: 'AI companion focused on emotional support',
    features: ['Empathy', 'Personal growth', 'Companionship'],
    enabled: true,
  },
  {
    id: 'character',
    name: 'Character.AI',
    company: 'Character Technologies',
    icon: '🎭',
    color: '#FF6B35',
    gradient: ['#FF6B35', '#FF9558'],
    apiKeyPrefix: 'char_',
    apiKeyPlaceholder: 'char_...',
    docsUrl: 'https://character.ai/docs',
    getKeyUrl: 'https://character.ai/settings/api',
    description: 'Create and chat with AI characters',
    features: ['Character creation', 'Roleplay', 'Creative scenarios'],
    enabled: true,
  },
  {
    id: 'cohere',
    name: 'Cohere',
    company: 'Cohere',
    icon: '🔮',
    color: '#39D0B3',
    gradient: ['#39D0B3', '#29A08C'],
    apiKeyPrefix: 'co_',
    apiKeyPlaceholder: 'co_...',
    docsUrl: 'https://docs.cohere.com',
    getKeyUrl: 'https://dashboard.cohere.com/api-keys',
    description: 'Enterprise-focused language AI',
    features: ['Semantic search', 'Classification', 'Generation'],
    enabled: false,
  },
  {
    id: 'mistral',
    name: 'Mistral',
    company: 'Mistral AI',
    icon: '🌪️',
    color: '#FFA500',
    gradient: ['#FFA500', '#FF8C00'],
    apiKeyPrefix: 'msk_',
    apiKeyPlaceholder: 'msk_...',
    docsUrl: 'https://docs.mistral.ai',
    getKeyUrl: 'https://console.mistral.ai/api-keys',
    description: 'Open and efficient AI models',
    features: ['Fast inference', 'Code generation', 'Multilingual'],
    enabled: false,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    company: 'Perplexity AI',
    icon: '🔍',
    color: '#20B2AA',
    gradient: ['#20B2AA', '#17968E'],
    apiKeyPrefix: 'pplx_',
    apiKeyPlaceholder: 'pplx_...',
    docsUrl: 'https://docs.perplexity.ai',
    getKeyUrl: 'https://perplexity.ai/settings/api',
    description: 'AI-powered search and research',
    features: ['Web search', 'Citations', 'Research'],
    enabled: false,
  },
];

export const getProviderById = (id: string): AIProvider | undefined => {
  return AI_PROVIDERS.find(provider => provider.id === id);
};

export const getEnabledProviders = (): AIProvider[] => {
  return AI_PROVIDERS.filter(provider => provider.enabled);
};