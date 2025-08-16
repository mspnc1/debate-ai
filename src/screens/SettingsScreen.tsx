import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '../components/atoms';
import { Typography } from '../components/molecules';
import { SettingButton } from '../components/molecules/settings';
import { Header } from '../components/organisms';
import { 
  SettingsList,
  SettingSectionConfig 
} from '../components/organisms/settings';
import { 
  useThemeSettings, 
  useSubscriptionSettings, 
  useAuthSettings 
} from '../hooks/settings';
import { useTheme } from '../theme';

interface SettingsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const themeSettings = useThemeSettings();
  const subscriptionSettings = useSubscriptionSettings();
  const authSettings = useAuthSettings();

  // Define settings sections configuration
  const sections: SettingSectionConfig[] = [
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize the look and feel of the app',
      animationDelay: 200,
      items: [
        {
          id: 'dark-mode',
          type: 'switch',
          label: 'Dark Mode',
          description: 'Easier on the eyes at night',
          value: themeSettings.isDark,
          onChange: (value: boolean) => {
            themeSettings.setThemeMode(value ? 'dark' : 'light');
          },
          leftIcon: 'darkmode',
          disabled: themeSettings.isLoading,
          testID: 'settings-dark-mode-switch',
        },
      ],
    },
    {
      id: 'api-configuration',
      title: 'API Configuration',
      description: 'Manage your API keys and providers',
      animationDelay: 300,
      items: [
        {
          id: 'manage-api-keys',
          type: 'button',
          label: 'Manage API Keys',
          description: 'Configure your AI provider API keys',
          variant: 'brand',
          onPress: () => navigation.navigate('APIConfig'),
          leftIcon: 'api',
          testID: 'settings-api-config-button',
        },
      ],
    },
    {
      id: 'subscription',
      title: 'Subscription',
      description: 'Manage your premium features and billing',
      animationDelay: 400,
      items: [
        {
          id: 'subscription-card',
          type: 'subscription',
          label: 'Subscription Status',
          subscription: {
            plan: subscriptionSettings.currentPlan,
            expiresAt: subscriptionSettings.subscription.expiresAt,
            onUpgrade: () => navigation.navigate('Subscription'),
            onManage: () => navigation.navigate('Subscription'),
            features: subscriptionSettings.subscription.features,
          },
          loading: subscriptionSettings.isLoading,
          testID: 'settings-subscription-card',
        },
      ],
    },
    {
      id: 'about',
      title: 'About',
      description: 'App information and version details',
      animationDelay: 500,
      items: [
        {
          id: 'app-info',
          type: 'custom',
          label: 'App Information',
          component: (
            <Box 
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                padding: 16,
                ...theme.shadows.sm,
              }}
            >
              <Typography variant="body" color="secondary" style={{ textAlign: 'center' }}>
                DebateAI v1.0.0{'\n'}
                Made with code and caffeine
              </Typography>
            </Box>
          ),
          testID: 'settings-app-info',
        },
      ],
    },
  ];

  return (
    <Box style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <Header
          variant="gradient"
          title="Settings"
          subtitle="Customize your AI experience"
          showTime={true}
          showDate={true}
          animated={true}
          testID="settings-header"
        />
        
        <SettingsList
          sections={sections}
          footer={
            <SettingButton
              label="Sign Out"
              description="Clear all data and return to login"
              variant="danger"
              onPress={authSettings.signOutWithConfirmation}
              loading={authSettings.isLoading}
              leftIcon="logout"
              testID="settings-sign-out-button"
              accessibilityHint="Sign out of your account and clear all local data"
            />
          }
          testID="settings-list"
        />
      </SafeAreaView>
    </Box>
  );
};

export default SettingsScreen;