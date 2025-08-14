/**
 * Debate Hooks Index
 * Centralized exports for all debate-related hooks
 */

export { useDebateSession } from './useDebateSession';
export { useDebateFlow } from './useDebateFlow';
export { useDebateVoting } from './useDebateVoting';
export { useTopicSelection } from './useTopicSelection';
export { useDebateMessages } from './useDebateMessages';
export { usePreDebateValidation } from './usePreDebateValidation';

// Debate Setup Hooks
export { useDebateSetup } from './useDebateSetup';
export { useDebateSteps } from './useDebateSteps';
export { useAIDebaterSelection } from './useAIDebaterSelection';
export { useDebateTopic } from './useDebateTopic';
export { usePersonalitySelection } from './usePersonalitySelection';
export { useDebateValidation } from './useDebateValidation';

export type { UseDebateSessionReturn } from './useDebateSession';
export type { UseDebateFlowReturn } from './useDebateFlow';
export type { UseDebateVotingReturn } from './useDebateVoting';
export type { UseTopicSelectionReturn } from './useTopicSelection';
export type { UseDebateMessagesReturn } from './useDebateMessages';
export type { UsePreDebateValidation } from './usePreDebateValidation';

// Debate Setup Hook Types
export type { UseDebateSetupReturn } from '../../types/debate';
export type { UseDebateStepsReturn } from '../../types/debate';
export type { UseAIDebaterSelectionReturn } from '../../types/debate';
export type { UseDebateTopicReturn } from '../../types/debate';
export type { UsePersonalitySelectionReturn } from '../../types/debate';
export type { UseDebateValidationReturn } from '../../types/debate';