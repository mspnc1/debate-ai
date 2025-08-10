import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { ThemedView, ThemedText } from '../components/core';

interface SettingsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const { currentUser } = useSelector((state: RootState) => state.user);
  const { theme, setThemeMode, isDark } = useTheme();

  return (
    <ThemedView flex={1} backgroundColor="background">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText variant="heading" style={{ marginTop: 20, marginBottom: 24 }}>Settings</ThemedText>


        {/* Appearance */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={{ marginBottom: 32 }}
        >
          <ThemedText variant="title" style={{ marginBottom: 16 }}>Appearance</ThemedText>
          <ThemedView 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              padding: 16,
              ...theme.shadows.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <ThemedText variant="subtitle" weight="semibold">Dark Mode</ThemedText>
              <ThemedText variant="caption" color="secondary" style={{ marginTop: 4 }}>
                Easier on the eyes at night
              </ThemedText>
            </View>
            <Switch
              value={isDark}
              onValueChange={(value) => {
                setThemeMode(value ? 'dark' : 'light');
              }}
              trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[500] }}
            />
          </ThemedView>
        </Animated.View>

        {/* API Keys */}
        <Animated.View 
          entering={FadeInDown.delay(300).springify()}
          style={{ marginBottom: 32 }}
        >
          <ThemedText variant="title" style={{ marginBottom: 16 }}>API Configuration</ThemedText>
          <TouchableOpacity 
            style={{
              backgroundColor: theme.colors.gray[100],
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('APIConfig')}
          >
            <ThemedText variant="subtitle" color="brand" weight="semibold">Manage API Keys</ThemedText>
          </TouchableOpacity>
        </Animated.View>

        {/* Subscription */}
        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={{ marginBottom: 32 }}
        >
          <ThemedText variant="title" style={{ marginBottom: 16 }}>Subscription</ThemedText>
          <ThemedView
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              padding: 16,
              ...theme.shadows.sm,
            }}
          >
            <ThemedText variant="subtitle" weight="semibold" style={{ marginBottom: 12 }}>
              {currentUser?.subscription === 'free' ? 'Free Plan' : 'Pro Plan'}
            </ThemedText>
            {currentUser?.subscription === 'free' && (
              <TouchableOpacity 
                style={{
                  backgroundColor: theme.colors.primary[500],
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
                onPress={() => navigation.navigate('Subscription')}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Upgrade to Pro</Text>
              </TouchableOpacity>
            )}
          </ThemedView>
        </Animated.View>

        {/* About */}
        <Animated.View 
          entering={FadeInDown.delay(500).springify()}
          style={{ marginBottom: 32 }}
        >
          <ThemedText variant="title" style={{ marginBottom: 16 }}>About</ThemedText>
          <ThemedText variant="body" color="secondary">
            My AI Friends v1.0.0{'\n'}
            Made with code and caffeine
          </ThemedText>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View 
          entering={FadeInDown.delay(600).springify()}
          style={{ marginBottom: 32 }}
        >
          <TouchableOpacity 
            style={{
              backgroundColor: theme.colors.error[500],
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}
            onPress={() => dispatch(logout())}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
    </ThemedView>
  );
};

export default SettingsScreen;