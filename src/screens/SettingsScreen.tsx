import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { updateUIMode, updateTheme, logout } from '../store';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface SettingsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const { uiMode, currentUser } = useSelector((state: RootState) => state.user);
  const { theme } = useSelector((state: RootState) => state.settings);
  
  const isExpertMode = uiMode === 'expert';
  // const hasApiKeys = apiKeys && (apiKeys.claude || apiKeys.openai || apiKeys.google);

  const isDarkMode = theme === 'dark';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Mode Toggle */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Interface Mode</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Expert Mode</Text>
              <Text style={styles.settingDescription}>
                {isExpertMode 
                  ? 'Full control over AI parameters' 
                  : 'Simple, friendly interface'}
              </Text>
            </View>
            <Switch
              value={isExpertMode}
              onValueChange={(value) => {
                dispatch(updateUIMode(value ? 'expert' : 'simple'));
              }}
              trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
            />
          </View>
        </Animated.View>

        {/* Appearance */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                Easier on the eyes at night
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={(value) => {
                dispatch(updateTheme(value ? 'dark' : 'light'));
              }}
              trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
            />
          </View>
        </Animated.View>

        {/* API Keys */}
        <Animated.View 
          entering={FadeInDown.delay(300).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>API Configuration</Text>
          <TouchableOpacity 
            style={styles.button}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('APIConfig')}
          >
            <Text style={styles.buttonText}>Manage API Keys</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Subscription */}
        <Animated.View 
          entering={FadeInDown.delay(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.subscriptionCard}>
            <Text style={styles.subscriptionStatus}>
              {currentUser?.subscription === 'free' ? 'Free Plan' : 'Pro Plan'}
            </Text>
            {currentUser?.subscription === 'free' && (
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => navigation.navigate('Subscription')}
                activeOpacity={0.7}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View 
          entering={FadeInDown.delay(500).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            My AI Friends v1.0.0{'\n'}
            Made with code and caffeine
          </Text>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View 
          entering={FadeInDown.delay(600).springify()}
          style={styles.section}
        >
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={() => dispatch(logout())}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
  },
  button: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  subscriptionStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;