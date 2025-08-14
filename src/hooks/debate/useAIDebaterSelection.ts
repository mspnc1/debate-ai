/**
 * Hook for managing AI debater selection
 * Handles selection state, validation, and limits
 */

import { useState, useMemo } from 'react';
import { AIDebater, UseAIDebaterSelectionReturn } from '../../types/debate';
import { DebaterSelectionService } from '../../services/debate/DebaterSelectionService';
import { DEBATE_SETUP_CONFIG } from '../../config/debate/debateSetupConfig';

export const useAIDebaterSelection = (
  initialSelection: AIDebater[] = [],
  maxSelection: number = DEBATE_SETUP_CONFIG.REQUIRED_DEBATERS as number
): UseAIDebaterSelectionReturn => {
  const [selectedAIs, setSelectedAIs] = useState<AIDebater[]>(initialSelection);

  // Toggle AI selection
  const toggleAI = (ai: AIDebater) => {
    setSelectedAIs(prevSelected => {
      const isSelected = prevSelected.some(s => s.id === ai.id);
      if (isSelected) {
        return prevSelected.filter(s => s.id !== ai.id);
      } else if (prevSelected.length < maxSelection) {
        return [...prevSelected, ai];
      }
      return prevSelected;
    });
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedAIs([]);
  };

  // Validation and computed properties
  const validation = useMemo(() => {
    return DebaterSelectionService.validateSelection(selectedAIs);
  }, [selectedAIs]);

  const isValidSelection = validation.isValid;
  const canProceed = selectedAIs.length === DEBATE_SETUP_CONFIG.REQUIRED_DEBATERS;
  const maxReached = selectedAIs.length >= maxSelection;
  const validationMessage = validation.message || '';

  // Selection summary
  const selectionSummary = useMemo(() => {
    return DebaterSelectionService.getSelectionSummary(selectedAIs);
  }, [selectedAIs]);

  // Helper functions
  const isAISelected = (aiId: string): boolean => {
    return DebaterSelectionService.isAISelected(selectedAIs, aiId);
  };

  const addAI = (ai: AIDebater): boolean => {
    if (maxReached || isAISelected(ai.id)) {
      return false;
    }
    setSelectedAIs(prev => [...prev, ai]);
    return true;
  };

  const removeAI = (aiId: string): boolean => {
    const aiExists = isAISelected(aiId);
    if (aiExists) {
      setSelectedAIs(prev => prev.filter(ai => ai.id !== aiId));
      return true;
    }
    return false;
  };

  // Get recommended pairs (for 2-AI debates)
  const getRecommendedPairs = (availableAIs: AIDebater[]) => {
    return DebaterSelectionService.getRecommendedPairs(availableAIs);
  };

  // Select a recommended pair
  const selectRecommendedPair = (pair: AIDebater[]) => {
    if (pair.length === 2) {
      setSelectedAIs(pair);
    }
  };

  // Optimize selection for topic
  const optimizeForTopic = (topic: string, availableAIs: AIDebater[]) => {
    const optimizedSelection = DebaterSelectionService.getOptimalDebaters(topic, availableAIs);
    if (optimizedSelection.length > 0) {
      setSelectedAIs(optimizedSelection.slice(0, maxSelection));
    }
  };

  return {
    selectedAIs,
    toggleAI,
    clearSelection,
    canProceed,
    validationMessage,
    isValidSelection,
    maxReached,
    selectionSummary,
    isAISelected,
    addAI,
    removeAI,
    getRecommendedPairs,
    selectRecommendedPair,
    optimizeForTopic,
  };
};