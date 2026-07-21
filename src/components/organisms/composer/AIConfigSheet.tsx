import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Typography, SheetHeader } from '@/components/molecules';
import { AIAvatar } from '../common/AIAvatar';
import { ModelSelectorEnhanced } from '../home/ModelSelectorEnhanced';
import { PersonalityPicker } from '../home/PersonalityPicker';
import { HelpModalHost } from '../help/HelpModalHost';
import { AISelectionConfig } from '@/types/aiSelection';
import { getProviderById } from '@/config/aiProviders';
import { getAIProviderIcon } from '@/utils/aiProviderAssets';

interface AIConfigSheetProps {
  visible: boolean;
  onClose: () => void;
  config: AISelectionConfig | null;
  onChangeModel: (modelId: string) => void;
  onChangePersonality: (personalityId: string) => void;
  onRemove: () => void;
  /** Hidden when undefined (e.g. demo mode, where Expert Mode is gated). */
  onOpenAdvanced?: () => void;
  testID?: string;
}

/**
 * Per-pill bottom sheet: model picker, personality picker, a link to
 * Expert Mode for advanced parameters, and a destructive remove action.
 */
export const AIConfigSheet: React.FC<AIConfigSheetProps> = ({
  visible,
  onClose,
  config,
  onChangeModel,
  onChangePersonality,
  onRemove,
  onOpenAdvanced,
  testID,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const provider = config ? getProviderById(config.providerId) : undefined;
  if (!config || !provider) return null;
  const iconData = getAIProviderIcon(provider.id);

  const handleRemove = () => {
    onClose();
    onRemove();
  };

  const handleAdvanced = () => {
    onClose();
    onOpenAdvanced?.();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close AI settings"
          testID={testID ? `${testID}-backdrop` : undefined}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <SheetHeader title={provider.name} onClose={onClose} showHandle testID={testID} />
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.identityRow}>
              <AIAvatar
                icon={iconData.icon}
                iconType={iconData.iconType}
                size="small"
                color={provider.color}
              />
              <Typography variant="caption" color="secondary">
                {provider.company}
              </Typography>
            </View>

            <View style={styles.section}>
              <ModelSelectorEnhanced
                providerId={config.providerId}
                selectedModel={config.modelId}
                onSelectModel={onChangeModel}
                compactMode
                showPricing
                aiName={provider.name}
              />
            </View>

            <View style={styles.section}>
              <PersonalityPicker
                currentPersonalityId={config.personalityId}
                onSelectPersonality={onChangePersonality}
                aiName={provider.name}
              />
            </View>

            {onOpenAdvanced && (
              <TouchableOpacity
                onPress={handleAdvanced}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Advanced parameters"
                accessibilityHint="Opens Expert Mode"
                style={[
                  styles.advancedRow,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
                ]}
              >
                <Ionicons name="options-outline" size={18} color={theme.colors.text.secondary} />
                <Typography variant="body" weight="medium" style={styles.advancedLabel}>
                  Advanced parameters
                </Typography>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleRemove}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${provider.name} from conversation`}
              style={styles.removeRow}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.error[500]} />
              <Typography variant="body" weight="medium" color="error">
                Remove from conversation
              </Typography>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
      {/* Lets the InfoButtons' help sheet present above this Modal */}
      <HelpModalHost />
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  advancedLabel: {
    flex: 1,
  },
  removeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
});

export default AIConfigSheet;
