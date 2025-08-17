/**
 * ConnectionTestService - API connection testing logic
 * Extracted from APIConfigScreen for better separation of concerns
 */

import { getDefaultModel } from '../config/providers/modelRegistry';

export interface TestResult {
  success: boolean;
  message: string;
  model?: string;
  responseTime?: number;
  error?: TestError;
}

export interface TestError {
  code: string;
  message: string;
  statusCode?: number;
}

export interface TestOptions {
  timeout?: number;
  mockMode?: boolean;
  retries?: number;
}

export class ConnectionTestService {
  private static instance: ConnectionTestService;
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly DEFAULT_RETRIES = 1;

  static getInstance(): ConnectionTestService {
    if (!ConnectionTestService.instance) {
      ConnectionTestService.instance = new ConnectionTestService();
    }
    return ConnectionTestService.instance;
  }

  /**
   * Test API connection for a specific provider
   * Currently implements mock testing, ready for real API integration
   */
  async testProvider(
    providerId: string,
    apiKey: string,
    options: TestOptions = {}
  ): Promise<TestResult> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      mockMode = true, // Default to mock mode for development
      retries = this.DEFAULT_RETRIES
    } = options;

    if (!apiKey || apiKey.trim().length === 0) {
      return this.createErrorResult('INVALID_KEY', 'No API key provided');
    }

    // Basic validation
    const validationResult = this.validateApiKey(providerId, apiKey);
    if (!validationResult.success) {
      return validationResult;
    }

    let lastError: TestError | undefined;

    // Retry logic
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (mockMode) {
          return await this.mockTest(providerId, apiKey, timeout);
        } else {
          return await this.realTest(providerId, apiKey, timeout);
        }
      } catch (error) {
        lastError = this.parseError(error);
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(lastError)) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    return this.createErrorResult(
      lastError?.code || 'CONNECTION_FAILED',
      lastError?.message || 'Connection failed after retries'
    );
  }

  /**
   * Mock test implementation for development
   */
  private async mockTest(
    providerId: string,
    apiKey: string,
    timeout: number
  ): Promise<TestResult> {
    // Simulate network delay
    await this.delay(Math.min(1500, timeout / 2));

    // Simulate success/failure based on key length (for demo purposes)
    const success = apiKey.length > 10;

    if (success) {
      return {
        success: true,
        message: 'Verified just now',
        model: this.getMockModel(providerId),
        responseTime: 1200 + Math.random() * 800 // 1.2-2.0 seconds
      };
    } else {
      return this.createErrorResult('INVALID_KEY', 'Invalid API key');
    }
  }

  /**
   * Real API test implementation (to be implemented when ready)
   */
  private async realTest(
    providerId: string,
    apiKey: string,
    timeout: number
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      // Create API test promise based on provider
      const testPromise = this.performProviderSpecificTest(providerId, apiKey);

      // Race between test and timeout
      const result = await Promise.race([testPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;

      return {
        success: true,
        message: 'Connection successful',
        model: result.model,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const testError = this.parseError(error);

      return {
        success: false,
        message: testError.message,
        responseTime,
        error: testError
      };
    }
  }

  /**
   * Perform provider-specific API tests
   */
  private async performProviderSpecificTest(
    providerId: string,
    apiKey: string
  ): Promise<{ model: string }> {
    switch (providerId) {
      case 'openai':
        return await this.testOpenAI(apiKey);
      
      case 'claude':
        return await this.testClaude(apiKey);
      
      case 'google':
        return await this.testGoogle(apiKey);
      
      default:
        throw new Error(`Provider ${providerId} testing not implemented`);
    }
  }

  /**
   * Test OpenAI API
   */
  private async testOpenAI(_apiKey: string): Promise<{ model: string }> {
    // TODO: Implement actual OpenAI API test
    // const response = await fetch('https://api.openai.com/v1/models', {
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //   },
    // });
    
    // For now, return mock data
    return { model: 'gpt-4-turbo' };
  }

  /**
   * Test Claude API
   */
  private async testClaude(_apiKey: string): Promise<{ model: string }> {
    // TODO: Implement actual Claude API test
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'x-api-key': apiKey,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'claude-3-haiku-20240307',
    //     max_tokens: 1,
    //     messages: [{ role: 'user', content: 'test' }]
    //   }),
    // });
    
    // For now, return mock data
    return { model: getDefaultModel('claude') };
  }

  /**
   * Test Google API
   */
  private async testGoogle(_apiKey: string): Promise<{ model: string }> {
    // TODO: Implement actual Google API test
    // const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    
    // For now, return mock data
    return { model: getDefaultModel('google') };
  }

  /**
   * Validate API key format
   */
  private validateApiKey(providerId: string, apiKey: string): TestResult {
    if (!apiKey || apiKey.trim().length === 0) {
      return this.createErrorResult('EMPTY_KEY', 'API key is empty');
    }

    if (apiKey.length < 10) {
      return this.createErrorResult('INVALID_KEY', 'API key too short');
    }

    // Provider-specific validation
    switch (providerId) {
      case 'openai':
        if (!apiKey.startsWith('sk-')) {
          return this.createErrorResult(
            'INVALID_FORMAT',
            'OpenAI API keys should start with "sk-"'
          );
        }
        break;
      
      case 'claude':
        if (apiKey.length < 40) {
          return this.createErrorResult(
            'INVALID_FORMAT',
            'Claude API key appears to be too short'
          );
        }
        break;
      
      case 'google':
        if (apiKey.length < 20) {
          return this.createErrorResult(
            'INVALID_FORMAT',
            'Google API key appears to be too short'
          );
        }
        break;
    }

    return { success: true, message: 'Key format valid' };
  }

  /**
   * Get mock model name for testing
   */
  private getMockModel(providerId: string): string {
    // Return the actual default model for the provider
    return getDefaultModel(providerId) || 'unknown-model';
  }

  /**
   * Create error result object
   */
  private createErrorResult(code: string, message: string): TestResult {
    return {
      success: false,
      message,
      error: { code, message }
    };
  }

  /**
   * Parse error from caught exception
   */
  private parseError(error: unknown): TestError {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return { code: 'TIMEOUT', message: 'Request timed out' };
      }
      
      if (error.message.includes('network')) {
        return { code: 'NETWORK_ERROR', message: 'Network connection failed' };
      }
      
      return { code: 'UNKNOWN_ERROR', message: error.message };
    }

    return { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
  }

  /**
   * Check if error should not be retried
   */
  private shouldNotRetry(error: TestError): boolean {
    const noRetryErrors = ['INVALID_KEY', 'INVALID_FORMAT', 'UNAUTHORIZED'];
    return noRetryErrors.includes(error.code);
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test multiple providers concurrently
   */
  async testMultipleProviders(
    tests: Array<{ providerId: string; apiKey: string }>,
    options: TestOptions = {}
  ): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};

    const promises = tests.map(async ({ providerId, apiKey }) => {
      const result = await this.testProvider(providerId, apiKey, options);
      results[providerId] = result;
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Get test recommendations based on error
   */
  getTestRecommendation(result: TestResult): string {
    if (result.success) {
      return 'Connection successful! Your API key is working correctly.';
    }

    switch (result.error?.code) {
      case 'INVALID_KEY':
        return 'Please check your API key format and ensure it\'s correct.';
      
      case 'UNAUTHORIZED':
        return 'API key appears to be invalid or expired. Please check your provider dashboard.';
      
      case 'TIMEOUT':
        return 'Connection timed out. Please check your internet connection and try again.';
      
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection.';
      
      default:
        return 'Connection failed. Please verify your API key and try again.';
    }
  }

  /**
   * Check if provider supports testing
   */
  isProviderSupported(providerId: string): boolean {
    const supportedProviders = ['openai', 'claude', 'google'];
    return supportedProviders.includes(providerId);
  }
}

export default ConnectionTestService.getInstance();