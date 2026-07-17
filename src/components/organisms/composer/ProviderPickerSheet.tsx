import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Typography, SheetHeader } from '@/components/molecules';
import { AIAvatar } from '../common/AIAvatar';
import { AI_PROVIDERS } from '@/config/aiProviders';
import { getAIProviderIcon } from '@/utils/aiProviderAssets';

/** Minimal provider row data; AI_PROVIDERS entries satisfy it structurally. */
export interface ProviderPickerItem {
  id: string;
  name: string;
  company: string;
  color: string;
}

interface ProviderPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectProvider: (providerId: string) => void;
  selectedProviderIds: string[];
  configuredProviderIds: string[];
  /** When set (demo mode), only these providers are listed and Add-key rows are hidden. */
  allowedProviderIds?: string[];
  /** Compare allows the same provider on both sides (different models). */
  allowDuplicates?: boolean;
  onRequestAddKey?: () => void;
  /** Catalog override (e.g. Create's media providers). Defaults to enabled AI_PROVIDERS. */
  providers?: ProviderPickerItem[];
  testID?: string;
}

/**
 * Bottom sheet listing providers for the composer's [+] Add AI chip.
 * Keyed providers are selectable; un-keyed ones are dimmed with an
 * "Add key" action that routes to API configuration.
 */
export const ProviderPickerSheet: React.FC<ProviderPickerSheetProps> = ({
  visible,
  onClose,
  onSelectProvider,
  selectedProviderIds,
  configuredProviderIds,
  allowedProviderIds,
  allowDuplicates = false,
  onRequestAddKey,
  providers: providersProp,
  testID,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const providers = useMemo<ProviderPickerItem[]>(
    () =>
      (providersProp ?? AI_PROVIDERS.filter(provider => provider.enabled)).filter(
        provider => !allowedProviderIds || allowedProviderIds.includes(provider.id)
      ),
    [providersProp, allowedProviderIds]
  );

  const handleSelect = (providerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectProvider(providerId);
    onClose();
  };

  const handleAddKey = () => {
    onClose();
    onRequestAddKey?.();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close AI picker"
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
          <SheetHeader title="Add an AI" onClose={onClose} showHandle testID={testID} />
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {providers.map(provider => {
              const iconData = getAIProviderIcon(provider.id);
              const isConfigured = configuredProviderIds.includes(provider.id);
              const isSelected = selectedProviderIds.includes(provider.id);
              const isBlocked = isSelected && !allowDuplicates;
              const canSelect = isConfigured && !isBlocked;

              return (
                <TouchableOpacity
                  key={provider.id}
                  onPress={() => canSelect && handleSelect(provider.id)}
                  disabled={!canSelect}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={provider.name}
                  accessibilityState={{ disabled: !canSelect, selected: isSelected }}
                  style={[
                    styles.row,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                      opacity: isConfigured ? 1 : 0.55,
                    },
                  ]}
                >
                  <AIAvatar
                    icon={iconData.icon}
                    iconType={iconData.iconType}
                    size="small"
                    color={provider.color}
                  />
                  <View style={styles.rowText}>
                    <Typography variant="body" weight="medium">
                      {provider.name}
                    </Typography>
                    <Typography variant="caption" color="secondary">
                      {provider.company}
                    </Typography>
                  </View>
                  {isBlocked ? (
                    <View style={styles.rowTrailing}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.colors.success[500]}
                      />
                      <Typography variant="caption" color="secondary">
                        Added
                      </Typography>
                    </View>
                  ) : !isConfigured && onRequestAddKey ? (
                    <TouchableOpacity
                      onPress={handleAddKey}
                      accessibilityRole="button"
                      accessibilityLabel={`Add API key for ${provider.name}`}
                      style={[styles.addKeyChip, { borderColor: theme.colors.primary[400] }]}
                    >
                      <Typography
                        variant="caption"
                        weight="medium"
                        style={{ color: theme.colors.primary[500] }}
                      >
                        Add key
                      </Typography>
                    </TouchableOpacity>
                  ) : canSelect ? (
                    <Ionicons
                      name="add-circle-outline"
                      size={22}
                      color={theme.colors.text.secondary}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
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
    maxHeight: '75%',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowText: {
    flex: 1,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addKeyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
});

export default ProviderPickerSheet;
