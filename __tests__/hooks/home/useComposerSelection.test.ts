import { act } from '@testing-library/react-native';
import { renderHookWithProviders } from '../../../test-utils/renderHookWithProviders';
import { useComposerSelection } from '@/hooks/home/useComposerSelection';
import AISelectionPersistenceService from '@/services/home/AISelectionPersistenceService';
import { getProviderDefaultModel } from '@/config/modelConfigs';
import type { RootState } from '@/store';
import type { AISelectionConfig } from '@/types/aiSelection';

const mockUseFeatureAccess = jest.fn();

jest.mock('@/hooks/useFeatureAccess', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseFeatureAccess(...args),
  useFeatureAccess: (...args: unknown[]) => mockUseFeatureAccess(...args),
}));

jest.mock('@/services/home/AISelectionPersistenceService', () => {
  const service = { load: jest.fn(), save: jest.fn() };
  return {
    __esModule: true,
    AISelectionPersistenceService: service,
    default: service,
  };
});

describe('useComposerSelection', () => {
  const mockSave = AISelectionPersistenceService.save as jest.MockedFunction<
    typeof AISelectionPersistenceService.save
  >;

  const claudeDefaultModel = getProviderDefaultModel('claude')?.id as string;
  const openaiDefaultModel = getProviderDefaultModel('openai')?.id as string;

  const makeConfig = (overrides: Partial<AISelectionConfig> = {}): AISelectionConfig => ({
    providerId: 'claude',
    modelId: claudeDefaultModel,
    personalityId: 'default',
    ...overrides,
  });

  const makeState = (
    chat: AISelectionConfig[] = [],
    compare: AISelectionConfig[] = []
  ): Partial<RootState> =>
    ({
      settings: {
        theme: 'light',
        fontSize: 'medium',
        apiKeys: {
          claude: { configured: true, maskedLabel: 'sk-…', updatedAt: 1 },
          openai: { configured: true, maskedLabel: 'sk-…', updatedAt: 1 },
        },
        verifiedProviders: [],
        verificationTimestamps: {},
        verificationModels: {},
        expertMode: {},
        hasCompletedOnboarding: true,
      },
      aiSelection: { chat, compare, hydrated: true },
    }) as unknown as Partial<RootState>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeatureAccess.mockReturnValue({ isDemo: false });
  });

  it('exposes only configs whose provider has an API key, without deleting the rest', () => {
    const hidden = makeConfig({ providerId: 'mistral', modelId: 'anything' });
    const { result, store } = renderHookWithProviders(
      () => useComposerSelection('chat', { minAIs: 1, maxAIs: 3 }),
      { preloadedState: makeState([makeConfig(), hidden]) }
    );

    expect(result.current.configs.map(c => c.providerId)).toEqual(['claude']);
    expect(result.current.configuredAIs.map(ai => ai.id)).toEqual(['claude', 'openai']);
    // Raw state keeps the hidden entry until the user next edits the lineup.
    expect(store.getState().aiSelection.chat).toHaveLength(2);
  });

  it('adds a provider with its default model and persists the selection', () => {
    const { result, store } = renderHookWithProviders(
      () => useComposerSelection('chat', { minAIs: 1, maxAIs: 3 }),
      { preloadedState: makeState() }
    );

    act(() => {
      result.current.addProvider('openai');
    });

    expect(store.getState().aiSelection.chat).toEqual([
      { providerId: 'openai', modelId: openaiDefaultModel, personalityId: 'default' },
    ]);
    expect(mockSave).toHaveBeenCalledWith({
      chat: [{ providerId: 'openai', modelId: openaiDefaultModel, personalityId: 'default' }],
      compare: [],
    });
  });

  it('ignores duplicate providers in chat mode and respects the max limit', () => {
    const { result, store } = renderHookWithProviders(
      () => useComposerSelection('chat', { minAIs: 1, maxAIs: 2 }),
      { preloadedState: makeState([makeConfig()]) }
    );

    act(() => {
      result.current.addProvider('claude');
    });
    expect(store.getState().aiSelection.chat).toHaveLength(1);

    act(() => {
      result.current.addProvider('openai');
    });
    expect(store.getState().aiSelection.chat).toHaveLength(2);

    act(() => {
      result.current.addProvider('google');
    });
    expect(store.getState().aiSelection.chat).toHaveLength(2);
  });

  it('updates and removes configs by visible index', () => {
    const { result, store } = renderHookWithProviders(
      () => useComposerSelection('chat', { minAIs: 1, maxAIs: 3 }),
      {
        preloadedState: makeState([
          makeConfig(),
          makeConfig({ providerId: 'openai', modelId: openaiDefaultModel }),
        ]),
      }
    );

    act(() => {
      result.current.updateConfig(1, { personalityId: 'brody' });
    });
    expect(store.getState().aiSelection.chat[1].personalityId).toBe('brody');

    act(() => {
      result.current.removeConfig(0);
    });
    expect(store.getState().aiSelection.chat.map(c => c.providerId)).toEqual(['openai']);
  });

  it('builds session AIConfigs and maps from the selection', () => {
    const { result } = renderHookWithProviders(
      () => useComposerSelection('chat', { minAIs: 1, maxAIs: 3 }),
      { preloadedState: makeState([makeConfig({ personalityId: 'brody' })]) }
    );

    expect(result.current.hasEnoughAIs).toBe(true);
    expect(result.current.selectedAIConfigs).toEqual([
      expect.objectContaining({
        id: 'claude',
        provider: 'claude',
        model: claudeDefaultModel,
        personality: 'brody',
      }),
    ]);
    expect(result.current.sessionMaps).toEqual({
      personalities: { claude: 'brody' },
      models: { claude: claudeDefaultModel },
    });
  });

  it('does not persist selection changes made in demo mode', () => {
    mockUseFeatureAccess.mockReturnValue({ isDemo: true });
    const { result, store } = renderHookWithProviders(
      () => useComposerSelection('chat', { minAIs: 1, maxAIs: 3 }),
      { preloadedState: makeState() }
    );

    act(() => {
      result.current.addProvider('claude');
    });

    expect(store.getState().aiSelection.chat).toHaveLength(1);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('keeps chat and compare selections independent', () => {
    const { result, store } = renderHookWithProviders(
      () => useComposerSelection('compare', { minAIs: 2, maxAIs: 2 }),
      { preloadedState: makeState([makeConfig()], []) }
    );

    act(() => {
      result.current.addProvider('openai');
    });
    act(() => {
      result.current.addProvider('openai');
    });

    // Compare allows the same provider twice (different models).
    expect(store.getState().aiSelection.compare).toHaveLength(2);
    expect(store.getState().aiSelection.chat).toHaveLength(1);
    expect(result.current.hasEnoughAIs).toBe(true);
  });
});
