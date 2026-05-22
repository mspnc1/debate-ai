import React from 'react';
import {  Alert } from 'react-native';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { ProfileContent } from '@/components/organisms/profile/ProfileContent';
import type { RootState } from '@/store';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock ErrorService
const mockShowSuccess = jest.fn();
const mockShowInfo = jest.fn();
const mockHandleWithToast = jest.fn();
const mockOpenSubscriptionManagement = jest.fn();
const mockNavigate = jest.fn();
const mockPurchaseSubscription = jest.fn().mockResolvedValue({ success: true });
const mockRestorePurchases = jest.fn().mockResolvedValue({ success: true, restored: false });

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('@/services/errors/ErrorService', () => ({
  ErrorService: {
    showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
    showInfo: (...args: unknown[]) => mockShowInfo(...args),
    handleWithToast: (...args: unknown[]) => mockHandleWithToast(...args),
  },
}));

jest.mock('@/services/subscription/subscriptionManagement', () => ({
  openSubscriptionManagement: (...args: unknown[]) => mockOpenSubscriptionManagement(...args),
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => <>{children}</>,
}));

const mockUseFeatureAccess = jest.fn(() => ({
  isPremium: false,
  isInTrial: false,
  trialDaysRemaining: 0,
  isDemo: true,
  refresh: jest.fn(),
}));

jest.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => mockUseFeatureAccess(),
}));

jest.mock('@/components/molecules', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    ProfileAvatar: () => null,
    Typography: ({ children }: { children: React.ReactNode }) => React.createElement(Text, null, children),
    Button: ({ title, onPress }: { title: string; onPress: () => void }) =>
      React.createElement(
        TouchableOpacity,
        { onPress, testID: title },
        React.createElement(Text, { onPress }, title)
      ),
    SettingRow: ({ title, onPress }: { title: string; onPress?: () => void }) =>
      React.createElement(
        TouchableOpacity,
        { onPress },
        React.createElement(Text, null, title)
      ),
    SheetHeader: () => null,
  };
});

jest.mock('@/components/molecules/auth/EmailAuthForm', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    EmailAuthForm: () => React.createElement(Text, { testID: 'email-auth-form' }, 'Email Form'),
  };
});

jest.mock('@/components/organisms/auth/SocialAuthProviders', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    SocialAuthProviders: () => React.createElement(Text, null, 'Social Providers'),
  };
});

jest.mock('@/components/organisms/subscription/UnlockEverythingBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    UnlockEverythingBanner: () => React.createElement(Text, null, 'Unlock Banner'),
  };
});

jest.mock('@/components/molecules/subscription/TrialBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    TrialBanner: () => React.createElement(Text, null, 'Trial Banner'),
  };
});

jest.mock('@/services/firebase/auth', () => ({
  signOut: jest.fn(),
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  toAuthUser: jest.fn((user) => ({ uid: user.uid, email: user.email })),
}));

const mockDeleteAccount = jest.fn();
jest.mock('@/services/firebase/accountDeletion', () => ({
  deleteAccount: () => mockDeleteAccount(),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(() => ({ data: () => null })),
  serverTimestamp: jest.fn(() => Date.now()),
}));

jest.mock('@/services/iap/PurchaseService', () => ({
  __esModule: true,
  default: {
    purchaseSubscription: (...args: unknown[]) => mockPurchaseSubscription(...args),
    restorePurchases: (...args: unknown[]) => mockRestorePurchases(...args),
  },
}));

const baseAuthState = {
  user: null,
  isAuthenticated: false,
  isPremium: false,
  authLoading: false,
  authModalVisible: false,
  userProfile: null,
  lastAuthMethod: null,
  socialAuthLoading: false,
  socialAuthError: null,
};

const authenticatedState = {
  auth: {
    ...baseAuthState,
    isAuthenticated: true,
    user: { uid: 'test-user-id', email: 'test@example.com' },
    userProfile: {
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
      createdAt: Date.now(),
      membershipStatus: 'premium',
      preferences: {},
    },
  },
} as Partial<RootState>;

