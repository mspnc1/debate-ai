import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { AIPill, AddAIPill, ComposerValidationHint } from '@/components/molecules';
import { ProviderPickerSheet } from './ProviderPickerSheet';
import { AIConfigSheet } from './AIConfigSheet';
import { AISelectionConfig, AISelectionMode } from '@/types/aiSelection';
import { getProviderById } from '@/config/aiProviders';
import { getModelById } from '@/config/modelConfigs';

export interface AIComposerProps {
  mode: AISelectionMode;
  configs: AISelectionConfig[];
  minAIs: number;
  maxAIs: number;
  onAddProvider: (providerId: string) => void;
  onUpdateConfig: (index: number, patch: Partial<AISelectionConfig>) => void;
  onRemoveConfig: (index: number) => void;
  configuredProviderIds: string[];
  /** Demo mode: restrict the picker to these providers and hide Add-key rows. */
  allowedProviderIds?: string[];
  onRequestAddKey?: () => void;
  /** Hidden when undefined (demo): "Advanced parameters" link per pill. */
  onOpenAdvanced?: (providerId: string) => void;
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  /** Demo sends open a sample picker regardless of typed text. */
  requireText?: boolean;
  placeholder?: string;
  /** Compare labels its pills by pane, e.g. ['1', '2']. */
  pillIndexLabels?: string[];
  disabled?: boolean;
  testID?: string;
}

/**
 * Composer-first entry surface: message input on top, a WHO row of provider
 * pills + [+] Add AI, and an OPTIONS & GO row (web search left, send right).
 * Sending auto-creates the session — there is no separate Start button.
 */
export const AIComposer: React.FC<AIComposerProps> = ({
  mode,
  configs,
  minAIs,
  maxAIs,
  onAddProvider,
  onUpdateConfig,
  onRemoveConfig,
  configuredProviderIds,
  allowedProviderIds,
  onRequestAddKey,
  onOpenAdvanced,
  inputText,
  onChangeText,
  onSend,
  requireText = true,
  placeholder = 'Ask anything…',
  pillIndexLabels,
  disabled = false,
  testID,
}) => {
  const { theme } = useTheme();
  const { isTablet } = useResponsive();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [configIndex, setConfigIndex] = useState<number | null>(null);

  const hasEnoughAIs = configs.length >= minAIs;
  const hasText = inputText.trim().length > 0;
  const canSend = !disabled && hasEnoughAIs && (hasText || !requireText);
  const validationMessage = !hasEnoughAIs
    ? mode === 'compare'
      ? configs.length === 0
        ? 'Add 2 AIs to compare side by side'
        : 'Compare needs 2 AIs — add another to continue'
      : 'Add an AI to start chatting'
    : null;

  const activeConfig = configIndex !== null ? configs[configIndex] ?? null : null;

  const handleSend = () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSend(inputText.trim());
  };

  const closeConfigSheet = () => setConfigIndex(null);

  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
        },
      ]}
      testID={testID}
    >
      <TextInput
        value={inputText}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.disabled}
        multiline
        style={[styles.input, { color: theme.colors.text.primary }]}
        editable={!disabled}
        accessibilityLabel="Message input"
        testID={testID ? `${testID}-input` : undefined}
      />

      {/* Bottom row — WHO + GO: pills scroll, Add AI and send stay pinned.
          Model names show on tablets only; phones keep pills compact. */}
      <View style={styles.bottomRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroll}
          contentContainerStyle={styles.pillRow}
          keyboardShouldPersistTaps="handled"
        >
          {configs.map((config, index) => {
            const provider = getProviderById(config.providerId);
            if (!provider) return null;
            const model = getModelById(config.providerId, config.modelId);
            return (
              <AIPill
                key={`${config.providerId}-${index}`}
                name={provider.name}
                color={provider.color}
                modelLabel={isTablet ? model?.name : undefined}
                indexLabel={pillIndexLabels?.[index]}
                onPress={() => setConfigIndex(index)}
                disabled={disabled}
                testID={testID ? `${testID}-pill-${index}` : undefined}
              />
            );
          })}
        </ScrollView>
        {configs.length < maxAIs && (
          <AddAIPill
            onPress={() => setPickerVisible(true)}
            emphasized={!hasEnoughAIs}
            compact={configs.length > 0}
            testID={testID ? `${testID}-add-ai` : undefined}
          />
        )}
        <View style={styles.rowSpacer} />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          style={[
            styles.sendButton,
            {
              backgroundColor: canSend ? theme.colors.primary[500] : theme.colors.border,
            },
          ]}
          testID={testID ? `${testID}-send` : undefined}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={canSend ? '#FFFFFF' : theme.colors.text.disabled}
          />
        </TouchableOpacity>
      </View>

      {validationMessage && (
        <ComposerValidationHint
          message={validationMessage}
          testID={testID ? `${testID}-validation` : undefined}
        />
      )}

      <ProviderPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectProvider={onAddProvider}
        selectedProviderIds={configs.map(c => c.providerId)}
        configuredProviderIds={configuredProviderIds}
        allowedProviderIds={allowedProviderIds}
        allowDuplicates={mode === 'compare'}
        onRequestAddKey={onRequestAddKey}
        testID={testID ? `${testID}-picker` : undefined}
      />

      <AIConfigSheet
        visible={activeConfig !== null}
        onClose={closeConfigSheet}
        config={activeConfig}
        onChangeModel={modelId => {
          if (configIndex !== null) onUpdateConfig(configIndex, { modelId });
        }}
        onChangePersonality={personalityId => {
          if (configIndex !== null) onUpdateConfig(configIndex, { personalityId });
        }}
        onRemove={() => {
          if (configIndex !== null) onRemoveConfig(configIndex);
        }}
        onOpenAdvanced={
          onOpenAdvanced && activeConfig
            ? () => onOpenAdvanced(activeConfig.providerId)
            : undefined
        }
        testID={testID ? `${testID}-config` : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  input: {
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: 8,
    paddingBottom: 8,
    textAlignVertical: 'top',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  pillScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowSpacer: {
    flex: 1,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AIComposer;
