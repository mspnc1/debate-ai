import { Alert } from 'react-native';

export function showTrialCTA(
  navigate: (screen: string, params?: Record<string, unknown>) => void,
  opts?: { title?: string; message?: string; ctaText?: string }
) {
  const title = opts?.title || 'Demo Mode';
  const message = opts?.message || 'This action requires Premium access.';
  const ctaText = opts?.ctaText || 'Upgrade to Premium';
  Alert.alert(
    title,
    message,
    [
      { text: 'Not now', style: 'cancel' },
      { text: ctaText, onPress: () => navigate('Subscription') },
    ]
  );
}
