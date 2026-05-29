import {
  classifyProviderRetry,
  isConfiguredProviderModel,
  withProviderRetry,
} from '@/services/retry/ProviderRetryService';

describe('ProviderRetryService', () => {
  it('treats configured Gemini invalid-model errors as retryable once', () => {
    const decision = classifyProviderRetry(
      new Error('Gemini error (400): invalid model name'),
      { provider: 'google', model: 'gemini-3.5-flash' }
    );

    expect(decision).toEqual(expect.objectContaining({
      retryable: true,
      reason: 'invalid_model',
    }));
  });

  it('does not retry invalid-model errors for unknown local models', () => {
    const decision = classifyProviderRetry(
      new Error('Gemini error (400): invalid model name'),
      { provider: 'google', model: 'gemini-made-up-model' }
    );

    expect(decision.retryable).toBe(false);
  });

  it('recognizes Gemini aliases as configured local models', () => {
    expect(isConfiguredProviderModel('google', 'gemini-3.1-flash-lite-preview')).toBe(true);
  });

  it('does not retry authentication errors', () => {
    const decision = classifyProviderRetry(
      new Error('Invalid API key'),
      { provider: 'google', model: 'gemini-3.5-flash' }
    );

    expect(decision.retryable).toBe(false);
  });

  it('retries transient operations and stops after success', async () => {
    let calls = 0;

    const result = await withProviderRetry(
      async () => {
        calls++;
        if (calls === 1) {
          throw new Error('service unavailable');
        }
        return 'ok';
      },
      {
        provider: 'google',
        model: 'gemini-3.5-flash',
        operation: 'unit_test',
        baseDelayMs: 0,
      }
    );

    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });
});
