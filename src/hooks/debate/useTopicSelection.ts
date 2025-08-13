/**
 * useTopicSelection Hook
 * Manages topic selection state and validation
 */

import { useState, useCallback } from 'react';
import { getRandomTopic, validateTopic } from '../../config/debateTopics';

export interface UseTopicSelectionReturn {
  selectedTopic: string;
  customTopic: string;
  topicMode: 'preset' | 'custom';
  showTopicDropdown: boolean;
  isTopicSelected: boolean;
  finalTopic: string;
  setSelectedTopic: (topic: string) => void;
  setCustomTopic: (topic: string) => void;
  setTopicMode: (mode: 'preset' | 'custom') => void;
  setShowTopicDropdown: (show: boolean) => void;
  selectRandomTopic: () => void;
  validateCurrentTopic: () => { valid: boolean; error?: string };
  reset: () => void;
}

export const useTopicSelection = (initialTopic?: string): UseTopicSelectionReturn => {
  const [selectedTopic, setSelectedTopic] = useState(initialTopic || '');
  const [customTopic, setCustomTopic] = useState('');
  const [topicMode, setTopicMode] = useState<'preset' | 'custom'>('preset');
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  
  // Derived state
  const isTopicSelected = Boolean((topicMode === 'preset' && selectedTopic) || (topicMode === 'custom' && customTopic));
  const finalTopic = topicMode === 'custom' ? customTopic : selectedTopic;
  
  // Select random topic
  const selectRandomTopic = useCallback(() => {
    const randomTopic = getRandomTopic();
    setSelectedTopic(randomTopic);
    setShowTopicDropdown(false);
  }, []);
  
  // Validate current topic
  const validateCurrentTopic = useCallback((): { valid: boolean; error?: string } => {
    if (!finalTopic) {
      return { valid: false, error: 'Please select or enter a topic' };
    }
    
    if (!validateTopic(finalTopic)) {
      return { valid: false, error: 'Topic must be between 1 and 200 characters' };
    }
    
    return { valid: true };
  }, [finalTopic]);
  
  // Reset all state
  const reset = useCallback(() => {
    setSelectedTopic('');
    setCustomTopic('');
    setTopicMode('preset');
    setShowTopicDropdown(false);
  }, []);
  
  return {
    selectedTopic,
    customTopic,
    topicMode,
    showTopicDropdown,
    isTopicSelected,
    finalTopic,
    setSelectedTopic,
    setCustomTopic,
    setTopicMode,
    setShowTopicDropdown,
    selectRandomTopic,
    validateCurrentTopic,
    reset,
  };
};