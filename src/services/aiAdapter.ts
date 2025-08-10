// Universal AI Adapter Service for React Native
import { AIProvider, ModelParameters, PersonalityConfig, Message } from '../types';

interface AIAdapterConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  personality?: PersonalityConfig;
  parameters?: ModelParameters;
  isDebateMode?: boolean;
}

// Base adapter class
abstract class AIAdapter {
  public config: AIAdapterConfig;
  
  constructor(config: AIAdapterConfig) {
    this.config = config;
  }
  
  abstract sendMessage(
    message: string,
    conversationHistory?: Message[]
  ): Promise<string>;
  
  protected getSystemPrompt(): string {
    // Check if this is a debate context
    if (this.config.isDebateMode) {
      return 'You are participating in a lively debate. Take strong positions, directly address and challenge the previous speaker\'s arguments, and make compelling points. Be respectful but assertive. Build on or refute what was just said. Provide substantive arguments with examples, reasoning, or evidence. Aim for responses that are engaging and thought-provoking (3-5 sentences).';
    }
    if (this.config.personality) {
      return this.config.personality.systemPrompt;
    }
    return 'You are a helpful AI assistant.';
  }
  
  protected formatHistory(history: Message[]): Array<{ role: string; content: string }> {
    // Include sender names for context in multi-AI conversations
    return history.slice(-10).map(msg => ({
      role: msg.senderType === 'user' ? 'user' : 'assistant',
      content: msg.senderType === 'ai' && msg.sender !== this.config.provider 
        ? `[${msg.sender}]: ${msg.content || ''}`
        : msg.content || ''
    })).filter(msg => msg.content); // Filter out any empty messages
  }
}

// Claude Adapter
class ClaudeAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = []
  ): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.parameters?.maxTokens || 1024,
        temperature: this.config.parameters?.temperature || 0.7,
        top_p: this.config.parameters?.topP,
        system: this.getSystemPrompt(),
        messages: [
          ...this.formatHistory(conversationHistory),
          { role: 'user', content: message }
        ],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
  }
}

// ChatGPT Adapter
class ChatGPTAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = []
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o',
        max_tokens: this.config.parameters?.maxTokens || 1024,
        temperature: this.config.parameters?.temperature || 0.7,
        top_p: this.config.parameters?.topP,
        frequency_penalty: this.config.parameters?.frequencyPenalty,
        presence_penalty: this.config.parameters?.presencePenalty,
        seed: this.config.parameters?.seed,
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          ...this.formatHistory(conversationHistory),
          { role: 'user', content: message }
        ],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Gemini Adapter
class GeminiAdapter extends AIAdapter {
  async sendMessage(
    message: string,
    conversationHistory: Message[] = []
  ): Promise<string> {
    const history = this.formatHistory(conversationHistory)
      .filter(msg => msg && msg.content) // Additional safety check
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content || '' }]
      }));
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model || 'gemini-2.5-flash'}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            ...history,
            {
              role: 'user',
              parts: [{ text: message || '' }]
            }
          ],
          generationConfig: {
            temperature: this.config.parameters?.temperature || 0.8,
            maxOutputTokens: this.config.parameters?.maxTokens || 2048, // Increased for Gemini
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
    
    return data.candidates[0].content.parts[0].text;
  }
}

// Factory class
export class AIFactory {
  static create(config: AIAdapterConfig): AIAdapter {
    switch (config.provider) {
      case 'claude':
        return new ClaudeAdapter(config);
      case 'chatgpt':
        return new ChatGPTAdapter(config);
      case 'gemini':
        return new GeminiAdapter(config);
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
    _conversationHistory: Message[] = []
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
      chatgpt: [
        `Great question! "${message.slice(0, 30)}..." is definitely worth discussing.`,
        `I'd be happy to help with that! There are a few ways we could approach this.`,
        `That's a fascinating point! Let me share some thoughts on this.`,
      ],
      gemini: [
        `Analyzing your input: "${message.slice(0, 30)}..." I can see multiple angles here.`,
        `From a data perspective, this is quite intriguing. Let me break it down.`,
        `Interesting query! My analysis suggests several possibilities worth considering.`,
      ],
    };
    
    const providerResponses = responses[provider] || responses.chatgpt;
    return providerResponses[Math.floor(Math.random() * providerResponses.length)];
  }
}

// Service class to manage AI interactions
export class AIService {
  private adapters: Map<string, AIAdapter> = new Map();
  private useMockMode: boolean = false;

  constructor(apiKeys?: { claude?: string; openai?: string; google?: string }) {
    this.initializeAdapters(apiKeys);
  }

  private initializeAdapters(apiKeys?: { claude?: string; openai?: string; google?: string }) {
    const hasKeys = apiKeys && (apiKeys.claude || apiKeys.openai || apiKeys.google);
    this.useMockMode = !hasKeys;

    if (this.useMockMode) {
      // console.log('No API keys configured, using mock mode');
      // Create mock adapters
      this.adapters.set('claude', new MockAIAdapter({
        provider: 'claude',
        apiKey: 'mock',
        personality: PERSONALITIES.neutral,
      }));
      this.adapters.set('chatgpt', new MockAIAdapter({
        provider: 'chatgpt',
        apiKey: 'mock',
        personality: PERSONALITIES.neutral,
      }));
      this.adapters.set('gemini', new MockAIAdapter({
        provider: 'gemini',
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
        this.adapters.set('chatgpt', AIFactory.create({
          provider: 'chatgpt',
          apiKey: apiKeys.openai,
          personality: PERSONALITIES.neutral,
        }));
      }
      if (apiKeys?.google) {
        this.adapters.set('gemini', AIFactory.create({
          provider: 'gemini',
          apiKey: apiKeys.google,
          personality: PERSONALITIES.neutral,
        }));
      }
    }
  }

  async sendMessage(
    aiId: string,
    message: string,
    conversationHistory: Message[],
    isDebateMode: boolean = false
  ): Promise<string> {
    const adapter = this.adapters.get(aiId);
    if (!adapter) {
      if (this.useMockMode) {
        // Enhanced mock responses for debate mode
        if (isDebateMode && conversationHistory.length > 0) {
          const lastMessage = conversationHistory[conversationHistory.length - 1];
          return `[Mock ${aiId}]: I disagree with "${lastMessage.content.slice(0, 50)}..." because...`;
        }
        return `[Mock ${aiId}]: I received your message about "${message.slice(0, 50)}..."`;
      }
      throw new Error(`AI ${aiId} is not configured. Please add API key in settings.`);
    }

    // Set debate mode in adapter config if needed
    if (isDebateMode && adapter.config) {
      adapter.config.isDebateMode = true;
    }

    try {
      return await adapter.sendMessage(message, conversationHistory);
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

  updateApiKeys(apiKeys: { claude?: string; openai?: string; google?: string }) {
    this.adapters.clear();
    this.initializeAdapters(apiKeys);
  }
}