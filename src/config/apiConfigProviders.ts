import { AI_PROVIDERS, getProviderById, type AIProvider } from './aiProviders';
import { MEDIA_API_PROVIDERS } from './mediaProviders';

export const API_CONFIG_PROVIDERS: AIProvider[] = [
  ...AI_PROVIDERS,
  ...MEDIA_API_PROVIDERS,
];

export function getAPIConfigProviderById(id: string): AIProvider | undefined {
  return getProviderById(id) || API_CONFIG_PROVIDERS.find((provider) => provider.id === id);
}

export function getEnabledAPIConfigProviders(): AIProvider[] {
  return API_CONFIG_PROVIDERS.filter((provider) => provider.enabled);
}
