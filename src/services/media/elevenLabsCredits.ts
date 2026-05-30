import { ELEVENLABS_DEFAULT_TTS_MODEL } from '@/config/mediaProviders';

export interface ElevenLabsSubscriptionInfo {
  tier?: string;
  status?: string;
  characterCount: number;
  characterLimit: number;
  remainingCredits: number;
  maxCreditLimitExtension?: number | 'unlimited' | null;
  canExtendCharacterLimit?: boolean;
  allowedToExtendCharacterLimit?: boolean;
  overageAllowed: boolean;
  nextCharacterCountResetUnix?: number;
  resetDateLabel?: string;
  billingPeriod?: string;
  characterRefreshPeriod?: string;
}

export interface ElevenLabsCreditCheck {
  estimatedCost: number;
  remainingCredits?: number;
  willExceedRemaining: boolean;
  shouldBlock: boolean;
  shouldWarn: boolean;
  message?: string;
}

const LOW_CREDIT_WARNING_RATIO = 0.25;

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readCreditLimitExtension(record: Record<string, unknown>): number | 'unlimited' | null | undefined {
  const value = record.max_credit_limit_extension ?? record.max_character_limit_extension;
  if (value === 'unlimited') return 'unlimited';
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function isElevenLabsLowCostTtsModel(modelId?: string): boolean {
  const normalized = (modelId || ELEVENLABS_DEFAULT_TTS_MODEL).toLowerCase();
  return normalized.includes('flash') || normalized.includes('turbo');
}

export function getElevenLabsTtsCreditMultiplier(modelId?: string): number {
  return isElevenLabsLowCostTtsModel(modelId) ? 0.5 : 1;
}

export function estimateElevenLabsTtsCreditCost(text: string, modelId?: string): number {
  const characterCount = Math.max(0, text.length);
  if (characterCount === 0) return 0;
  return Math.ceil(characterCount * getElevenLabsTtsCreditMultiplier(modelId));
}

export function formatElevenLabsResetDate(resetUnix?: number): string | undefined {
  if (!resetUnix || !Number.isFinite(resetUnix)) return undefined;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(resetUnix * 1000));
}

export function parseElevenLabsSubscription(data: unknown): ElevenLabsSubscriptionInfo {
  const record = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  const characterCount = readNumber(record, 'character_count') ?? 0;
  const characterLimit = readNumber(record, 'character_limit') ?? 0;
  const remainingCredits = Math.max(0, characterLimit - characterCount);
  const maxCreditLimitExtension = readCreditLimitExtension(record);
  const canExtendCharacterLimit = readBoolean(record, 'can_extend_character_limit');
  const allowedToExtendCharacterLimit = readBoolean(record, 'allowed_to_extend_character_limit');
  const numericExtension = typeof maxCreditLimitExtension === 'number' ? maxCreditLimitExtension : undefined;
  const hasExplicitExtension = maxCreditLimitExtension !== undefined;
  const overageAllowed = maxCreditLimitExtension === 'unlimited'
    || Boolean(numericExtension && numericExtension > 0)
    || Boolean(!hasExplicitExtension && (canExtendCharacterLimit || allowedToExtendCharacterLimit));
  const nextCharacterCountResetUnix = readNumber(record, 'next_character_count_reset_unix');

  return {
    tier: readString(record, 'tier'),
    status: readString(record, 'status'),
    characterCount,
    characterLimit,
    remainingCredits,
    maxCreditLimitExtension,
    canExtendCharacterLimit,
    allowedToExtendCharacterLimit,
    overageAllowed,
    nextCharacterCountResetUnix,
    resetDateLabel: formatElevenLabsResetDate(nextCharacterCountResetUnix),
    billingPeriod: readString(record, 'billing_period'),
    characterRefreshPeriod: readString(record, 'character_refresh_period'),
  };
}

export function formatElevenLabsCreditSummary(
  subscription?: ElevenLabsSubscriptionInfo,
  loading?: boolean
): string | undefined {
  if (loading) return 'Checking ElevenLabs credits...';
  if (!subscription) return undefined;

  const reset = subscription.resetDateLabel ? ` • resets ${subscription.resetDateLabel}` : '';
  const overage = subscription.overageAllowed ? 'overage on' : 'overage off';
  return `ElevenLabs credits: ${subscription.remainingCredits.toLocaleString()} remaining (${subscription.characterCount.toLocaleString()} / ${subscription.characterLimit.toLocaleString()} used)${reset} • ${overage}`;
}

export function getElevenLabsCreditCheck(
  text: string,
  modelId: string | undefined,
  subscription?: ElevenLabsSubscriptionInfo
): ElevenLabsCreditCheck {
  const estimatedCost = estimateElevenLabsTtsCreditCost(text, modelId);
  if (!subscription) {
    return {
      estimatedCost,
      willExceedRemaining: false,
      shouldBlock: false,
      shouldWarn: false,
    };
  }

  const willExceedRemaining = estimatedCost > subscription.remainingCredits;
  const shouldBlock = willExceedRemaining && !subscription.overageAllowed;
  const shouldWarn = !shouldBlock
    && estimatedCost > 0
    && (
      willExceedRemaining
      || (
        subscription.remainingCredits > 0
        && estimatedCost >= Math.ceil(subscription.remainingCredits * LOW_CREDIT_WARNING_RATIO)
      )
    );

  let message: string | undefined;
  if (shouldBlock) {
    const reset = subscription.resetDateLabel ? ` Credits reset ${subscription.resetDateLabel}.` : '';
    message = `Not enough ElevenLabs credits. This voice clip needs about ${estimatedCost.toLocaleString()} credits, but only ${subscription.remainingCredits.toLocaleString()} remain.${reset}`;
  } else if (shouldWarn && willExceedRemaining) {
    message = `This voice generation needs about ${estimatedCost.toLocaleString()} ElevenLabs credits, but only ${subscription.remainingCredits.toLocaleString()} remain. ElevenLabs overage is enabled.`;
  } else if (shouldWarn) {
    message = `This voice generation will use about ${estimatedCost.toLocaleString()} ElevenLabs credits.`;
  }

  return {
    estimatedCost,
    remainingCredits: subscription.remainingCredits,
    willExceedRemaining,
    shouldBlock,
    shouldWarn,
    message,
  };
}
