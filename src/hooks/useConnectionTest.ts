import { useState, useCallback } from 'react';
import ConnectionTestService, { TestResult, TestOptions } from '../services/ConnectionTestService';

export interface ProviderTestStatus {
  status: 'idle' | 'testing' | 'success' | 'failed';
  message?: string;
  model?: string;
  responseTime?: number;
}

export interface UseConnectionTestReturn {
  testStatuses: Record<string, ProviderTestStatus>;
  isTestingAny: boolean;
  testConnection: (providerId: string, apiKey: string, options?: TestOptions) => Promise<TestResult>;
  testMultipleProviders: (
    tests: Array<{ providerId: string; apiKey: string }>
  ) => Promise<Record<string, TestResult>>;
  resetTestStatus: (providerId: string) => void;
  resetAllTestStatuses: () => void;
  getTestRecommendation: (providerId: string) => string;
  isProviderSupported: (providerId: string) => boolean;
}

export const useConnectionTest = (): UseConnectionTestReturn => {
  const [testStatuses, setTestStatuses] = useState<Record<string, ProviderTestStatus>>({});

  /**
   * Check if any provider is currently being tested
   */
  const isTestingAny = Object.values(testStatuses).some(status => status.status === 'testing');

  /**
   * Test connection for a single provider
   */
  const testConnection = useCallback(async (
    providerId: string,
    apiKey: string,
    options: TestOptions = {}
  ): Promise<TestResult> => {
    if (!apiKey) {
      const result: TestResult = {
        success: false,
        message: 'No API key provided'
      };
      
      setTestStatuses(prev => ({
        ...prev,
        [providerId]: {
          status: 'failed',
          message: result.message
        }
      }));
      
      return result;
    }

    // Set testing status
    setTestStatuses(prev => ({
      ...prev,
      [providerId]: { status: 'testing' }
    }));

    try {
      const result = await ConnectionTestService.testProvider(providerId, apiKey, options);
      
      // Update status based on result
      setTestStatuses(prev => ({
        ...prev,
        [providerId]: {
          status: result.success ? 'success' : 'failed',
          message: result.message,
          model: result.model,
          responseTime: result.responseTime
        }
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      
      setTestStatuses(prev => ({
        ...prev,
        [providerId]: {
          status: 'failed',
          message: errorMessage
        }
      }));

      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  /**
   * Test multiple providers concurrently
   */
  const testMultipleProviders = useCallback(async (
    tests: Array<{ providerId: string; apiKey: string }>
  ): Promise<Record<string, TestResult>> => {
    // Set all to testing status
    const testingStatuses: Record<string, ProviderTestStatus> = {};
    tests.forEach(({ providerId }) => {
      testingStatuses[providerId] = { status: 'testing' };
    });
    
    setTestStatuses(prev => ({
      ...prev,
      ...testingStatuses
    }));

    try {
      const results = await ConnectionTestService.testMultipleProviders(tests);
      
      // Update all statuses based on results
      const updatedStatuses: Record<string, ProviderTestStatus> = {};
      Object.entries(results).forEach(([providerId, result]) => {
        updatedStatuses[providerId] = {
          status: result.success ? 'success' : 'failed',
          message: result.message,
          model: result.model,
          responseTime: result.responseTime
        };
      });
      
      setTestStatuses(prev => ({
        ...prev,
        ...updatedStatuses
      }));

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch testing failed';
      
      // Set all to failed status
      const failedStatuses: Record<string, ProviderTestStatus> = {};
      tests.forEach(({ providerId }) => {
        failedStatuses[providerId] = {
          status: 'failed',
          message: errorMessage
        };
      });
      
      setTestStatuses(prev => ({
        ...prev,
        ...failedStatuses
      }));

      throw error;
    }
  }, []);

  /**
   * Reset test status for a specific provider
   */
  const resetTestStatus = useCallback((providerId: string) => {
    setTestStatuses(prev => {
      const updated = { ...prev };
      delete updated[providerId];
      return updated;
    });
  }, []);

  /**
   * Reset all test statuses
   */
  const resetAllTestStatuses = useCallback(() => {
    setTestStatuses({});
  }, []);

  /**
   * Get test recommendation based on last result
   */
  const getTestRecommendation = useCallback((providerId: string): string => {
    const status = testStatuses[providerId];
    
    if (!status) {
      return 'Click test to verify your API key.';
    }

    if (status.status === 'testing') {
      return 'Testing connection...';
    }

    if (status.status === 'success') {
      return 'Connection successful! Your API key is working correctly.';
    }

    // For failed status, try to get recommendation from service
    const mockResult: TestResult = {
      success: false,
      message: status.message || 'Connection failed',
      error: { code: 'UNKNOWN_ERROR', message: status.message || 'Connection failed' }
    };

    return ConnectionTestService.getTestRecommendation(mockResult);
  }, [testStatuses]);

  /**
   * Check if provider supports testing
   */
  const isProviderSupported = useCallback((providerId: string): boolean => {
    return ConnectionTestService.isProviderSupported(providerId);
  }, []);

  return {
    testStatuses,
    isTestingAny,
    testConnection,
    testMultipleProviders,
    resetTestStatus,
    resetAllTestStatuses,
    getTestRecommendation,
    isProviderSupported,
  };
};