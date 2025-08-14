/**
 * Service for managing debate topics
 * Handles topic validation, suggestion, and categorization
 */

import { 
  SuggestedTopic, 
  TopicCategory, 
  SUGGESTED_TOPICS, 
  TopicUtils 
} from '../../config/debate/suggestedTopics';
import { DEBATE_SETUP_CONFIG } from '../../config/debate/debateSetupConfig';
import { DEBATE_TOPICS } from '../../constants/debateTopics';
import { TopicValidationResult } from '../../types/debate';

export class TopicService {
  /**
   * Get suggested topics with optional limit
   */
  static getSuggestedTopics(limit?: number): SuggestedTopic[] {
    const topics = TopicUtils.getPopularTopics(limit || DEBATE_SETUP_CONFIG.SUGGESTED_TOPICS_COUNT);
    return topics.length > 0 ? topics : TopicService.getFallbackTopics(limit);
  }

  /**
   * Generate a random topic from suggestions
   */
  static generateRandomTopic(): SuggestedTopic {
    const randomTopic = TopicUtils.getRandomTopic();
    if (randomTopic) {
      return randomTopic;
    }

    // Fallback to legacy topics if no structured topics available
    const fallbackTopicText = DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)];
    return TopicService.createFallbackTopic(fallbackTopicText);
  }

  /**
   * Generate a random topic string (for backward compatibility)
   */
  static generateRandomTopicString(): string {
    return TopicService.generateRandomTopic().topic;
  }

  /**
   * Validate a custom topic
   */
  static validateCustomTopic(topic: string): TopicValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!topic || topic.trim().length === 0) {
      errors.push('Topic cannot be empty');
    } else if (topic.trim().length < DEBATE_SETUP_CONFIG.TOPIC_MIN_LENGTH) {
      errors.push(DEBATE_SETUP_CONFIG.VALIDATION_MESSAGES.TOPIC_TOO_SHORT);
    } else if (topic.length > DEBATE_SETUP_CONFIG.TOPIC_MAX_LENGTH) {
      errors.push(DEBATE_SETUP_CONFIG.VALIDATION_MESSAGES.TOPIC_TOO_LONG);
    }

    // Content validation
    const trimmedTopic = topic.trim();
    
    // Check for inappropriate content (basic check)
    const inappropriateWords = ['hate', 'kill', 'murder', 'violent'];
    const hasInappropriateContent = inappropriateWords.some(word => 
      trimmedTopic.toLowerCase().includes(word.toLowerCase())
    );
    
    if (hasInappropriateContent) {
      errors.push('Topic contains inappropriate content');
    }

    // Check if it's a question (optional suggestion)
    if (!trimmedTopic.includes('?') && !trimmedTopic.toLowerCase().startsWith('should') && 
        !trimmedTopic.toLowerCase().startsWith('is') && !trimmedTopic.toLowerCase().startsWith('are')) {
      suggestions.push('Consider phrasing as a question or debate statement (e.g., "Should...", "Is...")');
    }

    // Check length warnings
    if (trimmedTopic.length > 150) {
      warnings.push('Long topics may be harder to debate effectively');
    } else if (trimmedTopic.length < 20) {
      warnings.push('Short topics might benefit from more context');
    }

    // Check for similar existing topics
    const similarTopics = TopicService.findSimilarTopics(trimmedTopic);
    if (similarTopics.length > 0) {
      suggestions.push(`Similar topics exist: ${similarTopics.slice(0, 2).map(t => `"${t.topic}"`).join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Get topic category based on content analysis
   */
  static getTopicCategory(topic: string): TopicCategory | null {
    const topicLower = topic.toLowerCase();

    // Technology keywords
    if (topicLower.includes('ai') || topicLower.includes('robot') || 
        topicLower.includes('technology') || topicLower.includes('internet') ||
        topicLower.includes('social media') || topicLower.includes('digital')) {
      return 'Technology';
    }

    // Philosophy keywords
    if (topicLower.includes('free will') || topicLower.includes('consciousness') ||
        topicLower.includes('meaning') || topicLower.includes('existence') ||
        topicLower.includes('truth') || topicLower.includes('reality')) {
      return 'Philosophy';
    }

    // Science keywords
    if (topicLower.includes('climate') || topicLower.includes('space') ||
        topicLower.includes('evolution') || topicLower.includes('genetic') ||
        topicLower.includes('physics') || topicLower.includes('mars')) {
      return 'Science';
    }

    // Society keywords
    if (topicLower.includes('government') || topicLower.includes('society') ||
        topicLower.includes('political') || topicLower.includes('voting') ||
        topicLower.includes('economy') || topicLower.includes('work')) {
      return 'Society';
    }

    // Health keywords
    if (topicLower.includes('health') || topicLower.includes('diet') ||
        topicLower.includes('exercise') || topicLower.includes('medical') ||
        topicLower.includes('vegan') || topicLower.includes('food')) {
      return 'Health';
    }

    // Relationships keywords
    if (topicLower.includes('love') || topicLower.includes('dating') ||
        topicLower.includes('marriage') || topicLower.includes('relationship') ||
        topicLower.includes('friendship')) {
      return 'Relationships';
    }

    // Entertainment keywords
    if (topicLower.includes('movie') || topicLower.includes('game') ||
        topicLower.includes('music') || topicLower.includes('art') ||
        topicLower.includes('entertainment')) {
      return 'Entertainment';
    }

    // Fun & Quirky (specific patterns)
    if (topicLower.includes('hot dog') || topicLower.includes('pineapple pizza') ||
        topicLower.includes('toilet paper') || topicLower.includes('sandwich') ||
        topicLower.includes('cereal')) {
      return 'Fun & Quirky';
    }

    return null;
  }

  /**
   * Get related topics based on category and tags
   */
  static getRelatedTopics(topic: string, limit = 3): SuggestedTopic[] {
    const category = TopicService.getTopicCategory(topic);
    if (!category) {
      return TopicUtils.getPopularTopics(limit);
    }

    return TopicUtils.getTopicsByCategory(category).slice(0, limit);
  }

  /**
   * Search topics by query
   */
  static searchTopics(query: string): SuggestedTopic[] {
    if (!query || query.trim().length < 2) {
      return [];
    }

    return TopicUtils.searchTopics(query);
  }

  /**
   * Get estimated duration for a topic
   */
  static getEstimatedDuration(topic: string): number {
    const topicLength = topic.length;
    const category = TopicService.getTopicCategory(topic);

    // Base duration on topic complexity
    if (topicLength < 30) {
      return DEBATE_SETUP_CONFIG.ESTIMATED_DURATION.SHORT_TOPIC;
    } else if (topicLength < 60) {
      return DEBATE_SETUP_CONFIG.ESTIMATED_DURATION.MEDIUM_TOPIC;
    } else if (topicLength < 100) {
      return DEBATE_SETUP_CONFIG.ESTIMATED_DURATION.LONG_TOPIC;
    }

    // Adjust based on category complexity
    if (category === 'Philosophy' || category === 'Science') {
      return DEBATE_SETUP_CONFIG.ESTIMATED_DURATION.COMPLEX_TOPIC;
    } else if (category === 'Fun & Quirky') {
      return DEBATE_SETUP_CONFIG.ESTIMATED_DURATION.SHORT_TOPIC;
    }

    return DEBATE_SETUP_CONFIG.ESTIMATED_DURATION.MEDIUM_TOPIC;
  }

  /**
   * Check if topic is appropriate for debate
   */
  static isTopicDebatable(topic: string): boolean {
    const validation = TopicService.validateCustomTopic(topic);
    return validation.isValid;
  }

  // Private helper methods

  private static getFallbackTopics(limit?: number): SuggestedTopic[] {
    const fallbackCount = limit || 6;
    const fallbackTopics = DEBATE_TOPICS
      .slice(0, fallbackCount)
      .map(topic => TopicService.createFallbackTopic(topic));
    
    return fallbackTopics;
  }

  private static createFallbackTopic(topicText: string): SuggestedTopic {
    return {
      id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      topic: topicText,
      category: TopicService.getTopicCategory(topicText) || 'Fun & Quirky',
      difficulty: 'medium',
      estimatedDuration: TopicService.getEstimatedDuration(topicText),
      tags: [],
      popularity: 3,
    };
  }

  private static findSimilarTopics(topic: string): SuggestedTopic[] {
    const words = topic.toLowerCase().split(' ').filter(word => word.length > 3);
    if (words.length === 0) return [];

    return SUGGESTED_TOPICS.filter(suggestedTopic => {
      const suggestedWords = suggestedTopic.topic.toLowerCase().split(' ');
      return words.some(word => 
        suggestedWords.some(suggestedWord => 
          suggestedWord.includes(word) || word.includes(suggestedWord)
        )
      );
    }).slice(0, 3);
  }
}