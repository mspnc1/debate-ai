import { normalizeFinishReason } from '../normalizeFinishReason';

describe('normalizeFinishReason', () => {
  it('returns undefined for empty/absent values', () => {
    expect(normalizeFinishReason(undefined)).toBeUndefined();
    expect(normalizeFinishReason(null)).toBeUndefined();
    expect(normalizeFinishReason('')).toBeUndefined();
  });

  it('maps token-limit reasons across providers to length', () => {
    expect(normalizeFinishReason('length')).toBe('length');          // OpenAI chat
    expect(normalizeFinishReason('max_tokens')).toBe('length');      // Claude
    expect(normalizeFinishReason('MAX_TOKENS')).toBe('length');      // Cohere / Gemini
    expect(normalizeFinishReason('max_output_tokens')).toBe('length'); // OpenAI Responses
  });

  it('maps safety/content blocks to content_filter', () => {
    expect(normalizeFinishReason('content_filter')).toBe('content_filter'); // OpenAI
    expect(normalizeFinishReason('SAFETY')).toBe('content_filter');         // Gemini
    expect(normalizeFinishReason('RECITATION')).toBe('content_filter');     // Gemini
    expect(normalizeFinishReason('PROHIBITED_CONTENT')).toBe('content_filter');
    expect(normalizeFinishReason('ERROR_TOXIC')).toBe('content_filter');    // Cohere
    expect(normalizeFinishReason('refusal')).toBe('content_filter');        // Claude
  });

  it('maps provider-interrupted reasons to error (not silently stop)', () => {
    expect(normalizeFinishReason('ERROR')).toBe('error');                       // Cohere
    expect(normalizeFinishReason('insufficient_system_resource')).toBe('error'); // DeepSeek
  });

  it('maps cancellation to aborted', () => {
    expect(normalizeFinishReason('USER_CANCEL')).toBe('aborted');
    expect(normalizeFinishReason('aborted')).toBe('aborted');
  });

  it('treats normal completions (and unknowns) as stop', () => {
    expect(normalizeFinishReason('stop')).toBe('stop');
    expect(normalizeFinishReason('COMPLETE')).toBe('stop');     // Cohere
    expect(normalizeFinishReason('STOP')).toBe('stop');         // Gemini
    expect(normalizeFinishReason('end_turn')).toBe('stop');     // Claude
    expect(normalizeFinishReason('tool_calls')).toBe('stop');
    expect(normalizeFinishReason('OTHER')).toBe('stop');        // Gemini
  });
});
