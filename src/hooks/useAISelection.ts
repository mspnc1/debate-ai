import { useState, useCallback } from 'react';
import { AIConfig } from '../types';

interface UseAISelectionOptions {
  maxSelection?: number;
  minSelection?: number;
}

export const useAISelection = (options: UseAISelectionOptions = {}) => {
  const { maxSelection = 3, minSelection = 1 } = options;
  const [selectedAIs, setSelectedAIs] = useState<AIConfig[]>([]);

  const toggleAI = useCallback((ai: AIConfig) => {
    setSelectedAIs(prev => {
      const isSelected = prev.some(s => s.id === ai.id);
      
      if (isSelected) {
        // Remove AI from selection
        return prev.filter(s => s.id !== ai.id);
      } else if (prev.length < maxSelection) {
        // Add AI to selection if under max limit
        return [...prev, ai];
      }
      
      // Don't change if at max capacity
      return prev;
    });
  }, [maxSelection]);

  const clearSelection = useCallback(() => {
    setSelectedAIs([]);
  }, []);

  const setSelection = useCallback((ais: AIConfig[]) => {
    if (ais.length <= maxSelection) {
      setSelectedAIs(ais);
    }
  }, [maxSelection]);

  const isAISelected = useCallback((ai: AIConfig) => {
    return selectedAIs.some(s => s.id === ai.id);
  }, [selectedAIs]);

  const canSelectMore = selectedAIs.length < maxSelection;
  const hasMinimumSelection = selectedAIs.length >= minSelection;
  const selectionCount = selectedAIs.length;

  return {
    selectedAIs,
    toggleAI,
    clearSelection,
    setSelection,
    isAISelected,
    canSelectMore,
    hasMinimumSelection,
    selectionCount,
    maxSelection,
    minSelection,
  };
};