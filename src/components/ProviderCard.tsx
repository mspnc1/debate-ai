import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { ThemedText, GradientButton } from './core';
import { AIProvider } from '../config/aiProviders';
import * as Haptics from 'expo-haptics';

interface ProviderCardProps {
  provider: AIProvider;
  apiKey: string;
  onKeyChange: (key: string) => void;
  onTest: () => Promise<{ success: boolean; message?: string; model?: string }>;
  onSave: () => Promise<void>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  index: number;
  testStatus?: 'idle' | 'testing' | 'success' | 'failed';
  testMessage?: string;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  apiKey,
  onKeyChange,
  onTest,
  onSave,
  isExpanded,
  onToggleExpand,
  index,
  testStatus = 'idle',
  testMessage,
}) => {
  const { theme, isDark } = useTheme();
  const [isEditing, setIsEditing] = useState(!apiKey);
  const [isTesting, setIsTesting] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey);

  const handleTest = async () => {
    setIsTesting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const result = await onTest();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Auto-save on successful test
        await onSave();
        setIsEditing(false);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const getMaskedKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 10) return '•'.repeat(key.length);
    return key.slice(0, 3) + '•'.repeat(key.length - 6) + key.slice(-3);
  };

  const openURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open URL');
    }
  };

  const getStatusIcon = () => {
    switch (testStatus) {
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'testing':
        return '⏳';
      default:
        return apiKey ? '🔑' : '⚪';
    }
  };

  const getStatusText = () => {
    switch (testStatus) {
      case 'success':
        return testMessage || 'Connected';
      case 'failed':
        return testMessage || 'Connection failed';
      case 'testing':
        return 'Testing...';
      default:
        return apiKey ? 'Key configured' : 'Not configured';
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
      style={{ marginBottom: 16 }}
    >
      <TouchableOpacity
        onPress={onToggleExpand}
        activeOpacity={0.7}
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: isExpanded ? provider.color : theme.colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {/* Provider Icon with gradient background */}
            <LinearGradient
              colors={provider.gradient}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 24 }}>{provider.icon}</Text>
            </LinearGradient>
            
            <View style={{ flex: 1 }}>
              <ThemedText variant="subtitle" weight="semibold">
                {provider.name}
              </ThemedText>
              <ThemedText variant="caption" color="secondary">
                {getStatusIcon()} {getStatusText()}
              </ThemedText>
            </View>
          </View>
          
          <Text style={{ fontSize: 20, color: theme.colors.text.secondary }}>
            {isExpanded ? '−' : '+'}
          </Text>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderRadius: 12,
            padding: 16,
            marginTop: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          {/* Provider Description */}
          <ThemedText variant="body" color="secondary" style={{ marginBottom: 12 }}>
            {provider.description}
          </ThemedText>
          
          {/* Features */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            {provider.features.map((feature, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: isDark ? theme.colors.gray[800] : theme.colors.gray[100],
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  marginRight: 6,
                  marginBottom: 6,
                }}
              >
                <ThemedText variant="caption">{feature}</ThemedText>
              </View>
            ))}
          </View>

          {/* Get API Key Button */}
          <TouchableOpacity
            onPress={() => openURL(provider.getKeyUrl)}
            style={{
              backgroundColor: theme.colors.primary[100],
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <ThemedText variant="body" color="brand" weight="semibold">
              Get API Key →
            </ThemedText>
          </TouchableOpacity>

          {/* API Key Input */}
          <View style={{ marginBottom: 16 }}>
            <ThemedText variant="caption" color="secondary" style={{ marginBottom: 8 }}>
              API Key
            </ThemedText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? theme.colors.gray[900] : theme.colors.gray[50],
                borderRadius: 8,
                borderWidth: 1,
                borderColor: testStatus === 'failed' ? theme.colors.error[500] : theme.colors.border,
                paddingHorizontal: 12,
                height: 48,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  color: theme.colors.text.primary,
                  fontSize: 14,
                }}
                placeholder={provider.apiKeyPlaceholder}
                placeholderTextColor={theme.colors.text.disabled}
                value={isEditing ? localKey : getMaskedKey(localKey)}
                onChangeText={(text) => {
                  setLocalKey(text);
                  onKeyChange(text);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!isEditing && !!apiKey}
                editable={isEditing}
              />
              
              {apiKey && (
                <TouchableOpacity
                  onPress={() => {
                    setIsEditing(!isEditing);
                    if (!isEditing) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={{ padding: 8 }}
                >
                  <Text>{isEditing ? '👁️' : '✏️'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Test Connection Button */}
          <GradientButton
            title={isTesting ? 'Testing...' : 'Test Connection'}
            onPress={handleTest}
            disabled={!localKey || isTesting}
            gradient={provider.gradient}
            fullWidth
          />

          {/* Documentation Link */}
          <TouchableOpacity
            onPress={() => openURL(provider.docsUrl)}
            style={{ alignItems: 'center', marginTop: 12 }}
          >
            <ThemedText variant="caption" color="secondary">
              View Documentation →
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};