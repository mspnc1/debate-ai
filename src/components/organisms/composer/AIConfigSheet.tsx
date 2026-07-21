import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Typography, InfoButton, ConfigRow } from '@/components/molecules';
import { AIAvatar } from '../common/AIAvatar';
import { PagedSheet, usePagedSheetNav } from '../common/PagedSheet';
import { ModelOptionList, getModelTokenPricing } from '../home/ModelOptionList';
import { PersonalityOptionGrid } from '../personality/PersonalityOptionGrid';
import { AISelectionConfig } from '@/types/aiSelection';
import { getProviderById } from '@/config/aiProviders';
import { getProviderModels } from '@/config/modelConfigs';
import { UNIVERSAL_PERSONALITIES } from '@/config/personalities';
import { usePersonality } from '@/hooks/usePersonality';
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

interface PageProps {
  config: AISelectionConfig;
  providerName: string;
}

const ConfigRootPage: React.FC<
  PageProps & {
    company: string;
    iconData: ReturnType<typeof getAIProviderIcon>;
    color: string;
    onRemove: () => void;
    onOpenAdvanced?: () => void;
  }
> = ({ config, providerName, company, iconData, color, onRemove, onOpenAdvanced }) => {
  const { theme } = useTheme();
  const nav = usePagedSheetNav();
  const { isCustomized } = usePersonality();

  const models = (getProviderModels(config.providerId) || []).filter((m) => !m.isDeprecated);
  const currentModel =
    models.find((m) => m.id === config.modelId) || models.find((m) => m.isDefault);
  const currentPersonality =
    UNIVERSAL_PERSONALITIES.find((p) => p.id === config.personalityId) || UNIVERSAL_PERSONALITIES[0];

  return (
    <ScrollView
      style={styles.body}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.identityRow}>
        <AIAvatar icon={iconData.icon} iconType={iconData.iconType} size="small" color={color} />
        <Typography variant="caption" color="secondary">
          {company}
        </Typography>
      </View>

      <View style={styles.section}>
        <Typography variant="caption" color="secondary" style={styles.label}>
          Model
        </Typography>
        <ConfigRow
          primary={currentModel?.name || 'Select Model'}
          secondary={currentModel ? getModelTokenPricing(config.providerId, currentModel.id) ?? undefined : undefined}
          onPress={() => nav.push('model')}
          accessibilityLabel={`Model: ${currentModel?.name || 'none selected'}`}
          accessibilityHint="Opens model picker"
          testID="ai-config-model-row"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Typography variant="caption" color="secondary">
            Personality
          </Typography>
          <InfoButton topicId="personalities" size="small" />
        </View>
        <ConfigRow
          primary={`${currentPersonality.emoji} ${currentPersonality.name}`}
          secondary={currentPersonality.tagline}
          showIndicatorDot={isCustomized(currentPersonality.id)}
          onPress={() => nav.push('personality')}
          accessibilityLabel={`Personality: ${currentPersonality.name}`}
          accessibilityHint="Opens personality picker"
          testID="ai-config-personality-row"
        />
      </View>

      {onOpenAdvanced && (
        <TouchableOpacity
          onPress={onOpenAdvanced}
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
        onPress={onRemove}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${providerName} from conversation`}
        style={styles.removeRow}
      >
        <Ionicons name="trash-outline" size={18} color={theme.colors.error[500]} />
        <Typography variant="body" weight="medium" color="error">
          Remove from conversation
        </Typography>
      </TouchableOpacity>
    </ScrollView>
  );
};

const ModelPage: React.FC<PageProps & { onChangeModel: (modelId: string) => void }> = ({
  config,
  providerName,
  onChangeModel,
}) => {
  const { theme } = useTheme();
  const nav = usePagedSheetNav();

  return (
    <View style={styles.pickerPage}>
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: 8 }}>
        <Typography variant="caption" color="secondary">
          for {providerName}
        </Typography>
      </View>
      <ModelOptionList
        providerId={config.providerId}
        selectedModel={config.modelId}
        onSelectModel={(modelId) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChangeModel(modelId);
          nav.pop();
        }}
        testID="ai-config-model-list"
      />
    </View>
  );
};

const PersonalityPage: React.FC<
  PageProps & { onChangePersonality: (personalityId: string) => void }
> = ({ config, providerName, onChangePersonality }) => {
  const nav = usePagedSheetNav();

  return (
    <View style={[styles.pickerPage, styles.personalityPage]}>
      <View style={{ paddingTop: 8, paddingBottom: 4 }}>
        <Typography variant="caption" color="secondary">
          for {providerName}
        </Typography>
      </View>
      <PersonalityOptionGrid
        personalities={UNIVERSAL_PERSONALITIES}
        selectedPersonalityId={config.personalityId}
        onSelectPersonality={(personalityId) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onChangePersonality(personalityId);
          nav.pop();
        }}
        testID="ai-config-personality-grid"
      />
    </View>
  );
};

/**
 * Per-pill config sheet: one PagedSheet whose root page links to in-sheet
 * model and personality picker pages (tap an option to select and return),
 * plus a link to Expert Mode and a destructive remove action.
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
    <PagedSheet visible={visible} onClose={onClose} testID={testID}>
      <PagedSheet.Page id="root" title={provider.name}>
        <ConfigRootPage
          config={config}
          providerName={provider.name}
          company={provider.company}
          iconData={iconData}
          color={provider.color}
          onRemove={handleRemove}
          onOpenAdvanced={onOpenAdvanced ? handleAdvanced : undefined}
        />
      </PagedSheet.Page>
      <PagedSheet.Page id="model" title="Select Model">
        <ModelPage config={config} providerName={provider.name} onChangeModel={onChangeModel} />
      </PagedSheet.Page>
      <PagedSheet.Page id="personality" title="Choose a Personality">
        <PersonalityPage
          config={config}
          providerName={provider.name}
          onChangePersonality={onChangePersonality}
        />
      </PagedSheet.Page>
    </PagedSheet>
  );
};

const styles = StyleSheet.create({
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
  label: {
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
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
  pickerPage: {
    flex: 1,
  },
  personalityPage: {
    paddingHorizontal: 16,
  },
});

export default AIConfigSheet;
