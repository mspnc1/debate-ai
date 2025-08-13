/**
 * Voting Service
 * Handles all voting logic including round voting, overall voting, and score calculation
 */

import { AI } from '../../types';
import { DEBATE_CONSTANTS } from '../../config/debateConstants';

export interface VoteRecord {
  round: number;
  winnerId: string;
  timestamp: number;
}

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

export class VotingService {
  private participants: AI[];
  private maxRounds: number;
  private votes: Map<number, VoteRecord> = new Map();
  private overallWinner?: string;
  
  constructor(participants: AI[], maxRounds: number = DEBATE_CONSTANTS.MAX_ROUNDS) {
    this.participants = participants;
    this.maxRounds = maxRounds;
  }
  
  /**
   * Record a vote for a specific round
   */
  recordRoundVote(round: number, winnerId: string): VoteRecord {
    const voteRecord: VoteRecord = {
      round,
      winnerId,
      timestamp: Date.now(),
    };
    
    this.votes.set(round, voteRecord);
    return voteRecord;
  }
  
  /**
   * Record the overall winner
   */
  recordOverallWinner(winnerId: string): void {
    this.overallWinner = winnerId;
  }
  
  /**
   * Get vote for a specific round
   */
  getRoundVote(round: number): VoteRecord | undefined {
    return this.votes.get(round);
  }
  
  /**
   * Check if a round has been voted on
   */
  hasVotedForRound(round: number): boolean {
    return this.votes.has(round);
  }
  
  /**
   * Get all votes as a simple map for compatibility
   */
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
  
  /**
   * Calculate current scores based on round wins
   */
  calculateScores(): ScoreBoard {
    const scoreBoard: ScoreBoard = {};
    
    // Initialize scoreboard
    this.participants.forEach(ai => {
      scoreBoard[ai.id] = {
        name: ai.name,
        roundWins: 0,
        roundsWon: [],
        isOverallWinner: ai.id === this.overallWinner,
      };
    });
    
    // Count round wins
    this.votes.forEach((vote, round) => {
      if (scoreBoard[vote.winnerId]) {
        scoreBoard[vote.winnerId].roundWins++;
        scoreBoard[vote.winnerId].roundsWon.push(round);
      }
    });
    
    return scoreBoard;
  }
  
  /**
   * Get voting prompt for UI
   */
  getVotingPrompt(round: number, isFinalVote: boolean, isOverallVote: boolean): string {
    if (isOverallVote) {
      return DEBATE_CONSTANTS.VOTING.OVERALL_PROMPT;
    } else if (isFinalVote) {
      return DEBATE_CONSTANTS.VOTING.FINAL_ROUND_PROMPT;
    } else {
      return DEBATE_CONSTANTS.VOTING.ROUND_PROMPT(round);
    }
  }
  
  /**
   * Get winner announcement message
   */
  getWinnerMessage(round: number, winnerId: string, isFinalVote: boolean): string {
    const winner = this.participants.find(ai => ai.id === winnerId);
    const winnerName = winner?.name || 'Unknown';
    
    if (isFinalVote) {
      return DEBATE_CONSTANTS.MESSAGES.FINAL_ROUND_WINNER(winnerName);
    } else {
      return DEBATE_CONSTANTS.MESSAGES.ROUND_WINNER(round, winnerName);
    }
  }
  
  /**
   * Get overall winner message
   */
  getOverallWinnerMessage(winnerId: string): string {
    const winner = this.participants.find(ai => ai.id === winnerId);
    const winnerName = winner?.name || 'Unknown';
    return DEBATE_CONSTANTS.MESSAGES.OVERALL_WINNER(winnerName);
  }
  
  /**
   * Check if all rounds have been voted on
   */
  areAllRoundsVoted(): boolean {
    for (let round = 1; round <= this.maxRounds; round++) {
      if (!this.hasVotedForRound(round)) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Get next round that needs voting
   */
  getNextVotingRound(): number | null {
    for (let round = 1; round <= this.maxRounds; round++) {
      if (!this.hasVotedForRound(round)) {
        return round;
      }
    }
    return null;
  }
  
  /**
   * Reset all votes and state
   */
  reset(): void {
    this.votes.clear();
    this.overallWinner = undefined;
  }
  
  /**
   * Get voting statistics
   */
  getVotingStats(): {
    totalRounds: number;
    votedRounds: number;
    remainingRounds: number;
    hasOverallWinner: boolean;
  } {
    return {
      totalRounds: this.maxRounds,
      votedRounds: this.votes.size,
      remainingRounds: this.maxRounds - this.votes.size,
      hasOverallWinner: !!this.overallWinner,
    };
  }
}