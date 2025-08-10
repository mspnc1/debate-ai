import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateApiKeys } from '../store';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import secureStorage from '../services/secureStorage';

interface APIConfigScreenProps {
  navigation: {
    goBack: () => void;
  };
}

interface TestResult {
  provider: 'claude' | 'openai' | 'google';
  status: 'idle' | 'testing' | 'success' | 'failed';
  message?: string;
  model?: string;
  latency?: number;
}

const APIConfigScreen: React.FC<APIConfigScreenProps> = ({ navigation: _navigation }) => {
  const dispatch = useDispatch();
  const existingKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  
  const [apiKeys, setApiKeys] = useState({
    claude: existingKeys.claude || '',
    openai: existingKeys.openai || '',
    google: existingKeys.google || '',
  });
  
  const [savedKeys, setSavedKeys] = useState({
    claude: existingKeys.claude || '',
    openai: existingKeys.openai || '',
    google: existingKeys.google || '',
  });
  
  const [editMode, setEditMode] = useState({
    claude: false,
    openai: false,
    google: false,
  });

  const [testResults, setTestResults] = useState<{
    claude: TestResult;
    openai: TestResult;
    google: TestResult;
  }>({
    claude: { provider: 'claude', status: 'idle' },
    openai: { provider: 'openai', status: 'idle' },
    google: { provider: 'google', status: 'idle' },
  });

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Initialize test results based on existing keys
  useEffect(() => {
    if (existingKeys.claude) {
      setTestResults(prev => ({
        ...prev,
        claude: { 
          provider: 'claude', 
          status: 'success', 
          message: 'Key configured'
        }
      }));
    }
    if (existingKeys.openai) {
      setTestResults(prev => ({
        ...prev,
        openai: { 
          provider: 'openai', 
          status: 'success', 
          message: 'Key configured'
        }
      }));
    }
    if (existingKeys.google) {
      setTestResults(prev => ({
        ...prev,
        google: { 
          provider: 'google', 
          status: 'success', 
          message: 'Key configured'
        }
      }));
    }
  }, [existingKeys.claude, existingKeys.openai, existingKeys.google]);

  // Check if keys have been modified
  // const isKeyModified = (provider: 'claude' | 'openai' | 'google') => {
  //   return apiKeys[provider] !== savedKeys[provider];
  // };

  const hasAnyKey = apiKeys.claude || apiKeys.openai || apiKeys.google;
  const keyCount = [apiKeys.claude, apiKeys.openai, apiKeys.google].filter(k => k).length;

  const handleClearAllKeys = () => {
    Alert.alert(
      '⚠️ Clear All API Keys',
      'This will permanently remove all API keys. This action cannot be undone. You will need to re-enter them to use the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await secureStorage.clearApiKeys();
              dispatch(updateApiKeys({}));
              setApiKeys({ claude: '', openai: '', google: '' });
              setSavedKeys({ claude: '', openai: '', google: '' });
              setTestResults({
                claude: { provider: 'claude', status: 'idle' },
                openai: { provider: 'openai', status: 'idle' },
                google: { provider: 'google', status: 'idle' },
              });
              Alert.alert('Success', 'All API keys have been cleared');
            } catch {
              Alert.alert('Error', 'Failed to clear API keys');
            }
          }
        }
      ]
    );
  };

  const toggleEditMode = (key: 'claude' | 'openai' | 'google') => {
    setEditMode(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const testApiKey = async (provider: 'claude' | 'openai' | 'google') => {
    const key = apiKeys[provider];
    if (!key) {
      Alert.alert('Error', 'Please enter an API key first');
      return;
    }

    // Update test status to testing
    setTestResults(prev => ({
      ...prev,
      [provider]: { provider, status: 'testing', message: 'Connecting...' }
    }));

    const startTime = Date.now();

    try {
      let response;
      let model = '';

      switch (provider) {
        case 'claude':
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'Test connection. Reply with "OK".' }],
            }),
          });
          model = 'Claude 3.5 Sonnet';
          break;

        case 'openai':
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: 'gpt-4',
              max_tokens: 10,
              messages: [
                { role: 'system', content: 'Test connection' },
                { role: 'user', content: 'Reply with OK' }
              ],
            }),
          });
          model = 'GPT-4';
          break;

        case 'google':
          // Use Gemini 2.5 Flash with thinking capabilities
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  role: 'user',
                  parts: [{ text: 'Test connection. Reply with OK.' }]
                }],
                generationConfig: {
                  maxOutputTokens: 10,
                },
              }),
            }
          );
          model = 'Gemini 2.5 Flash';
          break;
      }

      const latency = Date.now() - startTime;

      if (response!.ok) {
        // Parse response to get actual model info
        const responseData = await response!.json();
        
        // Extract actual model from response
        switch (provider) {
          case 'claude':
            // Claude returns the model in the response
            model = responseData.model || model;
            // Format Claude model name for display
            if (model.includes('claude-3-5-sonnet')) model = 'Claude 3.5 Sonnet';
            else if (model.includes('claude-3-opus')) model = 'Claude 3 Opus';
            else if (model.includes('claude-3-haiku')) model = 'Claude 3 Haiku';
            break;
          case 'openai':
            // OpenAI returns model in the response
            model = responseData.model || model;
            // Format OpenAI model name for display
            if (model.includes('gpt-4-turbo')) model = 'GPT-4 Turbo';
            else if (model.includes('gpt-4o')) model = 'GPT-4o';
            else if (model.includes('gpt-4')) model = 'GPT-4';
            else if (model.includes('gpt-3.5')) model = 'GPT-3.5 Turbo';
            break;
          case 'google':
            // Check if response has model metadata
            if (responseData.modelVersion) {
              model = `Gemini ${responseData.modelVersion}`;
            } else {
              // Parse from the URL we used or response metadata
              model = 'Gemini 2.5 Flash';
            }
            break;
        }
        
        // Success - save the key
        const updatedKeys = { ...savedKeys, [provider]: key };
        setSavedKeys(updatedKeys);
        
        // Save to secure storage
        await secureStorage.saveApiKeys(updatedKeys);
        dispatch(updateApiKeys(updatedKeys));

        setTestResults(prev => ({
          ...prev,
          [provider]: {
            provider,
            status: 'success',
            message: `Connected successfully!`,
            model,
            latency,
          }
        }));
      } else {
        // const errorData = await response!.text();
        let errorMessage = 'Connection failed';
        
        if (response!.status === 401) {
          errorMessage = 'Invalid API key';
        } else if (response!.status === 429) {
          errorMessage = 'Rate limit exceeded';
        } else if (response!.status === 403) {
          errorMessage = 'Access forbidden - check key permissions';
        }

        setTestResults(prev => ({
          ...prev,
          [provider]: {
            provider,
            status: 'failed',
            message: errorMessage,
          }
        }));
      }
    } catch {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          provider,
          status: 'failed',
          message: 'Network error - check your connection',
        }
      }));
    }
  };

  const openURL = (url: string) => {
    Linking.openURL(url);
  };

  const getMaskedKey = (key: string) => {
    if (!key) return '';
    // Show first 3 and last 3 characters
    if (key.length <= 10) return '•'.repeat(key.length);
    return key.slice(0, 3) + '•'.repeat(key.length - 6) + key.slice(-3);
  };

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
            <Text style={styles.title}>API Configuration</Text>
            <Text style={styles.subtitle}>
              Connect your AI services to start chatting
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
                  ? 'No keys configured'
                  : keyCount === 3 
                  ? 'All services connected! 🎉' 
                  : `${keyCount} of 3 configured`}
              </Text>
            </View>
          </View>

          {/* Clear All Button */}
          {hasAnyKey && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearAllKeys}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllButtonText}>🗑️ Clear All Keys</Text>
            </TouchableOpacity>
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
                  <Text style={[
                    styles.sectionStatus,
                    testResults.claude.status === 'success' && styles.statusSuccess,
                    testResults.claude.status === 'failed' && styles.statusFailed,
                  ]}>
                    {testResults.claude.status === 'success' 
                      ? testResults.claude.model 
                        ? `✅ Connected (${testResults.claude.model})`
                        : '✅ Connected'
                      : testResults.claude.status === 'failed'
                      ? `❌ ${testResults.claude.message}`
                      : apiKeys.claude 
                      ? '🔑 Key entered' 
                      : '⚪ Not configured'}
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
                  <Text style={styles.linkButtonText}>Get API Key →</Text>
                </TouchableOpacity>
                
                <Text style={styles.stepTitle}>Step 2: Enter your key</Text>
                <View style={[styles.inputContainer, savedKeys.claude && !editMode.claude && styles.inputContainerSaved]}>
                  <TextInput
                    style={[
                      styles.input,
                      savedKeys.claude && !editMode.claude && styles.inputSaved,
                      testResults.claude.status === 'failed' && styles.inputFailed,
                    ]}
                    placeholder="sk-ant-api03-..."
                    value={savedKeys.claude && !editMode.claude
                      ? getMaskedKey(apiKeys.claude)
                      : apiKeys.claude
                    }
                    onChangeText={(text) => {
                      setApiKeys(prev => ({ ...prev, claude: text }));
                      setTestResults(prev => ({ ...prev, claude: { provider: 'claude', status: 'idle' }}));
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={editMode.claude || !savedKeys.claude || testResults.claude.status === 'testing'}
                  />
                  {savedKeys.claude && (
                    <TouchableOpacity
                      onPress={() => toggleEditMode('claude')}
                      style={styles.editButton}
                    >
                      <Text style={styles.editIcon}>{editMode.claude ? '✓' : '✏️'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <Text style={styles.stepTitle}>Step 3: Test your connection</Text>
                <TouchableOpacity
                  onPress={() => testApiKey('claude')}
                  style={[
                    styles.testButton,
                    !apiKeys.claude && styles.testButtonDisabled,
                    testResults.claude.status === 'success' && styles.testButtonSuccess,
                  ]}
                  disabled={!apiKeys.claude || testResults.claude.status === 'testing'}
                >
                  {testResults.claude.status === 'testing' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.testButtonText}>
                      {testResults.claude.status === 'success' 
                        ? `✅ Connected (${testResults.claude.latency}ms)`
                        : 'Test Connection'}
                    </Text>
                  )}
                </TouchableOpacity>

                {testResults.claude.status === 'testing' && (
                  <Animated.View entering={FadeIn} style={styles.telemetryBox}>
                    <Text style={styles.telemetryText}>🔄 Establishing connection...</Text>
                    <Text style={styles.telemetryText}>📡 Sending handshake...</Text>
                    <Text style={styles.telemetryText}>⏱️ Measuring latency...</Text>
                  </Animated.View>
                )}
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
                  <Text style={[
                    styles.sectionStatus,
                    testResults.openai.status === 'success' && styles.statusSuccess,
                    testResults.openai.status === 'failed' && styles.statusFailed,
                  ]}>
                    {testResults.openai.status === 'success' 
                      ? testResults.openai.model 
                        ? `✅ Connected (${testResults.openai.model})`
                        : '✅ Connected'
                      : testResults.openai.status === 'failed'
                      ? `❌ ${testResults.openai.message}`
                      : apiKeys.openai 
                      ? '🔑 Key entered' 
                      : '⚪ Not configured'}
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
                  <Text style={styles.linkButtonText}>Get API Key →</Text>
                </TouchableOpacity>
                
                <Text style={styles.stepTitle}>Step 2: Enter your key</Text>
                <View style={[styles.inputContainer, savedKeys.openai && !editMode.openai && styles.inputContainerSaved]}>
                  <TextInput
                    style={[
                      styles.input,
                      savedKeys.openai && !editMode.openai && styles.inputSaved,
                      testResults.openai.status === 'failed' && styles.inputFailed,
                    ]}
                    placeholder="sk-proj-..."
                    value={savedKeys.openai && !editMode.openai
                      ? getMaskedKey(apiKeys.openai)
                      : apiKeys.openai
                    }
                    onChangeText={(text) => {
                      setApiKeys(prev => ({ ...prev, openai: text }));
                      setTestResults(prev => ({ ...prev, openai: { provider: 'openai', status: 'idle' }}));
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={editMode.openai || !savedKeys.openai || testResults.openai.status === 'testing'}
                  />
                  {savedKeys.openai && (
                    <TouchableOpacity
                      onPress={() => toggleEditMode('openai')}
                      style={styles.editButton}
                    >
                      <Text style={styles.editIcon}>{editMode.openai ? '✓' : '✏️'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <Text style={styles.stepTitle}>Step 3: Test your connection</Text>
                <TouchableOpacity
                  onPress={() => testApiKey('openai')}
                  style={[
                    styles.testButton,
                    !apiKeys.openai && styles.testButtonDisabled,
                    testResults.openai.status === 'success' && styles.testButtonSuccess,
                  ]}
                  disabled={!apiKeys.openai || testResults.openai.status === 'testing'}
                >
                  {testResults.openai.status === 'testing' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.testButtonText}>
                      {testResults.openai.status === 'success' 
                        ? `✅ Connected (${testResults.openai.latency}ms)`
                        : 'Test Connection'}
                    </Text>
                  )}
                </TouchableOpacity>

                {testResults.openai.status === 'testing' && (
                  <Animated.View entering={FadeIn} style={styles.telemetryBox}>
                    <Text style={styles.telemetryText}>🔄 Establishing connection...</Text>
                    <Text style={styles.telemetryText}>📡 Sending handshake...</Text>
                    <Text style={styles.telemetryText}>⏱️ Measuring latency...</Text>
                  </Animated.View>
                )}
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
                  <Text style={[
                    styles.sectionStatus,
                    testResults.google.status === 'success' && styles.statusSuccess,
                    testResults.google.status === 'failed' && styles.statusFailed,
                  ]}>
                    {testResults.google.status === 'success' 
                      ? testResults.google.model 
                        ? `✅ Connected (${testResults.google.model})`
                        : '✅ Connected'
                      : testResults.google.status === 'failed'
                      ? `❌ ${testResults.google.message}`
                      : apiKeys.google 
                      ? '🔑 Key entered' 
                      : '⚪ Not configured'}
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
                  <Text style={styles.linkButtonText}>Get API Key →</Text>
                </TouchableOpacity>
                
                <Text style={styles.stepTitle}>Step 2: Enter your key</Text>
                <View style={[styles.inputContainer, savedKeys.google && !editMode.google && styles.inputContainerSaved]}>
                  <TextInput
                    style={[
                      styles.input,
                      savedKeys.google && !editMode.google && styles.inputSaved,
                      testResults.google.status === 'failed' && styles.inputFailed,
                    ]}
                    placeholder="AIzaSy..."
                    value={savedKeys.google && !editMode.google
                      ? getMaskedKey(apiKeys.google)
                      : apiKeys.google
                    }
                    onChangeText={(text) => {
                      setApiKeys(prev => ({ ...prev, google: text }));
                      setTestResults(prev => ({ ...prev, google: { provider: 'google', status: 'idle' }}));
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={editMode.google || !savedKeys.google || testResults.google.status === 'testing'}
                  />
                  {savedKeys.google && (
                    <TouchableOpacity
                      onPress={() => toggleEditMode('google')}
                      style={styles.editButton}
                    >
                      <Text style={styles.editIcon}>{editMode.google ? '✓' : '✏️'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <Text style={styles.stepTitle}>Step 3: Test your connection</Text>
                <TouchableOpacity
                  onPress={() => testApiKey('google')}
                  style={[
                    styles.testButton,
                    !apiKeys.google && styles.testButtonDisabled,
                    testResults.google.status === 'success' && styles.testButtonSuccess,
                  ]}
                  disabled={!apiKeys.google || testResults.google.status === 'testing'}
                >
                  {testResults.google.status === 'testing' ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.testButtonText}>
                      {testResults.google.status === 'success' 
                        ? `✅ Connected (${testResults.google.latency}ms)`
                        : 'Test Connection'}
                    </Text>
                  )}
                </TouchableOpacity>

                {testResults.google.status === 'testing' && (
                  <Animated.View entering={FadeIn} style={styles.telemetryBox}>
                    <Text style={styles.telemetryText}>🔄 Establishing connection...</Text>
                    <Text style={styles.telemetryText}>📡 Sending handshake...</Text>
                    <Text style={styles.telemetryText}>⏱️ Measuring latency...</Text>
                  </Animated.View>
                )}
              </View>
            )}
          </Animated.View>

          {/* Security note */}
          <Animated.View 
            entering={FadeInDown.delay(500).springify()}
            style={styles.securityNote}
          >
            <Text style={styles.securityTitle}>🔒 Your Security</Text>
            <Text style={styles.securityText}>
              • Keys are encrypted and stored locally{'\n'}
              • Successfully tested keys are auto-saved{'\n'}
              • We never send keys to our servers{'\n'}
              • You can modify or clear keys anytime
            </Text>
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
    paddingBottom: 100,
    flexGrow: 1,
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
  clearAllButton: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  clearAllButtonText: {
    color: '#856404',
    fontSize: 16,
    fontWeight: '600',
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
  statusSuccess: {
    color: '#34C759',
    fontWeight: '500',
  },
  statusFailed: {
    color: '#FF3B30',
    fontWeight: '500',
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
  inputContainerSaved: {
    backgroundColor: '#F8F8FA',
    borderColor: '#D1D1D6',
  },
  inputSaved: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  inputFailed: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  editButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 18,
  },
  testButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  testButtonDisabled: {
    backgroundColor: '#C8C8C8',
  },
  testButtonSuccess: {
    backgroundColor: '#007AFF',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  telemetryBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#B3E5FC',
  },
  telemetryText: {
    fontSize: 13,
    color: '#0277BD',
    marginVertical: 2,
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
});

export default APIConfigScreen;