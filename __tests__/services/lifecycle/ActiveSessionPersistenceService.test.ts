import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveSessionPersistenceService } from '@/services/lifecycle/ActiveSessionPersistenceService';
import type { AIConfig, Message } from '@/types';

const ai: AIConfig = {
  id: 'claude-main',
  provider: 'claude',
  name: 'Claude',
  model: 'claude-3-5-sonnet',
};

const userMessage: Message = {
  id: 'msg-user',
  sender: 'You',
  senderType: 'user',
  content: 'Hello',
  timestamp: 1000,
};

describe('ActiveSessionPersistenceService', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and loads a versioned chat snapshot', async () => {
    await ActiveSessionPersistenceService.saveSnapshot({
      mode: 'chat',
      sessionId: 'session-1',
      status: 'active',
      createdAt: 1000,
      selectedAIs: [ai],
      messages: [userMessage],
      session: {
        id: 'session-1',
        selectedAIs: [ai],
        messages: [userMessage],
        isActive: true,
        createdAt: 1000,
        sessionType: 'chat',
      },
    });

    const loaded = await ActiveSessionPersistenceService.loadSnapshot('chat', 'session-1');

    expect(loaded).toEqual(expect.objectContaining({
      version: 1,
      mode: 'chat',
      sessionId: 'session-1',
      status: 'active',
    }));
  });

  it('scrubs sensitive fields before persisting snapshots', async () => {
    await ActiveSessionPersistenceService.saveSnapshot({
      mode: 'chat',
      sessionId: 'session-sensitive',
      status: 'active',
      selectedAIs: [ai],
      messages: [{
        ...userMessage,
        metadata: {
          providerMetadata: {
            apiKey: 'sk-should-not-persist',
            nested: {
              authorization: 'Bearer secret',
              safe: 'kept',
            },
          },
        },
      }],
      session: {
        id: 'session-sensitive',
        selectedAIs: [ai],
        messages: [userMessage],
        isActive: true,
        createdAt: 1000,
        sessionType: 'chat',
      },
    });

    const allKeys = await AsyncStorage.getAllKeys();
    const storedValues = await AsyncStorage.multiGet(allKeys);
    const serialized = JSON.stringify(storedValues);

    expect(serialized).not.toContain('sk-should-not-persist');
    expect(serialized).not.toContain('Bearer secret');
    expect(serialized).toContain('kept');
  });

  it('marks an existing snapshot as interrupted without creating a new session', async () => {
    await ActiveSessionPersistenceService.saveSnapshot({
      mode: 'chat',
      sessionId: 'session-interrupt',
      status: 'active',
      selectedAIs: [ai],
      messages: [userMessage],
      session: {
        id: 'session-interrupt',
        selectedAIs: [ai],
        messages: [userMessage],
        isActive: true,
        createdAt: 1000,
        sessionType: 'chat',
      },
    });

    const interrupted = await ActiveSessionPersistenceService.markInterrupted('chat', 'session-interrupt', {
      kind: 'chat_response',
      messageIds: ['msg-ai'],
      reason: 'app_backgrounded',
    });

    expect(interrupted?.status).toBe('interrupted');
    expect(interrupted?.pendingTurn?.reason).toBe('app_backgrounded');
    expect(await ActiveSessionPersistenceService.loadLatestSnapshot('chat')).toEqual(
      expect.objectContaining({ sessionId: 'session-interrupt', status: 'interrupted' })
    );
  });
});
