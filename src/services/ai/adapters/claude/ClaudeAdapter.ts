import { Message, MessageAttachment } from '../../../../types';
import { getDefaultModel, resolveModelAlias } from '../../../../config/providers/modelRegistry';
import { BaseAdapter } from '../../base/BaseAdapter';
import { 
  ResumptionContext, 
  SendMessageResponse,
  AdapterCapabilities 
} from '../../types/adapter.types';

export class ClaudeAdapter extends BaseAdapter {
  private lastModelUsed?: string;
  
  getCapabilities(): AdapterCapabilities {
    return {
      streaming: true,
      attachments: true,
      functionCalling: true,
      systemPrompt: true,
      maxTokens: 8192,
      contextWindow: 200000,
    };
  }
  
  public getLastModelUsed(): string | undefined {
    return this.lastModelUsed;
  }
  
  private formatMessageContent(message: string, attachments?: MessageAttachment[]): string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> {
    if (!attachments || attachments.length === 0) {
      return message;
    }
    
    const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [{ type: 'text', text: message }];
    
    for (const attachment of attachments) {
      if (attachment.type === 'image') {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: attachment.mimeType || 'image/jpeg',
            data: attachment.base64 || this.extractBase64FromUri(attachment.uri),
          },
        });
      } else if (attachment.type === 'document') {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: attachment.mimeType || 'application/pdf',
            data: attachment.base64 || '',
          },
        });
      }
    }
    
    return content;
  }
  
  private extractBase64FromUri(uri: string): string {
    if (uri.startsWith('data:')) {
      const base64Index = uri.indexOf('base64,');
      if (base64Index !== -1) {
        return uri.substring(base64Index + 7);
      }
    }
    return '';
  }
  
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    modelOverride?: string
  ): Promise<SendMessageResponse> {
    const modelId = modelOverride || 
                   resolveModelAlias(this.config.model || getDefaultModel('claude'));
    
    const userContent = this.formatMessageContent(message, attachments);
    const formattedHistory = this.formatHistory(conversationHistory, resumptionContext);
    
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: this.config.parameters?.maxTokens || 4096,
            temperature: this.config.parameters?.temperature || 0.7,
            top_p: this.config.parameters?.topP,
            top_k: this.config.parameters?.topK,
            system: this.getSystemPrompt(),
            messages: [
              ...formattedHistory,
              { role: 'user', content: userContent }
            ],
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`[ClaudeAdapter] API Error ${response.status} for model ${modelId}:`, errorData);
          
          if (response.status === 529 || response.status === 503) {
            lastError = new Error(`Claude API error: ${response.status} (attempt ${attempt + 1}/${maxRetries})`);
            continue;
          }
          
          throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        this.lastModelUsed = data.model;
        
        return {
          response: data.content[0].text,
          modelUsed: data.model,
          usage: data.usage ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          } : undefined,
        };
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries - 1) {
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error('Failed to send message to Claude');
  }
  
  async *streamMessage(
    message: string,
    conversationHistory: Message[] = [],
    attachments?: MessageAttachment[]
  ): AsyncGenerator<string, void, unknown> {
    const modelId = resolveModelAlias(this.config.model || getDefaultModel('claude'));
    const userContent = this.formatMessageContent(message, attachments);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: this.config.parameters?.maxTokens || 4096,
        temperature: this.config.parameters?.temperature || 0.7,
        stream: true,
        system: this.getSystemPrompt(),
        messages: [
          ...this.formatHistory(conversationHistory),
          { role: 'user', content: userContent }
        ],
      }),
    });
    
    if (!response.ok) {
      await this.handleApiError(response, 'Claude');
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
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              yield data.delta.text;
            }
          } catch {
            // Ignore parsing errors
          }
        }
      }
    }
  }
}