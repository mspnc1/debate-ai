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
  type MessageSpec,
  type PhaseId,
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

interface VoteCheckpoint {
  label: string;
  prompt: string;
  criterion: string;
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
  private voteCheckpoints: VoteCheckpoint[];
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

    this.voteCheckpoints = this.preset.messages
      .filter((message) => message.voteAfter)
      .map((message) => this.buildVoteCheckpoint(message));
    this.totalVotes = this.voteCheckpoints.length;
  }

  private buildVoteCheckpoint(message: MessageSpec): VoteCheckpoint {
    const label = message.votingLabel || message.label || 'Exchange';

    return {
      label,
      prompt: this.buildVotingPrompt(label),
      criterion: this.buildVoteCriterion(label, message.phase),
    };
  }

  private buildVotingPrompt(label: string): string {
    return `Who had the stronger ${label.toLowerCase()}?`;
  }

  private buildVoteCriterion(label: string, phase: PhaseId): string {
    switch (this.formatId) {
      case 'lincoln_douglas':
        if (phase === 'constructive') {
          return `${label}: choose who better established their value, criterion, definitions, and initial burden.`;
        }
        if (phase === 'cross_examination') {
          return `${label}: choose who used questions and answers to expose weaknesses, clarify standards, and protect their case.`;
        }
        if (phase === 'final_rebuttal') {
          return `${label}: choose who crystallized the value clash and gave the clearer reason to prefer their criterion.`;
        }
        return `${label}: choose who better answered attacks, extended key value arguments, and weighed the round.`;
      case 'policy':
        if (label === 'First Constructives') {
          return `${label}: choose who better framed the plan or opposition, core harms, links, and initial solvency claims.`;
        }
        if (label === 'Second Constructives') {
          return `${label}: choose who better developed clash on solvency, disadvantages, counterplans, and comparative advantage.`;
        }
        if (phase === 'cross_examination') {
          return `${label}: choose who turned cross-examination into useful concessions or clearer burden analysis.`;
        }
        return `${label}: choose who better extended winning arguments, compared impacts, and explained the ballot.`;
      case 'socratic':
        if (label === 'Initial Framing') {
          return `${label}: choose who framed the central assumption or definition more clearly.`;
        }
        if (label === 'Clarification' || label === 'Focused Inquiry') {
          return `${label}: choose who advanced the inquiry with the sharper question or more direct answer.`;
        }
        if (label === 'Assumption Testing' || label === 'Counter-Questioning') {
          return `${label}: choose who tested assumptions more precisely without drifting from the issue.`;
        }
        return `${label}: choose who produced the clearer synthesis or unresolved tension.`;
      case 'oxford':
      default:
        if (phase === 'opening') {
          return `${label}: choose who gave the clearer motion framing, definitions, burden, and initial support.`;
        }
        if (phase === 'closing') {
          return `${label}: choose who gave the cleaner summary of voters and weighing without relying on new claims.`;
        }
        if (phase === 'final_rebuttal') {
          return `${label}: choose who best crystallized the decisive clash before closing.`;
        }
        return `${label}: choose who answered the other side more directly and improved their position on the motion.`;
    }
  }

  private getOverallVoteCriterion(): string {
    switch (this.formatId) {
      case 'lincoln_douglas':
        return 'Final decision: weigh the value clash across all checkpoints and choose the debater whose criterion should decide the debate.';
      case 'policy':
        return 'Final decision: weigh solvency, risks, impacts, and dropped arguments across the full policy debate.';
      case 'socratic':
        return 'Final decision: choose who most improved understanding through clear questions, direct answers, and useful synthesis.';
      case 'oxford':
      default:
        return 'Final decision: weigh the checkpoint wins and choose who carried the motion more convincingly overall.';
    }
  }

  getVoteCriterion(roundOrIsOverallVote: number | boolean = 1, maybeIsOverallVote: boolean = false): string {
    const isOverallVote = typeof roundOrIsOverallVote === 'boolean'
      ? roundOrIsOverallVote
      : maybeIsOverallVote;
    const round = typeof roundOrIsOverallVote === 'number'
      ? roundOrIsOverallVote
      : 1;

    if (isOverallVote) {
      return this.getOverallVoteCriterion();
    }

    return this.getVoteCheckpoint(round)?.criterion || this.buildVoteCriterion('Exchange', 'rebuttal');
  }

  recordRoundVote(round: number, winnerId: string): VoteRecord {
    const winner = this.participants.find((ai) => ai.id === winnerId);
    const voteRecord: VoteRecord = {
      round,
      winnerId,
      winnerName: winner?.name,
      votingLabel: this.getVotingLabel(round),
      criterion: this.getVoteCriterion(round, false),
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
    return this.getVoteCheckpoint(voteIndex)?.label || 'Exchange';
  }

  private getVoteCheckpoint(voteIndex: number): VoteCheckpoint | undefined {
    if (voteIndex >= 1 && voteIndex <= this.voteCheckpoints.length) {
      return this.voteCheckpoints[voteIndex - 1];
    }
    return undefined;
  }

  getVotingPrompt(round: number, _isFinalVote: boolean, isOverallVote: boolean): string {
    if (isOverallVote) {
      return DEBATE_CONSTANTS.VOTING.OVERALL_PROMPT;
    }
    return this.getVoteCheckpoint(round)?.prompt || this.buildVotingPrompt('exchange');
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
