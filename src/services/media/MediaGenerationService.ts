import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_DEFAULT_SFX_MODEL,
  ELEVENLABS_DEFAULT_TTS_MODEL,
  ELEVENLABS_DEFAULT_VOICE_ID,
  RUNWAY_DEFAULT_ASPECT_RATIO,
  RUNWAY_DEFAULT_DURATION_SECONDS,
  RUNWAY_DEFAULT_VIDEO_MODEL,
} from '@/config/mediaProviders';
import type {
  CreateMediaAssetStatus,
  CreateMediaOperation,
  CreateMediaType,
  ElevenLabsSharedVoiceQuery,
  ElevenLabsVoiceListQuery,
  MediaProviderId,
  MediaProviderModelOption,
  MediaProviderOptionsResponse,
  MediaProviderVoiceLanguageOption,
  MediaProviderVoiceOption,
} from '@/types/media';
import { bytesToBase64 } from './mediaFileCache';
import {
  parseElevenLabsSubscription,
  type ElevenLabsSubscriptionInfo,
} from './elevenLabsCredits';

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io';
const RUNWAY_API_KEY_PATTERN = /^key_[0-9a-f]{128}$/;

export interface StartRunwayVideoRequest {
  apiKey: string;
  operation: Extract<CreateMediaOperation, 'text_to_video' | 'image_to_video'>;
  prompt: string;
  modelId?: string;
  sourceImage?: string;
  durationSeconds?: number;
  aspectRatio?: string;
}

export interface RunwayVideoTask {
  providerTaskId: string;
  status: CreateMediaAssetStatus;
  pollAfterMs: number;
}

export interface RunwayTaskStatus {
  status: CreateMediaAssetStatus;
  outputUrls?: string[];
  error?: string;
}

export interface GenerateElevenLabsAudioRequest {
  apiKey: string;
  operation: Extract<CreateMediaOperation, 'text_to_speech' | 'sound_effect'>;
  prompt: string;
  modelId?: string;
  voiceId?: string;
  outputFormat?: string;
  durationSeconds?: number;
  promptInfluence?: number;
}

export interface GeneratedAudioPayload {
  dataUri: string;
  mimeType: string;
  modelId: string;
  operation: Extract<CreateMediaOperation, 'text_to_speech' | 'sound_effect'>;
  characterCost?: number;
  requestId?: string;
}

function mapRunwayStatus(status: string | undefined): CreateMediaAssetStatus {
  const normalized = (status || '').toLowerCase();
  if (['succeeded', 'success', 'completed', 'complete'].includes(normalized)) return 'succeeded';
  if (['failed', 'error'].includes(normalized)) return 'failed';
  if (['canceled', 'cancelled'].includes(normalized)) return 'canceled';
  if (['running', 'processing'].includes(normalized)) return 'running';
  return 'queued';
}

function mimeTypeForOutputFormat(outputFormat: string): string {
  if (outputFormat.startsWith('wav')) return 'audio/wav';
  if (outputFormat.startsWith('pcm')) return 'audio/L16';
  if (outputFormat.startsWith('ulaw')) return 'audio/basic';
  if (outputFormat.startsWith('opus')) return 'audio/ogg';
  return 'audio/mpeg';
}

function readProviderErrorMessage(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  const error = record.error;
  const detail = record.detail;

  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const errorRecord = error as Record<string, unknown>;
    const errorMessage = readString(errorRecord, 'message')
      || readString(errorRecord, 'detail')
      || readString(errorRecord, 'description');
    if (errorMessage) return errorMessage;
  }
  if (typeof detail === 'string' && detail.trim()) return detail.trim();
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const detailRecord = detail as Record<string, unknown>;
    const detailMessage = readString(detailRecord, 'message')
      || readString(detailRecord, 'detail')
      || readString(detailRecord, 'description')
      || readString(detailRecord, 'status');
    if (detailMessage) return detailMessage;
  }

  return readString(record, 'message')
    || readString(record, 'detail')
    || readString(record, 'error_description');
}

function readProviderErrorStatus(parsed: unknown): string | undefined {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  const detail = record.detail;
  const error = record.error;

  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const status = readString(detail as Record<string, unknown>, 'status');
    if (status) return status;
  }
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const status = readString(error as Record<string, unknown>, 'status')
      || readString(error as Record<string, unknown>, 'code');
    if (status) return status;
  }

  return readString(record, 'status') || readString(record, 'code');
}

