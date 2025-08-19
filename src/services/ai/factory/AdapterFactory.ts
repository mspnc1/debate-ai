import { AIAdapterConfig, AdapterCapabilities } from '../types/adapter.types';
import { BaseAdapter } from '../base/BaseAdapter';
import { AIProvider } from '../../../types';

// Import individual adapters
import { ClaudeAdapter } from '../adapters/claude/ClaudeAdapter';
import { ChatGPTAdapter } from '../adapters/openai/ChatGPTAdapter';
import { GeminiAdapter } from '../adapters/google/GeminiAdapter';
import { PerplexityAdapter } from '../adapters/perplexity/PerplexityAdapter';
import { MistralAdapter } from '../adapters/mistral/MistralAdapter';
import { CohereAdapter } from '../adapters/cohere/CohereAdapter';
import { TogetherAdapter } from '../adapters/together/TogetherAdapter';
import { DeepSeekAdapter } from '../adapters/deepseek/DeepSeekAdapter';
import { GrokAdapter } from '../adapters/grok/GrokAdapter';
import { MockAdapter } from '../adapters/mock/MockAdapter';

// Adapter registry
const ADAPTER_REGISTRY: Record<string, new (config: AIAdapterConfig) => BaseAdapter> = {
  claude: ClaudeAdapter,
  openai: ChatGPTAdapter,
  chatgpt: ChatGPTAdapter,
  google: GeminiAdapter,
  perplexity: PerplexityAdapter,
  mistral: MistralAdapter,
  cohere: CohereAdapter,
  together: TogetherAdapter,
  deepseek: DeepSeekAdapter,
  grok: GrokAdapter,
  mock: MockAdapter,
};

export class AdapterFactory {
  static create(config: AIAdapterConfig): BaseAdapter {
    const AdapterClass = ADAPTER_REGISTRY[config.provider];
    
    if (!AdapterClass) {
      throw new Error(`Unknown AI provider: ${config.provider}`);
    }
    
    return new AdapterClass(config);
  }
  
  static getAvailableProviders(): string[] {
    return Object.keys(ADAPTER_REGISTRY);
  }
  
  static isProviderSupported(provider: string): boolean {
    return provider in ADAPTER_REGISTRY;
  }
  
  static getAdapterCapabilities(provider: string, config: AIAdapterConfig): AdapterCapabilities {
    const adapter = AdapterFactory.create({ ...config, provider: provider as AIProvider });
    return adapter.getCapabilities();
  }
}