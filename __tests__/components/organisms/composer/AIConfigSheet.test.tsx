import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { AIConfigSheet } from '@/components/organisms/composer/AIConfigSheet';
import { getProviderModels } from '@/config/modelConfigs';

jest.mock('@/components/organisms/help/HelpModalHost', () => ({
  HelpModalHost: () => null,
}));

jest.mock('@/hooks/usePersonality', () => ({
  usePersonality: () => ({
    isCustomized: jest.fn().mockReturnValue(false),
  }),
}));

const claudeModels = (getProviderModels('claude') || []).filter((m) => !m.isDeprecated);

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  config: { providerId: 'claude', modelId: claudeModels[0]?.id || '', personalityId: 'default' },
  onChangeModel: jest.fn(),
  onChangePersonality: jest.fn(),
  onRemove: jest.fn(),
  testID: 'ai-config',
};

describe('AIConfigSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the root page with model and personality rows', () => {
    const { getByText, getByTestId } = renderWithProviders(<AIConfigSheet {...baseProps} />);

    expect(getByText('Claude')).toBeTruthy();
    expect(getByTestId('ai-config-model-row')).toBeTruthy();
    expect(getByTestId('ai-config-personality-row')).toBeTruthy();
    expect(getByText('Remove from conversation')).toBeTruthy();
  });

  it('pushes the model page and commits a selection on tap, returning to root', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProviders(
      <AIConfigSheet {...baseProps} />
    );

    fireEvent.press(getByTestId('ai-config-model-row'));
    expect(getByText('Select Model')).toBeTruthy();

    const target = claudeModels[claudeModels.length - 1];
    fireEvent.press(getByTestId(`ai-config-model-list-option-${target.id}`));

    expect(baseProps.onChangeModel).toHaveBeenCalledWith(target.id);
    // Selection pops back to the root page
    expect(queryByTestId('ai-config-back')).toBeNull();
  });

  it('pushes the personality page and commits a selection on tap', () => {
    const { getByTestId, getByText } = renderWithProviders(<AIConfigSheet {...baseProps} />);

    fireEvent.press(getByTestId('ai-config-personality-row'));
    expect(getByText('Choose a Personality')).toBeTruthy();

    fireEvent.press(getByTestId('ai-config-personality-grid-option-bestie'));
    expect(baseProps.onChangePersonality).toHaveBeenCalledWith('bestie');
  });

  it('closes then removes when the destructive action is pressed', () => {
    const { getByText } = renderWithProviders(<AIConfigSheet {...baseProps} />);

    fireEvent.press(getByText('Remove from conversation'));
    expect(baseProps.onClose).toHaveBeenCalled();
    expect(baseProps.onRemove).toHaveBeenCalled();
  });

  it('shows Advanced parameters only when onOpenAdvanced is provided', () => {
    const onOpenAdvanced = jest.fn();
    const { getByText, queryByText, rerender } = renderWithProviders(
      <AIConfigSheet {...baseProps} onOpenAdvanced={onOpenAdvanced} />
    );

    fireEvent.press(getByText('Advanced parameters'));
    expect(baseProps.onClose).toHaveBeenCalled();
    expect(onOpenAdvanced).toHaveBeenCalled();

    rerender(<AIConfigSheet {...baseProps} />);
    expect(queryByText('Advanced parameters')).toBeNull();
  });
});