function readHeaderNumber(headers: Headers, key: string): number | undefined {
  const value = headers.get(key);
  if (!value) return undefined;
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}

function normalizeApiKey(apiKey: string): string {
  return apiKey.trim();
}

function normalizeRunwayApiKey(apiKey: string): string {
  const normalized = normalizeApiKey(apiKey);
  return normalized.startsWith('Key_') ? `key_${normalized.slice(4)}` : normalized;
}

function describeApiKey(apiKey: string): { length: number; prefix: string; suffix: string } {
  return {
    length: apiKey.length,
    prefix: apiKey.slice(0, 4),
    suffix: apiKey.slice(-4),
  };
}

function formatRunwayKeyFingerprint(apiKey: string): string {
  const fingerprint = describeApiKey(apiKey);
  return `${fingerprint.prefix}...${fingerprint.suffix} (${fingerprint.length} chars)`;
}

function validateRunwayApiKey(apiKey: string): void {
  if (!RUNWAY_API_KEY_PATTERN.test(apiKey)) {
    throw new Error(
      `Runway API key format is invalid. Expected key_ or Key_ followed by 128 lowercase hex characters; mobile has ${formatRunwayKeyFingerprint(apiKey)}.`
    );
  }
}

async function parseErrorResponse(response: Response, provider: string, credentialFingerprint?: string): Promise<Error> {
  let message = `${provider} API error (${response.status})`;
  let providerStatus: string | undefined;
  try {
    const text = await response.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        message = readProviderErrorMessage(parsed) || text.slice(0, 260);
        providerStatus = readProviderErrorStatus(parsed);
      } catch {
        message = text.slice(0, 260);
      }
    }
  } catch {
    // Use default message.
  }

  const lower = message.toLowerCase();
  const normalizedProviderStatus = providerStatus?.toLowerCase();
  const elevenLabsPermissionDenied = provider === 'ElevenLabs' && (
    normalizedProviderStatus === 'insufficient_permissions'
    || lower.includes('permission')
    || lower.includes('scope')
    || lower.includes('text_to_speech')
  );
  const elevenLabsVoiceAccessDenied = provider === 'ElevenLabs' && (
    normalizedProviderStatus === 'voice_access_denied'
    || lower.includes('voice access')
  );
  if (provider === 'Runway' && response.status === 401) {
    message = `Runway API request failed with HTTP 401. Mobile stored key is ${credentialFingerprint || 'unavailable'}. Provider response: ${message}`;
  } else if (provider === 'ElevenLabs' && (response.status === 403 || elevenLabsPermissionDenied || elevenLabsVoiceAccessDenied)) {
    if (elevenLabsVoiceAccessDenied) {
      message = `ElevenLabs voice access denied: ${message}`;
    } else if (elevenLabsPermissionDenied) {
      message = `ElevenLabs API key is missing text-to-speech permission: ${message}`;
    } else {
      message = `ElevenLabs access denied: ${message}`;
    }
  } else if (provider === 'ElevenLabs' && response.status === 401) {
    message = `ElevenLabs authentication failed: ${message}`;
  } else {
    const mentionsCredential = lower.includes('api key')
      || lower.includes('token')
      || lower.includes('credential')
      || lower.includes('bearer')
      || lower.includes('authentication')
      || lower.includes('authorization');
    const credentialRejected = response.status === 401
      || lower.includes('unauthorized')
      || (mentionsCredential && (
        lower.includes('invalid')
        || lower.includes('expired')
        || lower.includes('missing')
        || lower.includes('not provided')
      ));

    if (credentialRejected) {
      message = `Invalid ${provider} API key.`;
    } else if (response.status === 402 || lower.includes('credit') || lower.includes('quota')) {
      message = `${provider} credits or quota are exhausted.`;
    } else if (response.status === 429 || lower.includes('rate limit')) {
      message = `${provider} rate limit exceeded. Please try again later.`;
    } else if (lower.includes('safety') || lower.includes('content policy') || lower.includes('moderation')) {
      message = 'Content policy violation. Please revise your prompt.';
    } else if (response.status === 403 || lower.includes('forbidden')) {
      message = `${provider} access denied: ${message}`;
    }
  }

  const error = new Error(message);
  (error as Error & { statusCode?: number }).statusCode = response.status;
  return error;
}

