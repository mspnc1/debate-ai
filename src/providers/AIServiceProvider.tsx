import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { AIService } from '../services/aiAdapter';
import { RootState } from '../store';

interface AIServiceContextType {
  aiService: AIService | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  reinitialize: () => void;
}

const AIServiceContext = createContext<AIServiceContextType | undefined>(undefined);

interface AIServiceProviderProps {
  children: ReactNode;
}

export const AIServiceProvider: React.FC<AIServiceProviderProps> = ({ children }) => {
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys);

  const initializeService = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Small delay to ensure API keys are properly loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const service = new AIService(apiKeys || {});
      setAiService(service);
      setIsInitialized(true);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize AI service';
      setError(errorMessage);
      console.error('AI Service initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKeys]);

  const reinitialize = useCallback(() => {
    setIsInitialized(false);
    initializeService();
  }, [initializeService]);

  useEffect(() => {
    initializeService();
  }, [initializeService]);

  const contextValue: AIServiceContextType = {
    aiService,
    isInitialized,
    isLoading,
    error,
    reinitialize,
  };

  return (
    <AIServiceContext.Provider value={contextValue}>
      {children}
    </AIServiceContext.Provider>
  );
};

export const useAIService = (): AIServiceContextType => {
  const context = useContext(AIServiceContext);
  if (context === undefined) {
    throw new Error('useAIService must be used within an AIServiceProvider');
  }
  return context;
};