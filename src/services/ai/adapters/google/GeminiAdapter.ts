import { Message, MessageAttachment } from '../../../../types';
import { getDefaultModel, resolveModelAlias } from '../../../../config/providers/modelRegistry';
import { BaseAdapter } from '../../base/BaseAdapter';
import { 
  ResumptionContext, 
  SendMessageResponse,
  AdapterCapabilities 
} from '../../types/adapter.types';

export class GeminiAdapter extends BaseAdapter {
  getCapabilities(): AdapterCapabilities {
    return {
      streaming: true,
      attachments: true,
      functionCalling: true,
      systemPrompt: true,
      maxTokens: 8192,
      contextWindow: 1048576, // 1M tokens for Gemini 2.5
    };
  }
  
  private formatContents(message: string, attachments?: MessageAttachment[]): Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: message }];
    
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.type === 'image') {
          parts.push({
            inlineData: {
              mimeType: attachment.mimeType || 'image/jpeg',
              data: attachment.base64 || this.extractBase64FromUri(attachment.uri),
            },
          });
        } else if (attachment.type === 'document' && attachment.mimeType === 'application/pdf') {
          parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: attachment.base64 || '',
            },
          });
        }
      }
    }
    
    return parts;
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
  
  private formatHistoryForGemini(
    history: Message[], 
    resumptionContext?: ResumptionContext
  ): Array<{ role: string; parts: Array<{ text: string }> }> {
    const formattedHistory = this.formatHistory(history, resumptionContext);
    const geminiHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    
    if (this.getSystemPrompt() !== 'You are a helpful AI assistant.') {
      geminiHistory.push({
        role: 'user',
        parts: [{ text: 'System: ' + this.getSystemPrompt() }]
      });
      geminiHistory.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }]
      });
    }
    
    for (const msg of formattedHistory) {
      geminiHistory.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content as string }]
      });
    }
    
    return geminiHistory;
  }
  
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    modelOverride?: string
  ): Promise<SendMessageResponse> {
    const resolvedModel = modelOverride || 
                         resolveModelAlias(this.config.model || getDefaultModel('google'));
    
    const contents = [
      ...this.formatHistoryForGemini(conversationHistory, resumptionContext),
      {
        role: 'user',
        parts: this.formatContents(message, attachments)
      }
    ];
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.config.apiKey,
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: this.config.parameters?.temperature || 0.7,
              maxOutputTokens: this.config.parameters?.maxTokens || 2048,
              topP: this.config.parameters?.topP || 0.95,
              topK: this.config.parameters?.topK || 40,
            },
          }),
        }
      );
      
      if (!response.ok) {
        await this.handleApiError(response, 'Gemini');
      }
      
      const data = await response.json();
      
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error('No response from Gemini');
      }
      
      return {
        response: responseText,
        modelUsed: resolvedModel,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        } : undefined,
      };
    } catch (error) {
      console.error('Error in GeminiAdapter:', error);
      throw error;
    }
  }
  
  async *streamMessage(
    message: string,
    conversationHistory: Message[] = [],
    attachments?: MessageAttachment[]
  ): AsyncGenerator<string, void, unknown> {
    const resolvedModel = resolveModelAlias(this.config.model || getDefaultModel('google'));
    
    const contents = [
      ...this.formatHistoryForGemini(conversationHistory),
      {
        role: 'user',
        parts: this.formatContents(message, attachments)
      }
    ];
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:streamGenerateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: this.config.parameters?.temperature || 0.7,
            maxOutputTokens: this.config.parameters?.maxTokens || 2048,
          },
        }),
      }
    );
    
    if (!response.ok) {
      await this.handleApiError(response, 'Gemini');
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
        if (line.trim() === '') continue;
        
        try {
          const data = JSON.parse(line);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            yield text;
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
  }
}