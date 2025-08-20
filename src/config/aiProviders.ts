export interface AIProvider {
  id: string;
  name: string;
  company: string;
  color: string;
  gradient: [string, string];
  icon?: string | number;
  iconType?: 'letter' | 'image';
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
    color: '#D97706',
    gradient: ['#D97706', '#F59E0B'],
    apiKeyPrefix: 'sk-ant-',
    apiKeyPlaceholder: 'sk-ant-api03-...',
    docsUrl: 'https://docs.anthropic.com',
    getKeyUrl: 'https://console.anthropic.com/account/keys',
    description: 'Advanced reasoning and analysis',
    features: ['Deep thinking', 'Code generation', 'Creative writing'],
    testEndpoint: 'https://api.anthropic.com/v1/messages',
    enabled: true,
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    company: 'OpenAI',
    color: '#00D9FF',
    gradient: ['#00D9FF', '#00A8CC'],
    apiKeyPrefix: 'sk-',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/docs',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    description: 'Versatile and creative AI',
    features: ['General knowledge', 'Problem solving', 'Conversation'],
    testEndpoint: 'https://api.openai.com/v1/chat/completions',
    enabled: true,
  },
  {
    id: 'google',
    name: 'Gemini',
    company: 'Google',
    color: '#4285F4',
    gradient: ['#4285F4', '#34A853'],
    apiKeyPrefix: 'AI',
    apiKeyPlaceholder: 'AIza...',
    docsUrl: 'https://ai.google.dev/docs',
    getKeyUrl: 'https://makersuite.google.com/app/apikey',
    description: 'Google\'s multimodal AI',
    features: ['Multimodal', 'Fast responses', 'Large context'],
    testEndpoint: 'https://generativelanguage.googleapis.com/v1/models/',
    enabled: true,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    company: 'Perplexity AI',
    color: '#20B2AA',
    gradient: ['#20B2AA', '#17968E'],
    apiKeyPrefix: 'pplx-',
    apiKeyPlaceholder: 'pplx-...',
    docsUrl: 'https://docs.perplexity.ai',
    getKeyUrl: 'https://www.perplexity.ai/settings/api',
    description: 'AI with real-time web search',
    features: ['Web search', 'Citations', 'Current information'],
    testEndpoint: 'https://api.perplexity.ai/chat/completions',
    enabled: true,
  },
  {
    id: 'mistral',
    name: 'Mistral',
    company: 'Mistral AI',
    color: '#FFA500',
    gradient: ['#FFA500', '#FF8C00'],
    apiKeyPrefix: '',
    apiKeyPlaceholder: 'Your Mistral API key',
    docsUrl: 'https://docs.mistral.ai',
    getKeyUrl: 'https://console.mistral.ai/api-keys',
    description: 'European AI with multilingual support',
    features: ['Fast inference', 'Code generation', 'Multilingual'],
    testEndpoint: 'https://api.mistral.ai/v1/chat/completions',
    enabled: true,
  },
  {
    id: 'cohere',
    name: 'Cohere',
    company: 'Cohere',
    color: '#39D0B3',
    gradient: ['#39D0B3', '#29A08C'],
    apiKeyPrefix: '',
    apiKeyPlaceholder: 'Your Cohere API key',
    docsUrl: 'https://docs.cohere.com',
    getKeyUrl: 'https://dashboard.cohere.com/api-keys',
    description: 'Excellent for RAG and search',
    features: ['Semantic search', 'RAG optimization', 'Generation'],
    testEndpoint: 'https://api.cohere.ai/v1/chat',
    enabled: true,
  },
  {
    id: 'together',
    name: 'Together',
    company: 'Together AI',
    color: '#7C3AED',
    gradient: ['#7C3AED', '#9333EA'],
    apiKeyPrefix: '',
    apiKeyPlaceholder: 'Your Together API key',
    docsUrl: 'https://docs.together.ai',
    getKeyUrl: 'https://api.together.xyz/settings/api-keys',
    description: 'Access to open-source models',
    features: ['Llama models', 'Mixtral', 'Many open models'],
    testEndpoint: 'https://api.together.xyz/v1/chat/completions',
    enabled: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    company: 'DeepSeek',
    color: '#0EA5E9',
    gradient: ['#0EA5E9', '#0284C7'],
    apiKeyPrefix: '',
    apiKeyPlaceholder: 'Your DeepSeek API key',
    docsUrl: 'https://platform.deepseek.com/docs',
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
    description: 'Excellent for code, very cost-effective',
    features: ['Code generation', 'Low cost', 'Fast responses'],
    testEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    enabled: true,
  },
  {
    id: 'grok',
    name: 'Grok',
    company: 'X.AI',
    color: '#1DA1F2',
    gradient: ['#1DA1F2', '#0E7490'],
    apiKeyPrefix: 'xai-',
    apiKeyPlaceholder: 'xai-...',
    docsUrl: 'https://docs.x.ai/api',
    getKeyUrl: 'https://console.x.ai/api-keys',
    description: 'Real-time knowledge, wit, and reasoning',
    features: ['Real-time info', 'Humor', 'Deep reasoning', '256K context'],
    testEndpoint: 'https://api.x.ai/v1/chat/completions',
    enabled: true,
  },
];

export const getProviderById = (id: string): AIProvider | undefined => {
  return AI_PROVIDERS.find(provider => provider.id === id);
};

export const getEnabledProviders = (): AIProvider[] => {
  return AI_PROVIDERS.filter(provider => provider.enabled);
};