import { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import { ProviderConfig } from '../../types/adapter.types';

export class ZaiAdapter extends OpenAICompatibleAdapter {
  protected getProviderConfig(): ProviderConfig {
    return {
      baseUrl: 'https://api.z.ai/api/paas/v4',
      defaultModel: 'glm-5.2',
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }),
      capabilities: {
        streaming: true,
        attachments: false,  // GLM 5.x text line has no image input (glm-5v-* is retired)
        supportsImages: false,
        supportsDocuments: false,
        functionCalling: true,
        systemPrompt: true,
        maxTokens: 128000,
        contextWindow: 1000000,
      },
    };
  }
}
