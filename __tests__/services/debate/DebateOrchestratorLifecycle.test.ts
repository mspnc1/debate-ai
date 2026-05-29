import { DebateOrchestrator, DebateStatus } from '@/services/debate/DebateOrchestrator';
import type { AI, Message } from '@/types';

const participants: AI[] = [
  {
    id: 'claude-debater',
    provider: 'claude',
    name: 'Claude',
    model: 'claude-3-5-sonnet',
  },
  {
    id: 'openai-debater',
    provider: 'openai',
    name: 'GPT',
    model: 'gpt-4o',
  },
];

const aiService = {
  getAdapter: jest.fn(),
  ensureAdapter: jest.fn(),
  sendMessage: jest.fn(),
  setPersonality: jest.fn(),
};

describe('DebateOrchestrator lifecycle snapshots', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serializes and hydrates an interrupted debate as a retryable paused turn', async () => {
    const orchestrator = new DebateOrchestrator(aiService as never);
    const session = await orchestrator.initializeDebate('Resolved: resilience matters.', participants, {}, {
      rounds: 1,
    });
    const messages: Message[] = [{
      id: 'host-1',
      sender: 'Debate Host',
      senderType: 'user',
      content: 'Cast your opening audience stance before the first speech.',
      timestamp: session.startTime,
    }];

    const snapshot = orchestrator.createSnapshot('interrupted', messages);
    expect(snapshot).toEqual(expect.objectContaining({
      mode: 'debate',
      sessionId: session.id,
      status: 'interrupted',
    }));

    const restored = new DebateOrchestrator(aiService as never);
    const restoredSession = restored.hydrateFromSnapshot(snapshot!);

    expect(restoredSession.status).toBe(DebateStatus.PAUSED_FOR_REVIEW);
    expect(restored.getSession()?.topic).toBe('Resolved: resilience matters.');
    expect(restored.getPendingContinuation()).toEqual(expect.objectContaining({
      continueAction: 'retry_message',
      buttonLabel: 'Retry Turn',
    }));
  });

  it('hydrates an active checkpoint without creating a retry continuation', async () => {
    const orchestrator = new DebateOrchestrator(aiService as never);
    const session = await orchestrator.initializeDebate('Resolved: checkpoints should not imply failure.', participants, {}, {
      rounds: 1,
    });
    const messages: Message[] = [{
      id: 'speech-1',
      sender: 'Claude',
      senderType: 'ai',
      content: 'Opening speech.',
      timestamp: session.startTime,
    }];

    const snapshot = orchestrator.createSnapshot('active', messages);
    expect(snapshot).toEqual(expect.objectContaining({
      mode: 'debate',
      sessionId: session.id,
      status: 'active',
    }));

    const restored = new DebateOrchestrator(aiService as never);
    const restoredSession = restored.hydrateFromSnapshot(snapshot!);

    expect(restoredSession.status).toBe(DebateStatus.ACTIVE);
    expect(restored.getPendingContinuation()).toBeNull();
  });
});
