import {
  API_KEY_PROVIDER_IDS,
  getAPIKeyProviderId,
  isAPIKeyProviderId,
  validateAPIKeyProvider,
} from '@/utils/typeGuards';

describe('provider type guards', () => {
  const removedProviderId = ['to', 'gether'].join('');

  it('keeps removed providers out of API-key validation', () => {
    expect(API_KEY_PROVIDER_IDS).not.toContain(removedProviderId);
    expect(isAPIKeyProviderId(removedProviderId)).toBe(false);
    expect(getAPIKeyProviderId(removedProviderId)).toBeNull();
    expect(() => validateAPIKeyProvider(removedProviderId)).toThrow('Invalid API key provider ID');
  });
});
