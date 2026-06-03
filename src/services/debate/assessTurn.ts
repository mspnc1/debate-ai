import type { StreamFinishReason } from '@/services/ai/types/adapter.types';

/**
 * The single definition of "is this a usable debate speech?".
 *
 * Pure and side-effect free so it can be unit tested and reused by both the streaming and
 * non-streaming generation paths in {@link DebateTurnRunner}. The order of checks encodes the policy
 * from the plan: a content block is terminal, an empty/garbage turn fails, and a token-limit finish
 * means the model did NOT finish (so it is not a valid speech even if substantial).
 */
export type TurnFailureReason = 'empty' | 'too_short' | 'length' | 'content_filter' | 'synthetic_error';

export type TurnAssessment = { ok: true } | { ok: false; reason: TurnFailureReason };

export interface AssessTurnInput {
  /** The normalized answer text (after ensureAnswerContent). */
  text: string;
  /** Canonical finish reason surfaced by the adapter, if known. */
  finishReason?: StreamFinishReason;
  /** The phase minimum word count (used for the conservative short-fragment floor). */
  minWords: number;
  /** Whether the text is one of the app's synthetic "had an error" placeholders. */
  isSyntheticError?: boolean;
}

/**
 * Conservative floor below which a response is treated as a garbage fragment (e.g. "The most").
 * Deliberately a small fraction of the phase minimum so legitimately short cross-examination /
 * audience-question turns (which carry smaller minWords) are not false-failed.
 */
export function shortResponseWordFloor(minWords: number): number {
  return Math.max(6, Math.round((minWords || 0) * 0.2));
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function assessTurn(input: AssessTurnInput): TurnAssessment {
  const { text, finishReason, minWords, isSyntheticError } = input;
  const content = (text ?? '').trim();

  // A safety/content block is terminal regardless of any partial text.
  if (finishReason === 'content_filter') {
    return { ok: false, reason: 'content_filter' };
  }

  if (content.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  if (isSyntheticError) {
    return { ok: false, reason: 'synthetic_error' };
  }

  // A token-limit finish means the model was cut off — an unfinished turn, not a valid speech.
  if (finishReason === 'length') {
    return { ok: false, reason: 'length' };
  }

  if (countWords(content) < shortResponseWordFloor(minWords)) {
    return { ok: false, reason: 'too_short' };
  }

  return { ok: true };
}
