import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { PersonalityModal } from '@/components/organisms/debate/PersonalityModal';

let mockSafeAreaInsets = { top: 0, bottom: 32, left: 0, right: 0 };

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Typography: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
    SheetHeader: ({ onClose }: { onClose: () => void }) =>
      React.createElement(TouchableOpacity, { onPress: onClose, testID: 'close-button' }),
    GradientButton: ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) =>
      React.createElement(TouchableOpacity, { onPress, testID: 'confirm-button', disabled }, React.createElement(Text, null, title)),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockSafeAreaInsets,
}));

describe('PersonalityModal', () => {
  const mockPersonalities = [
    { id: 'default', name: 'Default', emoji: '🤖', tagline: 'Standard', bio: 'Normal', signatureMoves: [] },
  ];

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    selectedPersonalityId: 'default',
    availablePersonalities: mockPersonalities,
  };

  beforeEach(() => {
    mockSafeAreaInsets = { top: 0, bottom: 32, left: 0, right: 0 };
    jest.clearAllMocks();
  });

  it('renders when visible', () => {
    const { getByText } = renderWithProviders(<PersonalityModal {...defaultProps} />);
    expect(getByText('🤖 Default')).toBeTruthy();
  });

  it('calls onConfirm when confirmed', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderWithProviders(<PersonalityModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.press(getByTestId('confirm-button'));
    expect(onConfirm).toHaveBeenCalledWith('default');
  });

  it('calls onClose when closed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(<PersonalityModal {...defaultProps} onClose={onClose} />);
    fireEvent.press(getByTestId('close-button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps the confirm action above the bottom safe area', () => {
    const { getByTestId } = renderWithProviders(<PersonalityModal {...defaultProps} />);
    expect(getByTestId('personality-modal-action-bar')).toHaveStyle({
      paddingBottom: 44,
    });
  });

  it('keeps the sheet below the camera and cutout area', () => {
    mockSafeAreaInsets = { top: 50, bottom: 32, left: 0, right: 0 };
    const { getByTestId } = renderWithProviders(<PersonalityModal {...defaultProps} />);
    expect(getByTestId('personality-modal-sheet')).toHaveStyle({
      top: 90,
    });
  });
});
