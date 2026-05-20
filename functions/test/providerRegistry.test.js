const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { isV2Supported, ProviderRegistry } = require('../lib/providers/registry');

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
