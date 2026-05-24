import { sanitizeDebateSpeechForTTS } from '@/services/debate/debateAudioSanitizer';

describe('sanitizeDebateSpeechForTTS', () => {
  it('preserves normal prose', () => {
    expect(sanitizeDebateSpeechForTTS('This is a clear opening argument.')).toBe('This is a clear opening argument.');
  });

  it('strips markdown while preserving link text', () => {
    expect(sanitizeDebateSpeechForTTS('**Bold claim** with [evidence](https://example.com) and `inline code`.'))
      .toBe('Bold claim with evidence and inline code.');
  });

  it('removes citation markers and raw urls', () => {
    expect(sanitizeDebateSpeechForTTS('This evidence matters [1]. See https://example.com/report for details.'))
      .toBe('This evidence matters. See for details.');
  });

  it('removes citation-only source sections', () => {
    const input = [
      'The central question is whether the policy works.',
      '',
      'Sources:',
      '1. https://example.com/source',
      '- https://example.com/another',
    ].join('\n');

    expect(sanitizeDebateSpeechForTTS(input)).toBe('The central question is whether the policy works.');
  });

  it('strips fenced code blocks and list markers', () => {
    const input = [
      'Here is my case:',
      '- First, incentives matter.',
      '```ts',
      'const source = 1;',
      '```',
      '2. Second, enforcement matters.',
    ].join('\n');

    expect(sanitizeDebateSpeechForTTS(input)).toBe('Here is my case:\nFirst, incentives matter.\nSecond, enforcement matters.');
  });
});
