import aiSelectionReducer, {
  hydrateAISelection,
  setModeSelection,
  addModeSelection,
  updateModeSelection,
  removeModeSelection,
} from '../aiSelectionSlice';
import type { AISelectionState } from '../aiSelectionSlice';
import { AISelectionConfig } from '../../types/aiSelection';

describe('aiSelectionSlice', () => {
  const makeConfig = (overrides: Partial<AISelectionConfig> = {}): AISelectionConfig => ({
    providerId: 'claude',
    modelId: 'model-a',
    personalityId: 'default',
    ...overrides,
  });

  const initialState: AISelectionState = {
    chat: [],
    compare: [],
    hydrated: false,
  };

  it('returns the initial state', () => {
    expect(aiSelectionReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('hydrateAISelection', () => {
    it('replaces both modes and marks hydrated', () => {
      const chat = [makeConfig(), makeConfig({ providerId: 'openai' })];
      const compare = [makeConfig({ providerId: 'google' })];
      const state = aiSelectionReducer(initialState, hydrateAISelection({ chat, compare }));
      expect(state.chat).toEqual(chat);
      expect(state.compare).toEqual(compare);
      expect(state.hydrated).toBe(true);
    });

    it('clamps to per-mode limits', () => {
      const four = ['claude', 'openai', 'google', 'mistral'].map(providerId =>
        makeConfig({ providerId })
      );
      const state = aiSelectionReducer(initialState, hydrateAISelection({ chat: four, compare: four }));
      expect(state.chat).toHaveLength(3);
      expect(state.compare).toHaveLength(2);
    });
  });

  describe('setModeSelection', () => {
    it('sets only the given mode and clamps', () => {
      const four = ['claude', 'openai', 'google', 'mistral'].map(providerId =>
        makeConfig({ providerId })
      );
      const state = aiSelectionReducer(
        initialState,
        setModeSelection({ mode: 'chat', configs: four })
      );
      expect(state.chat.map(c => c.providerId)).toEqual(['claude', 'openai', 'google']);
      expect(state.compare).toEqual([]);
    });
  });

  describe('addModeSelection', () => {
    it('appends a config', () => {
      const state = aiSelectionReducer(
        initialState,
        addModeSelection({ mode: 'chat', config: makeConfig() })
      );
      expect(state.chat).toHaveLength(1);
    });

    it('ignores duplicate providers in chat', () => {
      let state = aiSelectionReducer(
        initialState,
        addModeSelection({ mode: 'chat', config: makeConfig({ modelId: 'model-a' }) })
      );
      state = aiSelectionReducer(
        state,
        addModeSelection({ mode: 'chat', config: makeConfig({ modelId: 'model-b' }) })
      );
      expect(state.chat).toHaveLength(1);
      expect(state.chat[0].modelId).toBe('model-a');
    });

    it('allows duplicate providers in compare (same provider, two models)', () => {
      let state = aiSelectionReducer(
        initialState,
        addModeSelection({ mode: 'compare', config: makeConfig({ modelId: 'model-a' }) })
      );
      state = aiSelectionReducer(
        state,
        addModeSelection({ mode: 'compare', config: makeConfig({ modelId: 'model-b' }) })
      );
      expect(state.compare).toHaveLength(2);
    });

    it('ignores adds beyond the mode limit', () => {
      let state: AISelectionState = initialState;
      for (const providerId of ['claude', 'openai', 'google', 'mistral']) {
        state = aiSelectionReducer(
          state,
          addModeSelection({ mode: 'chat', config: makeConfig({ providerId }) })
        );
      }
      expect(state.chat).toHaveLength(3);
    });
  });

  describe('updateModeSelection', () => {
    it('replaces the config at the given index', () => {
      let state = aiSelectionReducer(
        initialState,
        addModeSelection({ mode: 'chat', config: makeConfig() })
      );
      state = aiSelectionReducer(
        state,
        updateModeSelection({
          mode: 'chat',
          index: 0,
          config: makeConfig({ personalityId: 'brody' }),
        })
      );
      expect(state.chat[0].personalityId).toBe('brody');
    });

    it('ignores out-of-bounds indices', () => {
      const state = aiSelectionReducer(
        initialState,
        updateModeSelection({ mode: 'chat', index: 1, config: makeConfig() })
      );
      expect(state.chat).toEqual([]);
    });
  });

  describe('removeModeSelection', () => {
    it('removes the config at the given index', () => {
      let state = aiSelectionReducer(
        initialState,
        hydrateAISelection({
          chat: [makeConfig(), makeConfig({ providerId: 'openai' })],
          compare: [],
        })
      );
      state = aiSelectionReducer(state, removeModeSelection({ mode: 'chat', index: 0 }));
      expect(state.chat.map(c => c.providerId)).toEqual(['openai']);
    });

    it('ignores out-of-bounds indices', () => {
      const state = aiSelectionReducer(initialState, removeModeSelection({ mode: 'compare', index: 0 }));
      expect(state.compare).toEqual([]);
    });
  });
});
