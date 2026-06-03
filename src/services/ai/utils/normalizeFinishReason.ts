import type { StreamFinishReason } from '../types/adapter.types';

/**
 * Maps a provider's native finish/stop reason string onto the canonical {@link StreamFinishReason}.
 *
 * Handles both the OpenAI vocabulary (`stop` / `length` / `content_filter` / `tool_calls`) and the
 * Cohere v2 vocabulary (`COMPLETE` / `MAX_TOKENS` / `STOP_SEQUENCE` / `ERROR*` / `*CANCEL`). Matching
 * is case-insensitive and substring-based so minor provider variations still resolve correctly.
 *
 * Returns `undefined` when there is no reason to classify (e.g. an empty/absent value), so callers can
 * distinguish "stream still open" from a known terminal state. An unknown but present reason defaults
 * to `'stop'` (treat as a normal completion rather than a failure).
 */
export function normalizeFinishReason(
  raw: string | null | undefined
): StreamFinishReason | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const r = String(raw).toLowerCase();

  if (r.includes('max_tokens') || r.includes('max-tokens') || r === 'length' || r.includes('token_limit')) {
    return 'length';
  }
  if ((r.includes('content') && (r.includes('filter') || r.includes('block'))) || r.includes('toxic') || r.includes('safety')) {
    return 'content_filter';
  }
  if (r.includes('cancel') || r.includes('abort')) {
    return 'aborted';
  }
  if (r.includes('error')) {
    return 'error';
  }
  // 'stop', 'complete', 'stop_sequence', 'end_turn', 'tool_calls', 'function_call', etc.
  return 'stop';
}
