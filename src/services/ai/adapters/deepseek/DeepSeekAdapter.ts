import { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import { ProviderConfig } from '../../types/adapter.types';

export class DeepSeekAdapter extends OpenAICompatibleAdapter {
  protected getProviderConfig(): ProviderConfig {
    return {
      baseUrl: 'https://api.deepseek.com/v1',
      defaultModel: 'deepseek-chat',
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }),
      capabilities: {
        streaming: true,
        attachments: true,  // Enabled for testing
        supportsImages: true,  // Enabled for testing
        supportsDocuments: true,  // Enabled for testing
        functionCalling: true,
        systemPrompt: true,
        maxTokens: 4096,
        contextWindow: 128000,
      },
    };
  }
}