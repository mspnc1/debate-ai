/**
 * Debate Rules Engine
 * Encapsulates business rules for debate flow and validation.
 */

import { DEBATE_CONSTANTS } from '../../config/debateConstants';
import { AI } from '../../types';
import type { MessageSpec, PresetConfig } from '../../config/debate/formats';

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

function isPresetConfig(value: PresetConfig | Partial<DebateRules> | undefined): value is PresetConfig {
  return Boolean(value && Array.isArray((value as PresetConfig).messages));
}

export class DebateRulesEngine {
  private rules: DebateRules;
  private preset: PresetConfig | null;

  constructor(config?: PresetConfig | Partial<DebateRules>) {
    this.preset = isPresetConfig(config) ? config : null;
    const legacyRules = config && !isPresetConfig(config) ? config : undefined;
    const maxRounds = this.preset?.voteCount ?? legacyRules?.maxRounds ?? DEBATE_CONSTANTS.MAX_ROUNDS;
    const messagesPerRound = legacyRules
      ? legacyRules.messagesPerRound || DEBATE_CONSTANTS.MESSAGES_PER_ROUND
      : DEBATE_CONSTANTS.MESSAGES_PER_ROUND;

    this.rules = {
      maxRounds,
      maxMessages: this.preset?.messages.length ?? maxRounds * messagesPerRound,
      messagesPerRound,
    };
  }

  setPreset(preset: PresetConfig): void {
    this.preset = preset;
    this.rules = {
      maxRounds: preset.voteCount,
      maxMessages: preset.messages.length,
      messagesPerRound: DEBATE_CONSTANTS.MESSAGES_PER_ROUND,
    };
  }

  getPreset(): PresetConfig | null {
    return this.preset;
  }

  getMessageSpec(messageIndex: number): MessageSpec | undefined {
    return this.preset?.messages[messageIndex];
  }

  calculateMaxMessages(participantCount: number = DEBATE_CONSTANTS.MESSAGES_PER_ROUND): number {
    if (this.preset) {
      return this.preset.messages.length;
    }
    return this.rules.maxRounds * participantCount;
  }

  shouldVoteAfter(messageIndex: number): boolean {
    return Boolean(this.preset?.messages[messageIndex]?.voteAfter);
  }

  getVotingLabel(voteIndex: number): string {
    if (!this.preset) return 'Exchange';
    const labels = this.preset.messages
      .filter((message) => message.voteAfter)
      .map((message) => message.votingLabel || message.label || 'Exchange');
    return labels[voteIndex - 1] || 'Exchange';
  }

  getVoteIndex(messageIndex: number): number {
    if (!this.preset) return 1;
    let voteIndex = 0;
    for (let i = 0; i <= messageIndex && i < this.preset.messages.length; i += 1) {
      if (this.preset.messages[i].voteAfter) {
        voteIndex += 1;
      }
    }
    return Math.max(1, voteIndex);
  }

  getCurrentRound(messageCount: number, participantCount: number): number {
    if (this.preset) {
      const priorMessageIndex = Math.max(0, messageCount - 1);
      const completedVotes = this.preset.messages
        .slice(0, priorMessageIndex)
        .filter((message) => message.voteAfter)
        .length;
      return Math.min(completedVotes + 1, this.preset.voteCount);
    }
    return Math.floor((messageCount - 1) / participantCount) + 1;
  }

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
    const shouldShowVoting = this.preset
      ? this.shouldVoteAfter(Math.max(0, messageCount - 2))
      : isNewRound && previousRoundCount > 0 && isFirstAIInRound;

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

  shouldContinueDebate(messageCount: number, participantCount: number = DEBATE_CONSTANTS.MESSAGES_PER_ROUND): boolean {
    return messageCount <= this.calculateMaxMessages(participantCount);
  }

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

  getNextAIIndex(currentIndex: number, participantCount: number): number {
    return (currentIndex + 1) % participantCount;
  }

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

  getRoundMessage(roundInfo: RoundInfo): string | null {
    if (roundInfo.isNewRound) {
      if (roundInfo.isFinalRound) {
        return DEBATE_CONSTANTS.MESSAGES.FINAL_ROUND;
      }
      if (roundInfo.currentRound < this.rules.maxRounds) {
        return DEBATE_CONSTANTS.MESSAGES.ROUND_START(roundInfo.currentRound);
      }
    }
    return null;
  }

  getRules(): DebateRules {
    return { ...this.rules };
  }
}
