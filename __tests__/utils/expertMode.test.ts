import { getExpertOverrides } from '@/utils/expertMode';

describe('getExpertOverrides', () => {
  it('returns disabled overrides when provider config is missing', () => {
    expect(getExpertOverrides({}, 'openai')).toEqual({ enabled: false });
  });

  it('returns the saved default model even when expert mode is disabled', () => {
    const overrides = getExpertOverrides(
      { openai: { enabled: false, selectedModel: 'gpt-4.1-mini' } },
      'openai'
    );

    expect(overrides.enabled).toBe(false);
    expect(overrides.model).toBe('gpt-4.1-mini');
    expect(overrides.parameters).toBeUndefined();
  });

  it('merges custom parameters when expert mode is enabled', () => {
    const overrides = getExpertOverrides(
      {
        openai: {
          enabled: true,
          selectedModel: 'gpt-4.1-mini',
          parameters: { temperature: 0.8 },
        },
      },
      'openai'
    );

    expect(overrides.enabled).toBe(true);
    expect(overrides.model).toBe('gpt-4.1-mini');
    expect(overrides.parameters).toEqual(expect.objectContaining({ temperature: 0.8 }));
  });
});
