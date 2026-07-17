import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { DebateAISelector } from '@/components/organisms/debate/DebateAISelector';
import type { AIConfig } from '@/types';

interface DynamicAISelectorMockProps {
  getBadge: (ai: AIConfig) => { text: string; color?: string } | undefined;
  onToggleAI: (ai: AIConfig) => void;
}

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Typography: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
    GradientButton: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(TouchableOpacity, { onPress, testID: 'next-button' }, React.createElement(Text, null, title)),
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(TouchableOpacity, { onPress, testID: 'back-button' }, React.createElement(Text, null, title)),
    SectionHeader: ({ title, subtitle }: { title: string; subtitle?: string }) =>
      React.createElement(Text, null, `${title}${subtitle ? ` ${subtitle}` : ''}`),
  };
});

let dynamicAISelectorProps: DynamicAISelectorMockProps | undefined;
jest.mock('@/components/organisms/home/DynamicAISelector', () => ({
  DynamicAISelector: (props: DynamicAISelectorMockProps) => {
    dynamicAISelectorProps = props;
    return null;
  },
}));

jest.mock('@/components/organisms/home/ModelSelectorEnhanced', () => ({
  ModelSelectorEnhanced: ({ aiName, onSelectModel, selectedModel }: {
    aiName: string;
    onSelectModel: (modelId: string) => void;
    selectedModel: string;
  }) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(
      TouchableOpacity,
      { onPress: () => onSelectModel('mock-model'), testID: `model-selector-${aiName}` },
      React.createElement(Text, null, `Model selector for ${aiName}: ${selectedModel}`),
    );
  },
}));

