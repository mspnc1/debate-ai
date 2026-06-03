import {
  buildDebateStatsRollups,
  buildRollupTrendLines,
  resolveStatsProviderId,
} from '../statsRollups';
import type { AIStats, DebateRound } from '../../../types/stats';

const createStats = (overrides: Partial<AIStats> = {}): AIStats => ({
  totalDebates: 1,
  roundsWon: 1,
  roundsLost: 0,
  overallWins: 1,
  overallLosses: 0,
  lastDebated: 1000,
  winRate: 100,
  roundWinRate: 100,
  topics: {},
  ...overrides,
});

describe('statsRollups', () => {
  it('resolves generated debater slot IDs back to provider IDs', () => {
    expect(resolveStatsProviderId('google-debater-slot-1779611274475-1')).toBe('google');
    expect(resolveStatsProviderId('grok-debater-slot-1779611285499-3')).toBe('grok');
    expect(resolveStatsProviderId('chatgpt')).toBe('openai');
  });

  it('aggregates generated debate slots into provider rollups', () => {
    const stats = {
      'google-debater-slot-1': createStats({ overallWins: 1, totalDebates: 1 }),
      'google-debater-slot-2': createStats({ overallWins: 0, overallLosses: 1, totalDebates: 1, roundsWon: 0, roundsLost: 1 }),
      'claude-debater-slot-3': createStats({ overallWins: 1, totalDebates: 1 }),
    };
    const history: DebateRound[] = [
      {
        debateId: 'debate-1',
        topic: 'Motion',
        participants: ['google-debater-slot-1', 'google-debater-slot-2'],
        roundWinners: {},
        overallWinner: 'google-debater-slot-1',
        timestamp: 1000,
      },
    ];

    const rollups = buildDebateStatsRollups(stats, history, 'provider');
    const google = rollups.find((entry) => entry.providerId === 'google');

    expect(google?.shortLabel).toBe('Gemini');
    expect(google?.totalDebates).toBe(2);
    expect(google?.sourceParticipantIds).toEqual([
      'google-debater-slot-1',
      'google-debater-slot-2',
    ]);
  });

  it('builds model rollups from participant details', () => {
    const stats = {
      'openai-debater-slot-1': createStats({ totalDebates: 2, overallWins: 1, overallLosses: 1, roundsWon: 2, roundsLost: 1 }),
      'claude-debater-slot-1': createStats({ totalDebates: 2, overallWins: 1, overallLosses: 1, roundsWon: 1, roundsLost: 2 }),
    };
    const history: DebateRound[] = [
      {
        debateId: 'debate-1',
        topic: 'Motion',
        participants: ['openai-debater-slot-1', 'claude-debater-slot-1'],
        participantDetails: {
          'openai-debater-slot-1': {
            id: 'openai-debater-slot-1',
            provider: 'openai',
            model: 'gpt-5',
            name: 'ChatGPT',
          },
          'claude-debater-slot-1': {
            id: 'claude-debater-slot-1',
            provider: 'claude',
            model: 'claude-sonnet-4-6',
            name: 'Claude',
          },
        },
        roundWinners: {},
        overallWinner: 'openai-debater-slot-1',
        timestamp: 1000,
      },
    ];

    const rollups = buildDebateStatsRollups(stats, history, 'model');
    const openaiModel = rollups.find((entry) => entry.id === 'model:openai:gpt-5');

    expect(openaiModel?.providerName).toBe('ChatGPT');
    expect(openaiModel?.shortLabel).toBe('GPT-5');
    expect(openaiModel?.totalDebates).toBe(2);
  });

  it('builds trend lines with multiple overall winners', () => {
    const now = 10 * 24 * 60 * 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;
    const stats = {
      'openai-debater-slot-1': createStats({ totalDebates: 2 }),
      'claude-debater-slot-1': createStats({ totalDebates: 2 }),
    };
    const history: DebateRound[] = [
      {
        debateId: 'debate-1',
        topic: 'Motion',
        participants: ['openai-debater-slot-1', 'claude-debater-slot-1'],
        participantDetails: {
          'openai-debater-slot-1': { id: 'openai-debater-slot-1', provider: 'openai', model: 'gpt-5' },
          'claude-debater-slot-1': { id: 'claude-debater-slot-1', provider: 'claude', model: 'claude-sonnet-4-6' },
        },
        roundWinners: {},
        overallWinners: ['openai-debater-slot-1', 'claude-debater-slot-1'],
        timestamp: now - dayMs,
      },
      {
        debateId: 'debate-2',
        topic: 'Motion',
        participants: ['openai-debater-slot-1', 'claude-debater-slot-1'],
        participantDetails: {
          'openai-debater-slot-1': { id: 'openai-debater-slot-1', provider: 'openai', model: 'gpt-5' },
          'claude-debater-slot-1': { id: 'claude-debater-slot-1', provider: 'claude', model: 'claude-sonnet-4-6' },
        },
        roundWinners: {},
        overallWinner: 'openai-debater-slot-1',
        timestamp: now,
      },
    ];

    const rollups = buildDebateStatsRollups(stats, history, 'provider');
    const trendLines = buildRollupTrendLines(history, rollups, 'provider', 'day', now);
    const claudeLine = trendLines.find((line) => line.id === 'provider:claude');

    expect(claudeLine?.points.map((point) => point.y)).toContain(100);
    expect(claudeLine?.points.map((point) => point.y)).toContain(0);
  });
});
