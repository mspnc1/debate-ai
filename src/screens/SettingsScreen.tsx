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
import { Box } from '../components/atoms';
import { Typography } from '../components/molecules';

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
    <Box style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Typography variant="heading" style={{ marginTop: 20, marginBottom: 24 }}>Settings</Typography>


        {/* Appearance */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={{ marginBottom: 32 }}
        >
          <Typography variant="title" style={{ marginBottom: 16 }}>Appearance</Typography>
          <Box 
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
              <Typography variant="subtitle" weight="semibold">Dark Mode</Typography>
              <Typography variant="caption" color="secondary" style={{ marginTop: 4 }}>
                Easier on the eyes at night
              </Typography>
            </View>
            <Switch
              value={isDark}
              onValueChange={(value) => {
                setThemeMode(value ? 'dark' : 'light');
              }}
              trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[500] }}
            />
          </Box>
        </Animated.View>

        {/* API Keys */}
        <Animated.View 
          entering={FadeInDown.delay(300).springify()}
          style={{ marginBottom: 32 }}
        >
          <Typography variant="title" style={{ marginBottom: 16 }}>API Configuration</Typography>
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
            <Typography variant="subtitle" color="brand" weight="semibold">Manage API Keys</Typography>
          </TouchableOpacity>
        </Animated.View>

        {/* Subscription */}
        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={{ marginBottom: 32 }}
        >
          <Typography variant="title" style={{ marginBottom: 16 }}>Subscription</Typography>
          <Box
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 12,
              padding: 16,
              ...theme.shadows.sm,
            }}
          >
            <Typography variant="subtitle" weight="semibold" style={{ marginBottom: 12 }}>
              {currentUser?.subscription === 'free' ? 'Free Plan' : 'Pro Plan'}
            </Typography>
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
          </Box>
        </Animated.View>

        {/* About */}
        <Animated.View 
          entering={FadeInDown.delay(500).springify()}
          style={{ marginBottom: 32 }}
        >
          <Typography variant="title" style={{ marginBottom: 16 }}>About</Typography>
          <Typography variant="body" color="secondary">
            DebateAI v1.0.0{'\n'}
            Made with code and caffeine
          </Typography>
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
    </Box>
  );
};

export default SettingsScreen;