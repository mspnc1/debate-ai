import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatSession, Message } from '../../types';

export interface StorageKeys {
  CHAT_SESSIONS: 'chatSessions';
  SESSION_METADATA: 'sessionMetadata';
  USER_PREFERENCES: 'userPreferences';
}

export interface SessionMetadata {
  id: string;
  lastAccessed: number;
  messageCount: number;
  participants: string[];
  createdAt: number;
}

export interface UserPreferences {
  autoSave: boolean;
  maxStoredSessions: number;
  retentionDays: number;
}

export class StorageService {
  private static readonly STORAGE_KEYS: StorageKeys = {
    CHAT_SESSIONS: 'chatSessions',
    SESSION_METADATA: 'sessionMetadata',
    USER_PREFERENCES: 'userPreferences'
  };

  /**
   * Saves a chat session to AsyncStorage
   */
  static async saveSession(session: ChatSession): Promise<void> {
    try {
      // Get existing sessions
      const sessions = await this.getAllSessions();
      
      // Update or add current session
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      // Save sessions
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.CHAT_SESSIONS, 
        JSON.stringify(sessions)
      );

      // Update metadata
      await this.updateSessionMetadata(session);

    } catch (error) {
      console.error('Error saving session:', error);
      throw new Error('Failed to save session to storage');
    }
  }

  /**
   * Loads a specific chat session from AsyncStorage
   */
  static async loadSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const sessions = await this.getAllSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (session) {
        // Update last accessed time
        await this.updateLastAccessed(sessionId);
      }
      
      return session || null;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }

  /**
   * Gets all chat sessions from AsyncStorage
   */
  static async getAllSessions(): Promise<ChatSession[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.CHAT_SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting all sessions:', error);
      return [];
    }
  }

  /**
   * Deletes a specific session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessions = await this.getAllSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.CHAT_SESSIONS,
        JSON.stringify(filteredSessions)
      );

      // Remove from metadata
      await this.removeSessionMetadata(sessionId);

    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error('Failed to delete session from storage');
    }
  }

  /**
   * Merges a session with existing data (for updating)
   */
  static async mergeSession(
    sessionId: string, 
    updates: Partial<ChatSession>
  ): Promise<ChatSession | null> {
    try {
      const existingSession = await this.loadSession(sessionId);
      if (!existingSession) {
        return null;
      }

      const mergedSession: ChatSession = {
        ...existingSession,
        ...updates,
        // Ensure messages are properly merged
        messages: updates.messages || existingSession.messages,
        // Always update timestamp
        lastMessageAt: Date.now()
      };

      await this.saveSession(mergedSession);
      return mergedSession;
    } catch (error) {
      console.error('Error merging session:', error);
      return null;
    }
  }

  /**
   * Adds a message to an existing session
   */
  static async addMessageToSession(
    sessionId: string, 
    message: Message
  ): Promise<void> {
    try {
      const session = await this.loadSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const updatedMessages = [...session.messages, message];
      
      await this.mergeSession(sessionId, {
        messages: updatedMessages,
        lastMessageAt: message.timestamp
      });
    } catch (error) {
      console.error('Error adding message to session:', error);
      throw error;
    }
  }

  /**
   * Gets session metadata for quick access
   */
  static async getSessionMetadata(): Promise<SessionMetadata[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SESSION_METADATA);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting session metadata:', error);
      return [];
    }
  }

  /**
   * Updates metadata for a session
   */
  private static async updateSessionMetadata(session: ChatSession): Promise<void> {
    try {
      const metadata = await this.getSessionMetadata();
      const existingIndex = metadata.findIndex(m => m.id === session.id);
      
      const newMetadata: SessionMetadata = {
        id: session.id,
        lastAccessed: Date.now(),
        messageCount: session.messages.length,
        participants: [...new Set(session.messages.map(m => m.sender))],
        createdAt: session.createdAt
      };

      if (existingIndex >= 0) {
        metadata[existingIndex] = newMetadata;
      } else {
        metadata.push(newMetadata);
      }

      await AsyncStorage.setItem(
        this.STORAGE_KEYS.SESSION_METADATA,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('Error updating session metadata:', error);
    }
  }

  /**
   * Updates last accessed time for a session
   */
  private static async updateLastAccessed(sessionId: string): Promise<void> {
    try {
      const metadata = await this.getSessionMetadata();
      const index = metadata.findIndex(m => m.id === sessionId);
      
      if (index >= 0) {
        metadata[index].lastAccessed = Date.now();
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.SESSION_METADATA,
          JSON.stringify(metadata)
        );
      }
    } catch (error) {
      console.error('Error updating last accessed:', error);
    }
  }

  /**
   * Removes session metadata
   */
  private static async removeSessionMetadata(sessionId: string): Promise<void> {
    try {
      const metadata = await this.getSessionMetadata();
      const filtered = metadata.filter(m => m.id !== sessionId);
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.SESSION_METADATA,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Error removing session metadata:', error);
    }
  }

  /**
   * Clears all stored sessions (use with caution)
   */
  static async clearAllSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.CHAT_SESSIONS);
      await AsyncStorage.removeItem(this.STORAGE_KEYS.SESSION_METADATA);
    } catch (error) {
      console.error('Error clearing all sessions:', error);
      throw new Error('Failed to clear sessions from storage');
    }
  }

  /**
   * Gets storage statistics
   */
  static async getStorageStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    oldestSession: number | null;
    newestSession: number | null;
    storageSize: number;
  }> {
    try {
      const sessions = await this.getAllSessions();
      const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
      
      const timestamps = sessions.map(s => s.createdAt);
      const oldestSession = timestamps.length > 0 ? Math.min(...timestamps) : null;
      const newestSession = timestamps.length > 0 ? Math.max(...timestamps) : null;

      // Estimate storage size (rough calculation)
      const dataString = JSON.stringify(sessions);
      const storageSize = new Blob([dataString]).size;

      return {
        totalSessions: sessions.length,
        totalMessages,
        oldestSession,
        newestSession,
        storageSize
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalSessions: 0,
        totalMessages: 0,
        oldestSession: null,
        newestSession: null,
        storageSize: 0
      };
    }
  }

  /**
   * Cleans up old sessions based on retention policy
   */
  static async cleanupOldSessions(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      const sessions = await this.getAllSessions();
      
      const activeSessions = sessions.filter(session => {
        const lastActivity = session.lastMessageAt || session.createdAt;
        return lastActivity > cutoffTime;
      });

      const removedCount = sessions.length - activeSessions.length;

      if (removedCount > 0) {
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.CHAT_SESSIONS,
          JSON.stringify(activeSessions)
        );

        // Update metadata
        const metadata = await this.getSessionMetadata();
        const activeMetadata = metadata.filter(m => 
          activeSessions.some(s => s.id === m.id)
        );
        
        await AsyncStorage.setItem(
          this.STORAGE_KEYS.SESSION_METADATA,
          JSON.stringify(activeMetadata)
        );

      }

      return removedCount;
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
      return 0;
    }
  }

  /**
   * Exports session data for backup
   */
  static async exportSessions(): Promise<string> {
    try {
      const sessions = await this.getAllSessions();
      const metadata = await this.getSessionMetadata();
      
      const exportData = {
        sessions,
        metadata,
        exportedAt: Date.now(),
        version: '1.0'
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting sessions:', error);
      throw new Error('Failed to export session data');
    }
  }

  /**
   * Imports session data from backup
   */
  static async importSessions(exportDataString: string): Promise<number> {
    try {
      const exportData = JSON.parse(exportDataString);
      
      if (!exportData.sessions || !Array.isArray(exportData.sessions)) {
        throw new Error('Invalid export data format');
      }

      // Merge with existing sessions (don't overwrite)
      const existingSessions = await this.getAllSessions();
      const newSessions = exportData.sessions.filter((importedSession: ChatSession) =>
        !existingSessions.some(existing => existing.id === importedSession.id)
      );

      const allSessions = [...existingSessions, ...newSessions];
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.CHAT_SESSIONS,
        JSON.stringify(allSessions)
      );

      return newSessions.length;
    } catch (error) {
      console.error('Error importing sessions:', error);
      throw new Error('Failed to import session data');
    }
  }
}