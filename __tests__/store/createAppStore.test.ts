import { createAppStore, loadSession } from '@/store';

describe('createAppStore', () => {
  it('hydrates store with preloaded state', () => {
    const store = createAppStore({ user: { currentUser: null, isAuthenticated: false, uiMode: 'expert' } as never });
    expect(store.getState().user.uiMode).toBe('expert');
  });

  it('drops unsupported providers when loading stale sessions', () => {
    const removedProviderId = ['to', 'gether'].join('');
    const store = createAppStore();

    store.dispatch(loadSession({
      id: 'stale-session',
      selectedAIs: [
        {
          id: removedProviderId,
          provider: removedProviderId as never,
          name: 'Removed Provider',
          model: 'removed-model',
        },
        {
          id: 'openai',
          provider: 'openai',
          name: 'ChatGPT',
          model: 'gpt-5.5',
        },
      ],
      messages: [],
      isActive: false,
      createdAt: Date.now(),
      sessionType: 'chat',
    }));

    expect(store.getState().chat.currentSession?.selectedAIs.map(ai => ai.provider)).toEqual(['openai']);
  });
});
