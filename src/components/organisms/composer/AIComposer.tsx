import React, { useState } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { ComposerShell, ComposerPillDescriptor } from './ComposerShell';
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
 * Composer-first entry surface for Chat/Compare: resolves the LLM catalog
 * (providers + models) into ComposerShell pills and owns the LLM-shaped
 * sheets. Sending auto-creates the session — there is no separate Start
 * button.
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

  // Pills track their config index explicitly so a config whose provider
  // fails to resolve never shifts the tap targets of the pills after it.
  const pills: ComposerPillDescriptor[] = [];
  const pillConfigIndices: number[] = [];
  configs.forEach((config, index) => {
    const provider = getProviderById(config.providerId);
    if (!provider) return;
    const model = getModelById(config.providerId, config.modelId);
    pills.push({
      key: `${config.providerId}-${index}`,
      name: provider.name,
      color: provider.color,
      modelLabel: isTablet ? model?.name : undefined,
      indexLabel: pillIndexLabels?.[index],
    });
    pillConfigIndices.push(index);
  });

  const activeConfig = configIndex !== null ? configs[configIndex] ?? null : null;

  const closeConfigSheet = () => setConfigIndex(null);

  return (
    <ComposerShell
      inputText={inputText}
      onChangeText={onChangeText}
      onSend={onSend}
      canSend={canSend}
      pills={pills}
      onPillPress={pillIndex => setConfigIndex(pillConfigIndices[pillIndex] ?? null)}
      showAddPill={configs.length < maxAIs}
      onAddPill={() => setPickerVisible(true)}
      addPillEmphasized={!hasEnoughAIs}
      validationMessage={validationMessage}
      placeholder={placeholder}
      disabled={disabled}
      testID={testID}
    >
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
    </ComposerShell>
  );
};

export default AIComposer;
