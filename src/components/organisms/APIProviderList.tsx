import React from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../atoms';
import { Typography } from '../molecules';
import { ProviderCard } from './ProviderCard';
import { ProviderExpertSettings } from './ProviderExpertSettings';
import { AIProvider } from '../../config/aiProviders';
import { DEFAULT_PARAMETERS } from '../../config/modelConfigs';
import { useTheme } from '../../theme';
import { getAPIKeyProviderId } from '../../utils/typeGuards';

export interface APIProviderListProps {
  providers: AIProvider[];
  apiKeys: Record<string, string>;
  verificationStatus: Record<string, {
    status: 'idle' | 'testing' | 'success' | 'failed';
    message?: string;
    model?: string;
  }>;
  onKeyChange: (providerId: string, key: string) => void;
  onTest: (providerId: string) => Promise<{ success: boolean; message?: string; model?: string; }>;
  onSave: (providerId: string) => Promise<void>;
  onToggleExpand: (providerId: string) => void;
  expandedProvider: string | null;
  expertModeConfigs: Record<string, { enabled: boolean; selectedModel?: string; parameters?: Record<string, number>; }>;
  isPremium: boolean;
  onExpertModeToggle: (providerId: string, enabled: boolean) => void;
  onModelChange: (providerId: string, modelId: string) => void;
  onParameterChange: (providerId: string, param: string, value: number) => void;
  testID?: string;
}

export const APIProviderList: React.FC<APIProviderListProps> = ({
  providers,
  apiKeys,
  verificationStatus,
  onKeyChange,
  onTest,
  onSave,
  onToggleExpand,
  expandedProvider,
  expertModeConfigs,
  isPremium,
  onExpertModeToggle,
  onModelChange,
  onParameterChange,
  testID,
}) => {
  const { theme } = useTheme();

  if (!providers || providers.length === 0) {
    return (
      <Box style={styles.emptyContainer} testID={testID}>
        <Typography variant="body" color="secondary" align="center">
          No AI providers available
        </Typography>
      </Box>
    );
  }

  return (
    <Box style={styles.container} testID={testID}>
      <Typography variant="title" style={styles.sectionTitle}>
        Available AI Services
      </Typography>
      
      {providers.map((provider, index) => {
        const providerKey = getAPIKeyProviderId(provider.id);
        const expertConfig = (providerKey && expertModeConfigs[providerKey]) || { 
          enabled: false, 
          parameters: DEFAULT_PARAMETERS 
        };
        const isExpanded = expandedProvider === provider.id;
        const hasApiKey = !!(apiKeys[provider.id] && apiKeys[provider.id].trim().length > 0);
        
        return (
          <Box key={provider.id} style={[
            styles.providerContainer,
            { marginBottom: theme.spacing.lg }
          ]}>
            <ProviderCard
              provider={provider}
              apiKey={apiKeys[provider.id] || ''}
              onKeyChange={(key) => onKeyChange(provider.id, key)}
              onTest={() => onTest(provider.id)}
              onSave={() => onSave(provider.id)}
              isExpanded={isExpanded}
              onToggleExpand={() => onToggleExpand(provider.id)}
              index={index}
              testStatus={verificationStatus[provider.id]?.status}
              testStatusMessage={verificationStatus[provider.id]?.message}
              selectedModel={expertConfig.enabled ? expertConfig.selectedModel : undefined}
              expertModeEnabled={expertConfig.enabled === true}
            />
            
            {/* Expert Mode Settings */}
            {isExpanded && hasApiKey && (
              <Box style={[
                styles.expertModeContainer,
                { marginTop: theme.spacing.md }
              ]}>
                <ProviderExpertSettings
                  providerId={provider.id}
                  isEnabled={expertConfig.enabled}
                  isPremium={isPremium}
                  onToggle={(enabled) => onExpertModeToggle(provider.id, enabled)}
                  selectedModel={expertConfig.enabled ? expertConfig.selectedModel : undefined}
                  onModelChange={(modelId) => onModelChange(provider.id, modelId)}
                  parameters={{
                    ...DEFAULT_PARAMETERS,
                    ...expertConfig.parameters
                  }}
                  onParameterChange={(param, value) => onParameterChange(provider.id, param, Number(value))}
                />
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    // Main container styles
  },
  emptyContainer: {
    padding: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  providerContainer: {
    // Individual provider container styles
  },
  expertModeContainer: {
    // Expert mode settings container styles
  },
});