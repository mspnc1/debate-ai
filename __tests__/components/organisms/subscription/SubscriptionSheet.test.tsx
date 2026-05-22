import React from 'react';
import { Text } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { SubscriptionSheet } from '@/components/organisms/subscription/SubscriptionSheet';

const mockGradientButton = jest.fn(({ title, onPress, disabled }: any) => (
  <Text accessibilityRole="button" onPress={disabled ? undefined : onPress}>
    {title}
  </Text>
));

const mockButton = jest.fn(({ title, onPress }: any) => (
  <Text accessibilityRole="button" onPress={onPress}>
    {title}
  </Text>
));

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    SheetHeader: ({ title }: any) => React.createElement(Text, null, title),
    GradientButton: (props: any) => mockGradientButton(props),
    Button: (props: any) => mockButton(props),
    Typography: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
  };
});

jest.mock('@/components/organisms/subscription/UnlockEverythingBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    UnlockEverythingBanner: () => React.createElement(Text, null, 'Banner'),
  };
});

const mockPurchaseSubscription = jest.fn().mockResolvedValue({ success: true });
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockShowInfo = jest.fn();
const mockShowError = jest.fn();
const mockUseFeatureAccess = jest.fn(() => ({ canStartTrial: true, refresh: mockRefresh }));

jest.mock('@/services/iap/PurchaseService', () => ({
  PurchaseService: { purchaseSubscription: (...args: any[]) => mockPurchaseSubscription(...args) },
}));

jest.mock('@/services/errors/ErrorService', () => ({
  ErrorService: {
    showInfo: (...args: unknown[]) => mockShowInfo(...args),
    showError: (...args: unknown[]) => mockShowError(...args),
  },
}));

jest.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => mockUseFeatureAccess(),
}));

describe('SubscriptionSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefresh.mockResolvedValue(undefined);
    mockPurchaseSubscription.mockResolvedValue({ success: true });
    mockUseFeatureAccess.mockReturnValue({ canStartTrial: true, refresh: mockRefresh });
  });

  it('launches the trial billing flow without showing success or closing the sheet', async () => {
    const onClose = jest.fn();
    const { getByText } = renderWithProviders(<SubscriptionSheet onClose={onClose} />);

    fireEvent.press(getByText('Start 1 week Free Trial'));

    await waitFor(() => expect(mockPurchaseSubscription).toHaveBeenCalledWith('monthly', { includeTrialOffer: true }));
    expect(onClose).not.toHaveBeenCalled();
    expect(mockShowInfo).not.toHaveBeenCalled();
  });

  it('subscribes without a trial offer when the user is not trial eligible', async () => {
    mockUseFeatureAccess.mockReturnValue({ canStartTrial: false, refresh: mockRefresh });
    const onClose = jest.fn();
    const { getByText } = renderWithProviders(<SubscriptionSheet onClose={onClose} />);

    fireEvent.press(getByText('Subscribe Now'));

    await waitFor(() => expect(mockPurchaseSubscription).toHaveBeenCalledWith('monthly', { includeTrialOffer: false }));
  });

  it('closes when choosing Maybe later', () => {
    const onClose = jest.fn();
    const { getByText } = renderWithProviders(<SubscriptionSheet onClose={onClose} />);

    fireEvent.press(getByText('Maybe later'));
    expect(onClose).toHaveBeenCalled();
  });
});
