// Core type definitions for DebateAI

export type AIProvider = 'claude' | 'chatgpt' | 'gemini' | 'nomi' | 'replika' | 'character';
export type UIMode = 'simple' | 'expert';
export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface User {
  id: string;
  email?: string;
  subscription: SubscriptionTier;
  uiMode: UIMode;
  apiKeys?: {
    claude?: string;
    openai?: string;
    google?: string;
    nomi?: string;
    replika?: string;
    character?: string;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
  };
}

export interface AIConfig {
  id: string;
  provider: AIProvider;
  name: string;
  model?: string;
  personality?: string;
  avatar?: string;
  icon?: string | number; // Logo image or letter
  iconType?: 'image' | 'letter';
  color?: string;
}

export interface Message {
  id: string;
  sender: string;
  senderType: 'user' | 'ai';
  content: string;
  timestamp: number;
  mentions?: string[];
}

export interface ChatSession {
  id: string;
  selectedAIs: AIConfig[];
  messages: Message[];
  isActive: boolean;
  createdAt: number;
  startTime?: number;
}

export interface PersonalityConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  traits: {
    formality: number; // 0-1
    humor: number; // 0-1
    technicality: number; // 0-1
    empathy: number; // 0-1
  };
  isPremium: boolean;
}

// Expert mode types
export interface ModelParameters {
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  seed?: number;
}

export interface ExpertConfig {
  modelSelection: {
    provider: AIProvider;
    model: string;
    parameters: ModelParameters;
  }[];
  systemPrompt: string;
  contextManagement: 'auto' | 'manual';
  turnOrder: 'round-robin' | 'free-for-all' | 'moderated';
}

// Type alias for AI (same as AIConfig for compatibility)
export type AI = AIConfig;

// Navigation types
export type RootStackParamList = {
  Welcome: undefined;
  MainTabs: undefined;
  Home: undefined;
  Chat: { sessionId: string; initialPrompt?: string };
  Settings: undefined;
  APIConfig: undefined;
  Subscription: undefined;
  ExpertMode: undefined;
  Debate: { selectedAIs: AI[]; topic?: string; personalities?: { [key: string]: string } };
  Stats: undefined;
};