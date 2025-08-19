import { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import { ProviderConfig } from '../../types/adapter.types';

export class PerplexityAdapter extends OpenAICompatibleAdapter {
  protected getProviderConfig(): ProviderConfig {
    return {
      baseUrl: 'https://api.perplexity.ai',
      defaultModel: 'sonar-pro',
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }),
      capabilities: {
        streaming: true,
        attachments: false,
        functionCalling: false,
        systemPrompt: true,
        maxTokens: 4096,
        contextWindow: 200000,
      },
    };
  }
}