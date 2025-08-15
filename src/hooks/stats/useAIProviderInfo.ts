import { useMemo } from 'react';
import { useTheme } from '../../theme';
import { AI_PROVIDERS } from '../../config/aiProviders';
import { AI_BRAND_COLORS } from '../../constants/aiColors';
import { AIInfo } from '../../types/stats';

/**
 * Custom hook for resolving AI provider information
 * Handles provider name resolution, brand colors, and fallback handling
 */
export const useAIProviderInfo = () => {
  const { theme } = useTheme();
  
  // Memoized AI provider resolution function
  const getAIInfo = useMemo(() => {
    return (aiId: string): AIInfo => {
      const provider = AI_PROVIDERS.find(p => p.id === aiId);
      
      if (!provider) {
        return {
          name: aiId,
          color: theme.colors.primary,
        };
      }
      
      // Handle special cases for OpenAI/ChatGPT aliases
      const colorKey = (aiId === 'openai' || aiId === 'chatgpt') ? 'openai' : aiId;
      const brandColors = AI_BRAND_COLORS[colorKey as keyof typeof AI_BRAND_COLORS];
      
      return {
        name: provider.name,
        color: brandColors || theme.colors.primary,
      };
    };
  }, [theme.colors.primary]);
  
  // Batch resolve multiple AI IDs
  const getMultipleAIInfo = useMemo(() => {
    return (aiIds: string[]): AIInfo[] => {
      return aiIds.map(getAIInfo);
    };
  }, [getAIInfo]);
  
  // Get brand color for AI
  const getAIColor = useMemo(() => {
    return (aiId: string) => {
      const info = getAIInfo(aiId);
      return info.color;
    };
  }, [getAIInfo]);
  
  // Get AI name (display friendly)
  const getAIName = useMemo(() => {
    return (aiId: string): string => {
      const info = getAIInfo(aiId);
      return info.name;
    };
  }, [getAIInfo]);
  
  // Check if AI provider exists
  const isValidAI = useMemo(() => {
    return (aiId: string): boolean => {
      return AI_PROVIDERS.some(p => p.id === aiId);
    };
  }, []);
  
  // Get all available AI providers
  const availableProviders = useMemo(() => {
    return AI_PROVIDERS.map(provider => ({
      id: provider.id,
      name: provider.name,
      info: getAIInfo(provider.id),
    }));
  }, [getAIInfo]);
  
  // Get providers with brand colors
  const providersWithColors = useMemo(() => {
    return AI_PROVIDERS.filter(provider => {
      const colorKey = (provider.id === 'openai' || provider.id === 'chatgpt') ? 'openai' : provider.id;
      return AI_BRAND_COLORS[colorKey as keyof typeof AI_BRAND_COLORS];
    });
  }, []);
  
  return {
    // Core functions
    getAIInfo,
    getMultipleAIInfo,
    getAIColor,
    getAIName,
    isValidAI,
    
    // Provider data
    availableProviders,
    providersWithColors,
    totalProviders: AI_PROVIDERS.length,
    
    // Utility
    fallbackColor: theme.colors.primary,
  };
};