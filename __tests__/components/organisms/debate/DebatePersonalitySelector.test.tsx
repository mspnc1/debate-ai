import React from 'react';
import { fireEvent } from '@testing-library/react-native';
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
    { id: 'openai', provider: 'openai', name: 'ChatGPT', apiKey: 'test', isConfigured: true },
    { id: 'mistral', provider: 'mistral', name: 'Mistral', apiKey: 'test', isConfigured: true },
    { id: 'google', provider: 'google', name: 'Gemini', apiKey: 'test', isConfigured: true },
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders personality selector', () => {
    const { getByText } = renderWithProviders(<DebatePersonalitySelector {...defaultProps} />);
    expect(getByText('Back to AI Selection')).toBeTruthy();
    expect(getByText('Debate Intensity')).toBeTruthy();
    expect(getByText('Hostile')).toBeTruthy();
  });

  it('groups debaters by team and hides per-AI voice controls while Debate Voices is off', () => {
    const onToggleVoiceEnabled = jest.fn();
    const { getByText, queryByText } = renderWithProviders(
      <DebatePersonalitySelector
        {...defaultProps}
        selectedAIs={mockAIs}
        voiceConfigAvailable
        voiceOptions={[{ id: 'voice-1', name: 'Voice One' } as MediaProviderVoiceOption]}
        onToggleVoiceEnabled={onToggleVoiceEnabled}
      />
    );

    expect(getByText('Affirmative')).toBeTruthy();
    expect(getByText('Negative')).toBeTruthy();
    expect(getByText('Affirmative 2')).toBeTruthy();
    expect(getByText('Negative 2')).toBeTruthy();
    expect(getByText('Optional debater audio. Leave it off for text-only debate content without an MC.')).toBeTruthy();
    expect(queryByText('Voice (optional)')).toBeNull();
    expect(queryByText('Optional, currently off')).toBeNull();

    fireEvent.press(getByText('Off'));
    expect(onToggleVoiceEnabled).toHaveBeenCalledWith(true);
  });

  it('shows optional per-AI voice controls when Debate Voices is on', () => {
    const onTtsModelChange = jest.fn();
    const { getAllByText, getByText } = renderWithProviders(
      <DebatePersonalitySelector
        {...defaultProps}
        selectedAIs={mockAIs}
        voiceConfigAvailable
        voiceEnabled
        ttsModelId="eleven_flash_v2_5"
        onTtsModelChange={onTtsModelChange}
        voiceOptions={[{ id: 'voice-1', name: 'Voice One' } as MediaProviderVoiceOption]}
      />
    );

    expect(getByText('Debate Voices')).toBeTruthy();
    expect(getByText('TTS Model')).toBeTruthy();
    expect(getByText('Lower-cost default for debate and podcast audio.')).toBeTruthy();
    expect(getAllByText('Voice (optional)')).toHaveLength(mockAIs.length);
    expect(getAllByText('Choose a voice')).toHaveLength(mockAIs.length);

    fireEvent.press(getByText('Multilingual'));
    expect(onTtsModelChange).toHaveBeenCalledWith('eleven_multilingual_v2');
  });

  it('renders a separate voice-only MC card in podcast mode', () => {
    const { getByTestId, getByText, getAllByText } = renderWithProviders(
      <DebatePersonalitySelector
        {...defaultProps}
        voiceConfigAvailable
        voiceOptions={[{ id: 'voice-1', name: 'Host Voice' } as MediaProviderVoiceOption]}
        podcastModeEnabled
        podcastMC={{ id: 'mc-1', provider: 'openai', name: 'MC', model: 'gpt-5' }}
        podcastMCVoice={{ voiceId: 'voice-1', voiceName: 'Host Voice' }}
      />
    );

    expect(getByText('Podcast Mode requires a voice for every debater and the MC.')).toBeTruthy();
    expect(getByText('Podcast MC')).toBeTruthy();
    expect(getByText('Host Voice')).toBeTruthy();
    expect(getByTestId('podcast-mc-voice-card')).toBeTruthy();
    expect(getAllByText('Voice (required)')).toHaveLength(defaultProps.selectedAIs.length + 1);
    expect(getAllByText('Personality')).toHaveLength(defaultProps.selectedAIs.length);
  });
});
