/**
 * DebateTurnRunner
 *
 * The single entry point for generating ONE debate speech. It owns the messy parts that used to be
 * inlined and duplicated across DebateOrchestrator.executeDebateMessage: streaming vs non-streaming,
 * the one retry policy, finish-reason capture, content normalization, and turn assessment. It returns
 * a single discriminated {@link DebateTurnResult} so the orchestrator only has to decide
 * "completed -> advance" or "failed -> retry card / blocked".
 *
 * Retry policy (see also the plan + assessTurn):
 *  - transient provider errors -> auto provider-retry (withProviderRetry) and one non-streaming fallback
 *  - empty / too-short / synthetic-error -> one non-streaming fallback, then a user retry card
 *  - length (token-limit) -> NO fallback (same cap re-truncates); paused user retry card
 *  - content_filter -> NO fallback (re-filters); paused, blocked state
 */
import type { AIProvider, Citation, Message, ModelParameters, PersonalityConfig } from '../../types';
import type { BaseAdapter } from '../ai/base/BaseAdapter';
import type { AIService } from '../aiAdapter';
import type { StreamFinishReason } from '../ai/types/adapter.types';
import type { StreamStopReason } from '../streaming/StreamingService';
import { getStreamingService, isStreamInterruptedError } from '../streaming/StreamingService';
import { classifyProviderRetry, withProviderRetry } from '../retry/ProviderRetryService';
import { ensureAnswerContent } from '@/utils/citationUtils';
import { store } from '../../store';
import { setProviderVerificationError } from '../../store/streamingSlice';
import { assessTurn, type TurnFailureReason } from './assessTurn';
import { trimToLastCompleteSentence } from './debateSentenceTrim';

export interface DebateTurnRequest {
  adapter?: BaseAdapter;
  aiService: AIService;
  provider: AIProvider;
  /** Provider key used for the streaming verification-error flag (usually === provider). */
  providerId: string;
  model: string;
  aiName: string;
  prompt: string;
  history: Message[];
  personalityConfig?: PersonalityConfig;
  parameters?: Partial<ModelParameters>;
  /** Phase minimum word count, for the conservative short-fragment floor. */
  minWords: number;
  /** Whether to stream this turn (adapter present + provider/global streaming allowed). */
  useStreaming: boolean;
  /** Pre-allocated message id so the orchestrator's placeholder and the stream share an id. */
  messageId: string;
  isSyntheticError: (content: string) => boolean;
  /** Forwards streamed text chunks for live display. */
  onChunk?: (chunk: string) => void;
  /** Forwards non-finish provider events (e.g. citations) upward. */
  onProviderEvent?: (event: unknown) => void;
  /**
   * Called when the streaming attempt itself errored / interrupted / produced unusable content,
   * BEFORE any non-streaming fallback. Lets the orchestrator surface a `stream_error` event even when
   * the turn later recovers via fallback. Not called for length/content_filter (those are rendered as
   * paused turns, not streaming errors).
   */
  onStreamError?: (errorMessage: string) => void;
}

export type DebateTurnFailureReason =
  | 'length'
  | 'too_short'
  | 'empty'
  | 'content_filter'
  | 'provider_error'
  | 'interrupted'
  | 'cancelled';

export interface DebateTurnCompleted {
  status: 'completed';
  text: string;
  citations?: Citation[];
  modelUsed?: string;
  finishReason: StreamFinishReason;
  streamed: boolean;
}

export interface DebateTurnFailed {
  status: 'failed';
  reason: DebateTurnFailureReason;
  /** Internal detail for lifecycle.reason / logging (not necessarily user-facing). */
  detail: string;
  /** Cleaned partial text to show on the retry card (already sentence-trimmed for length). */
  partialText: string;
  retryable: boolean;
  /** True for content-filter blocks. */
  blocked: boolean;
  streamed: boolean;
}

export type DebateTurnResult = DebateTurnCompleted | DebateTurnFailed;

export class DebateTurnRunner {
  async generateTurn(req: DebateTurnRequest): Promise<DebateTurnResult> {
    // The ONLY place a debate turn's effective parameters are applied to the adapter. The effective
    // ceiling (incl. the Expert-Mode safety clamp) is computed upstream via applyDebateOutputTokenCap.
    if (req.adapter && req.parameters) {
      try { req.adapter.config.parameters = req.parameters; } catch { /* ignore */ }
    }

    if (req.useStreaming && req.adapter) {
      return this.runStreaming(req);
    }
    return this.runNonStreaming(req);
  }