function buildRunwayBody(request: StartRunwayVideoRequest): Record<string, unknown> {
  if (request.operation === 'image_to_video' && !request.sourceImage) {
    throw new Error('A source image is required for image-to-video generation.');
  }

  return {
    model: request.modelId || RUNWAY_DEFAULT_VIDEO_MODEL,
    promptText: request.prompt.trim(),
    ratio: request.aspectRatio || RUNWAY_DEFAULT_ASPECT_RATIO,
    duration: request.durationSeconds || RUNWAY_DEFAULT_DURATION_SECONDS,
    ...(request.operation === 'image_to_video' ? { promptImage: request.sourceImage } : {}),
  };
}

function getRunwayVideoEndpoint(request: StartRunwayVideoRequest): 'text_to_video' | 'image_to_video' {
  return request.operation === 'text_to_video' ? 'text_to_video' : 'image_to_video';
}

function buildElevenLabsVoiceSearchUrl(input: ElevenLabsVoiceListQuery = {}): string {
  const params = new URLSearchParams();
  params.set('page_size', String(Math.max(1, Math.min(100, Math.floor(input.pageSize || 100)))));
  if (typeof input.includeTotalCount === 'boolean') {
    params.set('include_total_count', String(input.includeTotalCount));
  }
  const search = input.search?.trim();
  if (search) params.set('search', search);
  if (input.nextPageToken) params.set('next_page_token', input.nextPageToken);
  if (input.sort) params.set('sort', input.sort);
  if (input.sortDirection) params.set('sort_direction', input.sortDirection);
  if (input.voiceType) params.set('voice_type', input.voiceType);
  if (input.category) params.set('category', input.category);
  if (input.fineTuningState) params.set('fine_tuning_state', input.fineTuningState);
  if (input.collectionId?.trim()) params.set('collection_id', input.collectionId.trim());
  input.voiceIds?.filter(Boolean).slice(0, 100).forEach((voiceId) => {
    params.append('voice_ids', voiceId);
  });
  return `${ELEVENLABS_API_BASE}/v2/voices?${params.toString()}`;
}

