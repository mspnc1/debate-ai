const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { buildAppleCallbackRedirect } = require('../lib/appleAuthCallback');

describe('buildAppleCallbackRedirect', () => {
  it('places callback payload in the URL fragment', () => {
    const params = new URLSearchParams();
    params.set('id_token', 'apple-id-token');
    params.set('state', 'expected-state');

    const redirect = buildAppleCallbackRedirect(params);

    assert.equal(
      redirect,
      'https://symposiumai.app/auth/apple/callback/#id_token=apple-id-token&state=expected-state'
    );
    assert.equal(new URL(redirect).search, '');
    assert.equal(new URL(redirect).hash, '#id_token=apple-id-token&state=expected-state');
  });

  it('returns the base callback URL when there is no payload', () => {
    assert.equal(
      buildAppleCallbackRedirect(new URLSearchParams()),
      'https://symposiumai.app/auth/apple/callback/'
    );
  });
});
