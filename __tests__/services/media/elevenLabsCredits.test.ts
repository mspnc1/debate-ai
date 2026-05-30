import {
  estimateElevenLabsTtsCreditCost,
  formatElevenLabsCreditSummary,
  getElevenLabsCreditCheck,
  parseElevenLabsSubscription,
} from '@/services/media/elevenLabsCredits';
import {
  ELEVENLABS_DEFAULT_TTS_MODEL,
  ELEVENLABS_MULTILINGUAL_TTS_MODEL,
} from '@/config/mediaProviders';
import { sanitizeDebateSpeechForTTS } from '@/services/debate/debateAudioSanitizer';

describe('elevenLabsCredits', () => {
  it('estimates Flash and Turbo-style TTS at half of Multilingual credit cost', () => {
    expect(ELEVENLABS_DEFAULT_TTS_MODEL).toBe('eleven_flash_v2_5');
    expect(estimateElevenLabsTtsCreditCost('1234567890', ELEVENLABS_DEFAULT_TTS_MODEL)).toBe(5);
    expect(estimateElevenLabsTtsCreditCost('1234567890', ELEVENLABS_MULTILINGUAL_TTS_MODEL)).toBe(10);
  });

  it('estimates from the exact sanitized debate speech text', () => {
    const sanitized = sanitizeDebateSpeechForTTS('A [strong claim](https://example.com). [1]\n\nSources:\n- https://example.com');

    expect(sanitized).toBe('A strong claim.');
    expect(estimateElevenLabsTtsCreditCost(sanitized, ELEVENLABS_DEFAULT_TTS_MODEL)).toBe(8);
  });

  it('parses remaining credits, overage state, and reset date', () => {
    const subscription = parseElevenLabsSubscription({
      tier: 'creator',
      status: 'active',
      character_count: 900,
      character_limit: 1000,
      max_credit_limit_extension: 250,
      can_extend_character_limit: true,
      allowed_to_extend_character_limit: true,
      next_character_count_reset_unix: 1704067200,
      billing_period: 'monthly_period',
    });

    expect(subscription).toMatchObject({
      tier: 'creator',
      status: 'active',
      characterCount: 900,
      characterLimit: 1000,
      remainingCredits: 100,
      overageAllowed: true,
      resetDateLabel: 'Jan 1, 2024',
      billingPeriod: 'monthly_period',
    });
  });

  it('formats credit visibility with used, remaining, reset, and overage status', () => {
    const subscription = parseElevenLabsSubscription({
      character_count: 970,
      character_limit: 1000,
      max_credit_limit_extension: 0,
      can_extend_character_limit: true,
      next_character_count_reset_unix: 1704067200,
    });

    expect(formatElevenLabsCreditSummary(subscription)).toBe(
      'ElevenLabs credits: 30 remaining (970 / 1,000 used) • resets Jan 1, 2024 • overage off'
    );
  });

  it('blocks low-credit checks only when overage is disabled', () => {
    const blocked = getElevenLabsCreditCheck('1234567890', ELEVENLABS_MULTILINGUAL_TTS_MODEL, {
      characterCount: 995,
      characterLimit: 1000,
      remainingCredits: 5,
      overageAllowed: false,
    });
    const overageWarn = getElevenLabsCreditCheck('1234567890', ELEVENLABS_MULTILINGUAL_TTS_MODEL, {
      characterCount: 995,
      characterLimit: 1000,
      remainingCredits: 5,
      overageAllowed: true,
    });

    expect(blocked).toMatchObject({
      estimatedCost: 10,
      willExceedRemaining: true,
      shouldBlock: true,
      shouldWarn: false,
    });
    expect(overageWarn).toMatchObject({
      estimatedCost: 10,
      willExceedRemaining: true,
      shouldBlock: false,
      shouldWarn: true,
    });
    expect(overageWarn.message).toContain('overage is enabled');
  });
});
