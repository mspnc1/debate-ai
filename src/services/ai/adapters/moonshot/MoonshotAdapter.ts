import { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import { ProviderConfig } from '../../types/adapter.types';

export class MoonshotAdapter extends OpenAICompatibleAdapter {
  protected getProviderConfig(): ProviderConfig {
    return {
      baseUrl: 'https://api.moonshot.ai/v1',
      defaultModel: 'kimi-k3',
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }),
      capabilities: {
        streaming: true,
        attachments: true,  // Kimi K3 and K2.x are natively multimodal
        supportsImages: true,
        supportsDocuments: false,
        functionCalling: true,
        systemPrompt: true,
        maxTokens: 16384,
        contextWindow: 1000000,
      },
    };
  }
}
