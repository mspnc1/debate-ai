import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { RootStackParamList } from '../types';
import { useTheme } from '../theme';

// Import screens
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import APIConfigScreen from '../screens/APIConfigScreen';
import DebateScreen from '../screens/DebateScreen';
// import SubscriptionScreen from '../screens/SubscriptionScreen';
// import ExpertModeScreen from '../screens/ExpertModeScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Main Tab Navigator
const MainTabs = () => {
  const { theme, isDark } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 24, color }}>{focused ? '🏠' : '🏡'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 24, color }}>{focused ? '🕐' : '📋'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 24, color }}>{focused ? '⚙️' : '🔧'}</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};


// Placeholder screen for testing
interface PlaceholderScreenProps {
  route: {
    name: string;
  };
}

const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ route }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{route.name} Screen</Text>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
} as const;

export default function AppNavigator() {
  const { theme, isDark } = useTheme();
  const uiMode = useSelector((state: RootState) => state.user.uiMode);
  const hasCompletedOnboarding = useSelector(
    (state: RootState) => state.settings.hasCompletedOnboarding
  );

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

  return (
    <NavigationContainer theme={navigationTheme}>
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
        {!hasCompletedOnboarding ? (
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={MainTabs}
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
              name="APIConfig"
              component={APIConfigScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Subscription"
              component={PlaceholderScreen}
              options={{ title: 'Upgrade' }}
            />
            {uiMode === 'expert' && (
              <Stack.Screen
                name="ExpertMode"
                component={PlaceholderScreen}
                options={{ title: 'Expert Settings' }}
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}