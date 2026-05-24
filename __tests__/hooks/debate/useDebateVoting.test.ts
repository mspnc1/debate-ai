import { act } from '@testing-library/react-native';
import { useDebateVoting } from '@/hooks/debate/useDebateVoting';
import type { DebateEvent, ScoreBoard } from '@/services/debate';
import type { RootState } from '@/store';
import { startDebate } from '@/store';
import { renderHookWithProviders } from '../../../test-utils/renderHookWithProviders';

class MockVotingService {
  public prompt = 'Who had the stronger opening?';
  public scores: ScoreBoard = {
    claude: { name: 'Claude', roundWins: 1, roundsWon: [1], isOverallWinner: false },
  };
  public voteRecords = [
    {
      round: 1,
      winnerId: 'claude',
      winnerName: 'Claude',
      votingLabel: 'Opening',
      criterion: 'Opening: choose who framed the motion more clearly.',
      timestamp: 100,
    },
  ];
  public voted = new Set<number>();

  calculateScores = jest.fn(() => this.scores);
  getVotingPrompt = jest.fn(() => this.prompt);
  getVoteCriterion = jest.fn(() => 'Opening: choose who framed the motion more clearly.');
  getAudienceVotingPrompt = jest.fn((stage: string) => `${stage} audience prompt`);
  getAudienceVoteCriterion = jest.fn((stage: string) => `${stage} audience criterion`);
  getVotingLabel = jest.fn(() => 'Opening');
  getVoteRecords = jest.fn(() => this.voteRecords);
  hasVotedForRound = jest.fn((round: number) => this.voted.has(round));
}

type EventHandler = (event: DebateEvent) => void;

class MockOrchestrator {
  public votingService = new MockVotingService();
  public recordVote = jest.fn(async () => undefined);
  private handlers = new Set<EventHandler>();

  addEventListener(handler: EventHandler) {
    this.handlers.add(handler);
  }

  removeEventListener(handler: EventHandler) {
    this.handlers.delete(handler);
  }

  emit(event: DebateEvent) {
    this.handlers.forEach(handler => handler(event));
  }

  getVotingService() {
    return this.votingService;
  }
}