describe('DebateAISelector', () => {
  const mockAIs: AIConfig[] = [
    { id: 'openai', provider: 'openai', name: 'ChatGPT', model: 'gpt-5.5' },
    { id: 'google', provider: 'google', name: 'Gemini', model: 'gemini-3.5-flash' },
    { id: 'mistral', provider: 'mistral', name: 'Mistral', model: 'mistral-large-2512' },
  ];

  const defaultProps = {
    selectedTopic: 'Test',
    customTopic: '',
    topicMode: 'preset' as const,
    configuredAIs: mockAIs,
    debaterSlots: [null, null],
    selectedAIs: [],
    maxAIs: 2,
    isPremium: false,
    aiPersonalities: {},
    pendingSelectionTarget: null,
    podcastModeEnabled: false,
    podcastMC: null,
    onTogglePodcastMode: jest.fn(),
    onRequestDebaterSlot: jest.fn(),
    onRemoveDebaterSlot: jest.fn(),
    onRequestPodcastMC: jest.fn(),
    onRemovePodcastMC: jest.fn(),
    onSelectProvider: jest.fn(),
    onPersonalityChange: jest.fn(),
    onAddAI: jest.fn(),
    onNext: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    dynamicAISelectorProps = undefined;
  });

  it('renders AI selector', () => {
    const { getByText } = renderWithProviders(<DebateAISelector {...defaultProps} />);
    expect(getByText('Back to Motion')).toBeTruthy();
    expect(getByText('Debate Teams')).toBeTruthy();
  });

  it('reports the Debate Teams card as a cumulative team scroll anchor', () => {
    const onTeamGridLayout = jest.fn();
    const { getByTestId } = renderWithProviders(
      <DebateAISelector
        {...defaultProps}
        onTeamGridLayout={onTeamGridLayout}
      />
    );

    fireEvent(getByTestId('debate-ai-selector-root'), 'layout', {
      nativeEvent: { layout: { y: 120 } },
    });
    fireEvent(getByTestId('debate-ai-selector-top-stack'), 'layout', {
      nativeEvent: { layout: { y: 40 } },
    });
    fireEvent(getByTestId('debate-team-grid'), 'layout', {
      nativeEvent: { layout: { y: 360 } },
    });

    expect(onTeamGridLayout).toHaveBeenLastCalledWith(520);
  });

  it('provides live search card badges from effective model capability', () => {
    renderWithProviders(<DebateAISelector {...defaultProps} />);

    expect(dynamicAISelectorProps?.getBadge(mockAIs[0])).toEqual({
      text: 'Live Search',
      color: expect.any(String),
    });
    expect(dynamicAISelectorProps?.getBadge(mockAIs[2])).toBeUndefined();
  });

  it('shows enabled pair status when both selected debaters support live search', () => {
    const { getByText } = renderWithProviders(
      <DebateAISelector
        {...defaultProps}
        debaterSlots={[mockAIs[0], mockAIs[1]]}
        selectedAIs={[mockAIs[0], mockAIs[1]]}
      />
    );

    expect(getByText('Live Search enabled for this debate.')).toBeTruthy();
  });

  it('shows unavailable pair status when a selected model lacks live search', () => {
    const { getByText } = renderWithProviders(
      <DebateAISelector
        {...defaultProps}
        debaterSlots={[mockAIs[0], mockAIs[2]]}
        selectedAIs={[mockAIs[0], mockAIs[2]]}
      />
    );

    expect(getByText(/Live Search unavailable:/)).toBeTruthy();
  });

  it('uses provider taps to satisfy the pending slot target', () => {
    renderWithProviders(
      <DebateAISelector
        {...defaultProps}
        pendingSelectionTarget={{ kind: 'debater', index: 1 }}
      />
    );

    dynamicAISelectorProps?.onToggleAI(mockAIs[0]);
    expect(defaultProps.onSelectProvider).toHaveBeenCalledWith(mockAIs[0]);
  });

  it('grays out provider selector after all debater slots are filled until a slot is being changed', () => {
    const { getByTestId, getByText, rerender } = renderWithProviders(
      <DebateAISelector
        {...defaultProps}
        debaterSlots={[mockAIs[0], mockAIs[1]]}
        selectedAIs={[mockAIs[0], mockAIs[1]]}
      />
    );

    expect(getByText('Provider Selector All debater slots are filled. Tap Change on a slot to replace a debater.')).toBeTruthy();
    expect(getByTestId('debate-provider-selector').props.accessibilityState).toEqual({ disabled: true });

    rerender(
      <DebateAISelector
        {...defaultProps}
        debaterSlots={[mockAIs[0], mockAIs[1]]}
        selectedAIs={[mockAIs[0], mockAIs[1]]}
        pendingSelectionTarget={{ kind: 'debater', index: 1 }}
      />
    );

    expect(getByTestId('debate-provider-selector').props.accessibilityState).toEqual({ disabled: false });
  });

  it('opens a slot-local model selector and applies model changes', () => {
    const onModelChange = jest.fn();
    const slotAI = { ...mockAIs[0], id: 'openai-slot' };
    const { getAllByText, getByText, getByTestId, queryByText } = renderWithProviders(
      <DebateAISelector
        {...defaultProps}
        debaterSlots={[slotAI, mockAIs[1]]}
        selectedAIs={[slotAI, mockAIs[1]]}
        selectedModels={{ [slotAI.id]: 'gpt-5.5' }}
        onModelChange={onModelChange}
      />
    );

    expect(queryByText('Affirmative 1 model')).toBeNull();

    fireEvent.press(getAllByText('Model')[0]);

    expect(getByText('Affirmative 1 model')).toBeTruthy();
    expect(getByText('Model selector for ChatGPT: gpt-5.5')).toBeTruthy();

    fireEvent.press(getByTestId('model-selector-ChatGPT'));
    expect(onModelChange).toHaveBeenCalledWith('openai-slot', 'mock-model');
  });

  it('shows the MC slot only when podcast mode is enabled', () => {
    const { queryByText, rerender } = renderWithProviders(<DebateAISelector {...defaultProps} />);
    expect(queryByText('No MC selected')).toBeNull();

    rerender(
      <DebateAISelector
        {...defaultProps}
        podcastModeEnabled
      />
    );
    expect(queryByText('No MC selected')).toBeTruthy();
    expect(queryByText('Add MC')).toBeTruthy();
  });
});
