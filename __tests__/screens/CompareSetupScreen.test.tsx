import React from 'react';
import { act } from '@testing-library/react-native';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { setAIPersonality, setAIModel, showSheet, stageComposerAttachments } from '@/store';
import type { AIConfig } from '@/types';
import type { AISelectionConfig } from '@/types/aiSelection';

const mockDispatch = jest.fn();
const mockUseFeatureAccess = jest.fn();
const mockUseComposerSelection = jest.fn();
let mockDemoBannerProps: any;
let mockCompareSamplePickerProps: any;
let mockComposerProps: any;

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('@/hooks/useFeatureAccess', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseFeatureAccess(...args),
  useFeatureAccess: (...args: unknown[]) => mockUseFeatureAccess(...args),
}));

jest.mock('@/hooks/home/useComposerSelection', () => ({
  useComposerSelection: (...args: unknown[]) => mockUseComposerSelection(...args),
}));

jest.mock('@/hooks/useGreeting', () => ({
  useGreeting: () => ({
    timeBasedGreeting: 'Compare mode',
    welcomeMessage: 'Pick your AIs',
    greeting: {
      timeBasedGreeting: 'Compare mode',
      welcomeMessage: 'Pick your AIs',
    },
  }),
}));

jest.mock('@/components/molecules/subscription/TrialBanner', () => ({
  TrialBanner: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'trial-banner' }, 'trial-banner');
  },
}));

jest.mock('@/components/molecules/subscription/DemoBanner', () => ({
  DemoBanner: (props: any) => {
    mockDemoBannerProps = props;
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'demo-banner', onPress: props.onPress }, 'demo-banner');
  },
}));

jest.mock('@/components/organisms/demo/CompareSamplePickerModal', () => ({
  CompareSamplePickerModal: (props: any) => {
    mockCompareSamplePickerProps = props;
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'compare-sample-picker' }, props.visible ? 'visible' : 'hidden');
  },
}));

jest.mock('@/components/organisms', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Header: (props: any) => React.createElement(Text, { testID: 'header' }, props.title),
    HeaderActions: () => React.createElement(Text, null, 'actions'),
    AIComposer: (props: any) => {
      mockComposerProps = props;
      return React.createElement(Text, { testID: 'compare-composer' }, 'composer');
    },
  };
});

const mockButton = jest.fn();

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Button: (props: any) => {
      mockButton(props);
      return React.createElement(Text, { accessibilityRole: 'button', onPress: props.onPress }, props.title);
    },
    Typography: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
  };
});

const CompareSetupScreen = require('@/screens/CompareSetupScreen').default;

const createAIConfig = (overrides: Partial<AIConfig> = {}): AIConfig => ({
  id: 'claude',
  provider: 'claude' as AIConfig['provider'],
  name: 'Claude',
  model: 'claude-default',
  personality: 'default',
  ...overrides,
});

const createSelectionConfig = (overrides: Partial<AISelectionConfig> = {}): AISelectionConfig => ({
  providerId: 'claude',
  modelId: 'claude-default',
  personalityId: 'default',
  ...overrides,
});

const createSelection = (overrides: Record<string, unknown> = {}) => ({
  configs: [] as AISelectionConfig[],
  configuredAIs: [createAIConfig(), createAIConfig({ id: 'openai', provider: 'openai' as AIConfig['provider'], name: 'OpenAI', model: 'gpt-5' })],
  addProvider: jest.fn(),
  updateConfig: jest.fn(),
  removeConfig: jest.fn(),
  replaceConfigs: jest.fn(),
  selectedAIConfigs: [] as AIConfig[],
  sessionMaps: { personalities: {}, models: {} },
  hasEnoughAIs: false,
  hydrated: true,
  isDemo: false,
  ...overrides,
});

