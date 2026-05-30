export type MediaProviderId = 'runway' | 'elevenlabs';

export type CreateTab = 'image' | 'video' | 'audio';

export type CreateMediaType = 'video' | 'audio';

export type CreateMediaOperation =
  | 'text_to_video'
  | 'image_to_video'
  | 'text_to_speech'
  | 'sound_effect'
  | 'debate_voice_pack'
  | 'debate_podcast_playlist';

export type CreateMediaAssetStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface MediaProviderVoiceLanguageOption {
  language: string;
  modelId?: string;
  model_id?: string;
  accent?: string | null;
  locale?: string | null;
  previewUrl?: string | null;
  preview_url?: string | null;
}

export type ElevenLabsVoiceType =
  | 'personal'
  | 'community'
  | 'default'
  | 'workspace'
  | 'non-default'
  | 'non-community'
  | 'saved';

export type ElevenLabsVoiceCategory =
  | 'premade'
  | 'cloned'
  | 'generated'
  | 'professional';

export type ElevenLabsFineTuningState =
  | 'draft'
  | 'not_verified'
  | 'not_started'
  | 'queued'
  | 'fine_tuning'
  | 'fine_tuned'
  | 'failed'
  | 'delayed';

export interface ElevenLabsVoiceListQuery {
  search?: string;
  pageSize?: number;
  nextPageToken?: string | null;
  includeTotalCount?: boolean;
  sort?: 'created_at_unix' | 'name';
  sortDirection?: 'asc' | 'desc';
  voiceType?: ElevenLabsVoiceType;
  category?: ElevenLabsVoiceCategory;
  fineTuningState?: ElevenLabsFineTuningState;
  collectionId?: string;
  voiceIds?: string[];
  includeModels?: boolean;
}

export type ElevenLabsSharedVoiceCategory = 'professional' | 'famous' | 'high_quality';

// Query for the public community library (GET /v1/shared-voices). Unlike /v2/voices,
// these filters are applied server-side, so results are accurate and the catalog is large.
export interface ElevenLabsSharedVoiceQuery {
  search?: string;
  pageSize?: number;
  page?: number;
  category?: ElevenLabsSharedVoiceCategory;
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  locale?: string;
  useCases?: string[];
  descriptives?: string[];
  featured?: boolean;
  sort?: string;
}

export interface MediaProviderVoiceOption {
  id: string;
  name: string;
  voice_id?: string;
  category?: string | null;
  description?: string | null;
  previewUrl?: string | null;
  preview_url?: string | null;
  labels?: Record<string, string>;
  verifiedLanguages?: MediaProviderVoiceLanguageOption[];
  verified_languages?: MediaProviderVoiceLanguageOption[];
  sourceVoiceType?: ElevenLabsVoiceType;
  availableForTiers?: string[];
  available_for_tiers?: string[];
  highQualityBaseModelIds?: string[];
  high_quality_base_model_ids?: string[];
  fineTuningStates?: Record<string, string>;
  fine_tuning_states?: Record<string, string>;
  collectionIds?: string[];
  collection_ids?: string[];
  permissionOnResource?: string | null;
  permission_on_resource?: string | null;
  isOwner?: boolean;
  is_owner?: boolean;
  isBookmarked?: boolean;
  is_bookmarked?: boolean;
  isLegacy?: boolean;
  is_legacy?: boolean;
  isMixed?: boolean;
  is_mixed?: boolean;
  favoritedAtUnix?: number;
  favorited_at_unix?: number;
  createdAtUnix?: number;
  created_at_unix?: number;
  recordingQuality?: string | null;
  recording_quality?: string | null;
  labellingStatus?: string | null;
  labelling_status?: string | null;
  recordingQualityReason?: string | null;
  recording_quality_reason?: string | null;
  safetyControl?: string | null;
  safety_control?: string | null;
  sharingStatus?: string | null;
  // Community / shared-library voices (GET /v1/shared-voices). These must be added to
  // the account before they can be used for TTS.
  isCommunity?: boolean;
  publicOwnerId?: string | null;
  public_owner_id?: string | null;
  freeUsersAllowed?: boolean;
  free_users_allowed?: boolean;
  isAddedByUser?: boolean;
  is_added_by_user?: boolean;
  imageUrl?: string | null;
  image_url?: string | null;
}

export interface MediaProviderModelOption {
  id: string;
  label: string;
  description?: string;
  mediaType: CreateMediaType;
  operations: CreateMediaOperation[];
  maxInputCharacters?: number;
  isDeprecated?: boolean;
}

export interface MediaProviderOptionsResponse {
  success: boolean;
  providerId: MediaProviderId;
  voices?: MediaProviderVoiceOption[];
  voiceHasMore?: boolean;
  voiceTotalCount?: number;
  voiceNextPageToken?: string | null;
  models?: MediaProviderModelOption[];
  error?: string;
}

export interface DebateVoicePackParticipant {
  id: string;
  name: string;
}

export interface DebateVoicePackClip {
  id: string;
  messageId: string;
  order: number;
  role?: 'debater' | 'mc';
  speakerId?: string;
  speakerName: string;
  speechLabel?: string;
  voiceName?: string;
  textPreview: string;
  uri: string;
  mimeType: string;
  fileName: string;
  pauseAfterMs: number;
}

export interface DebateVoicePackCompiledAudio {
  id: string;
  uri: string;
  mimeType: string;
  fileName: string;
  createdAt: number;
  remoteUrl?: string;
  storagePath?: string;
  expiresAt?: number;
}

export interface DebateVoicePackManifest {
  kind: 'debate_voice_pack' | 'debate_podcast_playlist';
  version: 1;
  sessionId: string;
  topic: string;
  participants: DebateVoicePackParticipant[];
  clips: DebateVoicePackClip[];
  pauseMs: number;
  compiledAudio?: DebateVoicePackCompiledAudio;
  directoryUri?: string;
  createdAt: number;
}
