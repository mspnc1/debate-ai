import React from 'react';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { DebatePersonalitySelector } from '@/components/organisms/debate/DebatePersonalitySelector';
import type { AIConfig } from '@/types';
import type { MediaProviderVoiceOption } from '@/types/media';

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Typography: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
    GradientButton: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(TouchableOpacity, { onPress, testID: 'start-debate-button' }, React.createElement(Text, null, title)),
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(TouchableOpacity, { onPress, testID: `button-${title}` }, React.createElement(Text, null, title)),
    SectionHeader: () => null,
  };
});

jest.mock('@/components/organisms/common/AIAvatar', () => ({
  AIAvatar: () => null,
}));

jest.mock('@/components/organisms/debate/PersonalityModal', () => ({
  __esModule: true,
  default: () => null,
}));

describe('DebatePersonalitySelector', () => {
  const mockAIs: AIConfig[] = [
    { id: 'claude', provider: 'claude', name: 'Claude', apiKey: 'test', isConfigured: true },
  ];

  const defaultProps = {
    selectedTopic: 'Test',
    customTopic: '',
    topicMode: 'preset' as const,
    selectedAIs: mockAIs,
    aiPersonalities: {},
    onPersonalityChange: jest.fn(),
    onStartDebate: jest.fn(),
    onBack: jest.fn(),
    civility: 3 as 1|2|3|4|5,
    onChangeCivility: jest.fn(),
  };

  it('renders personality selector', () => {
    const { getByText } = renderWithProviders(<DebatePersonalitySelector {...defaultProps} />);
    expect(getByText('Back to AI Selection')).toBeTruthy();
    expect(getByText('Debate Intensity')).toBeTruthy();
    expect(getByText('Hostile')).toBeTruthy();
  });

  it('renders a separate MC voice row in podcast mode', () => {
    const { getByText } = renderWithProviders(
      <DebatePersonalitySelector
        {...defaultProps}
        voiceConfigAvailable
        voiceEnabled
        voiceOptions={[{ id: 'voice-1', name: 'Host Voice' } as MediaProviderVoiceOption]}
        podcastModeEnabled
        podcastMC={{ id: 'mc-1', provider: 'openai', name: 'MC', model: 'gpt-5' }}
        podcastMCVoice={{ voiceId: 'voice-1', voiceName: 'Host Voice' }}
      />
    );

    expect(getByText('Podcast MC')).toBeTruthy();
    expect(getByText('Host Voice')).toBeTruthy();
  });
});
