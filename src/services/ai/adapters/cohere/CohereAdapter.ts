import { Message, MessageAttachment } from '../../../../types';
import { BaseAdapter } from '../../base/BaseAdapter';
import { 
  ResumptionContext, 
  SendMessageResponse,
  AdapterCapabilities 
} from '../../types/adapter.types';

export class CohereAdapter extends BaseAdapter {
  getCapabilities(): AdapterCapabilities {
    return {
      streaming: true,
      attachments: false,
      functionCalling: false,
      systemPrompt: true,
      maxTokens: 4096,
      contextWindow: 128000,
    };
  }
  
  private formatChatHistory(history: Message[], resumptionContext?: ResumptionContext): Array<{ role: string; message: string }> {
    const formattedHistory = this.formatHistory(history, resumptionContext);
    return formattedHistory.map(msg => ({
      role: msg.role === 'user' ? 'USER' : 'ASSISTANT',
      message: msg.content as string,
    }));
  }
  
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    _attachments?: MessageAttachment[],
    _modelOverride?: string
  ): Promise<SendMessageResponse> {
    const chatHistory = this.formatChatHistory(conversationHistory, resumptionContext);
    
    try {
      const response = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'command-r-plus',
          message,
          chat_history: chatHistory,
          temperature: this.config.parameters?.temperature || 0.7,
          max_tokens: this.config.parameters?.maxTokens || 2048,
          preamble: this.getSystemPrompt(),
        }),
      });
      
      if (!response.ok) {
        await this.handleApiError(response, 'Cohere');
      }
      
      const data = await response.json();
      
      return {
        response: data.text,
        modelUsed: this.config.model || 'command-r-plus',
      };
    } catch (error) {
      console.error('Error in CohereAdapter:', error);
      throw error;
    }
  }
}