import { act } from '@testing-library/react-native';
import { renderHookWithProviders } from '../../../test-utils/renderHookWithProviders';
import { useAISelection } from '@/hooks/home/useAISelection';
import type { RootState } from '@/store';
import type { AIConfig } from '@/types';
import { AIConfigurationService } from '@/services/home/AIConfigurationService';
import { isDemoModeEnabled } from '@/services/demo/demoMode';

jest.mock('@/services/home/AIConfigurationService', () => ({
  AIConfigurationService: {
    getConfiguredAIs: jest.fn(),
  },
}));

jest.mock('@/services/demo/demoMode', () => ({
  isDemoModeEnabled: jest.fn(),
}));

jest.mock('@/services/firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
}));

describe('useAISelection', () => {
  const mockGetConfiguredAIs = AIConfigurationService.getConfiguredAIs as jest.MockedFunction<
    typeof AIConfigurationService.getConfiguredAIs
  >;
  const mockIsDemoModeEnabled = isDemoModeEnabled as jest.MockedFunction<typeof isDemoModeEnabled>;

  const configuredAIs: AIConfig[] = [
    {
      id: 'claude',
      provider: 'claude',
      name: 'Claude',
      model: 'claude-sonnet-4-6',
      personality: 'default',
      color: '#f5f5f5',
    },
    {
      id: 'openai',
      provider: 'openai',
      name: 'OpenAI',
      model: 'gpt-5.5',
      personality: 'default',
      color: '#111111',
    },
  ];

  const baseState: Partial<RootState> = {
    settings: {
      theme: 'light',
      fontSize: 'medium',
      apiKeys: { claude: 'key-1', openai: 'key-2' },
      expertMode: {
        claude: { enabled: true, selectedModel: 'claude-3-7-sonnet-20250219' },
      },
      verifiedProviders: [],
      verificationTimestamps: {},
      verificationModels: {},
      hasCompletedOnboarding: true,
    },
    chat: {
      currentSession: null,
      sessions: [],
      typingAIs: [],
      isLoading: false,
      aiPersonalities: { claude: 'default' },
      selectedModels: { claude: 'claude-sonnet-4-6' },
    },
  } as Partial<RootState>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConfiguredAIs.mockReturnValue(configuredAIs);
    mockIsDemoModeEnabled.mockReturnValue(false);
  });

  it('derives configured AIs with expert mode overrides and manages selection state', () => {
    const { result } = renderHookWithProviders(() => useAISelection(1), {
      preloadedState: baseState,
    });

    expect(result.current.configuredAIs).toHaveLength(2);
    expect(result.current.configuredAIs[0].model).toBe('claude-sonnet-4-6');

    expect(result.current.canSelectMore()).toBe(true);
    expect(result.current.isSelectionValid()).toBe(false);
    expect(result.current.getAvailableAICount()).toBe(2);

    act(() => {
      result.current.toggleAI(result.current.configuredAIs[0]);
    });

    expect(result.current.selectedAIs).toHaveLength(1);
    expect(result.current.selectionCount).toBe(1);
    expect(result.current.isAISelected('claude')).toBe(true);
    expect(result.current.canSelectMore()).toBe(false);
    expect(result.current.isSelectionValid()).toBe(true);

    const status = result.current.getSelectionStatus();
    expect(status).toEqual({
      selectedCount: 1,
      maxCount: 1,
      availableCount: 2,
      canSelectMore: false,
      isValid: true,
      atLimit: true,
    });

    act(() => {
      result.current.toggleAI(result.current.configuredAIs[1]);
    });

    expect(result.current.selectedAIs).toHaveLength(1);
    expect(result.current.isAISelected('openai')).toBe(false);

    act(() => {
      result.current.toggleAI(result.current.configuredAIs[0]);
    });

    expect(result.current.selectedAIs).toHaveLength(0);
    expect(result.current.hasSelection).toBe(false);
  });

  it('supports manual selection management helpers', () => {
    const { result } = renderHookWithProviders(() => useAISelection(2), {
      preloadedState: baseState,
    });

    act(() => {
      result.current.selectAIs(configuredAIs);
    });

    expect(result.current.selectedAIs).toHaveLength(2);
    expect(result.current.selectionCount).toBe(2);
    expect(result.current.canSelectMore()).toBe(false);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedAIs).toHaveLength(0);
  });

  it('dispatches personality and model updates to the store', () => {
    const { result, store } = renderHookWithProviders(() => useAISelection(2), {
      preloadedState: baseState,
    });

    act(() => {
      result.current.changePersonality('claude', 'analyst');
      result.current.changeModel('claude', 'claude-opus-4-7');
    });

    const state = store.getState();
    expect(state.chat.aiPersonalities.claude).toBe('analyst');
    expect(state.chat.selectedModels.claude).toBe('claude-opus-4-7');
  });

  it('sanitizes image-generation model selections back to text defaults', () => {
    const { result, store } = renderHookWithProviders(() => useAISelection(2), {
      preloadedState: baseState,
    });

    act(() => {
      result.current.changeModel('openai', 'gpt-image-1');
    });

    const state = store.getState();
    expect(state.chat.selectedModels.openai).toBe('gpt-5.5');
  });
});
