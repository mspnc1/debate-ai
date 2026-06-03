// Debate-local sentence trimming. Kept here (not in a generic utils file) because both callers are
// debate-specific: bounding generated audio to the TTS character budget (DebateVoiceService) and
// cleaning a token-truncated partial for the retry card / TTS (DebateTurnRunner).

// A sentence terminator, optionally followed by closing quotes/brackets, at a real boundary
// (whitespace or end-of-string). Matches '.', '!', '?', and the ellipsis character.
const SENTENCE_END = /[.!?…]['")\]]*(?=\s|$)/g;
const ENDS_WITH_SENTENCE = /[.!?…]['")\]]*$/;

/**
 * Returns `text` cut back to its last COMPLETE sentence, dropping any trailing partial fragment.
 * If the text already ends on a sentence boundary it is returned unchanged (minus trailing space).
 * If no sentence boundary exists at all, the original text is returned unchanged (nothing to trim).
 */
export function trimToLastCompleteSentence(text: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed) return text;

  const re = new RegExp(SENTENCE_END.source, 'g');
  let lastEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = re.exec(trimmed)) !== null) {
    lastEnd = match.index + match[0].length;
  }

  if (lastEnd <= 0) return text; // no sentence boundary — leave as-is
  return trimmed.slice(0, lastEnd).trimEnd();
}

/**
 * Returns `text` shortened to at most `maxChars`, preferring to end on a complete sentence.
 * Falls back to the last word boundary within budget when no sentence boundary fits. The result is
 * always `<= maxChars`. Used to bound generated audio length on COMPLETED speech text.
 */
export function trimToSentenceWithinBudget(text: string, maxChars: number): string {
  if (maxChars <= 0) return '';
  if (text.length <= maxChars) return text;

  const slice = text.slice(0, maxChars);
  const atSentence = trimToLastCompleteSentence(slice).trimEnd();
  if (atSentence.length > 0 && ENDS_WITH_SENTENCE.test(atSentence)) {
    return atSentence;
  }

  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd();
}
