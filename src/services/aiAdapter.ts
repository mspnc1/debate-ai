// Universal AI Adapter Service for React Native
import { AIProvider, ModelParameters, PersonalityConfig, Message, MessageAttachment } from '../types';
import { PersonalityOption } from '../config/personalities';
import { getDefaultModel, resolveModelAlias } from '../config/providers/modelRegistry';

interface AIAdapterConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  personality?: PersonalityConfig;
  parameters?: ModelParameters;
  isDebateMode?: boolean;
}

export interface ResumptionContext {
  originalPrompt: Message;
  isResuming: boolean;
}

// Base adapter class
abstract class AIAdapter {
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
  ): Promise<string | { response: string; modelUsed?: string }>;
  
  protected getSystemPrompt(): string {
    // Check if this is a debate context - personality is handled in the debate prompt itself
    if (this.config.isDebateMode) {
      return 'You are participating in a lively debate. Take strong positions, directly address and challenge the previous speaker\'s arguments, and make compelling points. Be respectful but assertive. Build on or refute what was just said. Provide substantive arguments with examples, reasoning, or evidence. Aim for responses that are engaging and thought-provoking (3-5 sentences).';
    }
    if (this.config.personality) {
      // Handle both PersonalityConfig and PersonalityOption types
      if (typeof this.config.personality === 'object' && 'systemPrompt' in this.config.personality) {
        return this.config.personality.systemPrompt;
      }
    }
    return 'You are a helpful AI assistant.';
  }
  
  // Method to temporarily set personality for a single message
  setTemporaryPersonality(personality: PersonalityConfig | undefined): void {
    this.config.personality = personality;
  }
  
  protected formatHistory(
    history: Message[], 
    resumptionContext?: ResumptionContext
  ): Array<{ role: string; content: string }> {
    let formattedMessages: Array<{ role: string; content: string }> = [];
    
    // If resuming, include the original prompt first
    if (resumptionContext?.isResuming && resumptionContext.originalPrompt) {
      // Add a system message explaining the continuation
      const originalContent = resumptionContext.originalPrompt.content || '';
      formattedMessages.push({
        role: 'assistant',
        content: `[Note: You're continuing a conversation that started with: "${originalContent.substring(0, 100)}${originalContent.length > 100 ? '...' : ''}"]`
      });
      
      // Include the original prompt if it's not already in recent history
      const recentHistory = history.slice(-10);
      if (!recentHistory.some(msg => msg.id === resumptionContext.originalPrompt.id)) {
        formattedMessages.push({
          role: 'user',
          content: originalContent
        });
      }
    }
    
    // Add recent conversation history
    const recentMessages = history.slice(-10).map(msg => ({
      role: msg.senderType === 'user' ? 'user' : 'assistant',
      content: msg.content || ''
    })).filter(msg => msg.content);
    
    formattedMessages = [...formattedMessages, ...recentMessages];
    
    return formattedMessages;
  }
}

// Claude Adapter with full feature support
class ClaudeAdapter extends AIAdapter {
  private lastModelUsed?: string;
  
  // Get the last model that was actually used
  public getLastModelUsed(): string | undefined {
    return this.lastModelUsed;
  }
  
  // Check if model supports extended features
  private getModelCapabilities(modelId: string) {
    const supports1MContext = modelId.includes('claude-4-sonnet') || modelId.includes('claude-sonnet-4');
    const supports128KOutput = modelId.includes('claude-3-7') || modelId.includes('claude-4');
    const supportsVision = modelId.includes('claude-3') || modelId.includes('claude-4') || modelId.includes('claude-opus-4');
    
    return { supports1MContext, supports128KOutput, supportsVision };
  }
  