  private async runStreaming(req: DebateTurnRequest): Promise<DebateTurnResult> {
    const streaming = getStreamingService();

    let streamedContent = '';
    let completeText: string | null = null;
    let citations: Citation[] | undefined;
    let finishReason: StreamFinishReason | undefined;
    let streamFailed = false;
    let streamErrorMessage = '';
    let interrupted: StreamStopReason | null = null;

    await streaming.streamResponse(
      {
        messageId: req.messageId,
        adapter: req.adapter,
        message: req.prompt,
        conversationHistory: req.history,
        modelOverride: req.model,
      },
      (chunk: string) => {
        streamedContent += chunk;
        req.onChunk?.(chunk);
      },
      (text: string) => {
        completeText = text;
      },
      (err: Error) => {
        streamFailed = true;
        streamErrorMessage = err?.message || '';
        if (isStreamInterruptedError(err)) {
          interrupted = err.reason;
        }
      },
      (event: unknown) => {
        const e = event as Record<string, unknown>;
        const type = String(e?.type || '');
        if (type === 'finish') {
          finishReason = (e as { reason?: StreamFinishReason }).reason;
          return;
        }
        if (type === 'citations') {
          const c = (e as { citations?: Citation[] }).citations;
          if (c && c.length > 0) citations = c;
        }
        req.onProviderEvent?.(event);
      }
    );

    if (interrupted !== null) {
      const stopReason: StreamStopReason = interrupted;
      req.onStreamError?.(streamErrorMessage || 'Stream interrupted');
      return {
        status: 'failed',
        reason: stopReason === 'cancelled' ? 'cancelled' : 'interrupted',
        detail: streamErrorMessage || 'Stream interrupted',
        partialText: streamedContent.trim(),
        retryable: true,
        blocked: false,
        streamed: true,
      };
    }

    if (streamFailed) {
      req.onStreamError?.(streamErrorMessage || 'Streaming failed');
      return this.recoverFromStreamError(req, streamErrorMessage, streamedContent);
    }

    const normalized = ensureAnswerContent(completeText ?? '', citations, req.aiName);
    const assessment = assessTurn({
      text: normalized.content,
      finishReason,
      minWords: req.minWords,
      isSyntheticError: req.isSyntheticError(normalized.content),
    });

    if (assessment.ok) {
      return {
        status: 'completed',
        text: normalized.content,
        citations: normalized.citations,
        modelUsed: req.model,
        finishReason: finishReason ?? 'stop',
        streamed: true,
      };
    }

    // A token-limit or content block must not fall back (it would re-truncate / re-filter).
    if (assessment.reason === 'length' || assessment.reason === 'content_filter') {
      return this.failFromAssessment(assessment.reason, normalized.content, streamedContent, true);
    }

    // empty / too_short / synthetic_error -> surface the streaming error, then one fallback.
    req.onStreamError?.(
      assessment.reason === 'empty'
        ? 'Streaming returned an empty response'
        : assessment.reason === 'too_short'
          ? 'Streaming returned a too-short response'
          : normalized.content
    );
    return this.runFallback(req, streamedContent);
  }

  private async recoverFromStreamError(
    req: DebateTurnRequest,
    errorMessage: string,
    streamingPartial: string
  ): Promise<DebateTurnResult> {
    const msg = errorMessage || '';
    const lower = msg.toLowerCase();
    const isVerificationError = (
      msg.includes('organization verification') ||
      msg.includes('Streaming requires organization verification') ||
      msg.includes('must be verified to stream') ||
      msg.includes('Verify Organization')
    );
    const isOverloadError = lower.includes('overload') || lower.includes('temporarily busy') || lower.includes('rate limit');
    const isEmptyResponseError = lower.includes('empty response');
    const isProviderRetryableError = classifyProviderRetry(
      new Error(msg),
      { provider: req.provider, model: req.model }
    ).retryable;

    if (isVerificationError) {
      try { store.dispatch(setProviderVerificationError({ providerId: req.providerId, hasError: true })); } catch { /* ignore */ }
    }

    if (isVerificationError || isOverloadError || isEmptyResponseError || isProviderRetryableError) {
      return this.runFallback(req, streamingPartial, msg);
    }

    return {
      status: 'failed',
      reason: 'provider_error',
      detail: msg || 'Provider response failed',
      partialText: streamingPartial.trim(),
      retryable: true,
      blocked: false,
      streamed: true,
    };
  }

