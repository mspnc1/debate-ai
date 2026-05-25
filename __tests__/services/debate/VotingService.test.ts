import { VotingService } from '@/services/debate/VotingService';
import { LINCOLN_DOUGLAS_FORMAT, POLICY_FORMAT, getPresetForFormat } from '@/config/debate/formats';
import type { AI } from '@/types';

describe('VotingService', () => {
  const participants: AI[] = [
    { id: 'claude', provider: 'claude', name: 'Claude', model: 'claude-3' },
    { id: 'gpt4', provider: 'openai', name: 'GPT-4o', model: 'gpt-4o' },
  ];
  const oxfordShort = getPresetForFormat('oxford', 'short');
  const lincolnDouglasShort = getPresetForFormat('lincoln_douglas', 'short');
  const policyShort = getPresetForFormat('policy', 'short');

  it('records round winners and calculates scores', () => {
    const service = new VotingService(participants, policyShort, 'policy');

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
    expect(service.getRoundVote(2)?.votingLabel).toBe('2NC policy clash');
    expect(service.getVoteRecords()).toHaveLength(3);
    expect(service.getVotesMap()).toEqual({ '1': 'claude', '2': 'gpt4', '3': 'claude', overall: 'claude' });
  });

  it('tracks completion state across rounds', () => {
    const service = new VotingService(participants, policyShort, 'policy');
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
    const service = new VotingService(participants, policyShort, 'policy');

    expect(service.getVotingPrompt(2, false, false)).toBe('Who better developed policy clash on solvency, impacts, and burdens?');
    expect(service.getVotingPrompt(3, true, false)).toBe('Who gave the clearer policy ballot story in the 2AR?');
    expect(service.getVotingPrompt(3, true, true)).toBe('Choose the overall winner');
    expect(service.getWinnerMessage(1, 'claude', false)).toBe('1NC plan clash: Claude');
    expect(service.getWinnerMessage(3, 'gpt4', true)).toBe('2AR ballot: GPT-4o');
    expect(service.getOverallWinnerMessage('gpt4')).toBe('OVERALL WINNER: GPT-4o!\n\nGPT-4o won the debate.');
  });

  it('maps legacy round counts to preset ids when constructed with a format', () => {
    const service = new VotingService(participants, LINCOLN_DOUGLAS_FORMAT, 5);

    expect(service.getTotalVotes()).toBe(5);
    expect(service.getVotingPrompt(2, false, false)).toBe('Who better handled the negative value framework and CX?');
  });

  it('provides format-specific vote criteria', () => {
    const ldService = new VotingService(participants, LINCOLN_DOUGLAS_FORMAT, 5);
    const policyService = new VotingService(participants, POLICY_FORMAT, 5);
    const presetService = new VotingService(participants, getPresetForFormat('socratic', 'short'), 'socratic');

    expect(ldService.getVoteCriterion(1)).toContain('value, criterion');
    expect(policyService.getVoteCriterion(1)).toContain('core harms');
    expect(presetService.getVoteCriterion(true)).toContain('Final decision');
    expect(presetService.getVoteCriterion(true)).toContain('improved understanding');

    const ldShortService = new VotingService(participants, lincolnDouglasShort, 'lincoln_douglas');
    expect(ldShortService.getVoteCriterion(1)).toContain('value, criterion, definitions, and contentions.');
    expect(ldShortService.getVoteCriterion(1)).not.toContain('cross-examination');
  });

  it('uses distinct vote guidance for each checkpoint and records it', () => {
    const service = new VotingService(participants, policyShort, 'policy');

    const openingCriterion = service.getVoteCriterion(1);
    const rebuttalCriterion = service.getVoteCriterion(2);
    const closingCriterion = service.getVoteCriterion(3);

    expect(openingCriterion).toContain('plan or opposition');
    expect(rebuttalCriterion).toContain('solvency');
    expect(closingCriterion).toContain('dropped arguments');
    expect(new Set([openingCriterion, rebuttalCriterion, closingCriterion]).size).toBe(3);

    expect(service.recordRoundVote(2, 'gpt4')).toMatchObject({
      votingLabel: '2NC policy clash',
      criterion: rebuttalCriterion,
    });
  });

  it('records Oxford opening and final audience stance votes', () => {
    const service = new VotingService(participants, oxfordShort, 'oxford');

    expect(service.isAudienceStanceVoteModel()).toBe(true);
    expect(service.areAllRoundsVoted()).toBe(false);
    expect(service.getAudienceVotingPrompt('initial')).toContain('Before the debate');
    expect(service.getAudienceVoteOptions('initial').map((option) => option.id)).toEqual(['for', 'against', 'undecided']);
    expect(service.getAudienceVoteOptions('final').map((option) => option.id)).toEqual(['for', 'against']);

    service.recordAudienceVote('initial', 'undecided');
    expect(service.areAllRoundsVoted()).toBe(false);

    service.recordAudienceVote('final', 'for');
    const result = service.getAudienceDecisionResult();

    expect(service.areAllRoundsVoted()).toBe(true);
    expect(result).toMatchObject({
      initialStance: 'undecided',
      finalStance: 'for',
      winningSide: 'aff',
      winningSideLabel: 'Affirmative',
      resultVerb: 'persuaded',
      winningParticipantIds: ['claude'],
    });
    expect(service.calculateScores().aff.roundWins).toBe(1);
    expect(service.getVoteRecords()).toHaveLength(2);
  });
});