  // Format message content with attachments
  private formatMessageContent(
    message: string, 
    attachments?: MessageAttachment[]
  ): string | Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string; document?: { type: string; source: { type: string; media_type: string; data: string } } }> {
    if (!attachments || attachments.length === 0) {
      return message;
    }
    
    // Build content array for messages with attachments
    const content: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string; document?: { type: string; source: { type: string; media_type: string; data: string } } }> = [];
    
    // Add images and documents
    attachments.forEach(attachment => {
      if (attachment.base64) {
        if (attachment.type === 'image') {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.mimeType,
              data: attachment.base64,
            },
          });
        } else if (attachment.type === 'document') {
          // Claude handles documents as text with base64 encoded content
          // We'll add it as a special text block with document context
          const fileName = attachment.fileName || 'document';
          content.push({
            type: 'text',
            text: `[Document: ${fileName}]\n\n<document type="${attachment.mimeType}" encoding="base64">\n${attachment.base64}\n</document>`,
          });
        }
      }
    });
    
    // Add text content
    if (message) {
      content.push({
        type: 'text',
        text: message,
      });
    }
    
    return content;
  }
  
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[]
  ): Promise<string> {
    // Retry logic for 529 (server overload) errors
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    const modelId = resolveModelAlias(this.config.model || getDefaultModel('claude'));
    // console.log(`[ClaudeAdapter] Sending request with model: ${modelId} (from config: ${this.config.model})`);
    const capabilities = this.getModelCapabilities(modelId);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Add exponential backoff for retries
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Build headers with beta features if supported
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01', // Use the version we tested and know works
        };
        
        // Add beta headers for extended features
        if (capabilities.supports1MContext && this.config.parameters?.useExtendedContext) {
          headers['anthropic-beta'] = 'context-1m-2025-08-07';
        } else if (capabilities.supports128KOutput && this.config.parameters?.useExtendedOutput) {
          headers['anthropic-beta'] = 'output-128k-2025-02-19';
        }
        
        // Format messages with attachment support
        const formattedHistory = this.formatHistory(conversationHistory, resumptionContext);
        const userContent = this.formatMessageContent(message, attachments);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelId,
            max_tokens: this.config.parameters?.maxTokens || 4096, // Increased default for Claude 4
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
          
          // Retry on 529 (server overload) or 503 (service unavailable)
          if (response.status === 529 || response.status === 503) {
            lastError = new Error(`Claude API error: ${response.status} (attempt ${attempt + 1}/${maxRetries}) - ${errorData.error?.message || 'Server overload'}`);
            continue;
          }
          
          throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'} (Model: ${modelId})`);
        }
        
        const data = await response.json();
        
        // Store the model that was actually used
        this.lastModelUsed = data.model;
        
        // Return the response text
        return data.content[0].text;
      } catch (error) {
        lastError = error as Error;
        // Only retry on network errors or specific status codes
        if (attempt === maxRetries - 1) {
          throw lastError;
        }
      }
    }
    
    throw lastError || new Error('Failed to send message to Claude');
  }
  
  // Stream messages for real-time responses
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
        stream: true, // Enable streaming
        system: this.getSystemPrompt(),
        messages: [
          ...this.formatHistory(conversationHistory),
          { role: 'user', content: userContent }
        ],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              yield data.delta.text;
            }
          } catch {
            // Ignore parsing errors for non-JSON lines
          }
        }
      }
    }
  }
}

// ChatGPT Adapter - Enhanced with full features
class ChatGPTAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    modelOverride?: string
  ): Promise<{ response: string; modelUsed?: string }> {
    // const startTime = Date.now();
    const modelId = modelOverride || this.config.model || getDefaultModel('openai');
    const resolvedModel = resolveModelAlias(modelId);

    // Prepare messages with proper formatting
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: 'system', content: this.getSystemPrompt() },
      ...this.formatHistory(conversationHistory, resumptionContext)
    ];

    // Handle attachments for the user message
    if (attachments && attachments.length > 0) {
      const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [{ type: 'text', text: message }];
      
      for (const attachment of attachments) {
        if (attachment.type === 'image' && attachment.base64) {
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: `data:${attachment.mimeType || 'image/jpeg'};base64,${attachment.base64}`
            }
          });
        } else if (attachment.type === 'document' && attachment.base64) {
          // Add document text as part of the message
          const fileName = attachment.fileName || 'document';
          contentParts.push({
            type: 'text',
            text: `\n\nDocument: ${fileName}\n[Document content would be extracted from base64 data]`
          });
        }
      }
      
      messages.push({ role: 'user', content: contentParts });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        max_tokens: this.config.parameters?.maxTokens || 2048,
        temperature: this.config.parameters?.temperature || 0.7,
        top_p: this.config.parameters?.topP,
        frequency_penalty: this.config.parameters?.frequencyPenalty,
        presence_penalty: this.config.parameters?.presencePenalty,
        seed: this.config.parameters?.seed,
        messages: messages,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`OpenAI API error: ${errorData?.error?.message || response.status}`);
    }
    
    const data = await response.json();
    // const responseTime = Date.now() - startTime;
    
    // Extract actual model used from response
    const actualModel = data.model || resolvedModel;
    // console.log(`OpenAI response received (${actualModel}) in ${responseTime}ms`);
    
    return {
      response: data.choices[0].message.content,
      modelUsed: actualModel
    };
  }
}

