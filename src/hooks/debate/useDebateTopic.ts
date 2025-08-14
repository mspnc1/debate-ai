/**
 * Hook for managing debate topic selection
 * Handles topic modes, validation, and suggestions
 */

import { useState, useMemo, useCallback } from 'react';
import { UseDebateTopicReturn } from '../../types/debate';
import { TopicMode } from '../../config/debate/debateSetupConfig';
import { TopicService } from '../../services/debate/TopicService';
import { SuggestedTopic } from '../../config/debate/suggestedTopics';

export const useDebateTopic = (
  initialTopic: string = '',
  initialMode: TopicMode = 'preset'
): UseDebateTopicReturn => {
  const [topicMode, setTopicModeState] = useState<TopicMode>(initialMode);
  const [selectedTopic, setSelectedTopic] = useState<string>(
    initialMode === 'preset' || initialMode === 'surprise' ? initialTopic : ''
  );
  const [customTopic, setCustomTopic] = useState<string>(
    initialMode === 'custom' ? initialTopic : ''
  );
  const [suggestedTopics, setSuggestedTopics] = useState<SuggestedTopic[]>([]);

  // Load suggested topics
  const loadSuggestedTopics = useCallback(() => {
    const topics = TopicService.getSuggestedTopics();
    setSuggestedTopics(topics);
  }, []);

  // Initialize suggested topics
  useMemo(() => {
    if (suggestedTopics.length === 0) {
      loadSuggestedTopics();
    }
  }, [loadSuggestedTopics, suggestedTopics.length]);

  // Set topic mode with cleanup
  const setTopicMode = (mode: TopicMode) => {
    setTopicModeState(mode);
    
    // Clear topics from other modes
    if (mode !== 'custom') {
      setCustomTopic('');
    }
    if (mode !== 'preset' && mode !== 'surprise') {
      setSelectedTopic('');
    }
  };

  // Set custom topic
  const setCustomTopicValue = (topic: string) => {
    setCustomTopic(topic);
    if (topicMode !== 'custom') {
      setTopicMode('custom');
    }
  };

  // Select suggested topic
  const selectSuggestedTopic = (topic: string) => {
    setSelectedTopic(topic);
    if (topicMode !== 'preset') {
      setTopicMode('preset');
    }
  };

  // Generate surprise topic
  const generateSurpriseTopic = () => {
    const randomTopic = TopicService.generateRandomTopic();
    setSelectedTopic(randomTopic.topic);
    setTopicMode('surprise');
    setCustomTopic('');
  };

  // Current topic (computed based on mode)
  const currentTopic = useMemo(() => {
    switch (topicMode) {
      case 'custom':
        return customTopic;
      case 'preset':
      case 'surprise':
        return selectedTopic;
      default:
        return '';
    }
  }, [topicMode, customTopic, selectedTopic]);

  // Topic validation
  const validation = useMemo(() => {
    if (!currentTopic) {
      return {
        isValid: false,
        errors: ['Topic is required'],
        warnings: [],
        suggestions: [],
      };
    }

    return TopicService.validateCustomTopic(currentTopic);
  }, [currentTopic]);

  const isValidTopic = validation.isValid;
  const validationMessage = validation.errors[0] || '';

  // Topic suggestions and helpers
  const getRelatedTopics = useCallback((limit = 3) => {
    if (!currentTopic) return [];
    return TopicService.getRelatedTopics(currentTopic, limit);
  }, [currentTopic]);

  const searchTopics = useCallback((query: string) => {
    return TopicService.searchTopics(query);
  }, []);

  const getTopicCategory = useCallback(() => {
    if (!currentTopic) return null;
    return TopicService.getTopicCategory(currentTopic);
  }, [currentTopic]);

  const getEstimatedDuration = useCallback(() => {
    if (!currentTopic) return 0;
    return TopicService.getEstimatedDuration(currentTopic);
  }, [currentTopic]);

  // Topic history/favorites (could be extended with persistence)
  const [topicHistory, setTopicHistory] = useState<string[]>([]);
  
  const addToHistory = useCallback((topic: string) => {
    setTopicHistory(prev => {
      const filtered = prev.filter(t => t !== topic);
      return [topic, ...filtered].slice(0, 10); // Keep last 10
    });
  }, []);

  // Finalize topic selection
  const finalizeTopic = useCallback(() => {
    if (currentTopic && isValidTopic) {
      addToHistory(currentTopic);
      return currentTopic;
    }
    return null;
  }, [currentTopic, isValidTopic, addToHistory]);

  // Reset all topic state
  const resetTopic = useCallback(() => {
    setTopicMode('preset');
    setSelectedTopic('');
    setCustomTopic('');
  }, []);

  return {
    selectedTopic,
    topicMode,
    customTopic,
    setTopicMode,
    setCustomTopic: setCustomTopicValue,
    selectSuggestedTopic,
    generateSurpriseTopic,
    currentTopic,
    isValidTopic,
    validationMessage,
    suggestedTopics,
    loadSuggestedTopics,
    getRelatedTopics,
    searchTopics,
    getTopicCategory,
    getEstimatedDuration,
    topicHistory,
    finalizeTopic,
    resetTopic,
    validation,
  };
};