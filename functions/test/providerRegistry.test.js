const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { isV2Supported, ProviderRegistry } = require('../lib/providers/registry');
const {
  getDefaultModel,
  normalizeProviderTemperature,
  resolveProviderModelId,
} = require('../lib/modelRegistry');
const {
  getResolvedImageModel,
  resolveImageModelId,
} = require('../lib/imageModelRegistry');
const { ClaudeRuntime } = require('../lib/providers/claude/runtime');

describe('ProviderRegistry', () => {
  const removedProviderId = ['to', 'gether'].join('');

  it('rejects removed providers from the V2 runtime surface', () => {
    assert.equal(isV2Supported(removedProviderId), false);
    assert.equal(ProviderRegistry.getSupportedProviders().includes(removedProviderId), false);
    assert.throws(
      () => ProviderRegistry.get(removedProviderId),
      /not supported/
    );
  });
});

describe('modelRegistry', () => {
  it('aligns refreshed provider defaults and aliases', () => {
    assert.equal(resolveProviderModelId('claude', 'claude-fable-latest'), 'claude-fable-5');
    assert.equal(getDefaultModel('claude'), 'claude-sonnet-4-6');
    assert.equal(resolveProviderModelId('google', 'gemini-flash-latest'), 'gemini-flash-latest');
    assert.equal(getDefaultModel('grok'), 'grok-4.3');
    assert.equal(resolveProviderModelId('grok', 'grok-build-latest'), 'grok-build-0.1');
    assert.equal(getDefaultModel('cohere'), 'command-a-reasoning-08-2025');
  });

  it('omits temperature for Claude 5-family models while preserving other model normalization', () => {
    assert.equal(normalizeProviderTemperature('claude', 'claude-fable-5', 0.7), undefined);
    assert.equal(normalizeProviderTemperature('claude', 'claude-fable-latest', 0.7), undefined);
    assert.equal(normalizeProviderTemperature('claude', 'claude-sonnet-5', 0.7), undefined);
    assert.equal(normalizeProviderTemperature('claude', 'claude-sonnet-4-6', 0.7), 0.7);
    assert.equal(normalizeProviderTemperature('openai', 'gpt-5.5', 0.7), 1);
  });
});

describe('ClaudeRuntime', () => {
  it('builds Fable requests without the deprecated temperature field', () => {
    const runtime = new ClaudeRuntime();
    const built = runtime.buildRequest({
      model: 'claude-fable-5',
      messages: [{ role: 'user', content: 'Hello' }],
    }, 'test-key');

    assert.equal(Object.hasOwn(built.body, 'temperature'), false);
  });

  it('keeps temperature on non-Fable Claude requests', () => {
    const runtime = new ClaudeRuntime();
    const built = runtime.buildRequest({
      model: 'claude-sonnet-4-6',
      messages: [{ role: 'user', content: 'Hello' }],
    }, 'test-key');

    assert.equal(built.body.temperature, 0.7);
  });
});

describe('imageModelRegistry', () => {
  it('resolves refreshed Grok image quality model and legacy pro alias', () => {
    assert.equal(resolveImageModelId('grok', 'grok-imagine-image-quality'), 'grok-imagine-image-quality');
    assert.equal(resolveImageModelId('grok', 'grok-imagine-image-pro'), 'grok-imagine-image-quality');
    assert.equal(getResolvedImageModel('grok', 'grok-imagine-image-quality')?.displayName, 'Grok Imagine Quality');
  });
});