// Gemini Adapter - Enhanced with full features
class GeminiAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    modelOverride?: string
  ): Promise<{ response: string; modelUsed?: string }> {
    // const startTime = Date.now();
    const modelId = modelOverride || this.config.model || getDefaultModel('google');
    const resolvedModel = resolveModelAlias(modelId);

    // Format conversation history
    const history = this.formatHistory(conversationHistory, resumptionContext)
      .filter(msg => msg && msg.content)
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content || '' }]
      }));
    
    // Prepare message parts with attachments
    const messageParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: message || '' }];
    
    // Add attachments if present
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        if (attachment.type === 'image' && attachment.base64) {
          // Gemini expects inlineData for images
          messageParts.push({
            inlineData: {
              mimeType: attachment.mimeType || 'image/jpeg',
              data: attachment.base64
            }
          });
        } else if (attachment.type === 'document' && attachment.base64) {
          // For documents, extract text and add as text part
          const fileName = attachment.fileName || 'document';
          messageParts.push({ text: `\n\nDocument content from ${fileName}:\n[Document would be processed from base64]` });
        }
      }
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          contents: [
            ...history,
            {
              role: 'user',
              parts: messageParts
            }
          ],
          generationConfig: {
            temperature: this.config.parameters?.temperature || 0.8,
            maxOutputTokens: this.config.parameters?.maxTokens || 2048,
            topP: this.config.parameters?.topP,
            topK: this.config.parameters?.topK,
            stopSequences: this.config.parameters?.stopSequences,
          },
          systemInstruction: {
            parts: [{ text: this.getSystemPrompt() }]
          }
        }),
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`Gemini API error: 429 - Rate limit exceeded. Please wait a moment.`);
      }
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Safely extract the response text
    if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini response structure:', data);
      throw new Error('Invalid response from Gemini API');
    }
    
    // const responseTime = Date.now() - startTime;
    // console.log(`Gemini response received (${resolvedModel}) in ${responseTime}ms`);
    
    return {
      response: data.candidates[0].content.parts[0].text,
      modelUsed: resolvedModel
    };
  }
}

// Perplexity Adapter - OpenAI-compatible with web search
class PerplexityAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    _attachments?: MessageAttachment[],
    _modelOverride?: string
  ): Promise<string> {
    try {
      const messages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...this.formatHistory(conversationHistory, resumptionContext),
        { role: 'user', content: message }
      ];

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'sonar-pro',
          messages,
          temperature: this.config.parameters?.temperature || 0.7,
          max_tokens: this.config.parameters?.maxTokens || 2048,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Perplexity API error: ${errorData?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error in PerplexityAdapter:', error);
      throw error;
    }
  }
}

// Mistral Adapter - OpenAI-compatible
class MistralAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    _attachments?: MessageAttachment[],
    _modelOverride?: string
  ): Promise<string> {
    try {
      const messages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...this.formatHistory(conversationHistory, resumptionContext),
        { role: 'user', content: message }
      ];

      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'mistral-large',
          messages,
          temperature: this.config.parameters?.temperature || 0.7,
          max_tokens: this.config.parameters?.maxTokens || 2048,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Mistral API error: ${errorData?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error in MistralAdapter:', error);
      throw error;
    }
  }
}

// Cohere Adapter - Custom format
class CohereAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    _attachments?: MessageAttachment[],
    _modelOverride?: string
  ): Promise<string> {
    try {
      const chatHistory = this.formatHistory(conversationHistory, resumptionContext).map(msg => ({
        role: msg.role === 'user' ? 'USER' : 'CHATBOT',
        message: msg.content,
      }));

      const response = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'command-r-plus',
          message,
          chat_history: chatHistory,
          temperature: this.config.parameters?.temperature || 0.7,
          max_tokens: this.config.parameters?.maxTokens || 2048,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Cohere API error: ${errorData?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error in CohereAdapter:', error);
      throw error;
    }
  }
}

// Together Adapter - OpenAI-compatible
class TogetherAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    _attachments?: MessageAttachment[],
    _modelOverride?: string
  ): Promise<string> {
    try {
      const messages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...this.formatHistory(conversationHistory, resumptionContext),
        { role: 'user', content: message }
      ];

      const response = await fetch('https://api.together.xyz/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
          messages,
          temperature: this.config.parameters?.temperature || 0.7,
          max_tokens: this.config.parameters?.maxTokens || 2048,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Together API error: ${errorData?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error in TogetherAdapter:', error);
      throw error;
    }
  }
}

