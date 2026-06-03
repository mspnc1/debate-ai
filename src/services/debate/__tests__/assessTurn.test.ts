import { assessTurn, shortResponseWordFloor } from '../assessTurn';

const longSpeech = (
  'The proposition fundamentally misunderstands accountability. ' +
  'Cancel culture, properly understood, is communities withdrawing their support from people who have caused real harm. ' +
  'That is a feature of free association, not a bug, and the affirmative has not shown otherwise. ' +
  'They point to a handful of high-profile cases where a clumsy joke ended a career, but those examples are cherry-picked and unrepresentative. ' +
  'For every viral overreaction there are countless ordinary cases where public pressure simply forced an apology, a policy change, or a long-overdue reckoning. ' +
  'The motion asks us to treat criticism itself as the problem, and that is a standard no healthy democracy should accept.'
);

describe('assessTurn', () => {
  it('accepts a normal completed speech', () => {
    expect(assessTurn({ text: longSpeech, finishReason: 'stop', minWords: 180 })).toEqual({ ok: true });
  });

  it('accepts a speech with no finish reason (treated as a normal stop)', () => {
    expect(assessTurn({ text: longSpeech, minWords: 180 })).toEqual({ ok: true });
  });

  it('rejects an empty response', () => {
    expect(assessTurn({ text: '   ', finishReason: 'stop', minWords: 180 })).toEqual({
      ok: false,
      reason: 'empty',
    });
  });

  it('rejects a token-limit (length) finish even when the text is substantial', () => {
    expect(assessTurn({ text: longSpeech, finishReason: 'length', minWords: 180 })).toEqual({
      ok: false,
      reason: 'length',
    });
  });

  it('rejects a tiny fragment as too_short', () => {
    expect(assessTurn({ text: 'The most', finishReason: 'stop', minWords: 180 })).toEqual({
      ok: false,
      reason: 'too_short',
    });
  });

  it('treats a content_filter finish as blocked, ahead of any other check', () => {
    expect(assessTurn({ text: longSpeech, finishReason: 'content_filter', minWords: 180 })).toEqual({
      ok: false,
      reason: 'content_filter',
    });
    // Blocked even if the partial happens to be empty.
    expect(assessTurn({ text: '', finishReason: 'content_filter', minWords: 180 })).toEqual({
      ok: false,
      reason: 'content_filter',
    });
  });

  it('rejects synthetic error placeholders', () => {
    expect(
      assessTurn({ text: 'Claude had an error. Continuing...', finishReason: 'stop', minWords: 180, isSyntheticError: true })
    ).toEqual({ ok: false, reason: 'synthetic_error' });
  });

  it('does not false-fail a legitimately short cross-examination turn', () => {
    // Cross-exam answerer minWords ~50 -> floor ~10. A 12-word answer must pass.
    const shortAnswer = 'Yes, I accept that point but only under the narrow conditions described.';
    expect(shortResponseWordFloor(50)).toBe(10);
    expect(assessTurn({ text: shortAnswer, finishReason: 'stop', minWords: 50 })).toEqual({ ok: true });
  });

  it('keeps a sane absolute floor when minWords is tiny', () => {
    expect(shortResponseWordFloor(0)).toBe(6);
    expect(shortResponseWordFloor(10)).toBe(6);
  });
});
