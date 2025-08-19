import { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import { ProviderConfig } from '../../types/adapter.types';

export class ChatGPTAdapter extends OpenAICompatibleAdapter {
  protected getProviderConfig(): ProviderConfig {
    return {
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4-turbo-preview',
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }),
      capabilities: {
        streaming: true,
        attachments: true,
        functionCalling: true,
        systemPrompt: true,
        maxTokens: 4096,
        contextWindow: 128000,
      },
    };
  }
}