describe('ProfileContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteAccount.mockReset();
    mockShowSuccess.mockClear();
    mockShowInfo.mockClear();
    mockHandleWithToast.mockClear();
    mockOpenSubscriptionManagement.mockClear();
    mockNavigate.mockClear();
    mockPurchaseSubscription.mockClear();
    mockRestorePurchases.mockClear();
    mockUseFeatureAccess.mockReturnValue({
      isPremium: false,
      isInTrial: false,
      trialDaysRemaining: 0,
      isDemo: true,
      hasUsedTrial: false,
      canStartTrial: false,
      refresh: jest.fn(),
    });
  });

  it('renders signed-out view and opens email auth form', async () => {
    const preloadedState = {
      auth: { ...baseAuthState },
    } as Partial<RootState>;

    const { getByText, queryByTestId } = renderWithProviders(
      <ProfileContent onClose={jest.fn()} />,
      { preloadedState: preloadedState as RootState }
    );

    expect(getByText('Sign in with Email')).toBeTruthy();
    fireEvent.press(getByText('Sign in with Email'));

    await waitFor(() => expect(queryByTestId('email-auth-form')).toBeTruthy());
  });

  it('opens platform subscription management from the manage row', () => {
    mockUseFeatureAccess.mockReturnValue({
      isPremium: true,
      isInTrial: false,
      trialDaysRemaining: null,
      isDemo: false,
      hasUsedTrial: true,
      canStartTrial: false,
      refresh: jest.fn(),
    });

    const { getByText } = renderWithProviders(
      <ProfileContent onClose={jest.fn()} />,
      { preloadedState: authenticatedState as RootState }
    );

    fireEvent.press(getByText('Manage Subscription'));

    expect(mockOpenSubscriptionManagement).toHaveBeenCalledTimes(1);
  });

  it('lets expired-trial users open the subscription screen from profile', () => {
    mockUseFeatureAccess.mockReturnValue({
      isPremium: false,
      isInTrial: false,
      trialDaysRemaining: null,
      isDemo: true,
      hasUsedTrial: true,
      canStartTrial: false,
      refresh: jest.fn(),
    });

    const onClose = jest.fn();
    const { getByText } = renderWithProviders(
      <ProfileContent onClose={onClose} />,
      { preloadedState: authenticatedState as RootState }
    );

    fireEvent.press(getByText('Upgrade to Premium'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('Subscription');
  });

  it('uses the trial offer only when starting a trial from profile', async () => {
    mockUseFeatureAccess.mockReturnValue({
      isPremium: false,
      isInTrial: false,
      trialDaysRemaining: null,
      isDemo: true,
      hasUsedTrial: false,
      canStartTrial: true,
      refresh: jest.fn(),
    });

    const { getByTestId } = renderWithProviders(
      <ProfileContent onClose={jest.fn()} />,
      { preloadedState: authenticatedState as RootState }
    );

    fireEvent.press(getByTestId('Start 1 week Free Trial'));

    await waitFor(() => {
      expect(mockPurchaseSubscription).toHaveBeenCalledWith('monthly', { includeTrialOffer: true });
    });
  });

  describe('Delete Account', () => {
    it('shows delete account button for authenticated users', () => {
      const { getByText } = renderWithProviders(
        <ProfileContent onClose={jest.fn()} />,
        { preloadedState: authenticatedState as RootState }
      );

      expect(getByText('Delete Account')).toBeTruthy();
    });

    it('shows confirmation alert when delete button is pressed', () => {
      const { getByText } = renderWithProviders(
        <ProfileContent onClose={jest.fn()} />,
        { preloadedState: authenticatedState as RootState }
      );

      fireEvent.press(getByText('Delete Account'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Account',
        expect.stringContaining('permanently delete'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Delete Account', style: 'destructive' }),
        ])
      );
    });

    it('calls deleteAccount service when confirmed', async () => {
      mockDeleteAccount.mockResolvedValue({ success: true });

      const onClose = jest.fn();
      const { getByText } = renderWithProviders(
        <ProfileContent onClose={onClose} />,
        { preloadedState: authenticatedState as RootState }
      );

      fireEvent.press(getByText('Delete Account'));

      // Get the confirm callback from the Alert.alert call
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const confirmButton = buttons.find((b: any) => b.text === 'Delete Account');

      await act(async () => {
        await confirmButton.onPress();
      });

      expect(mockDeleteAccount).toHaveBeenCalled();
    });

    it('shows success message on successful deletion', async () => {
      mockDeleteAccount.mockResolvedValue({ success: true });

      const onClose = jest.fn();
      const { getByText } = renderWithProviders(
        <ProfileContent onClose={onClose} />,
        { preloadedState: authenticatedState as RootState }
      );

      fireEvent.press(getByText('Delete Account'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const confirmButton = buttons.find((b: any) => b.text === 'Delete Account');

      await act(async () => {
        await confirmButton.onPress();
      });

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith(
          'Your account has been permanently deleted.',
          'account'
        );
      });
    });

    it('shows re-authentication message when required', async () => {
      mockDeleteAccount.mockResolvedValue({
        success: false,
        requiresRecentLogin: true,
        message: 'Re-authentication required'
      });

      const { getByText } = renderWithProviders(
        <ProfileContent onClose={jest.fn()} />,
        { preloadedState: authenticatedState as RootState }
      );

      fireEvent.press(getByText('Delete Account'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const confirmButton = buttons.find((b: any) => b.text === 'Delete Account');

      await act(async () => {
        await confirmButton.onPress();
      });

      await waitFor(() => {
        expect(mockShowInfo).toHaveBeenCalledWith(
          'For security, please sign out and sign back in before deleting your account.',
          'account'
        );
      });
    });

    it('shows error message on deletion failure', async () => {
      mockDeleteAccount.mockResolvedValue({
        success: false,
        message: 'Failed to delete'
      });

      const { getByText } = renderWithProviders(
        <ProfileContent onClose={jest.fn()} />,
        { preloadedState: authenticatedState as RootState }
      );

      fireEvent.press(getByText('Delete Account'));

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const confirmButton = buttons.find((b: any) => b.text === 'Delete Account');

      await act(async () => {
        await confirmButton.onPress();
      });

      await waitFor(() => {
        expect(mockHandleWithToast).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'Failed to delete' }),
          { feature: 'account' }
        );
      });
    });
  });
});
