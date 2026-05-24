import { VotingService } from '@/services/debate/VotingService';
import { LINCOLN_DOUGLAS_FORMAT, POLICY_FORMAT, getPresetForFormat } from '@/config/debate/formats';
import type { AI } from '@/types';

describe('VotingService', () => {
  const participants: AI[] = [
    { id: 'claude', provider: 'claude', name: 'Claude', model: 'claude-3' },
    { id: 'gpt4', provider: 'openai', name: 'GPT-4o', model: 'gpt-4o' },
  ];
  const oxfordShort = getPresetForFormat('oxford', 'short');

  it('records round winners and calculates scores', () => {
    const service = new VotingService(participants, oxfordShort);

    service.recordRoundVote(1, 'claude');
    service.recordRoundVote(2, 'gpt4');
    service.recordRoundVote(3, 'claude');
    service.recordOverallWinner('claude');

    const scores = service.calculateScores();

    expect(scores.claude.roundWins).toBe(2);
    expect(scores.gpt4.roundWins).toBe(1);
    expect(scores.claude.isOverallWinner).toBe(true);
    expect(scores.gpt4.isOverallWinner).toBe(false);
    expect(service.getRoundVote(2)?.winnerId).toBe('gpt4');
    expect(service.getRoundVote(2)?.votingLabel).toBe('Floor Debate');
    expect(service.getVoteRecords()).toHaveLength(3);
    expect(service.getVotesMap()).toEqual({ '1': 'claude', '2': 'gpt4', '3': 'claude', overall: 'claude' });
  });

  it('tracks completion state across rounds', () => {
    const service = new VotingService(participants, oxfordShort);
    expect(service.areAllRoundsVoted()).toBe(false);

    service.recordRoundVote(1, 'claude');
    expect(service.areAllRoundsVoted()).toBe(false);

    service.recordRoundVote(2, 'gpt4');
    expect(service.areAllRoundsVoted()).toBe(false);

    service.recordRoundVote(3, 'claude');
    expect(service.areAllRoundsVoted()).toBe(true);
    expect(service.getNextVotingRound()).toBe(null);
  });

  it('provides contextual prompts based on round and overall vote', () => {
    const service = new VotingService(participants, oxfordShort);

    expect(service.getVotingPrompt(2, false, false)).toBe('Who had the stronger floor debate?');
    expect(service.getVotingPrompt(3, true, false)).toBe('Who had the stronger closing speeches?');
    expect(service.getVotingPrompt(3, true, true)).toBe('Choose the overall winner');
    expect(service.getWinnerMessage(1, 'claude', false)).toBe('Opening Speeches: Claude');
    expect(service.getWinnerMessage(3, 'gpt4', true)).toBe('Closing Speeches: GPT-4o');
    expect(service.getOverallWinnerMessage('gpt4')).toBe('OVERALL WINNER: GPT-4o!\n\nGPT-4o won the debate.');
  });

  it('maps legacy round counts to preset ids when constructed with a format', () => {
    const service = new VotingService(participants, LINCOLN_DOUGLAS_FORMAT, 5);

    expect(service.getTotalVotes()).toBe(5);
    expect(service.getVotingPrompt(2, false, false)).toBe('Who had the stronger nc/1nr + cx?');
  });

  it('provides format-specific vote criteria', () => {
    const ldService = new VotingService(participants, LINCOLN_DOUGLAS_FORMAT, 5);
    const policyService = new VotingService(participants, POLICY_FORMAT, 5);
    const presetService = new VotingService(participants, getPresetForFormat('socratic', 'short'), 'socratic');

    expect(ldService.getVoteCriterion(1)).toContain('value, criterion');
    expect(policyService.getVoteCriterion(1)).toContain('core harms');
    expect(presetService.getVoteCriterion(true)).toContain('Final decision');
    expect(presetService.getVoteCriterion(true)).toContain('improved understanding');
  });

  it('uses distinct vote guidance for each checkpoint and records it', () => {
    const service = new VotingService(participants, oxfordShort);

    const openingCriterion = service.getVoteCriterion(1);
    const rebuttalCriterion = service.getVoteCriterion(2);
    const closingCriterion = service.getVoteCriterion(3);

    expect(openingCriterion).toContain('motion framing');
    expect(rebuttalCriterion).toContain('answered the other side');
    expect(closingCriterion).toContain('summary of voters');
    expect(new Set([openingCriterion, rebuttalCriterion, closingCriterion]).size).toBe(3);

    expect(service.recordRoundVote(2, 'gpt4')).toMatchObject({
      votingLabel: 'Floor Debate',
      criterion: rebuttalCriterion,
    });
  });
});
