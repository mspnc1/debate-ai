import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { ComposerShell } from '@/components/organisms/composer/ComposerShell';
import { AIComposer } from '@/components/organisms/composer/AIComposer';
import type { AISelectionConfig } from '@/types/aiSelection';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

const mockPickerSheet = jest.fn(() => null);
const mockConfigSheet = jest.fn(() => null);

jest.mock('@/components/organisms/composer/ProviderPickerSheet', () => ({
  ProviderPickerSheet: (props: unknown) => mockPickerSheet(props),
}));

jest.mock('@/components/organisms/composer/AIConfigSheet', () => ({
  AIConfigSheet: (props: unknown) => mockConfigSheet(props),
}));

const shellProps = {
  inputText: '',
  onChangeText: jest.fn(),
  onSend: jest.fn(),
  canSend: false,
  pills: [
    { key: 'claude-0', name: 'Claude', color: '#D97706' },
    { key: 'openai-1', name: 'ChatGPT', color: '#10A37F' },
  ],
  onPillPress: jest.fn(),
  showAddPill: true,
  onAddPill: jest.fn(),
  testID: 'shell',
};

describe('ComposerShell', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a pill per descriptor plus the add pill', () => {
    const { getByText, getByTestId } = renderWithProviders(<ComposerShell {...shellProps} />);
    expect(getByText('Claude')).toBeTruthy();
    expect(getByText('ChatGPT')).toBeTruthy();
    expect(getByTestId('shell-add-ai')).toBeTruthy();
  });

  it('hides the add pill when showAddPill is false', () => {
    const { queryByTestId } = renderWithProviders(
      <ComposerShell {...shellProps} showAddPill={false} />
    );
    expect(queryByTestId('shell-add-ai')).toBeNull();
  });

  it('reports pill presses by index', () => {
    const onPillPress = jest.fn();
    const { getByTestId } = renderWithProviders(
      <ComposerShell {...shellProps} onPillPress={onPillPress} />
    );
    fireEvent.press(getByTestId('shell-pill-1'));
    expect(onPillPress).toHaveBeenCalledWith(1);
  });

  it('blocks send when canSend is false and sends trimmed text when true', () => {
    const onSend = jest.fn();
    const { getByTestId, rerender } = renderWithProviders(
      <ComposerShell {...shellProps} onSend={onSend} inputText="  hello  " />
    );
    fireEvent.press(getByTestId('shell-send'));
    expect(onSend).not.toHaveBeenCalled();

    rerender(<ComposerShell {...shellProps} onSend={onSend} inputText="  hello  " canSend />);
    fireEvent.press(getByTestId('shell-send'));
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('renders validation hint, aboveInput, and leadingAccessory slots', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <ComposerShell
        {...shellProps}
        validationMessage="Add an AI to start chatting"
        aboveInput={<Text testID="above">chip</Text>}
        leadingAccessory={<Text testID="leading">options</Text>}
      />
    );
    expect(getByTestId('shell-validation')).toBeTruthy();
    expect(getByText('Add an AI to start chatting')).toBeTruthy();
    expect(getByTestId('above')).toBeTruthy();
    expect(getByTestId('leading')).toBeTruthy();
  });
});

describe('AIComposer (wrapper parity)', () => {
  beforeEach(() => jest.clearAllMocks());

  const configs: AISelectionConfig[] = [
    { providerId: 'claude', modelId: 'claude-x', personalityId: 'default' },
    { providerId: 'openai', modelId: 'gpt-x', personalityId: 'default' },
  ];

  const composerProps = {
    mode: 'chat' as const,
    configs,
    minAIs: 1,
    maxAIs: 3,
    onAddProvider: jest.fn(),
    onUpdateConfig: jest.fn(),
    onRemoveConfig: jest.fn(),
    configuredProviderIds: ['claude', 'openai'],
    inputText: '',
    onChangeText: jest.fn(),
    onSend: jest.fn(),
    testID: 'composer',
  };

  it('resolves configs to catalog pills and keeps the add pill below maxAIs', () => {
    const { getByText, getByTestId } = renderWithProviders(<AIComposer {...composerProps} />);
    expect(getByText('Claude')).toBeTruthy();
    expect(getByText('ChatGPT')).toBeTruthy();
    expect(getByTestId('composer-add-ai')).toBeTruthy();
  });

  it('requires text before sending, then sends trimmed text', () => {
    const onSend = jest.fn();
    const { getByTestId, rerender } = renderWithProviders(
      <AIComposer {...composerProps} onSend={onSend} />
    );
    fireEvent.press(getByTestId('composer-send'));
    expect(onSend).not.toHaveBeenCalled();

    rerender(<AIComposer {...composerProps} onSend={onSend} inputText="  hi there  " />);
    fireEvent.press(getByTestId('composer-send'));
    expect(onSend).toHaveBeenCalledWith('hi there');
  });

  it('shows the chat validation copy when below minAIs', () => {
    const { getByText } = renderWithProviders(
      <AIComposer {...composerProps} configs={[]} minAIs={1} />
    );
    expect(getByText('Add an AI to start chatting')).toBeTruthy();
  });

  it('opens the config sheet for the tapped pill config', () => {
    const { getByTestId } = renderWithProviders(<AIComposer {...composerProps} />);
    fireEvent.press(getByTestId('composer-pill-1'));
    expect(mockConfigSheet).toHaveBeenLastCalledWith(
      expect.objectContaining({ visible: true, config: configs[1] })
    );
  });

  it('passes compare duplicate policy through to the picker sheet', () => {
    renderWithProviders(<AIComposer {...composerProps} mode="compare" minAIs={2} maxAIs={2} />);
    expect(mockPickerSheet).toHaveBeenLastCalledWith(
      expect.objectContaining({ allowDuplicates: true })
    );
  });
});