describe('useDebateVoting', () => {
  const baseState = {} as Partial<RootState>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates voting state from orchestrator events and records votes', async () => {
    const orchestrator = new MockOrchestrator();
    const { result, store } = renderHookWithProviders(() => useDebateVoting(orchestrator as unknown as never, []), {
      preloadedState: baseState,
    });

    store.dispatch(startDebate({ debateId: 'debate-1', topic: 'AI', participants: ['claude', 'gpt4'] }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(orchestrator.votingService.calculateScores).toHaveBeenCalledTimes(1);
    expect(result.current.scores).toEqual(orchestrator.votingService.scores);
    expect(result.current.voteRecords).toEqual(orchestrator.votingService.voteRecords);

    expect(result.current.getVotingPrompt()).toBe('Who had the stronger opening?');
    expect(orchestrator.votingService.getVotingPrompt).toHaveBeenCalledWith(0, false, false);
    expect(result.current.getVoteCriterion()).toBe('Opening: choose who framed the motion more clearly.');
    expect(orchestrator.votingService.getVoteCriterion).toHaveBeenCalledWith(0, false);

    act(() => {
      orchestrator.emit({ type: 'voting_started', data: { round: 1, isFinalRound: false, isOverallVote: false }, timestamp: Date.now() });
    });
    expect(result.current.isVoting).toBe(true);
    expect(result.current.votingRound).toBe(1);

    orchestrator.votingService.voted.add(1);
    expect(result.current.hasVotedForRound(1)).toBe(true);

    act(() => {
      orchestrator.emit({
        type: 'voting_completed',
        data: {
          scores: orchestrator.votingService.scores,
          voteRecord: {
            round: 1,
            winnerId: 'claude',
            winnerName: 'Claude',
            votingLabel: 'Opening',
            criterion: 'Opening: choose who framed the motion more clearly.',
            timestamp: 200,
          },
        },
        timestamp: Date.now(),
      });
    });
    expect(result.current.scores).toEqual(orchestrator.votingService.scores);
    expect(result.current.voteRecords[0]?.timestamp).toBe(200);

    await act(async () => {
      await result.current.recordVote('claude');
    });

    expect(orchestrator.recordVote).toHaveBeenCalledWith(1, 'claude', false);
    expect(store.getState().debateStats.currentDebate?.roundWinners[1]).toBe('claude');
    expect(store.getState().debateStats.currentDebate?.voteResults?.[0]).toMatchObject({
      votingLabel: 'Opening',
      criterion: 'Opening: choose who framed the motion more clearly.',
    });

    orchestrator.votingService.prompt = 'Choose the overall winner';
    expect(result.current.getVotingPrompt()).toBe('Choose the overall winner');

    act(() => {
      orchestrator.emit({ type: 'voting_started', data: { round: 3, isFinalRound: true, isOverallVote: true }, timestamp: Date.now() });
    });

    await act(async () => {
      await result.current.recordVote('gpt4');
    });

    expect(orchestrator.recordVote).toHaveBeenLastCalledWith(3, 'gpt4', true);
    expect(result.current.getVotingPrompt()).toBe('Choose the overall winner');
    expect(orchestrator.votingService.getVotingPrompt).toHaveBeenLastCalledWith(3, true, true);
    expect(result.current.getVoteCriterion()).toBe('Opening: choose who framed the motion more clearly.');
    expect(orchestrator.votingService.getVoteCriterion).toHaveBeenLastCalledWith(3, true);

    // History is populated when debate_ended event is emitted (not during recordVote)
    act(() => {
      orchestrator.emit({ type: 'debate_ended', data: { overallWinner: 'gpt4' }, timestamp: Date.now() });
    });

    expect(store.getState().debateStats.history).toHaveLength(1);
    expect(store.getState().debateStats.history[0]?.overallWinner).toBe('gpt4');
    expect(result.current.isVoting).toBe(false);
  });

  it('handles Oxford audience stance voting without recording round winners', async () => {
    const orchestrator = new MockOrchestrator();
    const { result, store } = renderHookWithProviders(() => useDebateVoting(orchestrator as unknown as never, []), {
      preloadedState: baseState,
    });

    store.dispatch(startDebate({ debateId: 'debate-1', topic: 'AI', participants: ['claude', 'gpt4'] }));

    act(() => {
      orchestrator.emit({
        type: 'voting_started',
        data: {
          round: 0,
          voteKind: 'audience_stance',
          audienceVoteStage: 'initial',
          isFinalRound: false,
          isOverallVote: false,
        },
        timestamp: Date.now(),
      });
    });

    expect(result.current.voteKind).toBe('audience_stance');
    expect(result.current.audienceVoteStage).toBe('initial');
    expect(result.current.getVotingPrompt()).toBe('initial audience prompt');
    expect(result.current.getVoteCriterion()).toBe('initial audience criterion');

    await act(async () => {
      await result.current.recordVote('undecided');
    });

    expect(orchestrator.recordVote).toHaveBeenCalledWith(0, 'undecided', false);
    expect(store.getState().debateStats.currentDebate?.roundWinners).toEqual({});

    act(() => {
      orchestrator.emit({
        type: 'debate_ended',
        data: {
          overallWinner: 'claude',
          overallWinnerIds: ['claude'],
          audienceResult: {
            initialStance: 'undecided',
            finalStance: 'for',
            winningSide: 'aff',
            winningSideLabel: 'Proposition',
            resultVerb: 'persuaded',
            summary: 'Proposition persuaded the audience.',
            winningParticipantIds: ['claude'],
          },
        },
        timestamp: Date.now(),
      });
    });

    expect(result.current.audienceResult?.winningSideLabel).toBe('Proposition');
    expect(store.getState().debateStats.history[0]?.overallWinners).toEqual(['claude']);
  });

  it('handles missing orchestrator, vote failures, and helper fallbacks', async () => {
    let currentOrchestrator: MockOrchestrator | null = null;
    const participants = [];

    const { result, rerender } = renderHookWithProviders(
      () => useDebateVoting(currentOrchestrator as unknown as MockOrchestrator | null, participants),
      { preloadedState: baseState },
    );

    expect(result.current.getVotingPrompt()).toBe('');
    expect(result.current.getVoteCriterion()).toBe('');
    expect(result.current.hasVotedForRound(5)).toBe(false);

    await act(async () => {
      await result.current.recordVote('claude');
    });

    expect(result.current.error).toBe('No active orchestrator');

    const orchestrator = new MockOrchestrator();
    orchestrator.recordVote.mockRejectedValueOnce(new Error('vote-failed'));
    currentOrchestrator = orchestrator;

    await act(async () => {
      rerender();
      await Promise.resolve();
    });

    act(() => {
      orchestrator.emit({ type: 'voting_started', data: { round: 2, isFinalRound: false, isOverallVote: false }, timestamp: Date.now() });
    });

    await act(async () => {
      await result.current.recordVote('claude');
    });

    expect(orchestrator.recordVote).toHaveBeenCalledWith(2, 'claude', false);
    expect(result.current.error).toBe('vote-failed');

    orchestrator.recordVote.mockResolvedValueOnce(undefined);

    act(() => {
      orchestrator.emit({ type: 'voting_started', data: { round: 4, isFinalRound: true, isOverallVote: true }, timestamp: Date.now() });
    });

    await act(async () => {
      await result.current.recordVote('claude');
    });

    expect(orchestrator.recordVote).toHaveBeenLastCalledWith(4, 'claude', true);
    expect(result.current.error).toBeNull();
  });
});
