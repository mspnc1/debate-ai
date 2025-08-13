/**
 * Debate Rules Engine
 * Encapsulates all the business rules for debate flow and validation
 */

import { DEBATE_CONSTANTS } from '../../config/debateConstants';
import { AI } from '../../types';

export interface DebateRules {
  maxRounds: number;
  maxMessages: number;
  messagesPerRound: number;
}

export interface RoundInfo {
  currentRound: number;
  messageCount: number;
  aiIndex: number;
  isNewRound: boolean;
  isFirstAIInRound: boolean;
  isFinalRound: boolean;
  shouldEndDebate: boolean;
  shouldShowVoting: boolean;
}

export class DebateRulesEngine {
  private rules: DebateRules;
  
  constructor(customRules?: Partial<DebateRules>) {
    this.rules = {
      maxRounds: DEBATE_CONSTANTS.MAX_ROUNDS,
      maxMessages: DEBATE_CONSTANTS.MAX_ROUNDS * (customRules?.messagesPerRound || 1),
      messagesPerRound: DEBATE_CONSTANTS.MESSAGES_PER_ROUND,
      ...customRules,
    };
  }
  
  /**
   * Calculate the maximum number of messages allowed
   */
  calculateMaxMessages(participantCount: number): number {
    return this.rules.maxRounds * participantCount;
  }
  
  /**
   * Determine the current round based on message count and participants
   */
  getCurrentRound(messageCount: number, participantCount: number): number {
    return Math.floor((messageCount - 1) / participantCount) + 1;
  }
  
  /**
   * Get comprehensive round information for decision making
   */
  getRoundInfo(
    messageCount: number, 
    aiIndex: number, 
    participantCount: number,
    previousRoundCount: number
  ): RoundInfo {
    const currentRound = this.getCurrentRound(messageCount, participantCount);
    const maxMessages = this.calculateMaxMessages(participantCount);
    const isNewRound = currentRound !== previousRoundCount;
    const isFirstAIInRound = aiIndex === 0;
    const isFinalRound = currentRound === this.rules.maxRounds;
    const shouldEndDebate = messageCount > maxMessages;
    const shouldShowVoting = isNewRound && previousRoundCount > 0 && isFirstAIInRound;
    
    return {
      currentRound,
      messageCount,
      aiIndex,
      isNewRound,
      isFirstAIInRound,
      isFinalRound,
      shouldEndDebate,
      shouldShowVoting,
    };
  }
  
  /**
   * Check if the debate should continue
   */
  shouldContinueDebate(messageCount: number, participantCount: number): boolean {
    const maxMessages = this.calculateMaxMessages(participantCount);
    return messageCount <= maxMessages;
  }
  
  /**
   * Check if we need to show voting interface
   */
  shouldShowVotingForRound(
    currentRound: number, 
    previousRound: number, 
    isFirstAI: boolean,
    hasVotedForRound: boolean
  ): boolean {
    return currentRound !== previousRound && 
           previousRound > 0 && 
           isFirstAI && 
           !hasVotedForRound;
  }
  
  /**
   * Get the next AI index in rotation
   */
  getNextAIIndex(currentIndex: number, participantCount: number): number {
    return (currentIndex + 1) % participantCount;
  }
  
  /**
   * Validate debate parameters
   */
  validateDebateSetup(participants: AI[], topic: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (participants.length < 2) {
      errors.push('Debate requires at least 2 participants');
    }
    
    if (participants.length > 6) {
      errors.push('Debate supports maximum 6 participants');
    }
    
    if (!topic || topic.trim().length === 0) {
      errors.push('Debate topic is required');
    }
    
    if (topic && topic.trim().length > 200) {
      errors.push('Debate topic must be 200 characters or less');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Get the appropriate message for the current round
   */
  getRoundMessage(roundInfo: RoundInfo): string | null {
    if (roundInfo.isNewRound) {
      if (roundInfo.isFinalRound) {
        return DEBATE_CONSTANTS.MESSAGES.FINAL_ROUND;
      } else if (roundInfo.currentRound < this.rules.maxRounds) {
        return DEBATE_CONSTANTS.MESSAGES.ROUND_START(roundInfo.currentRound);
      }
    }
    return null;
  }
  
  /**
   * Get rules configuration
   */
  getRules(): DebateRules {
    return { ...this.rules };
  }
}