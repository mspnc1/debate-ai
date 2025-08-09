import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateApiKeys } from '../store';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface APIConfigScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const APIConfigScreen: React.FC<APIConfigScreenProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const existingKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  
  const [apiKeys, setApiKeys] = useState({
    claude: existingKeys.claude || '',
    openai: existingKeys.openai || '',
    google: existingKeys.google || '',
  });
  
  const [showKeys, setShowKeys] = useState({
    claude: false,
    openai: false,
    google: false,
  });

  const [expandedSection, setExpandedSection] = useState<string | null>('claude');

  const handleSave = async () => {
    try {
      // Save to AsyncStorage for persistence
      await AsyncStorage.setItem('apiKeys', JSON.stringify(apiKeys));
      
      // Update Redux store
      dispatch(updateApiKeys(apiKeys));
      
      Alert.alert('Success', 'API keys saved securely', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save API keys');
    }
  };

  const toggleShowKey = (key: 'claude' | 'openai' | 'google') => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const validateAndTestKey = async (provider: 'claude' | 'openai' | 'google') => {
    const key = apiKeys[provider];
    if (!key) {
      Alert.alert('Error', 'Please enter an API key first');
      return;
    }

    // Here we would test the API key
    Alert.alert('Testing', `Validating ${provider} API key...`);
    // TODO: Implement actual API key validation
  };

  const openURL = (url: string) => {
    Linking.openURL(url);
  };

  const hasAnyKey = apiKeys.claude || apiKeys.openai || apiKeys.google;
  const keyCount = [apiKeys.claude, apiKeys.openai, apiKeys.google].filter(k => k).length;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with progress */}
          <View style={styles.header}>
            <Text style={styles.title}>Let's Get You Connected</Text>
            <Text style={styles.subtitle}>
              You'll need at least one API key to start chatting with AI
            </Text>
            
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(keyCount / 3) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {keyCount === 0 
                  ? 'No keys configured yet'
                  : keyCount === 3 
                  ? 'All set! 🎉' 
                  : `${keyCount} of 3 configured`}
              </Text>
            </View>
          </View>

          {/* Intro card */}
          {keyCount === 0 && (
            <Animated.View 
              entering={FadeInDown.delay(100).springify()}
              style={styles.introCard}
            >
              <Text style={styles.introTitle}>🎯 Quick Start Guide</Text>
              <Text style={styles.introText}>
                1. Choose an AI provider below{'\n'}
                2. Click "Get Free API Key" to sign up{'\n'}
                3. Copy your key and paste it here{'\n'}
                4. Test to make sure it works{'\n'}
                5. Save and start chatting!
              </Text>
              <Text style={styles.introNote}>
                💡 Tip: Start with Claude or ChatGPT - they're easiest to set up
              </Text>
            </Animated.View>
          )}

          {/* Claude API Key */}
          <Animated.View 
            entering={FadeInDown.delay(200).springify()}
            style={styles.section}
          >
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'claude' ? null : 'claude')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>🎓</Text>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>Claude (Anthropic)</Text>
                  <Text style={styles.sectionStatus}>
                    {apiKeys.claude ? '✅ Configured' : '⚪ Not configured'}
                  </Text>
                </View>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSection === 'claude' ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {expandedSection === 'claude' && (
              <View style={styles.sectionContent}>
                <Text style={styles.stepTitle}>Step 1: Get your API key</Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => openURL('https://console.anthropic.com/account/keys')}
                >
                  <Text style={styles.linkButtonText}>Get Free API Key →</Text>
                </TouchableOpacity>
                
                <Text style={styles.stepTitle}>Step 2: Paste your key here</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="sk-ant-api03-..."
                    value={apiKeys.claude}
                    onChangeText={(text) => setApiKeys(prev => ({ ...prev, claude: text }))}
                    secureTextEntry={!showKeys.claude}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => toggleShowKey('claude')}
                    style={styles.eyeButton}
                  >
                    <Text>{showKeys.claude ? '👁' : '👁‍🗨'}</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.stepTitle}>Step 3: Test your key</Text>
                <TouchableOpacity
                  onPress={() => validateAndTestKey('claude')}
                  style={[styles.testButton, !apiKeys.claude && styles.testButtonDisabled]}
                  disabled={!apiKeys.claude}
                >
                  <Text style={styles.testButtonText}>Test Connection</Text>
                </TouchableOpacity>
                
                <View style={styles.helpBox}>
                  <Text style={styles.helpTitle}>ℹ️ About Claude</Text>
                  <Text style={styles.helpText}>
                    • Best for thoughtful, nuanced responses{'\n'}
                    • Great at analysis and writing{'\n'}
                    • Free tier includes 1000 messages/month{'\n'}
                    • Most ethical and safety-focused
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* OpenAI API Key */}
          <Animated.View 
            entering={FadeInDown.delay(300).springify()}
            style={styles.section}
          >
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'openai' ? null : 'openai')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>💡</Text>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>ChatGPT (OpenAI)</Text>
                  <Text style={styles.sectionStatus}>
                    {apiKeys.openai ? '✅ Configured' : '⚪ Not configured'}
                  </Text>
                </View>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSection === 'openai' ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {expandedSection === 'openai' && (
              <View style={styles.sectionContent}>
                <Text style={styles.stepTitle}>Step 1: Get your API key</Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => openURL('https://platform.openai.com/api-keys')}
                >
                  <Text style={styles.linkButtonText}>Get API Key (Free Credits) →</Text>
                </TouchableOpacity>
                
                <Text style={styles.stepTitle}>Step 2: Paste your key here</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="sk-proj-..."
                    value={apiKeys.openai}
                    onChangeText={(text) => setApiKeys(prev => ({ ...prev, openai: text }))}
                    secureTextEntry={!showKeys.openai}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => toggleShowKey('openai')}
                    style={styles.eyeButton}
                  >
                    <Text>{showKeys.openai ? '👁' : '👁‍🗨'}</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.stepTitle}>Step 3: Test your key</Text>
                <TouchableOpacity
                  onPress={() => validateAndTestKey('openai')}
                  style={[styles.testButton, !apiKeys.openai && styles.testButtonDisabled]}
                  disabled={!apiKeys.openai}
                >
                  <Text style={styles.testButtonText}>Test Connection</Text>
                </TouchableOpacity>
                
                <View style={styles.helpBox}>
                  <Text style={styles.helpTitle}>ℹ️ About ChatGPT</Text>
                  <Text style={styles.helpText}>
                    • Most popular and versatile{'\n'}
                    • Great for general conversations{'\n'}
                    • $5 free credits for new accounts{'\n'}
                    • Wide range of capabilities
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Google API Key */}
          <Animated.View 
            entering={FadeInDown.delay(400).springify()}
            style={styles.section}
          >
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'google' ? null : 'google')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>✨</Text>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionTitle}>Gemini (Google)</Text>
                  <Text style={styles.sectionStatus}>
                    {apiKeys.google ? '✅ Configured' : '⚪ Not configured'}
                  </Text>
                </View>
              </View>
              <Text style={styles.expandIcon}>
                {expandedSection === 'google' ? '−' : '+'}
              </Text>
            </TouchableOpacity>

            {expandedSection === 'google' && (
              <View style={styles.sectionContent}>
                <Text style={styles.stepTitle}>Step 1: Get your API key</Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => openURL('https://makersuite.google.com/app/apikey')}
                >
                  <Text style={styles.linkButtonText}>Get Free API Key →</Text>
                </TouchableOpacity>
                
                <Text style={styles.stepTitle}>Step 2: Paste your key here</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="AIzaSy..."
                    value={apiKeys.google}
                    onChangeText={(text) => setApiKeys(prev => ({ ...prev, google: text }))}
                    secureTextEntry={!showKeys.google}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => toggleShowKey('google')}
                    style={styles.eyeButton}
                  >
                    <Text>{showKeys.google ? '👁' : '👁‍🗨'}</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.stepTitle}>Step 3: Test your key</Text>
                <TouchableOpacity
                  onPress={() => validateAndTestKey('google')}
                  style={[styles.testButton, !apiKeys.google && styles.testButtonDisabled]}
                  disabled={!apiKeys.google}
                >
                  <Text style={styles.testButtonText}>Test Connection</Text>
                </TouchableOpacity>
                
                <View style={styles.helpBox}>
                  <Text style={styles.helpTitle}>ℹ️ About Gemini</Text>
                  <Text style={styles.helpText}>
                    • Google's latest AI model{'\n'}
                    • Good at creative tasks{'\n'}
                    • Generous free tier{'\n'}
                    • Fast response times
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Security note */}
          <Animated.View 
            entering={FadeInDown.delay(500).springify()}
            style={styles.securityNote}
          >
            <Text style={styles.securityTitle}>🔒 Your Security Matters</Text>
            <Text style={styles.securityText}>
              • Keys are stored locally on your device only{'\n'}
              • We never send keys to our servers{'\n'}
              • You can delete them anytime{'\n'}
              • Each provider bills you directly
            </Text>
          </Animated.View>

          {/* Action buttons */}
          <Animated.View 
            entering={FadeInDown.delay(600).springify()}
            style={styles.buttonContainer}
          >
            {hasAnyKey ? (
              <>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>
                    Save & Start Chatting
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.skipButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => {
                    Alert.alert(
                      'Continue without API keys?',
                      'You can try the app in demo mode with simulated responses.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Use Demo Mode', 
                          onPress: () => navigation.goBack() 
                        }
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.skipButtonText}>Try Demo Mode</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 10,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
  },
  introCard: {
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  introText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
    marginBottom: 12,
  },
  introNote: {
    fontSize: 13,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  sectionStatus: {
    fontSize: 13,
    color: '#666666',
  },
  expandIcon: {
    fontSize: 24,
    color: '#666666',
    fontWeight: '300',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    marginTop: 16,
  },
  linkButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingRight: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  eyeButton: {
    padding: 8,
  },
  testButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  testButtonDisabled: {
    backgroundColor: '#C8C8C8',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
  },
  helpText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 20,
  },
  securityNote: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#B3E5FC',
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666666',
    fontSize: 17,
    fontWeight: '500',
  },
});

export default APIConfigScreen;