const createReadySelection = () => {
  const leftAI = createAIConfig();
  const rightAI = createAIConfig({ id: 'openai', provider: 'openai' as AIConfig['provider'], name: 'OpenAI', model: 'gpt-5', personality: 'succinct' });
  return {
    selection: createSelection({
      hasEnoughAIs: true,
      configs: [createSelectionConfig(), createSelectionConfig({ providerId: 'openai', modelId: 'gpt-5', personalityId: 'succinct' })],
      selectedAIConfigs: [leftAI, rightAI],
    }),
    leftAI,
    rightAI,
  };
};

const collectTestIds = (node: any, ids: string[] = []): string[] => {
  if (!node) return ids;
  if (Array.isArray(node)) {
    node.forEach((child) => collectTestIds(child, ids));
    return ids;
  }
  if (node.props?.testID) {
    ids.push(node.props.testID);
  }
  node.children?.forEach((child: any) => collectTestIds(child, ids));
  return ids;
};

describe('CompareSetupScreen', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    navigation.navigate.mockClear();
    mockButton.mockClear();
    mockUseFeatureAccess.mockReturnValue({ isDemo: false });
    mockUseComposerSelection.mockReturnValue(createSelection());
    mockDemoBannerProps = undefined;
    mockCompareSamplePickerProps = undefined;
    mockComposerProps = undefined;
  });

  it('wires the composer for compare mode with left/right pill labels', () => {
    const { getByText } = renderWithProviders(
      <CompareSetupScreen navigation={navigation as any} />
    );

    expect(getByText('The Lens')).toBeTruthy();
    expect(mockUseComposerSelection).toHaveBeenCalledWith('compare', { minAIs: 2, maxAIs: 2 });
    expect(mockComposerProps.mode).toBe('compare');
    expect(mockComposerProps.minAIs).toBe(2);
    expect(mockComposerProps.maxAIs).toBe(2);
    expect(mockComposerProps.pillIndexLabels).toEqual(['L', 'R']);
    expect(mockComposerProps.requireText).toBe(true);
  });

  it('places the trial banner between the header and the composer', () => {
    const renderResult = renderWithProviders(
      <CompareSetupScreen navigation={navigation as any} />
    );

    const testIds = collectTestIds(renderResult.toJSON());

    expect(testIds.indexOf('header')).toBeGreaterThanOrEqual(0);
    expect(testIds.indexOf('trial-banner')).toBeGreaterThanOrEqual(0);
    expect(testIds.indexOf('header')).toBeLessThan(testIds.indexOf('trial-banner'));
    expect(testIds.indexOf('trial-banner')).toBeLessThan(testIds.indexOf('compare-composer'));
  });

  it('seeds session maps and navigates with the typed prompt on send', async () => {
    const { selection, leftAI, rightAI } = createReadySelection();
    mockUseComposerSelection.mockReturnValue(selection);

    renderWithProviders(<CompareSetupScreen navigation={navigation as any} />);

    await act(async () => {
      mockComposerProps.onSend('Which of you is funnier?');
    });

    expect(mockDispatch).toHaveBeenCalledWith(setAIPersonality({ aiId: leftAI.id, personalityId: 'default' }));
    expect(mockDispatch).toHaveBeenCalledWith(setAIModel({ aiId: leftAI.id, modelId: leftAI.model }));
    expect(mockDispatch).toHaveBeenCalledWith(setAIPersonality({ aiId: rightAI.id, personalityId: 'succinct' }));
    expect(mockDispatch).toHaveBeenCalledWith(setAIModel({ aiId: rightAI.id, modelId: rightAI.model }));

    expect(navigation.navigate).toHaveBeenCalledWith('CompareSession', {
      leftAI,
      rightAI,
      initialPrompt: 'Which of you is funnier?',
    });
  });

  it('stages composer attachments in Redux and keeps them out of nav params', async () => {
    const { selection, leftAI, rightAI } = createReadySelection();
    mockUseComposerSelection.mockReturnValue(selection);
    const attachment = {
      type: 'document' as const,
      uri: 'file://notes.pdf',
      mimeType: 'application/pdf',
      base64: 'def',
      fileName: 'notes.pdf',
    };

    renderWithProviders(<CompareSetupScreen navigation={navigation as any} />);

    expect(mockComposerProps.allowAttachments).toBe(true);

    await act(async () => {
      mockComposerProps.onSend('Summarize this document', [attachment]);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      stageComposerAttachments({ mode: 'compare', attachments: [attachment] })
    );
    // Nav state is persisted to AsyncStorage — base64 must never ride params.
    expect(navigation.navigate).toHaveBeenCalledWith('CompareSession', {
      leftAI,
      rightAI,
      initialPrompt: 'Summarize this document',
    });
  });

  it('does not navigate when fewer than two AIs are selected', async () => {
    mockUseComposerSelection.mockReturnValue(
      createSelection({ hasEnoughAIs: false, selectedAIConfigs: [createAIConfig()] })
    );

    renderWithProviders(<CompareSetupScreen navigation={navigation as any} />);

    await act(async () => {
      mockComposerProps.onSend('hello');
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('shows demo gating and routes through sample picker', async () => {
    mockUseFeatureAccess.mockReturnValue({ isDemo: true });
    const { selection, leftAI, rightAI } = createReadySelection();
    mockUseComposerSelection.mockReturnValue(selection);

    renderWithProviders(<CompareSetupScreen navigation={navigation as any} />);

    expect(mockDemoBannerProps).toMatchObject({
      subtitle: expect.stringContaining('Demo'),
    });
    expect(mockComposerProps.requireText).toBe(false);
    expect(mockComposerProps.allowAttachments).toBe(false);
    expect(mockComposerProps.allowedProviderIds).toEqual(['claude', 'openai']);

    await act(async () => {
      mockComposerProps.onSend('');
    });

    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockCompareSamplePickerProps).toMatchObject({
      visible: true,
      providers: expect.arrayContaining([leftAI.provider, rightAI.provider]),
    });

    await act(async () => {
      mockCompareSamplePickerProps.onSelect?.('demo-1');
    });

    expect(navigation.navigate).toHaveBeenCalledWith('CompareSession', expect.objectContaining({
      leftAI: expect.objectContaining({ id: leftAI.id }),
      rightAI: expect.objectContaining({ id: rightAI.id }),
      demoSampleId: 'demo-1',
    }));

    await act(async () => {
      mockCompareSamplePickerProps.onClose?.();
    });

    expect(mockCompareSamplePickerProps.visible).toBe(false);

    await act(async () => {
      mockDemoBannerProps.onPress();
    });

    expect(mockDispatch).toHaveBeenCalledWith(showSheet({ sheet: 'subscription' }));
  });

  it('prompts to add API keys when fewer than two providers configured', async () => {
    mockUseComposerSelection.mockReturnValue(
      createSelection({ configuredAIs: [createAIConfig()] })
    );

    renderWithProviders(<CompareSetupScreen navigation={navigation as any} />);

    const addKeyCall = mockButton.mock.calls.find(([props]) => props.title === 'Add AI Keys');
    expect(addKeyCall).toBeDefined();

    await act(async () => {
      addKeyCall?.[0].onPress();
    });

    expect(navigation.navigate).toHaveBeenCalledWith('APIConfig');
  });

  it('seeds pills from history rematch route params', () => {
    const selection = createSelection();
    mockUseComposerSelection.mockReturnValue(selection);

    const preselectedLeftAI = createAIConfig({ personality: 'friendly' });
    const preselectedRightAI = createAIConfig({ id: 'openai', provider: 'openai' as AIConfig['provider'], name: 'OpenAI', model: 'gpt-5' });

    renderWithProviders(
      <CompareSetupScreen
        navigation={navigation as any}
        route={{ params: { preselectedLeftAI, preselectedRightAI } }}
      />
    );

    expect(selection.replaceConfigs).toHaveBeenCalledWith([
      { providerId: 'claude', modelId: 'claude-default', personalityId: 'friendly' },
      { providerId: 'openai', modelId: 'gpt-5', personalityId: 'default' },
    ]);
  });
});
