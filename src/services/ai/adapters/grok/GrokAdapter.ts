import { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import { ProviderConfig } from '../../types/adapter.types';

export class GrokAdapter extends OpenAICompatibleAdapter {
  protected getProviderConfig(): ProviderConfig {
    return {
      baseUrl: 'https://api.x.ai/v1',
      defaultModel: 'grok-4.20-0309-non-reasoning',
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }),
      capabilities: {
        streaming: true,
        attachments: true,  // Supports vision models
        supportsImages: true,  // Vision supported via current Grok chat models
        supportsDocuments: false,  // PDFs require separate Files API
        functionCalling: true,
        systemPrompt: true,
        maxTokens: 100000,
        contextWindow: 2000000,
      },
    };
  }
}