function buildElevenLabsSharedVoiceUrl(input: ElevenLabsSharedVoiceQuery = {}): string {
  const params = new URLSearchParams();
  params.set('page_size', String(Math.max(1, Math.min(100, Math.floor(input.pageSize || 30)))));
  params.set('page', String(Math.max(0, Math.floor(input.page || 0))));
  const search = input.search?.trim();
  if (search) params.set('search', search);
  if (input.category) params.set('category', input.category);
  if (input.gender?.trim()) params.set('gender', input.gender.trim());
  if (input.age?.trim()) params.set('age', input.age.trim());
  if (input.accent?.trim()) params.set('accent', input.accent.trim());
  if (input.language?.trim()) params.set('language', input.language.trim());
  if (input.locale?.trim()) params.set('locale', input.locale.trim());
  if (input.sort?.trim()) params.set('sort', input.sort.trim());
  if (typeof input.featured === 'boolean') params.set('featured', String(input.featured));
  input.useCases?.filter(Boolean).forEach((useCase) => params.append('use_cases', useCase));
  input.descriptives?.filter(Boolean).forEach((descriptive) => params.append('descriptives', descriptive));
  return `${ELEVENLABS_API_BASE}/v1/shared-voices?${params.toString()}`;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readStringArray(record: Record<string, unknown>, key: string): string[] | undefined {
  const value = record[key];
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return strings.length > 0 ? strings : undefined;
}

function readStringRecord(record: Record<string, unknown>, key: string): Record<string, string> | undefined {
  const value = record[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
    .map(([entryKey, entryValue]) => [entryKey, entryValue.trim()] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function readVoiceLanguages(record: Record<string, unknown>): MediaProviderVoiceLanguageOption[] | undefined {
  const value = record.verified_languages;
  if (!Array.isArray(value)) return undefined;

  const languages = value
    .map((language): MediaProviderVoiceLanguageOption | null => {
      if (!language || typeof language !== 'object' || Array.isArray(language)) return null;
      const languageRecord = language as Record<string, unknown>;
      const name = readString(languageRecord, 'language');
      if (!name) return null;
      const modelId = readString(languageRecord, 'model_id');
      const previewUrl = readString(languageRecord, 'preview_url') || null;
      return {
        language: name,
        modelId,
        model_id: modelId,
        accent: readString(languageRecord, 'accent') || null,
        locale: readString(languageRecord, 'locale') || null,
        previewUrl,
        preview_url: previewUrl,
      };
    })
    .filter((language): language is MediaProviderVoiceLanguageOption => Boolean(language));

  return languages.length > 0 ? languages : undefined;
}

function readFineTuningStates(record: Record<string, unknown>): Record<string, string> | undefined {
  const fineTuning = record.fine_tuning;
  if (!fineTuning || typeof fineTuning !== 'object' || Array.isArray(fineTuning)) return undefined;
  return readStringRecord(fineTuning as Record<string, unknown>, 'state');
}

function readSharingStatus(record: Record<string, unknown>): string | undefined {
  const sharing = record.sharing;
  if (!sharing || typeof sharing !== 'object' || Array.isArray(sharing)) return undefined;
  return readString(sharing as Record<string, unknown>, 'status');
}

function mapVoice(voice: unknown, sourceVoiceType?: ElevenLabsVoiceListQuery['voiceType']): MediaProviderVoiceOption | null {
  if (!voice || typeof voice !== 'object' || Array.isArray(voice)) return null;
  const record = voice as Record<string, unknown>;
  const id = readString(record, 'voice_id');
  const name = readString(record, 'name');
  if (!id || !name) return null;
  const previewUrl = readString(record, 'preview_url') || null;
  const labels = readStringRecord(record, 'labels');
  const verifiedLanguages = readVoiceLanguages(record);
  const availableForTiers = readStringArray(record, 'available_for_tiers');
  const highQualityBaseModelIds = readStringArray(record, 'high_quality_base_model_ids');
  const fineTuningStates = readFineTuningStates(record);
  const collectionIds = readStringArray(record, 'collection_ids');
  const permissionOnResource = readString(record, 'permission_on_resource') || null;
  const recordingQuality = readString(record, 'recording_quality') || null;
  const labellingStatus = readString(record, 'labelling_status') || null;
  const recordingQualityReason = readString(record, 'recording_quality_reason') || null;
  const safetyControl = readString(record, 'safety_control') || null;
  const sharingStatus = readSharingStatus(record) || null;
  const isOwner = readBoolean(record, 'is_owner');
  const isBookmarked = readBoolean(record, 'is_bookmarked');
  const isLegacy = readBoolean(record, 'is_legacy');
  const isMixed = readBoolean(record, 'is_mixed');
  const favoritedAtUnix = readNumber(record, 'favorited_at_unix');
  const createdAtUnix = readNumber(record, 'created_at_unix');

  return {
    id,
    name,
    voice_id: id,
    category: readString(record, 'category') || null,
    description: readString(record, 'description') || null,
    previewUrl,
    preview_url: previewUrl,
    labels,
    verifiedLanguages,
    verified_languages: verifiedLanguages,
    sourceVoiceType,
    availableForTiers,
    available_for_tiers: availableForTiers,
    highQualityBaseModelIds,
    high_quality_base_model_ids: highQualityBaseModelIds,
    fineTuningStates,
    fine_tuning_states: fineTuningStates,
    collectionIds,
    collection_ids: collectionIds,
    permissionOnResource,
    permission_on_resource: permissionOnResource,
    isOwner,
    is_owner: isOwner,
    isBookmarked,
    is_bookmarked: isBookmarked,
    isLegacy,
    is_legacy: isLegacy,
    isMixed,
    is_mixed: isMixed,
    favoritedAtUnix,
    favorited_at_unix: favoritedAtUnix,
    createdAtUnix,
    created_at_unix: createdAtUnix,
    recordingQuality,
    recording_quality: recordingQuality,
    labellingStatus,
    labelling_status: labellingStatus,
    recordingQualityReason,
    recording_quality_reason: recordingQualityReason,
    safetyControl,
    safety_control: safetyControl,
    sharingStatus,
  };
}

function mapSharedVoice(voice: unknown): MediaProviderVoiceOption | null {
  if (!voice || typeof voice !== 'object' || Array.isArray(voice)) return null;
  const record = voice as Record<string, unknown>;
  const id = readString(record, 'voice_id');
  const name = readString(record, 'name');
  if (!id || !name) return null;

  const previewUrl = readString(record, 'preview_url') || null;
  const gender = readString(record, 'gender');
  const age = readString(record, 'age');
  const accent = readString(record, 'accent');
  const descriptive = readString(record, 'descriptive');
  const useCase = readString(record, 'use_case');
  const language = readString(record, 'language');
  const locale = readString(record, 'locale');

  // Synthesize the labels record so the picker's chip/filter helpers work uniformly
  // across /v2/voices and the shared library.
  const labels: Record<string, string> = {};
  if (gender) labels.gender = gender;
  if (age) labels.age = age;
  if (accent) labels.accent = accent;
  if (descriptive) labels.descriptive = descriptive;
  if (useCase) labels.use_case = useCase;

  const verifiedLanguages = readVoiceLanguages(record)
    || (language ? [{
      language,
      accent: accent || null,
      locale: locale || null,
      previewUrl,
      preview_url: previewUrl,
    }] : undefined);

  const publicOwnerId = readString(record, 'public_owner_id') || null;
  const freeUsersAllowed = readBoolean(record, 'free_users_allowed');
  const isAddedByUser = readBoolean(record, 'is_added_by_user');
  const isBookmarked = readBoolean(record, 'is_bookmarked');
  const imageUrl = readString(record, 'image_url') || null;
  const createdAtUnix = readNumber(record, 'date_unix');

  return {
    id,
    name,
    voice_id: id,
    category: readString(record, 'category') || null,
    description: readString(record, 'description') || null,
    previewUrl,
    preview_url: previewUrl,
    labels: Object.keys(labels).length > 0 ? labels : undefined,
    verifiedLanguages,
    verified_languages: verifiedLanguages,
    sourceVoiceType: 'community',
    isCommunity: true,
    publicOwnerId,
    public_owner_id: publicOwnerId,
    freeUsersAllowed,
    free_users_allowed: freeUsersAllowed,
    isAddedByUser,
    is_added_by_user: isAddedByUser,
    isBookmarked,
    is_bookmarked: isBookmarked,
    imageUrl,
    image_url: imageUrl,
    createdAtUnix,
    created_at_unix: createdAtUnix,
  };
}

function mapModel(model: unknown): MediaProviderModelOption | null {
  if (!model || typeof model !== 'object' || Array.isArray(model)) return null;
  const record = model as Record<string, unknown>;
  const id = readString(record, 'model_id');
  if (!id) return null;

  const text = `${id} ${readString(record, 'name') || ''} ${readString(record, 'description') || ''}`.toLowerCase();
  const operations: CreateMediaOperation[] = [];
  if (record.can_do_text_to_speech === true) {
    operations.push('text_to_speech');
  }
  if (id === ELEVENLABS_DEFAULT_SFX_MODEL || text.includes('text to sound') || text.includes('sound effect')) {
    operations.push('sound_effect');
  }
  if (operations.length === 0) return null;

  const subscribedMax = typeof record.max_characters_request_subscribed_user === 'number'
    ? record.max_characters_request_subscribed_user
    : undefined;
  const freeMax = typeof record.max_characters_request_free_user === 'number'
    ? record.max_characters_request_free_user
    : undefined;

  return {
    id,
    label: readString(record, 'name') || id,
    description: readString(record, 'description'),
    mediaType: 'audio',
    operations,
    maxInputCharacters: subscribedMax && freeMax ? Math.max(subscribedMax, freeMax) : subscribedMax || freeMax,
  };
}

async function recordMediaGeneration(input: {
  providerId: MediaProviderId;
  mediaType: CreateMediaType;
  operation: CreateMediaOperation;
  modelId: string;
}): Promise<void> {
  try {
    const functionsModule = await import('@react-native-firebase/functions');
    const functions = functionsModule.getFunctions();
    const callable = functionsModule.httpsCallable(functions, 'recordMediaGeneration');
    await callable(input);
  } catch {
    // Usage analytics must not block local BYOK generation.
  }
}

export class MediaGenerationService {
  static mapRunwayStatus = mapRunwayStatus;
  static buildRunwayBody = buildRunwayBody;
  static getRunwayVideoEndpoint = getRunwayVideoEndpoint;
  static mimeTypeForOutputFormat = mimeTypeForOutputFormat;
  static buildElevenLabsVoiceSearchUrl = buildElevenLabsVoiceSearchUrl;
  static buildElevenLabsSharedVoiceUrl = buildElevenLabsSharedVoiceUrl;

  static async startRunwayVideo(request: StartRunwayVideoRequest): Promise<RunwayVideoTask> {
    const apiKey = normalizeRunwayApiKey(request.apiKey);
    validateRunwayApiKey(apiKey);
    const endpoint = getRunwayVideoEndpoint(request);
    const body = buildRunwayBody(request);
    const response = await fetch(`${RUNWAY_API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': RUNWAY_API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (__DEV__ && (typeof process === 'undefined' || process.env.NODE_ENV !== 'test')) {
        console.warn('[Runway] Video task request failed', {
          status: response.status,
          endpoint,
          operation: request.operation,
          modelId: request.modelId || RUNWAY_DEFAULT_VIDEO_MODEL,
          durationSeconds: request.durationSeconds || RUNWAY_DEFAULT_DURATION_SECONDS,
          aspectRatio: request.aspectRatio || RUNWAY_DEFAULT_ASPECT_RATIO,
          hasSourceImage: Boolean(request.sourceImage),
          credential: describeApiKey(apiKey),
          bodyKeys: Object.keys(body),
        });
      }
      throw await parseErrorResponse(response, 'Runway', formatRunwayKeyFingerprint(apiKey));
    }

    const data = await response.json() as { id?: string; status?: string };
    if (!data.id) {
      throw new Error('Runway did not return a task ID.');
    }

    return {
      providerTaskId: data.id,
      status: mapRunwayStatus(data.status),
      pollAfterMs: 5000,
    };
  }

  static async getRunwayTaskStatus(apiKey: string, providerTaskId: string): Promise<RunwayTaskStatus> {
    const normalizedApiKey = normalizeRunwayApiKey(apiKey);
    validateRunwayApiKey(normalizedApiKey);
    const response = await fetch(`${RUNWAY_API_BASE}/tasks/${encodeURIComponent(providerTaskId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${normalizedApiKey}`,
        'X-Runway-Version': RUNWAY_API_VERSION,
      },
    });

    if (!response.ok) {
      throw await parseErrorResponse(response, 'Runway', formatRunwayKeyFingerprint(normalizedApiKey));
    }

    const data = await response.json() as {
      status?: string;
      output?: string[];
      failure?: string;
      failureCode?: string;
      error?: string | { message?: string };
    };
    const providerError = typeof data.error === 'string' ? data.error : data.error?.message;

    return {
      status: mapRunwayStatus(data.status),
      outputUrls: Array.isArray(data.output) ? data.output : undefined,
      error: providerError || data.failure || data.failureCode,
    };
  }

  static async generateElevenLabsAudio(request: GenerateElevenLabsAudioRequest): Promise<GeneratedAudioPayload> {
    const outputFormat = request.outputFormat || ELEVENLABS_DEFAULT_OUTPUT_FORMAT;
    const mimeType = mimeTypeForOutputFormat(outputFormat);
    const isTts = request.operation === 'text_to_speech';
    const modelId = request.modelId || (isTts ? ELEVENLABS_DEFAULT_TTS_MODEL : ELEVENLABS_DEFAULT_SFX_MODEL);

    const endpoint = isTts
      ? `${ELEVENLABS_API_BASE}/v1/text-to-speech/${encodeURIComponent(request.voiceId || ELEVENLABS_DEFAULT_VOICE_ID)}?output_format=${encodeURIComponent(outputFormat)}`
      : `${ELEVENLABS_API_BASE}/v1/sound-generation?output_format=${encodeURIComponent(outputFormat)}`;

    const body = isTts
      ? {
          text: request.prompt.trim(),
          model_id: modelId,
        }
      : {
          text: request.prompt.trim(),
          model_id: modelId,
          ...(typeof request.durationSeconds === 'number' ? { duration_seconds: request.durationSeconds } : {}),
          ...(typeof request.promptInfluence === 'number' ? { prompt_influence: request.promptInfluence } : {}),
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'xi-api-key': normalizeApiKey(request.apiKey),
        'Content-Type': 'application/json',
        Accept: mimeType,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await parseErrorResponse(response, 'ElevenLabs');
    }

    const arrayBuffer = await response.arrayBuffer();
    const responseMimeType = response.headers.get('content-type')?.split(';')[0] || mimeType;
    const base64 = bytesToBase64(new Uint8Array(arrayBuffer));
    return {
      dataUri: `data:${responseMimeType};base64,${base64}`,
      mimeType: responseMimeType,
      modelId,
      operation: request.operation,
      characterCost: readHeaderNumber(response.headers, 'x-character-count'),
      requestId: response.headers.get('request-id') || undefined,
    };
  }

  static async getElevenLabsSubscription(apiKey: string): Promise<ElevenLabsSubscriptionInfo> {
    const response = await fetch(`${ELEVENLABS_API_BASE}/v1/user/subscription`, {
      method: 'GET',
      headers: { 'xi-api-key': normalizeApiKey(apiKey) },
    });

    if (!response.ok) {
      throw await parseErrorResponse(response, 'ElevenLabs');
    }

    const data = await response.json();
    return parseElevenLabsSubscription(data);
  }

  static async listElevenLabsOptions(
    apiKey: string,
    input: ElevenLabsVoiceListQuery = {}
  ): Promise<MediaProviderOptionsResponse> {
    const voiceResponse = await fetch(buildElevenLabsVoiceSearchUrl(input), {
      method: 'GET',
      headers: { 'xi-api-key': normalizeApiKey(apiKey) },
    });

    if (!voiceResponse.ok) {
      throw await parseErrorResponse(voiceResponse, 'ElevenLabs');
    }

    const voiceData = await voiceResponse.json() as {
      voices?: unknown[];
      has_more?: boolean;
      total_count?: number;
      next_page_token?: string | null;
    };

    let models: MediaProviderModelOption[] = [];
    if (input.includeModels !== false) {
      try {
        const modelResponse = await fetch(`${ELEVENLABS_API_BASE}/v1/models`, {
          method: 'GET',
          headers: { 'xi-api-key': normalizeApiKey(apiKey) },
        });
        if (modelResponse.ok) {
          const rawModels = await modelResponse.json() as unknown;
          models = (Array.isArray(rawModels) ? rawModels : [])
            .map(mapModel)
            .filter((model): model is MediaProviderModelOption => Boolean(model));
        }
      } catch {
        // Voices are enough to render the audio panel; model list can fall back to defaults.
      }
    }

    return {
      success: true,
      providerId: 'elevenlabs',
      voices: (voiceData.voices || [])
        .map((voice) => mapVoice(voice, input.voiceType))
        .filter((voice): voice is MediaProviderVoiceOption => Boolean(voice)),
      voiceHasMore: Boolean(voiceData.has_more),
      voiceTotalCount: typeof voiceData.total_count === 'number' ? voiceData.total_count : undefined,
      voiceNextPageToken: voiceData.next_page_token || null,
      models,
    };
  }

  static async listElevenLabsSharedVoices(
    apiKey: string,
    input: ElevenLabsSharedVoiceQuery = {}
  ): Promise<MediaProviderOptionsResponse> {
    const response = await fetch(buildElevenLabsSharedVoiceUrl(input), {
      method: 'GET',
      headers: { 'xi-api-key': normalizeApiKey(apiKey) },
    });

    if (!response.ok) {
      throw await parseErrorResponse(response, 'ElevenLabs');
    }

    const data = await response.json() as {
      voices?: unknown[];
      has_more?: boolean;
      total_count?: number;
    };

    const page = Math.max(0, Math.floor(input.page || 0));
    const hasMore = Boolean(data.has_more);

    return {
      success: true,
      providerId: 'elevenlabs',
      voices: (data.voices || [])
        .map(mapSharedVoice)
        .filter((voice): voice is MediaProviderVoiceOption => Boolean(voice)),
      voiceHasMore: hasMore,
      voiceTotalCount: typeof data.total_count === 'number' ? data.total_count : undefined,
      // The shared library paginates by integer page; encode the next page in the token
      // so callers can reuse the same pagination plumbing as /v2/voices.
      voiceNextPageToken: hasMore ? String(page + 1) : null,
      models: [],
    };
  }

  // Adds a community voice to the account's library so it can be used for TTS.
  // Returns the new library voice_id (distinct from the shared voice_id).
  static async addElevenLabsSharedVoice(
    apiKey: string,
    publicOwnerId: string,
    voiceId: string,
    newName: string
  ): Promise<string> {
    const url = `${ELEVENLABS_API_BASE}/v1/voices/add/${encodeURIComponent(publicOwnerId)}/${encodeURIComponent(voiceId)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': normalizeApiKey(apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_name: newName, bookmarked: true }),
    });

    if (!response.ok) {
      throw await parseErrorResponse(response, 'ElevenLabs');
    }

    const data = await response.json() as { voice_id?: string };
    return data.voice_id || voiceId;
  }

  static recordMediaGeneration = recordMediaGeneration;
}

export default MediaGenerationService;