// DeepSeek Adapter - OpenAI-compatible
class DeepSeekAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    _attachments?: MessageAttachment[],
    _modelOverride?: string
  ): Promise<string> {
    try {
      const messages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...this.formatHistory(conversationHistory, resumptionContext),
        { role: 'user', content: message }
      ];

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model || 'deepseek-chat',
          messages,
          temperature: this.config.parameters?.temperature || 0.7,
          max_tokens: this.config.parameters?.maxTokens || 2048,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`DeepSeek API error: ${errorData?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error in DeepSeekAdapter:', error);
      throw error;
    }
  }
}

// Factory class
export class AIFactory {
  static create(config: AIAdapterConfig): AIAdapter {
    switch (config.provider) {
      case 'claude':
        return new ClaudeAdapter(config);
      case 'openai':
      case 'chatgpt':
        return new ChatGPTAdapter(config);
      case 'google':
        return new GeminiAdapter(config);
      case 'perplexity':
        return new PerplexityAdapter(config);
      case 'mistral':
        return new MistralAdapter(config);
      case 'cohere':
        return new CohereAdapter(config);
      case 'together':
        return new TogetherAdapter(config);
      case 'deepseek':
        return new DeepSeekAdapter(config);
      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }
  }
}

// Preset personalities
export const PERSONALITIES: Record<string, PersonalityConfig> = {
  neutral: {
    id: 'neutral',
    name: 'Neutral',
    description: 'Standard helpful assistant',
    systemPrompt: 'You are a helpful AI assistant. Keep responses concise and friendly.',
    traits: { formality: 0.5, humor: 0.3, technicality: 0.5, empathy: 0.6 },
    isPremium: false,
  },
  professor: {
    id: 'professor',
    name: 'Professor',
    description: 'Academic and educational',
    systemPrompt: 'You are a knowledgeable professor. Explain concepts clearly and thoroughly. Use examples and analogies.',
    traits: { formality: 0.8, humor: 0.2, technicality: 0.9, empathy: 0.5 },
    isPremium: false,
  },
  sassy: {
    id: 'sassy',
    name: 'Sassy',
    description: 'Witty and sarcastic',
    systemPrompt: 'Be sassy, witty, and a bit sarcastic. Use humor and playful teasing while still being helpful.',
    traits: { formality: 0.2, humor: 0.9, technicality: 0.4, empathy: 0.4 },
    isPremium: true,
  },
  zen: {
    id: 'zen',
    name: 'Zen Master',
    description: 'Calm and philosophical',
    systemPrompt: 'You are a zen master. Speak calmly and philosophically. Offer wisdom and perspective.',
    traits: { formality: 0.6, humor: 0.3, technicality: 0.3, empathy: 0.9 },
    isPremium: true,
  },
  comedian: {
    id: 'comedian',
    name: 'Comedian',
    description: 'Funny and entertaining',
    systemPrompt: 'You are a stand-up comedian. Make jokes, use wordplay, and keep things light and funny.',
    traits: { formality: 0.1, humor: 1.0, technicality: 0.2, empathy: 0.5 },
    isPremium: true,
  },
  therapist: {
    id: 'therapist',
    name: 'Therapist',
    description: 'Supportive and understanding',
    systemPrompt: 'You are a supportive therapist. Listen carefully, show empathy, and offer thoughtful guidance.',
    traits: { formality: 0.7, humor: 0.1, technicality: 0.4, empathy: 1.0 },
    isPremium: true,
  },
};

// Mock adapter for testing without API keys
class MockAIAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    _conversationHistory: Message[] = [],
    _resumptionContext?: ResumptionContext,
    _attachments?: MessageAttachment[],
    _modelOverride?: string
  ): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    const provider = this.config.provider;
    const responses: Record<AIProvider, string[]> = {
      claude: [
        `I understand what you're saying about "${message.slice(0, 30)}..." Let me think about that analytically.`,
        `That's an interesting perspective. From my analysis, there are several factors to consider here.`,
        `Based on the context, I'd suggest we explore this further. What specific aspect interests you most?`,
      ],
      openai: [
        `Great question! "${message.slice(0, 30)}..." is definitely worth discussing.`,
        `I'd be happy to help with that! There are a few ways we could approach this.`,
        `That's a fascinating point! Let me share some thoughts on this.`,
      ],
      chatgpt: [
        `Great question! "${message.slice(0, 30)}..." is definitely worth discussing.`,
        `I'd be happy to help with that! There are a few ways we could approach this.`,
        `That's a fascinating point! Let me share some thoughts on this.`,
      ],
      google: [
        `Analyzing your input: "${message.slice(0, 30)}..." I can see multiple angles here.`,
        `From a data perspective, this is quite intriguing. Let me break it down.`,
        `Interesting query! My analysis suggests several possibilities worth considering.`,
      ],
      perplexity: [
        `Based on current web sources about "${message.slice(0, 30)}...", here's what I found...`,
        `Let me search for the latest information on that topic. According to recent sources...`,
        `That's a timely question! Recent data suggests several interesting perspectives.`,
      ],
      mistral: [
        `Bonjour! Regarding "${message.slice(0, 30)}...", I have some insights to share.`,
        `That's an excellent question. Let me provide a comprehensive analysis.`,
        `From a European perspective, this topic has interesting dimensions.`,
      ],
      cohere: [
        `Let me help you understand "${message.slice(0, 30)}..." through a structured approach.`,
        `Based on semantic analysis, there are several key points to consider.`,
        `That's a great topic for exploration. Let me break down the main concepts.`,
      ],
      together: [
        `Using open-source AI to analyze "${message.slice(0, 30)}..."`,
        `That's interesting! Let me process this with Llama's capabilities.`,
        `From an open-source perspective, here's my take on this topic.`,
      ],
      deepseek: [
        `Let me analyze "${message.slice(0, 30)}..." with deep reasoning.`,
        `That's a coding-related question! Let me provide an efficient solution.`,
        `Based on my analysis, here's a cost-effective approach to your query.`,
      ],
      grok: [
        `Alright, "${message.slice(0, 30)}..." - let me give you the real-time scoop on this.`,
        `Ha! That's a good one. Here's what's actually happening with that...`,
        `Based on the latest information available, here's my take on this.`,
      ],
    };
    
    const providerResponses = responses[provider] || responses.openai;
    return providerResponses[Math.floor(Math.random() * providerResponses.length)];
  }
}

