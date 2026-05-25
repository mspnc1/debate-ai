import { DebateRulesEngine } from '@/services/debate/DebateRulesEngine';
import { DEBATE_CONSTANTS } from '@/config/debateConstants';
import { getPresetForFormat } from '@/config/debate/formats';
import type { AI } from '@/types';

describe('DebateRulesEngine', () => {
  const participants: AI[] = [
    { id: 'claude', provider: 'claude', name: 'Claude', model: 'claude-3' },
    { id: 'gpt4', provider: 'openai', name: 'GPT-4o', model: 'gpt-4o' },
  ];

  it('calculates max messages based on participant count and configured rounds', () => {
    const engine = new DebateRulesEngine({ maxRounds: 5 });
    expect(engine.calculateMaxMessages(participants.length)).toBe(10);
  });

  it('derives max message count from the selected preset', () => {
    const preset = getPresetForFormat('policy', 'standard');
    const engine = new DebateRulesEngine(preset);

    expect(engine.calculateMaxMessages(participants.length)).toBe(preset.messages.length);
    expect(engine.getRules().maxRounds).toBe(preset.voteCount);
    expect(engine.getRules().maxMessages).toBe(preset.messages.length);
  });

  it('derives vote checkpoints and labels from preset messages', () => {
    const preset = getPresetForFormat('lincoln_douglas', 'standard');
    const engine = new DebateRulesEngine(preset);

    expect(engine.shouldVoteAfter(2)).toBe(true);
    expect(engine.shouldVoteAfter(3)).toBe(false);
    expect(engine.getVoteIndex(5)).toBe(2);
    expect(engine.getVotingLabel(2)).toBe('NC/1NR value + CX');
  });

  it('derives round metadata and signals voting on new rounds', () => {
    const engine = new DebateRulesEngine({ maxRounds: 3 });
    const info = engine.getRoundInfo(3, 0, participants.length, 1);

    expect(info.currentRound).toBe(2);
    expect(info.isNewRound).toBe(true);
    expect(info.shouldShowVoting).toBe(true);
    expect(engine.getRoundMessage(info)).toBe(DEBATE_CONSTANTS.MESSAGES.ROUND_START(2));
  });

  it('suppresses voting prompt when round already recorded', () => {
    const engine = new DebateRulesEngine();
    const shouldVote = engine.shouldShowVotingForRound(2, 1, true, true);
    expect(shouldVote).toBe(false);
  });

  it('validates debate setup and returns descriptive errors', () => {
    const engine = new DebateRulesEngine();
    const invalid = engine.validateDebateSetup([participants[0]], '');

    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContain('Debate requires at least 2 participants');
    expect(invalid.errors).toContain('Debate topic is required');
  });

  it('returns final round cue for last exchange', () => {
    const engine = new DebateRulesEngine({ maxRounds: 3 });
    const finalRoundInfo = engine.getRoundInfo(6, 0, participants.length, 2);

    expect(finalRoundInfo.isFinalRound).toBe(true);
    expect(engine.getRoundMessage(finalRoundInfo)).toBe(DEBATE_CONSTANTS.MESSAGES.FINAL_ROUND);
  });
});
