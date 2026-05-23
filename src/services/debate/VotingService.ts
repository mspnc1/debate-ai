/**
 * Voting Service
 * Handles voting logic including round voting, overall voting, and score calculation.
 */

import { AI, type DebateVoteResult } from '../../types';
import { DEBATE_CONSTANTS } from '../../config/debateConstants';
import {
  getPresetForFormat,
  getPresetIdForRounds,
  type DebateFormatId,
  type FormatSpec,
  type PresetConfig,
} from '../../config/debate/formats';

export type VoteRecord = DebateVoteResult;

export interface ScoreBoard {
  [aiId: string]: {
    name: string;
    roundWins: number;
    roundsWon: number[];
    isOverallWinner: boolean;
  };
}

export interface VotingState {
  votes: { [round: number]: string };
  overallWinner?: string;
  isVoting: boolean;
  votingRound: number;
  isFinalVote: boolean;
  isOverallVote: boolean;
}

function isPresetConfig(value: PresetConfig | FormatSpec | undefined): value is PresetConfig {
  return Boolean(value && Array.isArray((value as PresetConfig).messages));
}

function isFormatSpec(value: PresetConfig | FormatSpec | undefined): value is FormatSpec {
  return Boolean(value && Array.isArray((value as FormatSpec).presets));
}

export class VotingService {
  private participants: AI[];
  private preset: PresetConfig;
  private formatId: DebateFormatId = 'oxford';
  private votingLabels: string[];
  private totalVotes: number;
  private votes: Map<number, VoteRecord> = new Map();
  private overallWinner?: string;

  constructor(
    participants: AI[],
    presetOrFormat: PresetConfig | FormatSpec,
    legacyMaxRoundsOrFormatId?: number | DebateFormatId
  ) {
    this.participants = participants;

    if (isPresetConfig(presetOrFormat)) {
      this.preset = presetOrFormat;
      if (typeof legacyMaxRoundsOrFormatId === 'string') {
        this.formatId = legacyMaxRoundsOrFormatId;
      }
    } else if (isFormatSpec(presetOrFormat)) {
      this.formatId = presetOrFormat.id;
      const rounds = typeof legacyMaxRoundsOrFormatId === 'number'
        ? legacyMaxRoundsOrFormatId
        : undefined;
      const presetId = getPresetIdForRounds(rounds);
      this.preset = presetOrFormat.presets.find((preset) => preset.id === presetId) || presetOrFormat.presets[0];
    } else {
      this.preset = getPresetForFormat('oxford', 'short');
    }

    this.votingLabels = this.preset.messages
      .filter((message) => message.voteAfter)
      .map((message) => message.votingLabel || message.label || 'Exchange');
    this.totalVotes = this.votingLabels.length;
  }

  getVoteCriterion(isOverallVote: boolean = false): string {
    const scope = isOverallVote ? 'Final vote criteria' : 'Vote criteria';

    switch (this.formatId) {
      case 'lincoln_douglas':
        return `${scope}: value clash. Choose who better upheld their value and criterion while answering the opponent.`;
      case 'policy':
        return `${scope}: policy burden. Choose who better proved solvency, impacts, and comparative advantage.`;
      case 'socratic':
        return `${scope}: inquiry quality. Choose who better clarified assumptions and advanced understanding.`;
      case 'oxford':
      default:
        return `${scope}: motion burden. Choose who presented the clearer case, rebuttal, and voters.`;
    }
  }

  recordRoundVote(round: number, winnerId: string): VoteRecord {
    const winner = this.participants.find((ai) => ai.id === winnerId);
    const voteRecord: VoteRecord = {
      round,
      winnerId,
      winnerName: winner?.name,
      votingLabel: this.getVotingLabel(round),
      criterion: this.getVoteCriterion(false),
      timestamp: Date.now(),
    };

    this.votes.set(round, voteRecord);
    return voteRecord;
  }

  recordOverallWinner(winnerId: string): void {
    this.overallWinner = winnerId;
  }

  getRoundVote(round: number): VoteRecord | undefined {
    return this.votes.get(round);
  }

  getVoteRecords(): VoteRecord[] {
    return Array.from(this.votes.values()).sort((a, b) => a.round - b.round);
  }

  hasVotedForRound(round: number): boolean {
    return this.votes.has(round);
  }

  getVotesMap(): { [key: string]: string } {
    const votesMap: { [key: string]: string } = {};
    this.votes.forEach((vote, round) => {
      votesMap[round.toString()] = vote.winnerId;
    });
    if (this.overallWinner) {
      votesMap.overall = this.overallWinner;
    }
    return votesMap;
  }

  calculateScores(): ScoreBoard {
    const scoreBoard: ScoreBoard = {};

    this.participants.forEach((ai) => {
      scoreBoard[ai.id] = {
        name: ai.name,
        roundWins: 0,
        roundsWon: [],
        isOverallWinner: ai.id === this.overallWinner,
      };
    });

    this.votes.forEach((vote, round) => {
      if (scoreBoard[vote.winnerId]) {
        scoreBoard[vote.winnerId].roundWins += 1;
        scoreBoard[vote.winnerId].roundsWon.push(round);
      }
    });

    return scoreBoard;
  }

  getVotingLabel(voteIndex: number): string {
    if (voteIndex >= 1 && voteIndex <= this.votingLabels.length) {
      return this.votingLabels[voteIndex - 1];
    }
    return 'Exchange';
  }

  getVotingPrompt(round: number, _isFinalVote: boolean, isOverallVote: boolean): string {
    if (isOverallVote) {
      return DEBATE_CONSTANTS.VOTING.OVERALL_PROMPT;
    }
    return `🏅 Who won ${this.getVotingLabel(round)}?`;
  }

  getWinnerMessage(round: number, winnerId: string, _isFinalVote: boolean): string {
    const winner = this.participants.find((ai) => ai.id === winnerId);
    const winnerName = winner?.name || 'Unknown';
    return `${this.getVotingLabel(round)}: ${winnerName}`;
  }

  getOverallWinnerMessage(winnerId: string): string {
    const winner = this.participants.find((ai) => ai.id === winnerId);
    const winnerName = winner?.name || 'Unknown';
    return DEBATE_CONSTANTS.MESSAGES.OVERALL_WINNER(winnerName);
  }

  areAllRoundsVoted(): boolean {
    for (let round = 1; round <= this.totalVotes; round += 1) {
      if (!this.hasVotedForRound(round)) {
        return false;
      }
    }
    return true;
  }

  getNextVotingRound(): number | null {
    for (let round = 1; round <= this.totalVotes; round += 1) {
      if (!this.hasVotedForRound(round)) {
        return round;
      }
    }
    return null;
  }

  getTotalVotes(): number {
    return this.totalVotes;
  }

  reset(): void {
    this.votes.clear();
    this.overallWinner = undefined;
  }

  getVotingStats(): {
    totalRounds: number;
    votedRounds: number;
    remainingRounds: number;
    hasOverallWinner: boolean;
  } {
    return {
      totalRounds: this.totalVotes,
      votedRounds: this.votes.size,
      remainingRounds: this.totalVotes - this.votes.size,
      hasOverallWinner: !!this.overallWinner,
    };
  }
}
