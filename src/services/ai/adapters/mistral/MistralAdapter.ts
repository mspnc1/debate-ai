import { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import { ProviderConfig } from '../../types/adapter.types';

export class MistralAdapter extends OpenAICompatibleAdapter {
  protected getProviderConfig(): ProviderConfig {
    return {
      baseUrl: 'https://api.mistral.ai/v1',
      defaultModel: 'mistral-medium-latest',
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }),
      capabilities: {
        streaming: true,
        attachments: true,  // Many models now support vision
        functionCalling: true,
        systemPrompt: true,
        maxTokens: 32768,
        contextWindow: 128000,
      },
    };
  }
}