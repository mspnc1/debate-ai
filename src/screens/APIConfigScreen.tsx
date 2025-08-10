import React, { useState } from 'react';
import {
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateApiKeys, updateExpertMode } from '../store';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { ThemedView, ThemedText, ThemedButton } from '../components/core';
import { ProviderCard } from '../components/ProviderCard';
import { ProviderExpertSettings } from '../components/organisms/ProviderExpertSettings';
import { AI_PROVIDERS, getEnabledProviders } from '../config/aiProviders';
import { DEFAULT_PARAMETERS } from '../config/modelConfigs';
import secureStorage from '../services/secureStorage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface APIConfigScreenProps {
  navigation: {
    goBack: () => void;
  };
}

interface ProviderStatus {
  [key: string]: {
    status: 'idle' | 'testing' | 'success' | 'failed';
    message?: string;
    model?: string;
  };
}

const APIConfigScreen: React.FC<APIConfigScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const existingKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const expertModeConfigs = useSelector((state: RootState) => state.settings.expertMode || {});
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  // TODO: Remove true || for production - defaulting to premium for development
  // eslint-disable-next-line no-constant-binary-expression
  const isPremium = true || currentUser?.subscription === 'pro' || currentUser?.subscription === 'business';
  
  // State for all API keys
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>(() => {
    const keys: { [key: string]: string } = {};
    AI_PROVIDERS.forEach(provider => {
      const existingKey = existingKeys ? existingKeys[provider.id as keyof typeof existingKeys] : undefined;
      keys[provider.id] = existingKey || '';
    });
    return keys;
  });

  // State for test results
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>(() => {
    const status: ProviderStatus = {};
    AI_PROVIDERS.forEach(provider => {
      const existingKey = existingKeys ? existingKeys[provider.id as keyof typeof existingKeys] : undefined;
      status[provider.id] = {
        status: existingKey ? 'success' : 'idle',
        message: existingKey ? 'Connected' : undefined,
      };
    });
    return status;
  });

  // State for expanded cards
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Get enabled providers
  const enabledProviders = getEnabledProviders();
  const configuredCount = enabledProviders.filter(p => apiKeys[p.id]).length;
  const progressPercentage = (configuredCount / enabledProviders.length) * 100;

  // Test API connection
  const testConnection = async (providerId: string) => {
    const key = apiKeys[providerId];
    if (!key) return { success: false, message: 'No API key provided' };

    setProviderStatus(prev => ({
      ...prev,
      [providerId]: { status: 'testing' },
    }));

    try {
      // Here you would implement actual API testing for each provider
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate success for demo
      const success = key.length > 10;
      
      if (success) {
        setProviderStatus(prev => ({
          ...prev,
          [providerId]: {
            status: 'success',
            message: 'Connected successfully',
            model: 'Model v1.0', // This would come from actual API response
          },
        }));
        return { success: true, message: 'Connected successfully', model: 'Model v1.0' };
      } else {
        setProviderStatus(prev => ({
          ...prev,
          [providerId]: {
            status: 'failed',
            message: 'Invalid API key',
          },
        }));
        return { success: false, message: 'Invalid API key' };
      }
    } catch {
      setProviderStatus(prev => ({
        ...prev,
        [providerId]: {
          status: 'failed',
          message: 'Connection failed',
        },
      }));
      return { success: false, message: 'Connection failed' };
    }
  };

  // Save API key
  const saveApiKey = async (providerId: string) => {
    const updatedKeys = { ...existingKeys, [providerId]: apiKeys[providerId] };
    await secureStorage.saveApiKeys(updatedKeys);
    dispatch(updateApiKeys(updatedKeys));
  };

  // Clear all keys
  const handleClearAllKeys = () => {
    Alert.alert(
      'Clear All API Keys',
      'This will remove all configured API keys. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await secureStorage.clearApiKeys();
            dispatch(updateApiKeys({}));
            setApiKeys({});
            setProviderStatus({});
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'All API keys have been cleared');
          },
        },
      ],
    );
  };

  // Toggle provider expansion
  const toggleProvider = (providerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedProvider(expandedProvider === providerId ? null : providerId);
  };

  return (
    <ThemedView flex={1} backgroundColor="background">
      <SafeAreaView style={{ flex: 1 }}>
        {/* Custom Header */}
        <ThemedView style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}>
          <ThemedButton 
            onPress={() => navigation.goBack()}
            variant="ghost"
            style={{ borderWidth: 0, minWidth: 44 }}
          >
            <ThemedText size="2xl" color="brand">←</ThemedText>
          </ThemedButton>
          <ThemedText variant="title" weight="bold">API Configuration</ThemedText>
          <ThemedView style={{ width: 44 }} />
        </ThemedView>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Content */}
            <Animated.View
              entering={FadeInDown.springify()}
              style={{ marginTop: 20, marginBottom: 24 }}
            >
              <ThemedText variant="body" color="secondary" style={{ marginBottom: 20 }}>
                Connect your AI services to unlock their full potential
              </ThemedText>

              {/* Progress Bar */}
              <View style={{ marginBottom: 20 }}>
                <View
                  style={{
                    height: 8,
                    backgroundColor: theme.colors.gray[200],
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <LinearGradient
                    colors={theme.colors.gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      height: '100%',
                      width: `${progressPercentage}%`,
                    }}
                  />
                </View>
                <ThemedText
                  variant="caption"
                  color="secondary"
                  style={{ marginTop: 8, textAlign: 'center' }}
                >
                  {configuredCount === 0
                    ? 'No services connected'
                    : configuredCount === enabledProviders.length
                    ? '🎉 All services connected!'
                    : `${configuredCount} of ${enabledProviders.length} services connected`}
                </ThemedText>
              </View>

              {/* Clear All Button */}
              {configuredCount > 0 && (
                <TouchableOpacity
                  onPress={handleClearAllKeys}
                  style={{
                    backgroundColor: theme.colors.error[50],
                    borderColor: theme.colors.error[500],
                    borderWidth: 1,
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <ThemedText variant="body" color="error" weight="semibold">
                    🗑️ Clear All Keys
                  </ThemedText>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Provider Cards */}
            <View>
              <ThemedText variant="title" style={{ marginBottom: 16 }}>
                Available AI Services
              </ThemedText>
              
              {enabledProviders.map((provider, index) => {
                const providerKey = provider.id as 'claude' | 'openai' | 'google';
                const expertConfig = expertModeConfigs[providerKey] || { 
                  enabled: false, 
                  parameters: DEFAULT_PARAMETERS 
                };
                
                return (
                  <View key={provider.id} style={{ marginBottom: theme.spacing.lg }}>
                    <ProviderCard
                      provider={provider}
                      apiKey={apiKeys[provider.id] || ''}
                      onKeyChange={(key) => {
                        setApiKeys(prev => ({ ...prev, [provider.id]: key }));
                      }}
                      onTest={() => testConnection(provider.id)}
                      onSave={() => saveApiKey(provider.id)}
                      isExpanded={expandedProvider === provider.id}
                      onToggleExpand={() => toggleProvider(provider.id)}
                      index={index}
                      testStatus={providerStatus[provider.id]?.status}
                      selectedModel={expertConfig.enabled ? expertConfig.selectedModel : undefined}
                      expertModeEnabled={expertConfig.enabled === true}
                    />
                    
                    {/* Expert Mode Settings */}
                    {expandedProvider === provider.id && apiKeys[provider.id] && (
                      <View style={{ marginTop: theme.spacing.md }}>
                        <ProviderExpertSettings
                          providerId={provider.id}
                          isEnabled={expertConfig.enabled}
                          isPremium={isPremium}
                          onToggle={(enabled) => {
                            dispatch(updateExpertMode({
                              provider: providerKey,
                              config: { ...expertConfig, enabled }
                            }));
                          }}
                          selectedModel={expertConfig.selectedModel}
                          onModelChange={(modelId) => {
                            dispatch(updateExpertMode({
                              provider: providerKey,
                              config: { ...expertConfig, selectedModel: modelId }
                            }));
                          }}
                          parameters={{
                            ...DEFAULT_PARAMETERS,
                            ...expertConfig.parameters
                          }}
                          onParameterChange={(param, value) => {
                            dispatch(updateExpertMode({
                              provider: providerKey,
                              config: {
                                ...expertConfig,
                                parameters: {
                                  ...expertConfig.parameters,
                                  [param]: value
                                }
                              }
                            }));
                          }}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Coming Soon Section */}
            {AI_PROVIDERS.filter(p => !p.enabled).length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(500).springify()}
                style={{ marginTop: 32 }}
              >
                <ThemedText variant="title" style={{ marginBottom: 16 }}>
                  Coming Soon
                </ThemedText>
                <View
                  style={{
                    backgroundColor: theme.colors.card,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {AI_PROVIDERS.filter(p => !p.enabled).map(provider => (
                      <View
                        key={provider.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginRight: 16,
                          marginBottom: 12,
                        }}
                      >
                        <Text style={{ fontSize: 20, marginRight: 8 }}>
                          {provider.icon}
                        </Text>
                        <ThemedText variant="body" color="secondary">
                          {provider.name}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Security Note */}
            <Animated.View
              entering={FadeInDown.delay(600).springify()}
              style={{
                backgroundColor: theme.colors.card,
                borderRadius: 12,
                padding: 16,
                marginTop: 32,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <ThemedText variant="subtitle" weight="semibold" style={{ marginBottom: 8 }}>
                🔒 Your Security
              </ThemedText>
              <ThemedText variant="body" color="secondary">
                • Keys are encrypted and stored locally{'\n'}
                • We never send keys to our servers{'\n'}
                • You can modify or clear keys anytime{'\n'}
                • Each service connection is isolated
              </ThemedText>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
};

export default APIConfigScreen;