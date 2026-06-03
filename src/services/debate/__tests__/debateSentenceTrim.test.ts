import { trimToLastCompleteSentence, trimToSentenceWithinBudget } from '../debateSentenceTrim';

describe('trimToLastCompleteSentence', () => {
  it('drops a trailing incomplete fragment', () => {
    const input = 'These examples are cherry-picked. For every high-profile';
    expect(trimToLastCompleteSentence(input)).toBe('These examples are cherry-picked.');
  });

  it('leaves a complete sentence unchanged', () => {
    const input = 'The motion fails. The evidence is clear.';
    expect(trimToLastCompleteSentence(input)).toBe('The motion fails. The evidence is clear.');
  });

  it('returns the original when there is no sentence boundary', () => {
    const input = 'an unfinished thought with no terminator';
    expect(trimToLastCompleteSentence(input)).toBe(input);
  });

  it('handles question and exclamation terminators and trailing quotes', () => {
    expect(trimToLastCompleteSentence('Is that fair? Of cou')).toBe('Is that fair?');
    expect(trimToLastCompleteSentence('"Absolutely!" she said. And then he star')).toBe('"Absolutely!" she said.');
  });
});

describe('trimToSentenceWithinBudget', () => {
  it('returns text unchanged when within budget', () => {
    expect(trimToSentenceWithinBudget('Short and sweet.', 100)).toBe('Short and sweet.');
  });

  it('trims to the last full sentence within the budget', () => {
    const input = 'One. Two. Three. Four.';
    // Budget 9 chars -> "One. Two." fits (9 chars), "Three" would overflow.
    expect(trimToSentenceWithinBudget(input, 9)).toBe('One. Two.');
  });

  it('falls back to a word boundary when no sentence fits in the budget', () => {
    const input = 'this is one very long run-on clause without any terminator at all';
    const out = trimToSentenceWithinBudget(input, 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(input.startsWith(out)).toBe(true);
    expect(out.endsWith(' ')).toBe(false);
  });
});
