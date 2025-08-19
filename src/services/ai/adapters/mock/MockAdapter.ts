import { Message, MessageAttachment } from '../../../../types';
import { BaseAdapter } from '../../base/BaseAdapter';
import { 
  ResumptionContext, 
  SendMessageResponse,
  AdapterCapabilities 
} from '../../types/adapter.types';

export class MockAdapter extends BaseAdapter {
  getCapabilities(): AdapterCapabilities {
    return {
      streaming: false,
      attachments: false,
      functionCalling: false,
      systemPrompt: true,
      maxTokens: 4096,
      contextWindow: 128000,
    };
  }
  
  async sendMessage(
    _message: string,
    _conversationHistory: Message[] = [],
    _resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    _modelOverride?: string
  ): Promise<SendMessageResponse> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const mockResponses = [
      "I understand your question. Let me provide a thoughtful response.",
      "That's an interesting point. Here's my perspective on it.",
      "Based on what you're asking, I think the key consideration is...",
      "Let me break this down for you step by step.",
      "That's a great question! Here's what I think about it.",
    ];
    
    const attachmentNote = attachments && attachments.length > 0 
      ? ` (I see you've attached ${attachments.length} file${attachments.length > 1 ? 's' : ''})` 
      : '';
    
    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)] + attachmentNote;
    
    return {
      response,
      modelUsed: 'mock-model',
      usage: {
        promptTokens: Math.floor(Math.random() * 100) + 50,
        completionTokens: Math.floor(Math.random() * 50) + 20,
        totalTokens: Math.floor(Math.random() * 150) + 70,
      },
    };
  }
}