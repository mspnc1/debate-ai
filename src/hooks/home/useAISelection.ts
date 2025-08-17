import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setAIPersonality, setAIModel } from '../../store';
import { AIConfigurationService } from '../../services/home/AIConfigurationService';
import { AIConfig } from '../../types';

/**
 * Custom hook for managing AI selection logic and state.
 * Handles AI configuration, selection limits, and personality management.
 */
export const useAISelection = (maxAIs: number) => {
  const dispatch = useDispatch();
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const aiPersonalities = useSelector((state: RootState) => state.chat.aiPersonalities);
  const selectedModels = useSelector((state: RootState) => state.chat.selectedModels);
  
  const [selectedAIs, setSelectedAIs] = useState<AIConfig[]>([]);

  // Get configured AIs based on API keys
  const configuredAIs = useMemo(() => {
    return AIConfigurationService.getConfiguredAIs(apiKeys);
  }, [apiKeys]);

  /**
   * Toggles AI selection (add/remove from selected list).
   * 
   * @param ai - AI configuration to toggle
   */
  const toggleAI = (ai: AIConfig) => {
    setSelectedAIs(prev => {
      const isSelected = prev.some(s => s.id === ai.id);
      
      if (isSelected) {
        // Remove AI from selection
        return prev.filter(s => s.id !== ai.id);
      } else if (prev.length < maxAIs) {
        // Add AI to selection if under limit
        return [...prev, ai];
      }
      
      // Return unchanged if at limit
      return prev;
    });
  };

  /**
   * Handles personality change for a specific AI.
   * 
   * @param aiId - ID of the AI to change personality for
   * @param personalityId - New personality ID
   */
  const changePersonality = (aiId: string, personalityId: string) => {
    dispatch(setAIPersonality({ aiId, personalityId }));
  };

  /**
   * Handles model change for a specific AI.
   * 
   * @param aiId - ID of the AI to change model for
   * @param modelId - New model ID
   */
  const changeModel = (aiId: string, modelId: string) => {
    dispatch(setAIModel({ aiId, modelId }));
  };

  /**
   * Checks if an AI is currently selected.
   * 
   * @param aiId - ID of the AI to check
   * @returns True if AI is selected
   */
  const isAISelected = (aiId: string): boolean => {
    return selectedAIs.some(ai => ai.id === aiId);
  };

  /**
   * Checks if more AIs can be selected.
   * 
   * @returns True if more AIs can be added to selection
   */
  const canSelectMore = (): boolean => {
    return selectedAIs.length < maxAIs;
  };

  /**
   * Gets the count of available AIs.
   * 
   * @returns Number of configured AIs
   */
  const getAvailableAICount = (): number => {
    return configuredAIs.length;
  };

  /**
   * Validates current AI selection for session creation.
   * 
   * @returns True if selection is valid for starting a session
   */
  const isSelectionValid = (): boolean => {
    return selectedAIs.length > 0;
  };

  /**
   * Clears all selected AIs.
   */
  const clearSelection = () => {
    setSelectedAIs([]);
  };

  /**
   * Selects specific AIs (replaces current selection).
   * 
   * @param ais - Array of AI configurations to select
   */
  const selectAIs = (ais: AIConfig[]) => {
    const limitedAIs = ais.slice(0, maxAIs);
    setSelectedAIs(limitedAIs);
  };

  /**
   * Gets selection status information.
   * 
   * @returns Object with selection status details
   */
  const getSelectionStatus = () => {
    return {
      selectedCount: selectedAIs.length,
      maxCount: maxAIs,
      availableCount: configuredAIs.length,
      canSelectMore: canSelectMore(),
      isValid: isSelectionValid(),
      atLimit: selectedAIs.length === maxAIs,
    };
  };

  return {
    // AI Data
    configuredAIs,
    selectedAIs,
    
    // Selection Actions
    toggleAI,
    clearSelection,
    selectAIs,
    
    // Personality Management
    changePersonality,
    aiPersonalities,
    
    // Model Management
    changeModel,
    selectedModels,
    
    // Status Checks
    isAISelected,
    canSelectMore,
    isSelectionValid,
    getAvailableAICount,
    getSelectionStatus,
    
    // Computed Properties
    hasSelection: selectedAIs.length > 0,
    selectionCount: selectedAIs.length,
    maxAIs,
  };
};