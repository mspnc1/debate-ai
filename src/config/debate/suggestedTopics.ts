/**
 * Suggested topics for debates with metadata
 * Categorized and structured for better UX
 */

export interface SuggestedTopic {
  id: string;
  topic: string;
  category: TopicCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number; // in minutes
  tags: string[];
  popularity: number; // 1-5 rating
}

export type TopicCategory = 
  | 'Fun & Quirky'
  | 'Technology'
  | 'Philosophy'
  | 'Society'
  | 'Science'
  | 'Entertainment'
  | 'Health'
  | 'Relationships';

export const SUGGESTED_TOPICS: SuggestedTopic[] = [
  // Featured/Popular Topics
  {
    id: 'ai-rights',
    topic: 'Should AI have rights?',
    category: 'Technology',
    difficulty: 'hard',
    estimatedDuration: 20,
    tags: ['ai', 'ethics', 'rights', 'philosophy'],
    popularity: 5,
  },
  {
    id: 'hot-dog-sandwich',
    topic: 'Is a hot dog a sandwich?',
    category: 'Fun & Quirky',
    difficulty: 'easy',
    estimatedDuration: 10,
    tags: ['food', 'classification', 'fun'],
    popularity: 5,
  },
  {
    id: 'remote-work',
    topic: 'Is remote work better than office work?',
    category: 'Society',
    difficulty: 'medium',
    estimatedDuration: 15,
    tags: ['work', 'productivity', 'lifestyle'],
    popularity: 4,
  },
  {
    id: 'free-will',
    topic: 'Is free will an illusion?',
    category: 'Philosophy',
    difficulty: 'hard',
    estimatedDuration: 25,
    tags: ['philosophy', 'consciousness', 'determinism'],
    popularity: 4,
  },
  {
    id: 'pineapple-pizza',
    topic: 'Is pineapple on pizza acceptable?',
    category: 'Fun & Quirky',
    difficulty: 'easy',
    estimatedDuration: 8,
    tags: ['food', 'taste', 'preferences'],
    popularity: 5,
  },
  {
    id: 'social-media-regulation',
    topic: 'Should social media be regulated?',
    category: 'Technology',
    difficulty: 'medium',
    estimatedDuration: 18,
    tags: ['social-media', 'regulation', 'freedom'],
    popularity: 4,
  },
  {
    id: 'mars-colonization',
    topic: 'Should we colonize Mars?',
    category: 'Science',
    difficulty: 'hard',
    estimatedDuration: 22,
    tags: ['space', 'exploration', 'colonization'],
    popularity: 4,
  },
  {
    id: 'universal-basic-income',
    topic: 'Should there be a universal basic income?',
    category: 'Society',
    difficulty: 'medium',
    estimatedDuration: 20,
    tags: ['economics', 'policy', 'welfare'],
    popularity: 3,
  },
  {
    id: 'toilet-paper-direction',
    topic: 'Should toilet paper hang over or under?',
    category: 'Fun & Quirky',
    difficulty: 'easy',
    estimatedDuration: 6,
    tags: ['household', 'preferences', 'fun'],
    popularity: 4,
  },
  {
    id: 'veganism-future',
    topic: 'Is veganism the future?',
    category: 'Health',
    difficulty: 'medium',
    estimatedDuration: 16,
    tags: ['diet', 'environment', 'ethics'],
    popularity: 3,
  },
  {
    id: 'time-travel-possible',
    topic: 'Is time travel possible?',
    category: 'Science',
    difficulty: 'hard',
    estimatedDuration: 18,
    tags: ['physics', 'time', 'theoretical'],
    popularity: 4,
  },
  {
    id: 'online-dating-romance',
    topic: 'Is online dating ruining romance?',
    category: 'Relationships',
    difficulty: 'medium',
    estimatedDuration: 14,
    tags: ['dating', 'technology', 'relationships'],
    popularity: 3,
  },
  {
    id: 'money-happiness',
    topic: 'Can money buy happiness?',
    category: 'Philosophy',
    difficulty: 'medium',
    estimatedDuration: 15,
    tags: ['money', 'happiness', 'psychology'],
    popularity: 4,
  },
  {
    id: 'video-games-art',
    topic: 'Are video games art?',
    category: 'Entertainment',
    difficulty: 'medium',
    estimatedDuration: 12,
    tags: ['games', 'art', 'culture'],
    popularity: 3,
  },
  {
    id: 'simulation-hypothesis',
    topic: 'Are we living in a simulation?',
    category: 'Philosophy',
    difficulty: 'hard',
    estimatedDuration: 20,
    tags: ['reality', 'simulation', 'consciousness'],
    popularity: 4,
  },
];

// Topic categories for filtering/organization
export const TOPIC_CATEGORIES: Record<TopicCategory, { 
  name: string; 
  icon: string; 
  color: string;
  description: string;
}> = {
  'Fun & Quirky': {
    name: 'Fun & Quirky',
    icon: '😄',
    color: '#FF6B6B',
    description: 'Light-hearted debates about everyday things',
  },
  'Technology': {
    name: 'Technology',
    icon: '🤖',
    color: '#4ECDC4',
    description: 'AI, future tech, and digital society',
  },
  'Philosophy': {
    name: 'Philosophy',
    icon: '🤔',
    color: '#45B7D1',
    description: 'Deep questions about existence and meaning',
  },
  'Society': {
    name: 'Society',
    icon: '🏛️',
    color: '#96CEB4',
    description: 'Politics, culture, and social issues',
  },
  'Science': {
    name: 'Science',
    icon: '🔬',
    color: '#FECA57',
    description: 'Scientific theories and discoveries',
  },
  'Entertainment': {
    name: 'Entertainment',
    icon: '🎭',
    color: '#FF9FF3',
    description: 'Movies, games, and pop culture',
  },
  'Health': {
    name: 'Health',
    icon: '🏥',
    color: '#54A0FF',
    description: 'Wellness, diet, and lifestyle choices',
  },
  'Relationships': {
    name: 'Relationships',
    icon: '💕',
    color: '#FF7675',
    description: 'Love, friendship, and human connections',
  },
};

// Utility functions for topic management
export const TopicUtils = {
  getTopicsByCategory: (category: TopicCategory) => 
    SUGGESTED_TOPICS.filter(topic => topic.category === category),
  
  getPopularTopics: (limit = 6) => 
    SUGGESTED_TOPICS
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit),
  
  getRandomTopic: () => 
    SUGGESTED_TOPICS[Math.floor(Math.random() * SUGGESTED_TOPICS.length)],
  
  getTopicById: (id: string) => 
    SUGGESTED_TOPICS.find(topic => topic.id === id),
  
  searchTopics: (query: string) => 
    SUGGESTED_TOPICS.filter(topic => 
      topic.topic.toLowerCase().includes(query.toLowerCase()) ||
      topic.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    ),
  
  getRelatedTopics: (currentTopic: SuggestedTopic, limit = 3) =>
    SUGGESTED_TOPICS
      .filter(topic => 
        topic.id !== currentTopic.id && 
        (topic.category === currentTopic.category ||
         topic.tags.some(tag => currentTopic.tags.includes(tag)))
      )
      .slice(0, limit),
};