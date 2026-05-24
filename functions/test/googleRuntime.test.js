const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { GoogleRuntime } = require('../lib/providers/google/runtime');
const { getGeminiThinkingConfig } = require('../lib/providers/google/thinking');

describe('GoogleRuntime thinking controls', () => {
  it('uses minimal thinking for tight Gemini 3 Flash output caps', () => {
    const runtime = new GoogleRuntime();
    const request = runtime.buildRequest(
      {
        model: 'gemini-3.5-flash',
        messages: [{ role: 'user', content: 'Keep this short.' }],
        maxTokens: 512,
        temperature: 0.4,
      },
      'test-key'
    );

    assert.deepEqual(request.body.generationConfig, {
      temperature: 0.4,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingLevel: 'minimal' },
    });
  });

  it('uses low thinking for tight Gemini 3 Pro output caps', () => {
    assert.deepEqual(
      getGeminiThinkingConfig('gemini-3.1-pro-preview', 512),
      { thinkingLevel: 'low' }
    );
  });

  it('disables Gemini 2.5 Flash thinking for tight output caps', () => {
    assert.deepEqual(
      getGeminiThinkingConfig('gemini-2.5-flash', 512),
      { thinkingBudget: 0 }
    );
  });

  it('keeps default dynamic thinking when no tight output cap is set', () => {
    const runtime = new GoogleRuntime();
    const request = runtime.buildRequest(
      {
        model: 'gemini-3.5-flash',
        messages: [{ role: 'user', content: 'Think deeply.' }],
        temperature: 0.7,
      },
      'test-key'
    );

    assert.deepEqual(request.body.generationConfig, {
      temperature: 0.7,
      maxOutputTokens: 8192,
    });
  });
});
