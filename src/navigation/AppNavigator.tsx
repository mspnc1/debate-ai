import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, DefaultTheme, DarkTheme, type InitialState } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, cancelAllStreams, hydrateMediaGallery, isApiKeyConfigured, resumeCreateMediaTasks } from '../store';
import { RootStackParamList } from '../types';
import { useTheme } from '../theme';
import { SheetProvider } from '../contexts/SheetContext';
import { GlobalSheets } from './GlobalSheets';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useResponsive } from '../hooks/useResponsive';
import { ErrorBoundary } from '../components/organisms/common/ErrorBoundary';
import { AppLifecycleService } from '@/services/lifecycle/AppLifecycleService';
import { getStreamingService } from '@/services/streaming/StreamingService';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import HistoryScreen from '../screens/HistoryScreen';
import APIConfigScreen from '../screens/APIConfigScreen';
import DebateScreen from '../screens/DebateScreen';
import DebateSetupScreen from '../screens/DebateSetupScreen';
import DebateTranscriptScreen from '../screens/DebateTranscriptScreen';
import StatsScreen from '../screens/StatsScreen';
import CompareSetupScreen from '../screens/CompareSetupScreen';
import CompareScreen from '../screens/CompareScreen';
import UpgradeScreen from '../screens/UpgradeScreen';
import ExpertModeScreen from '../screens/ExpertModeScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import CreateSetupScreen from '../screens/CreateSetupScreen';
import CreateScreen from '../screens/CreateScreen';
import PersonalitySystemScreen from '../screens/PersonalitySystemScreen';
// import SubscriptionScreen from '../screens/SubscriptionScreen';
// import ExpertModeScreen from '../screens/ExpertModeScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const NAVIGATION_STATE_KEY = 'navigationState_v1';

const CreateActivityBridge = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mediaGalleryHydrated = useSelector((state: RootState) => state.create.mediaGalleryHydrated);
  const activeRunwayTask = useSelector((state: RootState) => state.create.activeRunwayTask);

  useEffect(() => {
    if (!mediaGalleryHydrated) {
      dispatch(hydrateMediaGallery());
    }
  }, [dispatch, mediaGalleryHydrated]);

  useEffect(() => {
    if (mediaGalleryHydrated && activeRunwayTask) {
      dispatch(resumeCreateMediaTasks());
    }
  }, [activeRunwayTask, dispatch, mediaGalleryHydrated]);

  useEffect(() => {
    AppLifecycleService.start();
    return AppLifecycleService.register({
      id: 'create-activity-bridge',
      onForeground: () => {
        dispatch(resumeCreateMediaTasks());
      },
      onBackground: () => {
        try {
          getStreamingService().interruptAllStreams();
          dispatch(cancelAllStreams({ reason: 'interrupted' }));
        } catch {
          // ignore lifecycle cancellation failures
        }
      },
    });
  }, [dispatch]);

  return null;
};

