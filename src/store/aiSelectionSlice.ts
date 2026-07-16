import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AISelectionConfig, AISelectionMode } from '../types/aiSelection';
import { HOME_CONSTANTS } from '../config/homeConstants';

/**
 * Composer draft selection (Chat/Compare pills), independent of any active
 * session. The chat slice's aiPersonalities/selectedModels maps are wiped by
 * startSession; this slice survives across sessions and is persisted via
 * AISelectionPersistenceService.
 */
export interface AISelectionState {
  chat: AISelectionConfig[];
  compare: AISelectionConfig[];
  hydrated: boolean;
}

const MODE_LIMITS: Record<AISelectionMode, number> = {
  chat: HOME_CONSTANTS.MAX_AIS_FOR_CHAT,
  compare: HOME_CONSTANTS.MAX_AIS_FOR_COMPARE,
};

const initialState: AISelectionState = {
  chat: [],
  compare: [],
  hydrated: false,
};

const clampToLimit = (configs: AISelectionConfig[], mode: AISelectionMode): AISelectionConfig[] =>
  configs.slice(0, MODE_LIMITS[mode]);

const aiSelectionSlice = createSlice({
  name: 'aiSelection',
  initialState,
  reducers: {
    hydrateAISelection: (
      state,
      action: PayloadAction<{ chat: AISelectionConfig[]; compare: AISelectionConfig[] }>
    ) => {
      state.chat = clampToLimit(action.payload.chat, 'chat');
      state.compare = clampToLimit(action.payload.compare, 'compare');
      state.hydrated = true;
    },
    setModeSelection: (
      state,
      action: PayloadAction<{ mode: AISelectionMode; configs: AISelectionConfig[] }>
    ) => {
      state[action.payload.mode] = clampToLimit(action.payload.configs, action.payload.mode);
    },
    addModeSelection: (
      state,
      action: PayloadAction<{ mode: AISelectionMode; config: AISelectionConfig }>
    ) => {
      const { mode, config } = action.payload;
      if (state[mode].length >= MODE_LIMITS[mode]) return;
      // Chat sessions key personality/model maps by provider id, so one pill
      // per provider; Compare legitimately pits a provider against itself.
      if (mode === 'chat' && state.chat.some(c => c.providerId === config.providerId)) return;
      state[mode].push(config);
    },
    updateModeSelection: (
      state,
      action: PayloadAction<{ mode: AISelectionMode; index: number; config: AISelectionConfig }>
    ) => {
      const { mode, index, config } = action.payload;
      if (index < 0 || index >= state[mode].length) return;
      state[mode][index] = config;
    },
    removeModeSelection: (
      state,
      action: PayloadAction<{ mode: AISelectionMode; index: number }>
    ) => {
      const { mode, index } = action.payload;
      if (index < 0 || index >= state[mode].length) return;
      state[mode].splice(index, 1);
    },
  },
});

export const {
  hydrateAISelection,
  setModeSelection,
  addModeSelection,
  updateModeSelection,
  removeModeSelection,
} = aiSelectionSlice.actions;

export default aiSelectionSlice.reducer;
