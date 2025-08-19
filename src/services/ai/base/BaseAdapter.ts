import { Message, MessageAttachment, PersonalityConfig } from '../../../types';
import { PersonalityOption } from '../../../config/personalities';
import { 
  AIAdapterConfig, 
  ResumptionContext, 
  SendMessageResponse,
  FormattedMessage,
  AdapterCapabilities 
} from '../types/adapter.types';

export abstract class BaseAdapter {
  public config: AIAdapterConfig;
  
  constructor(config: AIAdapterConfig) {
    this.config = config;
  }
  
  abstract sendMessage(
    message: string,
    conversationHistory?: Message[],
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    modelOverride?: string
  ): Promise<SendMessageResponse>;
  
  abstract getCapabilities(): AdapterCapabilities;
  
  protected getSystemPrompt(): string {
    if (this.config.isDebateMode) {
      return 'You are participating in a lively debate. Take strong positions, directly address and challenge the previous speaker\'s arguments, and make compelling points. Be respectful but assertive. Build on or refute what was just said. Provide substantive arguments with examples, reasoning, or evidence. Aim for responses that are engaging and thought-provoking (3-5 sentences).';
    }
    if (this.config.personality) {
      if (typeof this.config.personality === 'object' && 'systemPrompt' in this.config.personality) {
        return this.config.personality.systemPrompt;
      }
    }
    return 'You are a helpful AI assistant.';
  }
  
  setTemporaryPersonality(personality: PersonalityConfig | PersonalityOption | undefined | boolean): void {
    if (typeof personality === 'boolean') {
      // Handle boolean for backwards compatibility
      return;
    }
    if (!personality) {
      this.config.personality = undefined;
      return;
    }
    // Convert PersonalityOption to PersonalityConfig if needed
    if ('systemPrompt' in personality) {
      this.config.personality = personality as PersonalityConfig;
    } else {
      // PersonalityOption - create a basic PersonalityConfig
      const option = personality as PersonalityOption;
      this.config.personality = {
        id: option.id,
        name: option.name,
        description: option.description,
        systemPrompt: `You are ${option.name}: ${option.description}`,
        traits: { formality: 0.5, humor: 0.5, technicality: 0.5, empathy: 0.5 },
        isPremium: false,
      };
    }
  }
  
  protected formatHistory(
    history: Message[], 
    resumptionContext?: ResumptionContext
  ): FormattedMessage[] {
    let formattedMessages: FormattedMessage[] = [];
    
    if (resumptionContext?.isResuming && resumptionContext.originalPrompt) {
      const originalContent = resumptionContext.originalPrompt.content || '';
      formattedMessages.push({
        role: 'assistant',
        content: `[Note: You're continuing a conversation that started with: "${originalContent.substring(0, 100)}${originalContent.length > 100 ? '...' : ''}"]`
      });
      
      const recentHistory = history.slice(-10);
      if (!recentHistory.some(msg => msg.id === resumptionContext.originalPrompt.id)) {
        formattedMessages.push({
          role: 'user',
          content: originalContent
        });
      }
    }
    
    const recentMessages = history.slice(-10).map(msg => ({
      role: (msg.senderType === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.content || ''
    })).filter(msg => msg.content);
    
    formattedMessages = [...formattedMessages, ...recentMessages];
    
    return formattedMessages;
  }
  
  protected async handleApiError(response: Response, provider: string): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || 
                        errorData.message || 
                        response.statusText || 
                        'Unknown error';
    
    throw new Error(`${provider} API error (${response.status}): ${errorMessage}`);
  }
}