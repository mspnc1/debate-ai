import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { loadSession as loadSessionAction, endSession as endSessionAction } from '../../store';
import { ChatSession } from '../../types';
import { StorageService } from '../../services/chat';

export interface ChatSessionHook {
  currentSession: ChatSession | null;
  selectedAIs: ChatSession['selectedAIs'];
  isActive: boolean;
  sessionId: string | null;
  loadSession: (sessionId: string) => Promise<void>;
  saveSession: () => Promise<void>;
  endSession: () => void;
}

export const useChatSession = (): ChatSessionHook => {
  const dispatch = useDispatch();
  const { currentSession } = useSelector((state: RootState) => state.chat);
  const isPremium = useSelector((state: RootState) => state.auth.isPremium);

  const loadSession = useCallback(async (id: string): Promise<void> => {
    try {
      const session = await StorageService.loadSession(id);
      if (session && (session.sessionType === undefined || session.sessionType === 'chat')) {
        dispatch(loadSessionAction({
          ...session,
          sessionType: 'chat',
        }));
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }, [dispatch]);

  const saveSession = useCallback(async (): Promise<void> => {
    if (!currentSession) return;
    
    // ChatScreen owns chat persistence only. Debate/compare flows save through their own screens.
    if (currentSession.sessionType !== undefined && currentSession.sessionType !== 'chat') {
      return;
    }
    
    try {
      // Check if this is a new session (not yet saved)
      const existingSession = await StorageService.loadSession(currentSession.id);
      
      // Only enforce limits for new chat sessions
      if (!existingSession) {
        await StorageService.enforceStorageLimits('chat', isPremium, true);
      }
      
      await StorageService.saveSession(currentSession);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, [currentSession, isPremium]);

  const endSession = useCallback((): void => {
    dispatch(endSessionAction());
  }, [dispatch]);

  return {
    currentSession,
    selectedAIs: currentSession?.selectedAIs || [],
    isActive: currentSession?.isActive || false,
    sessionId: currentSession?.id || null,
    loadSession,
    saveSession,
    endSession,
  };
};
