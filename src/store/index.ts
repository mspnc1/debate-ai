// Redux store configuration
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, ChatSession, Message, UIMode, SubscriptionTier, AIConfig } from '../types';

// User slice
interface UserState {
  currentUser: User | null;
  isAuthenticated: boolean;
  uiMode: UIMode;
}

const initialUserState: UserState = {
  currentUser: null,
  isAuthenticated: false,
  uiMode: 'simple',
};

const userSlice = createSlice({
  name: 'user',
  initialState: initialUserState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = true;
      state.uiMode = action.payload.uiMode;
    },
    updateUIMode: (state, action: PayloadAction<UIMode>) => {
      state.uiMode = action.payload;
      if (state.currentUser) {
        state.currentUser.uiMode = action.payload;
      }
    },
    updateSubscription: (state, action: PayloadAction<SubscriptionTier>) => {
      if (state.currentUser) {
        state.currentUser.subscription = action.payload;
      }
    },
    logout: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.uiMode = 'simple';
    },
  },
});

// Chat slice
interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  typingAIs: string[];
  isLoading: boolean;
}

const initialChatState: ChatState = {
  currentSession: null,
  sessions: [],
  typingAIs: [],
  isLoading: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState: initialChatState,
  reducers: {
    startSession: (state, action: PayloadAction<{ selectedAIs: AIConfig[] }>) => {
      const newSession: ChatSession = {
        id: `session_${Date.now()}`,
        selectedAIs: action.payload.selectedAIs,
        messages: [],
        isActive: true,
        createdAt: Date.now(),
      };
      // console.log('Redux - Starting new session:', newSession.id);
      state.currentSession = newSession;
      state.sessions.push(newSession);
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      if (state.currentSession) {
        state.currentSession.messages.push(action.payload);
      }
    },
    setTypingAI: (state, action: PayloadAction<{ ai: string; isTyping: boolean }>) => {
      if (action.payload.isTyping) {
        if (!state.typingAIs.includes(action.payload.ai)) {
          state.typingAIs.push(action.payload.ai);
        }
      } else {
        state.typingAIs = state.typingAIs.filter(ai => ai !== action.payload.ai);
      }
    },
    endSession: (state) => {
      if (state.currentSession) {
        state.currentSession.isActive = false;
        state.currentSession = null;
        state.typingAIs = [];
      }
    },
    loadSession: (state, action: PayloadAction<ChatSession>) => {
      state.currentSession = action.payload;
      state.currentSession.isActive = true;
      const existingIndex = state.sessions.findIndex(s => s.id === action.payload.id);
      if (existingIndex >= 0) {
        state.sessions[existingIndex] = action.payload;
      } else {
        state.sessions.push(action.payload);
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

// Settings slice
interface ExpertModeConfig {
  enabled: boolean;
  selectedModel?: string;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
}

interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  apiKeys: {
    claude?: string;
    openai?: string;
    google?: string;
  };
  expertMode: {
    claude?: ExpertModeConfig;
    openai?: ExpertModeConfig;
    google?: ExpertModeConfig;
  };
  hasCompletedOnboarding: boolean;
}

const initialSettingsState: SettingsState = {
  theme: 'auto',
  fontSize: 'medium',
  apiKeys: {},
  expertMode: {},
  hasCompletedOnboarding: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState: initialSettingsState,
  reducers: {
    updateTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
    },
    updateFontSize: (state, action: PayloadAction<'small' | 'medium' | 'large'>) => {
      state.fontSize = action.payload;
    },
    setAPIKey: (state, action: PayloadAction<{ provider: 'claude' | 'openai' | 'google'; key: string }>) => {
      state.apiKeys[action.payload.provider] = action.payload.key;
    },
    updateApiKeys: (state, action: PayloadAction<{ claude?: string; openai?: string; google?: string }>) => {
      state.apiKeys = { ...state.apiKeys, ...action.payload };
    },
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true;
    },
    updateExpertMode: (state, action: PayloadAction<{ 
      provider: 'claude' | 'openai' | 'google'; 
      config: ExpertModeConfig 
    }>) => {
      state.expertMode[action.payload.provider] = action.payload.config;
    },
  },
});

// Configure store
export const store = configureStore({
  reducer: {
    user: userSlice.reducer,
    chat: chatSlice.reducer,
    settings: settingsSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export actions
export const { setUser, updateUIMode, updateSubscription, logout } = userSlice.actions;
export const { startSession, addMessage, setTypingAI, endSession, loadSession, setLoading } = chatSlice.actions;
export const { updateTheme, updateFontSize, setAPIKey, updateApiKeys, completeOnboarding, updateExpertMode } = settingsSlice.actions;