// Service class to manage AI interactions
export class AIService {
  private adapters: Map<string, AIAdapter> = new Map();
  private useMockMode: boolean = false;

  constructor(apiKeys?: { claude?: string; openai?: string; google?: string; perplexity?: string; mistral?: string; cohere?: string; together?: string; deepseek?: string; grok?: string }) {
    this.initializeAdapters(apiKeys);
  }
  
  setPersonality(aiId: string, personality: PersonalityOption): void {
    const adapter = this.adapters.get(aiId);
    if (adapter) {
      // Convert PersonalityOption to PersonalityConfig format
      const personalityConfig: PersonalityConfig = {
        id: personality.id,
        name: personality.name,
        description: personality.description,
        systemPrompt: personality.systemPrompt,
        traits: { formality: 0.5, humor: 0.5, technicality: 0.5, empathy: 0.5 },
        isPremium: personality.id !== 'default',
      };
      adapter.setTemporaryPersonality(personalityConfig);
    }
  }

  private initializeAdapters(apiKeys?: { claude?: string; openai?: string; google?: string; perplexity?: string; mistral?: string; cohere?: string; together?: string; deepseek?: string }) {
    const hasKeys = apiKeys && (apiKeys.claude || apiKeys.openai || apiKeys.google || apiKeys.perplexity || apiKeys.mistral || apiKeys.cohere || apiKeys.together || apiKeys.deepseek);
    this.useMockMode = !hasKeys;

    if (this.useMockMode) {
      // console.log('No API keys configured, using mock mode');
      // Create mock adapters
      this.adapters.set('claude', new MockAIAdapter({
        provider: 'claude',
        apiKey: 'mock',
        personality: PERSONALITIES.neutral,
      }));
      this.adapters.set('openai', new MockAIAdapter({
        provider: 'openai',
        apiKey: 'mock',
        personality: PERSONALITIES.neutral,
      }));
      this.adapters.set('google', new MockAIAdapter({
        provider: 'google',
        apiKey: 'mock',
        personality: PERSONALITIES.neutral,
      }));
      this.adapters.set('perplexity', new MockAIAdapter({
        provider: 'perplexity',
        apiKey: 'mock',
        personality: PERSONALITIES.neutral,
      }));
      this.adapters.set('mistral', new MockAIAdapter({
        provider: 'mistral',
        apiKey: 'mock',
        personality: PERSONALITIES.neutral,
      }));
    } else {
      // Create real adapters for available API keys
      if (apiKeys?.claude) {
        this.adapters.set('claude', AIFactory.create({
          provider: 'claude',
          apiKey: apiKeys.claude,
          personality: PERSONALITIES.neutral,
        }));
      }
      if (apiKeys?.openai) {
        // Store under 'openai' to match the provider ID from aiProviders.ts
        this.adapters.set('openai', AIFactory.create({
          provider: 'openai',
          apiKey: apiKeys.openai,
          personality: PERSONALITIES.neutral,
        }));
      }
      if (apiKeys?.google) {
        this.adapters.set('google', AIFactory.create({
          provider: 'google',
          apiKey: apiKeys.google,
          personality: PERSONALITIES.neutral,
        }));
      }
      if (apiKeys?.perplexity) {
        this.adapters.set('perplexity', AIFactory.create({
          provider: 'perplexity',
          apiKey: apiKeys.perplexity,
          personality: PERSONALITIES.neutral,
        }));
      }
      if (apiKeys?.mistral) {
        this.adapters.set('mistral', AIFactory.create({
          provider: 'mistral',
          apiKey: apiKeys.mistral,
          personality: PERSONALITIES.neutral,
        }));
      }
      if (apiKeys?.cohere) {
        this.adapters.set('cohere', AIFactory.create({
          provider: 'cohere',
          apiKey: apiKeys.cohere,
          personality: PERSONALITIES.neutral,
        }));
      }
      if (apiKeys?.together) {
        this.adapters.set('together', AIFactory.create({
          provider: 'together',
          apiKey: apiKeys.together,
          personality: PERSONALITIES.neutral,
        }));
      }
      if (apiKeys?.deepseek) {
        this.adapters.set('deepseek', AIFactory.create({
          provider: 'deepseek',
          apiKey: apiKeys.deepseek,
          personality: PERSONALITIES.neutral,
        }));
      }
    }
  }