// Main Tab Navigator
const MainTabs = () => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const createActivity = useSelector((state: RootState) => state.create.createActivity);
  const mediaGeneration = useSelector((state: RootState) => state.create.mediaGeneration);
  const { isDemo } = useFeatureAccess();
  const { responsive } = useResponsive();

  // Calculate configured AI count for badge
  const configuredCount = useMemo(() => {
    return Object.values(apiKeys).filter(isApiKeyConfigured).length;
  }, [apiKeys]);

  // Responsive tab bar sizing for iPad
  const tabBarHeight = responsive(60, 72);
  const iconSize = responsive(24, 28);
  const labelFontSize = responsive(12, 14);
  const totalHeight = tabBarHeight + insets.bottom;
  const createBadge = createActivity.hasUnseenActivity
    ? '•'
    : (mediaGeneration.video || mediaGeneration.audio || createActivity.status === 'running') ? '…' : undefined;

  return (
    <>
    <CreateActivityBridge />
    <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary[500],
          tabBarInactiveTintColor: theme.colors.text.secondary,
          tabBarStyle: {
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 5 : 5,
            paddingTop: responsive(5, 8),
            height: totalHeight,
          },
          tabBarLabelStyle: {
            fontSize: labelFontSize,
            fontWeight: '500',
          },
        }}
      >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="DebateTab"
        component={DebateSetupScreen}
        options={{
          tabBarLabel: 'Debate',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="sword-cross"
              size={iconSize}
              color={color}
            />
          ),
          tabBarBadge: !isDemo && configuredCount < 2 ? '!' : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.error[500],
            fontSize: 10,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
          },
        }}
      />
      <Tab.Screen
        name="Compare"
        component={CompareSetupScreen}
        options={{
          tabBarLabel: 'Compare',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'git-compare' : 'git-compare-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="CreateTab"
        component={CreateSetupScreen}
        options={{
          tabBarLabel: 'Create',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'sparkles' : 'sparkles-outline'}
              size={iconSize}
              color={color}
            />
          ),
          tabBarBadge: createBadge,
          tabBarBadgeStyle: {
            backgroundColor: createActivity.hasUnseenActivity
              ? theme.colors.primary[500]
              : theme.colors.warning[500],
            fontSize: 10,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
          },
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => (
            <MaterialIcons
              name="history"
              size={responsive(26, 30)}
              color={color}
            />
          ),
        }}
      />
      </Tab.Navigator>
    </>
  );
};

// Wrapper to include sheets and modals
const MainTabsWithSheets = () => {
  return <MainTabs />;
};


// Placeholder removed — using real screens

export default function AppNavigator() {
  const { theme, isDark } = useTheme();
  const [initialNavigationState, setInitialNavigationState] = useState<InitialState | undefined>();
  const [isNavigationStateReady, setIsNavigationStateReady] = useState(false);
  // const uiMode = useSelector((state: RootState) => state.user.uiMode);
  const hasCompletedOnboarding = useSelector(
    (state: RootState) => state.settings.hasCompletedOnboarding
  );

  // Get subscription status to determine if we should skip Welcome
  const { membershipStatus, loading: subscriptionLoading } = useFeatureAccess();

  // Premium subscribers skip Welcome entirely
  // Trial and demo users follow the normal onboarding flow
  const isPremiumSubscriber = membershipStatus === 'premium';
  const shouldShowMainApp = isPremiumSubscriber || hasCompletedOnboarding;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(NAVIGATION_STATE_KEY)
      .then(raw => {
        if (!mounted || !raw) return;
        setInitialNavigationState(JSON.parse(raw) as InitialState);
      })
      .catch(() => {
        // Navigation persistence is a recovery assist only.
      })
      .finally(() => {
        if (mounted) setIsNavigationStateReady(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Custom navigation theme
  const navigationTheme = isDark ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.colors.primary[500],
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text.primary,
      border: theme.colors.border,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: theme.colors.primary[500],
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text.primary,
      border: theme.colors.border,
    },
  };

  // Show loading screen while determining subscription status
  // This prevents flash of wrong screen
  if (subscriptionLoading || !isNavigationStateReady) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <SheetProvider>
      <ErrorBoundary level="recoverable">
        <NavigationContainer
          theme={navigationTheme}
          initialState={shouldShowMainApp ? initialNavigationState : undefined}
          onStateChange={(state) => {
            if (!shouldShowMainApp) return;
            AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state)).catch(() => {});
          }}
        >
          <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark ? theme.colors.surface : theme.colors.primary[500],
            },
            headerTintColor: isDark ? theme.colors.text.primary : '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
        {!shouldShowMainApp ? (
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabsWithSheets}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Debate"
              component={DebateScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="DebateTranscript"
              component={DebateTranscriptScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CompareSession"
              component={CompareScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateSession"
              component={CreateScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="APIConfig"
              component={APIConfigScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Stats"
              component={StatsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TermsOfService"
              component={TermsOfServiceScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Subscription"
              component={UpgradeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ExpertMode"
              component={ExpertModeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PersonalitySystem"
              component={PersonalitySystemScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
        </Stack.Navigator>
        {/* Global sheets: available on every screen */}
          <GlobalSheets />
        </NavigationContainer>
      </ErrorBoundary>
    </SheetProvider>
  );
}
