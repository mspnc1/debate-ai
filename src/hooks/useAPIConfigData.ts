import { useMemo } from 'react';
import { AI_PROVIDERS, getEnabledProviders } from '../config/aiProviders';
import { validateAPIKeyProvider } from '../utils/typeGuards';
import { useAPIKeys } from './useAPIKeys';
import { useConnectionTest } from './useConnectionTest';
import { useExpertMode } from './useExpertMode';
import { useProviderVerification } from './useProviderVerification';

/**
 * Custom hook that handles data computation and transformation for API configuration
 * to reduce the main component complexity and improve performance with memoization.
 */
export const useAPIConfigData = () => {
  const { apiKeys } = useAPIKeys();
  const { testStatuses } = useConnectionTest();
  const { getConfig } = useExpertMode();
  const { verifiedProviders, getVerificationMessage, getVerificationModel } = useProviderVerification();

  // Memoized provider lists to avoid unnecessary recalculations
  const enabledProviders = useMemo(() => getEnabledProviders(), []);
  const disabledProviders = useMemo(() => AI_PROVIDERS.filter(p => !p.enabled), []);
  
  // Count of providers with valid API keys configured
  const configuredCount = useMemo(() => 
    enabledProviders.filter(p => !!apiKeys[p.id]).length, 
    [enabledProviders, apiKeys]
  );

  /**
   * Convert test statuses for provider list component
   * Combines temporary test status with persistent verification status
   */
  const verificationStatus = useMemo(() => {
    const statusMap: Record<string, {
      status: 'idle' | 'testing' | 'success' | 'failed';
      message?: string;
      model?: string;
    }> = {};
    
    // First, check for verified providers from Redux
    enabledProviders.forEach(provider => {
      const hasKey = !!apiKeys[provider.id];
      const isVerified = verifiedProviders.includes(provider.id);
      
      if (isVerified && hasKey) {
        // Provider is verified and has a key
        const message = getVerificationMessage(provider.id, hasKey);
        const model = getVerificationModel(provider.id);
        statusMap[provider.id] = {
          status: 'success',
          message: message || 'Verified',
          model: model
        };
      }
    });
    
    // Then overlay any active test statuses (these take priority for UI feedback)
    Object.entries(testStatuses).forEach(([providerId, status]) => {
      statusMap[providerId] = {
        status: status.status,
        message: status.message,
        model: status.model
      };
    });
    
    return statusMap;
  }, [testStatuses, verifiedProviders, enabledProviders, apiKeys, getVerificationMessage, getVerificationModel]);

  /**
   * Convert expert mode configs for provider list, filtering only valid API key providers.
   * This complex transformation:
   * 1. Filters providers to only those that support API keys (claude, openai, google)
   * 2. Maps each provider to its expert mode configuration
   * 3. Returns as object for efficient lookup by provider ID
   */
  const expertModeConfigs = useMemo(() => 
    Object.fromEntries(
      enabledProviders
        .filter(provider => {
          try {
            // Only include providers that have API key support
            validateAPIKeyProvider(provider.id);
            return true;
          } catch {
            // Skip providers that don't support API keys (nomi, replika, etc.)
            return false;
          }
        })
        .map(provider => [
          provider.id,
          getConfig(validateAPIKeyProvider(provider.id))
        ])
    ), 
    [enabledProviders, getConfig]
  );

  return {
    enabledProviders,
    disabledProviders,
    configuredCount,
    verificationStatus,
    expertModeConfigs,
  };
};