  async sendMessage(
    aiId: string,
    message: string,
    conversationHistory: Message[],
    isDebateMode: boolean = false,
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    modelOverride?: string  // Add model override parameter
  ): Promise<{ response: string; modelUsed?: string }> {
    const adapter = this.adapters.get(aiId);
    if (!adapter) {
      if (this.useMockMode) {
        // Enhanced mock responses for debate mode
        if (isDebateMode && conversationHistory.length > 0) {
          const lastMessage = conversationHistory[conversationHistory.length - 1];
          return { 
            response: `[Mock ${aiId}]: I disagree with "${lastMessage.content.slice(0, 50)}..." because...`,
            modelUsed: 'mock'
          };
        }
        return { 
          response: `[Mock ${aiId}]: I received your message about "${message.slice(0, 50)}..."`,
          modelUsed: 'mock'
        };
      }
      throw new Error(`AI ${aiId} is not configured. Please add API key in settings.`);
    }

    // Set debate mode in adapter config if needed
    if (isDebateMode && adapter.config) {
      adapter.config.isDebateMode = true;
    }

    // Override model if provided
    if (modelOverride && adapter.config) {
      // console.log(`[AIService] Setting model for ${aiId}: ${modelOverride}`);
      adapter.config.model = modelOverride;
    } else if (adapter.config) {
      // console.log(`[AIService] No model override for ${aiId}, using: ${adapter.config.model || 'default'}`);
    }

    try {
      // Send message with all parameters
      const result = await adapter.sendMessage(
        message, 
        conversationHistory, 
        resumptionContext, 
        attachments, 
        modelOverride
      );
      
      // Handle both return types
      if (typeof result === 'string') {
        // Legacy adapters return just a string
        return { response: result, modelUsed: adapter.config.model };
      } else {
        // Enhanced adapters return { response, modelUsed }
        return result;
      }
    } catch (error) {
      console.error(`Error sending message to ${aiId}:`, error);
      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error(`Invalid API key for ${aiId}. Please check your settings.`);
      }
      throw error;
    } finally {
      // Reset debate mode after use
      if (adapter.config) {
        adapter.config.isDebateMode = false;
      }
    }
  }

  isConfigured(aiId: string): boolean {
    return this.adapters.has(aiId);
  }

  getConfiguredAIs(): string[] {
    return Array.from(this.adapters.keys());
  }

  updateApiKeys(apiKeys: { claude?: string; openai?: string; google?: string; perplexity?: string; mistral?: string; cohere?: string; together?: string; deepseek?: string }) {
    this.adapters.clear();
    this.initializeAdapters(apiKeys);
  }
}