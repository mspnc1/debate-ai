import { BrandColor } from '../constants/aiColors';
import type { DebateVoteResult } from './index';

export interface AIStats {
  winRate: number;
  roundWinRate: number;
  totalDebates: number;
  overallWins: number;
  overallLosses: number;
  roundsWon: number;
  roundsLost: number;
  lastDebated: number;
  topics: {
    [topic: string]: {
      participated: number;
      won: number;
    };
  };
}

export interface DebateRound {
  debateId: string;
  topic: string;
  participants: string[];
  roundWinners: { [round: number]: string };
  voteResults?: DebateVoteResult[];
  overallWinner?: string;
  timestamp: number;
}

export interface SortedAIStats {
  aiId: string;
  stats: AIStats;
  rank: number;
}

export interface AIInfo {
  name: string;
  color: string | BrandColor;
}

export interface FormattedDebate {
  debateId: string;
  topic: string;
  timestamp: number;
  formattedDate: string;
  winner: AIInfo | null;
}

export interface TopicPerformance {
  topic: string;
  won: number;
  participated: number;
  winRate: number;
}
