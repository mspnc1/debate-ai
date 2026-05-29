import { getModelById, resolveProviderModelId } from '@/config/modelConfigs';
import { AppError } from '@/errors/types/AppError';

export type ProviderRetryReason = 'transient' | 'invalid_model';

export interface ProviderRetryDecision {
  retryable: boolean;
  reason?: ProviderRetryReason;
  message: string;
}

export interface ProviderRetryInfo {
  attempt: number;
  nextAttempt: number;
  maxAttempts: number;
  delayMs: number;
  reason: ProviderRetryReason;
  provider?: string;
  model?: string;
  operation: string;
  message: string;
}

export interface ProviderRetryOptions {
  provider?: string;
  model?: string;
  operation: string;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryInvalidModelOnce?: boolean;
  canRetry?: (decision: ProviderRetryDecision, attempt: number) => boolean;
  onRetry?: (info: ProviderRetryInfo) => void;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 400;
const DEFAULT_MAX_DELAY_MS = 1600;

const TRANSIENT_PATTERNS = [
  '429',
  '500',
  '502',
  '503',
  '504',
  '529',
  'bad gateway',
  'connection failed',
  'connection reset',
  'deadline exceeded',
  'eai_again',
  'econnreset',
  'etimedout',
  'fetch failed',
  'gateway timeout',
  'internal error',
  'network request failed',
  'overload',
  'overloaded',
  'rate limit',
  'server error',
  'service unavailable',
  'temporarily busy',
  'temporarily unavailable',
  'timed out',
  'timeout',
  'too many requests',
  'unavailable',
];

const NON_RETRYABLE_PATTERNS = [
  '401',
  '403',
  'api key',
  'authentication',
  'billing',
  'forbidden',
  'invalid api',
  'permission denied',
  'quota exceeded',
  'unauthorized',
];

const INVALID_MODEL_PATTERNS = [
  'invalid model',
  'invalid model name',
  'model name',
  'model not found',
  'not found for api version',
];

export const getProviderErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown; userMessage?: unknown }).message
      || (error as { message?: unknown; userMessage?: unknown }).userMessage;
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }

  return String(error);
};

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const directStatus = (error as { statusCode?: unknown }).statusCode;
  if (typeof directStatus === 'number') {
    return directStatus;
  }

  const context = (error as { context?: { statusCode?: unknown } }).context;
  if (typeof context?.statusCode === 'number') {
    return context.statusCode;
  }

  return undefined;
};

export const isConfiguredProviderModel = (provider?: string, model?: string): boolean => {
  if (!provider || !model) {
    return false;
  }

  const localModel = getModelById(provider, model);
  if (!localModel) {
    return false;
  }

  const resolvedModel = resolveProviderModelId(provider, model);
  return resolvedModel === localModel.id;
};

const includesAny = (message: string, patterns: string[]): boolean =>
  patterns.some(pattern => message.includes(pattern));

const isGoogleInvalidModelRetry = (
  provider: string | undefined,
  model: string | undefined,
  message: string
): boolean => {
  if (provider !== 'google') {
    return false;
  }

  if (!includesAny(message, INVALID_MODEL_PATTERNS)) {
    return false;
  }

  return isConfiguredProviderModel(provider, model);
};

export const classifyProviderRetry = (
  error: unknown,
  options: Pick<ProviderRetryOptions, 'provider' | 'model' | 'retryInvalidModelOnce'>
): ProviderRetryDecision => {
  const rawMessage = getProviderErrorMessage(error);
  const message = rawMessage.toLowerCase();
  const statusCode = getStatusCode(error);

  if (options.retryInvalidModelOnce !== false && isGoogleInvalidModelRetry(options.provider, options.model, message)) {
    return { retryable: true, reason: 'invalid_model', message: rawMessage };
  }

  if (includesAny(message, NON_RETRYABLE_PATTERNS)) {
    return { retryable: false, message: rawMessage };
  }

  if (statusCode && [429, 500, 502, 503, 504, 529].includes(statusCode)) {
    return { retryable: true, reason: 'transient', message: rawMessage };
  }

  if (error instanceof AppError && error.retryable) {
    return { retryable: true, reason: 'transient', message: rawMessage };
  }

  if (includesAny(message, TRANSIENT_PATTERNS)) {
    return { retryable: true, reason: 'transient', message: rawMessage };
  }

  return { retryable: false, message: rawMessage };
};

export const getProviderRetryDelayMs = (
  attempt: number,
  options: Pick<ProviderRetryOptions, 'baseDelayMs' | 'maxDelayMs'> = {}
): number => {
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  return Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
};

export const waitForProviderRetry = (delayMs: number): Promise<void> =>
  delayMs > 0
    ? new Promise(resolve => setTimeout(resolve, delayMs))
    : Promise.resolve();

export async function withProviderRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: ProviderRetryOptions
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      const decision = classifyProviderRetry(error, options);
      const canRetryInvalidModel = decision.reason !== 'invalid_model' || attempt === 1;
      const canRetry = decision.retryable
        && attempt < maxAttempts
        && canRetryInvalidModel
        && (options.canRetry?.(decision, attempt) ?? true);

      if (!canRetry || !decision.reason) {
        throw error;
      }

      const delayMs = getProviderRetryDelayMs(attempt, options);
      const info: ProviderRetryInfo = {
        attempt,
        nextAttempt: attempt + 1,
        maxAttempts,
        delayMs,
        reason: decision.reason,
        provider: options.provider,
        model: options.model,
        operation: options.operation,
        message: decision.message,
      };

      options.onRetry?.(info);

      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[ProviderRetry] Retrying ${options.operation} for ${options.provider || 'unknown'} after ${decision.reason}: attempt ${info.nextAttempt}/${maxAttempts}`
        );
      }

      await waitForProviderRetry(delayMs);
    }
  }

  throw new Error(`Provider retry exhausted for ${options.operation}`);
}
