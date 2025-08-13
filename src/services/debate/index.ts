/**
 * Debate Services Index
 * Centralized exports for all debate-related services
 */

export { DebateOrchestrator, DebateStatus } from './DebateOrchestrator';
export { DebateRulesEngine } from './DebateRulesEngine';
export { VotingService } from './VotingService';
export { DebatePromptBuilder } from './DebatePromptBuilder';

export type { 
  DebateSession,
  DebateError,
  DebateEvent,
  DebateEventHandler,
} from './DebateOrchestrator';

export type {
  DebateRules,
  RoundInfo,
} from './DebateRulesEngine';

export type {
  VoteRecord,
  ScoreBoard,
  VotingState,
} from './VotingService';

export type {
  PromptContext,
} from './DebatePromptBuilder';