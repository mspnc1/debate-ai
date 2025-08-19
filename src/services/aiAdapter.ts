// Backwards compatibility wrapper for the new modular AI adapter architecture
// This file maintains the same API as the original monolithic aiAdapter.ts
// but delegates to the new modular architecture in src/services/ai/

import { AIProvider, ModelParameters, PersonalityConfig, Message, MessageAttachment } from '../types';
import { PersonalityOption } from '../config/personalities';
import { AdapterFactory, BaseAdapter } from './ai';
import type { AIAdapterConfig, ResumptionContext } from './ai';

// Re-export types for backwards compatibility
export type { AIAdapterConfig, ResumptionContext } from './ai';

// Export base adapter for type compatibility
export { BaseAdapter as AIAdapter } from './ai';

// Re-export individual adapters with their original names
export { ClaudeAdapter } from './ai';
export { ChatGPTAdapter } from './ai';
export { GeminiAdapter } from './ai';
export { PerplexityAdapter } from './ai';
export { MistralAdapter } from './ai';
export { CohereAdapter } from './ai';
export { TogetherAdapter } from './ai';
export { DeepSeekAdapter } from './ai';
export { GrokAdapter } from './ai';
export { MockAdapter as MockAIAdapter } from './ai';

// AIFactory for backwards compatibility
export class AIFactory {
  static create(config: AIAdapterConfig): BaseAdapter {
    return AdapterFactory.create(config);
  }
}

// Preset personalities (moved from original file)
export const PERSONALITIES: Record<string, PersonalityConfig> = {
  neutral: {
    id: 'neutral',
    name: 'Neutral',
    description: 'Standard helpful assistant',
    systemPrompt: 'You are a helpful AI assistant. Keep responses concise and friendly.',
    traits: { formality: 0.5, humor: 0.3, technicality: 0.5, empathy: 0.6 },
    isPremium: false,
  },
  // Add other personalities as needed
};

// AIService class for backwards compatibility
export class AIService {
  private adapters: Map<string, BaseAdapter> = new Map();
  
  constructor(apiKeys?: Record<string, string | undefined>) {
    if (apiKeys) {
      this.initializeSync(apiKeys);
    }
  }
  
  private initializeSync(apiKeys: Record<string, string | undefined>): void {
    for (const [provider, apiKey] of Object.entries(apiKeys)) {
      if (apiKey) {
        try {
          this.adapters.set(provider, AdapterFactory.create({
            provider: provider as AIProvider,
            apiKey,
            personality: PERSONALITIES.neutral,
          }));
        } catch (error) {
          console.warn(`Failed to create adapter for ${provider}:`, error);
        }
      }
    }
  }
  
  async initialize(apiKeys?: Record<string, string | undefined>): Promise<void> {
    if (!apiKeys || Object.keys(apiKeys).length === 0) {
      // Create mock adapters
      const mockProviders = ['claude', 'openai', 'google', 'perplexity', 'mistral'];
      for (const provider of mockProviders) {
        this.adapters.set(provider, AdapterFactory.create({
          provider: 'mock' as AIProvider,
          apiKey: 'mock',
          personality: PERSONALITIES.neutral,
        }));
      }
    } else {
      // Create real adapters for available API keys
      for (const [provider, apiKey] of Object.entries(apiKeys)) {
        if (apiKey) {
          try {
            this.adapters.set(provider, AdapterFactory.create({
              provider: provider as AIProvider,
              apiKey,
              personality: PERSONALITIES.neutral,
            }));
          } catch (error) {
            console.warn(`Failed to create adapter for ${provider}:`, error);
          }
        }
      }
    }
  }
  
  getAdapter(provider: string): BaseAdapter | undefined {
    return this.adapters.get(provider);
  }
  
  getAllAdapters(): Map<string, BaseAdapter> {
    return this.adapters;
  }
  
  setPersonality(provider: string, personality: PersonalityConfig | PersonalityOption | undefined): void {
    const adapter = this.adapters.get(provider);
    if (adapter) {
      adapter.setTemporaryPersonality(personality);
    }
  }
  
  async sendMessage(
    provider: string,
    message: string,
    conversationHistory?: Message[],
    isDebateModeOrPersonality?: boolean | PersonalityConfig,
    resumptionContextOrModel?: ResumptionContext | string,
    attachmentsOrParams?: MessageAttachment[] | ModelParameters,
    modelOrDebateMode?: string | boolean
  ): Promise<{ response: string; modelUsed?: string }> {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter found for provider: ${provider}`);
    }
    
    // Handle overloaded parameters based on type checking
    let isDebateMode: boolean | undefined;
    let personality: PersonalityConfig | undefined;
    let resumptionContext: ResumptionContext | undefined;
    let model: string | undefined;
    let attachments: MessageAttachment[] | undefined;
    
    // Parse the overloaded arguments
    if (typeof isDebateModeOrPersonality === 'boolean') {
      isDebateMode = isDebateModeOrPersonality;
    } else if (isDebateModeOrPersonality) {
      personality = isDebateModeOrPersonality;
    }
    
    if (resumptionContextOrModel && typeof resumptionContextOrModel === 'object') {
      resumptionContext = resumptionContextOrModel;
    } else if (typeof resumptionContextOrModel === 'string') {
      model = resumptionContextOrModel;
    }
    
    if (Array.isArray(attachmentsOrParams) && attachmentsOrParams.length > 0) {
      if (attachmentsOrParams[0].type === 'image' || attachmentsOrParams[0].type === 'document') {
        attachments = attachmentsOrParams as MessageAttachment[];
      }
    }
    
    if (typeof modelOrDebateMode === 'string') {
      model = modelOrDebateMode;
    } else if (typeof modelOrDebateMode === 'boolean') {
      isDebateMode = modelOrDebateMode;
    }
    
    // Apply configurations
    if (personality) {
      adapter.setTemporaryPersonality(personality);
    }
    
    if (model) {
      adapter.config.model = model;
    }
    
    if (isDebateMode !== undefined) {
      adapter.config.isDebateMode = isDebateMode;
    }
    
    const result = await adapter.sendMessage(
      message,
      conversationHistory,
      resumptionContext,
      attachments,
      model
    );
    
    // Return the full result object for compatibility
    if (typeof result === 'string') {
      return { response: result, modelUsed: model || adapter.config.model };
    }
    return result;
  }
}