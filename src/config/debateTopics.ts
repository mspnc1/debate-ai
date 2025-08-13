/**
 * Debate topics configuration
 * Re-exports the debate topics with additional metadata and categorization
 */

import { DEBATE_TOPICS } from '../constants/debateTopics';

export interface DebateTopicCategory {
  name: string;
  description: string;
  topics: string[];
}

// Export the original topics array for backward compatibility
export { DEBATE_TOPICS };

// Categorized topics for better organization (future enhancement)
export const DEBATE_TOPIC_CATEGORIES: DebateTopicCategory[] = [
  {
    name: 'Fun & Quirky',
    description: 'Light-hearted debates about everyday controversies',
    topics: DEBATE_TOPICS.slice(0, 32),
  },
  {
    name: 'Technology & Future',
    description: 'Debates about technology, AI, and the future',
    topics: DEBATE_TOPICS.slice(33, 54),
  },
  {
    name: 'Philosophy & Life',
    description: 'Deep philosophical questions about existence and meaning',
    topics: DEBATE_TOPICS.slice(55, 76),
  },
  {
    name: 'Society & Culture',
    description: 'Debates about social structures and cultural norms',
    topics: DEBATE_TOPICS.slice(77, 98),
  },
  {
    name: 'Science & Nature',
    description: 'Scientific questions and natural phenomena',
    topics: DEBATE_TOPICS.slice(99, 120),
  },
  {
    name: 'Entertainment & Pop Culture',
    description: 'Media, entertainment, and pop culture debates',
    topics: DEBATE_TOPICS.slice(121, 142),
  },
  {
    name: 'Health & Lifestyle',
    description: 'Health, fitness, and lifestyle choices',
    topics: DEBATE_TOPICS.slice(143, 164),
  },
  {
    name: 'Relationships & Social',
    description: 'Relationships, dating, and social interactions',
    topics: DEBATE_TOPICS.slice(165, 186),
  },
];

// Utility functions for topic management
export const getRandomTopic = (): string => {
  const randomIndex = Math.floor(Math.random() * DEBATE_TOPICS.length);
  return DEBATE_TOPICS[randomIndex];
};

export const getTopicsByCategory = (categoryName: string): string[] => {
  const category = DEBATE_TOPIC_CATEGORIES.find(cat => cat.name === categoryName);
  return category?.topics || [];
};

export const getCategoryForTopic = (topic: string): DebateTopicCategory | undefined => {
  return DEBATE_TOPIC_CATEGORIES.find(category => 
    category.topics.includes(topic)
  );
};

export const validateTopic = (topic: string): boolean => {
  return topic.trim().length > 0 && topic.trim().length <= 200;
};