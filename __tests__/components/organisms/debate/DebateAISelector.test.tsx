import React from 'react';
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
  ModelSelectorEnhanced: () => null,
}));

describe('DebateAISelector', () => {
  const mockAIs: AIConfig[] = [
    { id: 'openai', provider: 'openai', name: 'ChatGPT', model: 'gpt-5.5' },
    { id: 'google', provider: 'google', name: 'Gemini', model: 'gemini-3.5-flash' },
    { id: 'claude', provider: 'claude', name: 'Claude', model: 'claude-sonnet-4-6' },
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
