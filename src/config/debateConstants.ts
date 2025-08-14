/**
 * Configuration constants for the debate feature
 * These are extracted from the original DebateScreen to centralize configuration
 */

export const DEBATE_CONSTANTS = {
  // Round configuration
  MAX_ROUNDS: 3,
  MESSAGES_PER_ROUND: 1, // Each AI speaks once per round
  
  // Timing configuration (in milliseconds)
  DELAYS: {
    AI_RESPONSE: 2000,        // Normal delay between AI responses (reduced from 8s to 2s)
    RATE_LIMIT_RECOVERY: 10000, // Delay after rate limit errors
    ERROR_RECOVERY: 6000,     // Delay after other errors
    VOTING_CONTINUATION: 500,  // Delay before continuing after voting (reduced from 1s to 0.5s)
    OVERALL_VOTE: 800,        // Delay before showing overall vote (reduced from 1.5s to 0.8s)
    AUTO_SCROLL: 100,         // Delay before auto-scrolling to new messages
  },
  
  // Message content configuration - professional, engaging style
  MESSAGES: {
    ROUND_START: (round: number) => `Round ${round}`,
    FINAL_ROUND: 'Final Round',
    DEBATE_START: (topic: string, firstAI: string) => 
      `"${topic}"\n\n${firstAI} opens the debate.`,
    DEBATE_COMPLETE: 'Debate complete.\n\nVote for the final round winner.',
    ROUND_WINNER: (round: number, winner: string) => `Round ${round}: ${winner}`,
    FINAL_ROUND_WINNER: (winner: string) => `Final Round: ${winner}`,
    OVERALL_WINNER: (winner: string) => `OVERALL WINNER: ${winner}!\n\n${winner} won the debate.`,
    RATE_LIMIT: (aiName: string) => `${aiName} is taking a moment...`,
    ERROR: (aiName: string) => `${aiName} had an error. Continuing...`,
  },
  
  // Voting configuration
  VOTING: {
    ROUND_PROMPT: (round: number) => `🏅 Who won Round ${round}?`,
    FINAL_ROUND_PROMPT: '🏅 Who won the Final Round?',
    OVERALL_PROMPT: '🏆 Vote for Overall Winner!',
    SCORE_OVERRIDE_TEXT: 'Despite the scores, you can crown any AI as the overall winner!',
  },
  
  // Prompt building
  PROMPT_MARKERS: {
    DEBATE_MODE: '[DEBATE MODE]',
    TOPIC_PREFIX: 'Topic: ',
    PREVIOUS_SPEAKER: 'The previous speaker said: ',
    FINAL_ARGUMENT: 'Make your final argument!',
    CONTINUE_DEBATE: 'Continue the debate!',
  },
  
  // UI Configuration
  UI: {
    RATE_LIMIT_NOTE: 'Note: Debates have built-in delays to respect API rate limits',
    DROPDOWN_MAX_HEIGHT: 200,
    MESSAGE_MAX_WIDTH: '85%',
    TOPIC_INPUT_MIN_HEIGHT: 60,
  },
} as const;

export type DebateConstants = typeof DEBATE_CONSTANTS;