  private async runFallback(
    req: DebateTurnRequest,
    streamingPartial: string,
    priorError?: string
  ): Promise<DebateTurnResult> {
    try {
      const fallback = await withProviderRetry(
        async () => req.adapter && typeof req.adapter.sendMessage === 'function'
          ? req.adapter.sendMessage(req.prompt, req.history, undefined, undefined, req.model)
          : req.aiService.sendMessage(
            req.provider,
            req.prompt,
            req.history,
            req.personalityConfig,
            undefined,
            req.parameters,
            req.model
          ),
        {
          provider: req.provider,
          model: req.model,
          operation: 'debate_fallback_response',
        }
      );

      const text = typeof fallback === 'string' ? fallback : fallback.response;
      const meta = typeof fallback === 'string' ? undefined : (fallback as { metadata?: { citations?: Citation[] } }).metadata;
      const fbFinish = typeof fallback === 'string' ? undefined : (fallback as { finishReason?: StreamFinishReason }).finishReason;
      const normalized = ensureAnswerContent(text, meta?.citations, req.aiName);
      const assessment = assessTurn({
        text: normalized.content,
        finishReason: fbFinish,
        minWords: req.minWords,
        isSyntheticError: req.isSyntheticError(normalized.content),
      });

      if (assessment.ok) {
        return {
          status: 'completed',
          text: normalized.content,
          citations: normalized.citations,
          modelUsed: req.model,
          finishReason: fbFinish ?? 'stop',
          streamed: false,
        };
      }

      return this.failFromAssessment(assessment.reason, normalized.content, streamingPartial, false);
    } catch (error) {
      const detail = error instanceof Error ? error.message : (priorError || 'Provider response failed');
      return {
        status: 'failed',
        reason: 'provider_error',
        detail,
        partialText: streamingPartial.trim(),
        retryable: true,
        blocked: false,
        streamed: false,
      };
    }
  }

  private async runNonStreaming(req: DebateTurnRequest): Promise<DebateTurnResult> {
    try {
      const response = await withProviderRetry(
        async () => req.adapter && typeof req.adapter.sendMessage === 'function'
          ? req.adapter.sendMessage(req.prompt, req.history, undefined, undefined, req.model)
          : req.aiService.sendMessage(
            req.provider,
            req.prompt,
            req.history,
            req.personalityConfig,
            undefined,
            req.parameters,
            req.model
          ),
        {
          provider: req.provider,
          model: req.model,
          operation: 'debate_response',
        }
      );

      const text = typeof response === 'string' ? response : response.response;
      const modelUsed = typeof response === 'string' ? req.model : response.modelUsed;
      const meta = typeof response === 'string' ? undefined : (response as { metadata?: { citations?: Citation[] } }).metadata;
      const finishReason = typeof response === 'string' ? undefined : (response as { finishReason?: StreamFinishReason }).finishReason;
      const normalized = ensureAnswerContent(text, meta?.citations, req.aiName);
      const assessment = assessTurn({
        text: normalized.content,
        finishReason,
        minWords: req.minWords,
        isSyntheticError: req.isSyntheticError(normalized.content),
      });

      if (assessment.ok) {
        return {
          status: 'completed',
          text: normalized.content,
          citations: normalized.citations,
          modelUsed: modelUsed ?? req.model,
          finishReason: finishReason ?? 'stop',
          streamed: false,
        };
      }

      return this.failFromAssessment(assessment.reason, normalized.content, '', false);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Provider response failed';
      return {
        status: 'failed',
        reason: 'provider_error',
        detail,
        partialText: '',
        retryable: true,
        blocked: false,
        streamed: false,
      };
    }
  }

  private failFromAssessment(
    reason: TurnFailureReason,
    content: string,
    streamingPartial: string,
    streamed: boolean
  ): DebateTurnFailed {
    switch (reason) {
      case 'length':
        return {
          status: 'failed',
          reason: 'length',
          detail: 'Provider stopped at the output token limit before finishing the turn',
          partialText: trimToLastCompleteSentence(content).trim(),
          retryable: true,
          blocked: false,
          streamed,
        };
      case 'content_filter':
        return {
          status: 'failed',
          reason: 'content_filter',
          detail: 'Provider blocked the response (content filter)',
          partialText: '',
          retryable: true,
          blocked: true,
          streamed,
        };
      case 'too_short':
        return {
          status: 'failed',
          reason: 'too_short',
          detail: 'Response was too short to be a valid debate turn',
          partialText: '',
          retryable: true,
          blocked: false,
          streamed,
        };
      case 'empty':
        return {
          status: 'failed',
          reason: 'empty',
          detail: 'Provider returned an empty response',
          partialText: streamingPartial.trim(),
          retryable: true,
          blocked: false,
          streamed,
        };
      case 'synthetic_error':
      default:
        return {
          status: 'failed',
          reason: 'provider_error',
          detail: 'Provider returned an error response',
          partialText: streamingPartial.trim(),
          retryable: true,
          blocked: false,
          streamed,
        };
    }
  }
}
