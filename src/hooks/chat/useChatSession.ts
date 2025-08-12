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

  const loadSession = async (id: string): Promise<void> => {
    try {
      const session = await StorageService.loadSession(id);
      if (session) {
        dispatch(loadSessionAction(session));
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const saveSession = async (): Promise<void> => {
    if (!currentSession) return;
    
    try {
      await StorageService.saveSession(currentSession);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const endSession = (): void => {
    dispatch(endSessionAction());
  };

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