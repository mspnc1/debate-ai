import { Message, MessageAttachment } from '../../../../types';
import { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import { ProviderConfig, ResumptionContext, SendMessageResponse } from '../../types/adapter.types';
import { getDefaultModel, resolveModelAlias } from '../../../../config/providers/modelRegistry';
import { processPerplexityResponse } from '../../../../utils/responseProcessor';

export class PerplexityAdapter extends OpenAICompatibleAdapter {
  protected getProviderConfig(): ProviderConfig {
    return {
      baseUrl: 'https://api.perplexity.ai',
      defaultModel: 'sonar',  // Updated to working model
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }),
      capabilities: {
        streaming: true,
        attachments: true,  // Supports images via OpenAI format
        supportsImages: true,  // Enabled for testing
        supportsDocuments: true,  // Enabled for testing
        functionCalling: false,
        systemPrompt: true,
        maxTokens: 4096,
        contextWindow: 200000,
      },
    };
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
    
    // Format user message with attachments if present
    interface MessageContent {
      type: string;
      text?: string;
      image_url?: { url: string };
    }
    
    let userMessage: { role: 'user' | 'system' | 'assistant'; content: string | MessageContent[] } = { 
      role: 'user' as const, 
      content: message 
    };
    
    if (attachments && attachments.length > 0) {
      // Use OpenAI-style content array for messages with attachments
      const contentArray: MessageContent[] = [{ type: 'text', text: message }];
      
      for (const attachment of attachments) {
        if (attachment.type === 'image') {
          // Use base64 if available, otherwise use URI
          const imageUrl = attachment.base64 
            ? `data:${attachment.mimeType};base64,${attachment.base64}`
            : attachment.uri;
          
          contentArray.push({
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          });
        }
      }
      
      userMessage = { role: 'user' as const, content: contentArray };
    }
    
    const messages = [
      { role: 'system' as const, content: this.getSystemPrompt() },
      ...this.formatHistory(conversationHistory, resumptionContext),
      userMessage
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
          // Perplexity-specific parameters
          return_citations: true,  // Include source citations
          search_recency_filter: 'month',  // Default to recent results
        }),
      });
      
      if (!response.ok) {
        await this.handleApiError(response, 'Perplexity');
      }
      
      const data = await response.json();
      
      // Process response to extract citations
      const rawContent = data.choices[0].message.content || '';
      const processed = processPerplexityResponse(
        rawContent,
        data.citations,
        data.search_results
      );
      
      return {
        response: processed.content,
        modelUsed: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
        metadata: {
          citations: processed.citations,
        },
      };
    } catch (error) {
      console.error('Error in Perplexity adapter:', error);
      throw error;
    }
  }
}