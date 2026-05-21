import { Linking, Platform } from 'react-native';

const mockShowError = jest.fn();
const mockHandleSilent = jest.fn();

jest.mock('@/services/errors/ErrorService', () => ({
  ErrorService: {
    showError: (...args: unknown[]) => mockShowError(...args),
    handleSilent: (...args: unknown[]) => mockHandleSilent(...args),
  },
}));

import {
  getSubscriptionManagementUrl,
  openSubscriptionManagement,
} from '@/services/subscription/subscriptionManagement';

describe('subscriptionManagement', () => {
  const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

  const setPlatform = (platform: typeof Platform.OS) => {
    Object.defineProperty(Platform, 'OS', {
      value: platform,
      configurable: true,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalPlatformDescriptor) {
      Object.defineProperty(Platform, 'OS', originalPlatformDescriptor);
    }
  });

  it('returns the App Store subscription URL for iOS', () => {
    expect(getSubscriptionManagementUrl('ios')).toBe(
      'https://apps.apple.com/account/subscriptions'
    );
  });

  it('returns the Play Store subscription URL for Android', () => {
    expect(getSubscriptionManagementUrl('android')).toBe(
      'https://play.google.com/store/account/subscriptions?package=com.braveheartinnovations.debateai'
    );
  });

  it('opens the current platform subscription URL', async () => {
    setPlatform('android');

    await expect(openSubscriptionManagement()).resolves.toBe(true);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://play.google.com/store/account/subscriptions?package=com.braveheartinnovations.debateai'
    );
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('shows a fallback error when the store URL cannot be opened', async () => {
    setPlatform('ios');
    const error = new Error('cannot open');
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(error);

    await expect(openSubscriptionManagement()).resolves.toBe(false);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://apps.apple.com/account/subscriptions'
    );
    expect(mockShowError).toHaveBeenCalledWith(
      expect.stringContaining('Could not open subscription management'),
      'subscription'
    );
    expect(mockHandleSilent).toHaveBeenCalledWith(error, expect.objectContaining({
      action: 'open_subscription_management',
      platform: 'ios',
    }));
  });
});
