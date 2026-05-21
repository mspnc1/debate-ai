import { Linking, Platform } from 'react-native';
import { ErrorService } from '@/services/errors/ErrorService';

const IOS_SUBSCRIPTION_MANAGEMENT_URL = 'https://apps.apple.com/account/subscriptions';
const ANDROID_SUBSCRIPTION_MANAGEMENT_URL =
  'https://play.google.com/store/account/subscriptions?package=com.braveheartinnovations.debateai';

export const getSubscriptionManagementUrl = (
  platform: typeof Platform.OS = Platform.OS
): string => {
  if (platform === 'ios') {
    return IOS_SUBSCRIPTION_MANAGEMENT_URL;
  }

  return ANDROID_SUBSCRIPTION_MANAGEMENT_URL;
};

export const openSubscriptionManagement = async (): Promise<boolean> => {
  const url = getSubscriptionManagementUrl();

  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    ErrorService.showError(
      'Could not open subscription management. Open your device subscriptions from the App Store or Play Store.',
      'subscription'
    );
    ErrorService.handleSilent(error, {
      action: 'open_subscription_management',
      platform: Platform.OS,
      url,
    });
    return false;
  }
};
