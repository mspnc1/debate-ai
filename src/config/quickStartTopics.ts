import { QuickStartTopic } from '../components/organisms/QuickStartsSection';

/**
 * Quick Start conversation topics that guide users into structured AI conversations.
 * Each topic provides context and prompts to help users start meaningful discussions.
 */
export const QUICK_START_TOPICS: QuickStartTopic[] = [
  { 
    id: 'morning', 
    emoji: '☀️', 
    title: 'Morning Check-in', 
    subtitle: 'Start your day right' 
  },
  { 
    id: 'brainstorm', 
    emoji: '💡', 
    title: 'Brainstorming', 
    subtitle: 'Generate fresh ideas' 
  },
  { 
    id: 'learn', 
    emoji: '📚', 
    title: 'Learn Something', 
    subtitle: 'Explore new topics' 
  },
  { 
    id: 'creative', 
    emoji: '📝', 
    title: 'Creative Writing', 
    subtitle: 'Tell a story together' 
  },
  { 
    id: 'problem', 
    emoji: '🧩', 
    title: 'Problem Solving', 
    subtitle: 'Work through challenges' 
  },
  { 
    id: 'fun', 
    emoji: '🎮', 
    title: 'Just for Fun', 
    subtitle: 'Games and entertainment' 
  },
];

/**
 * Topic enrichment prompts to provide context for each Quick Start topic.
 * These help structure the conversation and guide AI responses.
 */
export const TOPIC_PROMPTS: Record<string, string> = {
  morning: "Let's start with a positive morning check-in. How are you feeling today?",
  brainstorm: "I need help brainstorming ideas. What topic would you like to explore?",
  learn: "I'd like to learn something new today. What interests you?",
  creative: "Let's write something creative together. What kind of story should we tell?",
  problem: "I have a challenge I'd like to work through. What's on your mind?",
  fun: "Let's have some fun! What game or activity sounds interesting?",
};