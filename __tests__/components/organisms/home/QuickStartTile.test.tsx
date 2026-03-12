import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { QuickStartTile } from '@/components/organisms/home/QuickStartTile';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('QuickStartTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invokes onPress with haptic feedback when enabled', () => {
    const onPress = jest.fn();
    const { getByText } = renderWithProviders(
      <QuickStartTile
        emoji="🔥"
        title="Hot ideas"
        subtitle="Start fast"
        onPress={onPress}
        index={0}
      />
    );

    fireEvent.press(getByText('Hot ideas'));
    expect(onPress).toHaveBeenCalled();
    expect(require('expo-haptics').impactAsync).toHaveBeenCalled();
  });

  it('does not fire when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = renderWithProviders(
      <QuickStartTile
        emoji="🔥"
        title="Hot ideas"
        subtitle="Start fast"
        onPress={onPress}
        index={1}
        disabled
      />
    );

    fireEvent.press(getByText('Hot ideas'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
