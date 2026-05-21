import React from 'react';
import { TouchableOpacity } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { AICard } from '@/components/organisms/home/AICard';
import type { AIConfig } from '@/types';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const mockSelectionIndicator = jest.fn(() => null);
const mockGlassCard = jest.fn(({ children, onPress, disabled }: any) => (
  <TouchableOpacity testID="glass-card" onPress={onPress} disabled={disabled}>
    {children}
  </TouchableOpacity>
));
const mockAiAvatar = jest.fn(() => null);
const mockPersonalityPicker = jest.fn(() => null);
const mockModelSelector = jest.fn(() => null);
const mockCreateElement = React.createElement;

jest.mock('@/components/molecules', () => {
  const { Text } = require('react-native');
  return {
    GlassCard: (props: any) => mockGlassCard(props),
    SelectionIndicator: (props: any) => mockSelectionIndicator(props),
    Typography: ({ children, style }: { children?: React.ReactNode; style?: unknown }) =>
      mockCreateElement(Text, { style }, children),
  };
});

jest.mock('@/components/organisms/common/AIAvatar', () => ({
  AIAvatar: (props: any) => mockAiAvatar(props),
}));

jest.mock('@/components/organisms/home/PersonalityPicker', () => ({
  PersonalityPicker: (props: any) => mockPersonalityPicker(props),
}));

jest.mock('@/components/organisms/home/ModelSelectorEnhanced', () => ({
  ModelSelectorEnhanced: (props: any) => mockModelSelector(props),
}));

const ai: AIConfig = {
  id: 'ai-1',
  name: 'Claude',
  provider: 'claude',
  model: 'haiku',
  color: '#ff6600',
  personality: 'default',
};

describe('AICard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes onPress with haptic feedback when enabled', () => {
    const onPress = jest.fn();

    const { getByTestId } = renderWithProviders(
      <AICard
        ai={ai}
        isSelected={false}
        isDisabled={false}
        onPress={onPress}
        index={0}
      />
    );

    fireEvent.press(getByTestId('glass-card'));
    expect(onPress).toHaveBeenCalledWith(ai);
    expect(require('expo-haptics').impactAsync).toHaveBeenCalled();
  });

  it('does not press when disabled', () => {
    const onPress = jest.fn();

    const { getByTestId } = renderWithProviders(
      <AICard
        ai={ai}
        isSelected={false}
        isDisabled
        onPress={onPress}
        index={1}
      />
    );

    fireEvent.press(getByTestId('glass-card'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows personality and model pickers when selected', () => {
    renderWithProviders(
      <AICard
        ai={{ ...ai, model: 'opus' }}
        isSelected
        isDisabled={false}
        onPress={jest.fn()}
        index={2}
        personalityId="persona-1"
        onPersonalityChange={jest.fn()}
        onModelChange={jest.fn()}
      />
    );

    expect(mockSelectionIndicator).toHaveBeenCalledWith(expect.objectContaining({ isSelected: true, color: '#ff6600' }));
    expect(mockPersonalityPicker).toHaveBeenCalledWith(expect.objectContaining({ currentPersonalityId: 'persona-1' }));
    expect(mockModelSelector).toHaveBeenCalledWith(expect.objectContaining({ compactMode: true, selectedModel: 'opus' }));
  });

  it('renders badges without replacing selected controls', () => {
    const onModelChange = jest.fn();

    const { getByText } = renderWithProviders(
      <AICard
        ai={{ ...ai, model: 'haiku' }}
        isSelected
        isDisabled={false}
        onPress={jest.fn()}
        index={3}
        onModelChange={onModelChange}
        badge={{ text: 'Live Search', color: '#16803c' }}
      />
    );

    expect(getByText('Live Search')).toBeTruthy();
    expect(mockModelSelector).toHaveBeenCalledWith(
      expect.objectContaining({ compactMode: true, selectedModel: 'haiku' })
    );
  });
});
