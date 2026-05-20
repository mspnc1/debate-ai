export type MediaProviderId = 'runway' | 'elevenlabs';

export type CreateTab = 'image' | 'video' | 'audio';

export type CreateMediaType = 'video' | 'audio';

export type CreateMediaOperation =
  | 'text_to_video'
  | 'image_to_video'
  | 'text_to_speech'
  | 'sound_effect';

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
