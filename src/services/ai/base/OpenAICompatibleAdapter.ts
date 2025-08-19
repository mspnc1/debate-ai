import { Message, MessageAttachment } from '../../../types';
import { getDefaultModel, resolveModelAlias } from '../../../config/providers/modelRegistry';
import { BaseAdapter } from './BaseAdapter';
import { 
  ResumptionContext, 
  SendMessageResponse,
  FormattedMessage,
  AdapterCapabilities,
  ProviderConfig 
} from '../types/adapter.types';

export abstract class OpenAICompatibleAdapter extends BaseAdapter {
  protected abstract getProviderConfig(): ProviderConfig;
  
  getCapabilities(): AdapterCapabilities {
    return this.getProviderConfig().capabilities;
  }
  
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    modelOverride?: string
  ): Promise<SendMessageResponse> {
    const config = this.getProviderConfig();
    const resolvedModel = modelOverride || 
                         resolveModelAlias(this.config.model || getDefaultModel(this.config.provider));
    
    const messages: FormattedMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      ...this.formatHistory(conversationHistory, resumptionContext),
      { role: 'user', content: this.formatUserMessage(message, attachments) }
    ];
    
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: config.headers(this.config.apiKey),
        body: JSON.stringify({
          model: resolvedModel,
          messages,
          temperature: this.config.parameters?.temperature || 0.7,
          max_tokens: this.config.parameters?.maxTokens || 2048,
          top_p: this.config.parameters?.topP,
          stream: false,
        }),
      });
      
      if (!response.ok) {
        await this.handleApiError(response, this.config.provider);
      }
      
      const data = await response.json();
      
      return {
        response: data.choices[0].message.content,
        modelUsed: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error(`Error in ${this.config.provider} adapter:`, error);
      throw error;
    }
  }
  
  protected formatUserMessage(message: string, attachments?: MessageAttachment[]): string | Array<{ type: string; text?: string; image_url?: { url: string } }> {
    if (!attachments || attachments.length === 0) {
      return message;
    }
    
    const capabilities = this.getCapabilities();
    if (!capabilities.attachments) {
      return message;
    }
    
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ type: 'text', text: message }];
    
    for (const attachment of attachments) {
      if (attachment.type === 'image') {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: attachment.uri.startsWith('data:') 
              ? attachment.uri 
              : `data:${attachment.mimeType || 'image/jpeg'};base64,${attachment.base64}`
          }
        });
      }
    }
    
    return contentParts;
  }
  
  async *streamMessage(
    message: string,
    conversationHistory: Message[] = [],
    attachments?: MessageAttachment[]
  ): AsyncGenerator<string, void, unknown> {
    const config = this.getProviderConfig();
    const resolvedModel = resolveModelAlias(this.config.model || getDefaultModel(this.config.provider));
    
    const messages: FormattedMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      ...this.formatHistory(conversationHistory),
      { role: 'user', content: this.formatUserMessage(message, attachments) }
    ];
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: config.headers(this.config.apiKey),
      body: JSON.stringify({
        model: resolvedModel,
        messages,
        temperature: this.config.parameters?.temperature || 0.7,
        max_tokens: this.config.parameters?.maxTokens || 2048,
        stream: true,
      }),
    });
    
    if (!response.ok) {
      await this.handleApiError(response, this.config.provider);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
        
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
}