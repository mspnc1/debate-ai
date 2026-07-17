import type { CreateMediaOperation, CreateTab } from './media';
import type { ImageModelSettings, StylePreset, SizeOption } from '../store/createSlice';

/**
 * Composer draft selection for Create mode ("The Studio"), the media-catalog
 * sibling of AISelectionConfig. Cross-session state: persisted to AsyncStorage
 * (attachments excluded) and re-validated at read time because providers can
 * lose API keys and models can be retired between app launches.
 *
 * Only the image tab is genuinely multi-provider, so only it stores a config
 * array; video (Runway) and audio (ElevenLabs) have exactly one possible
 * provider each, and their single pill is derived from options + key presence.
 */
export interface CreateSelectionConfig {
  providerId: string;
  modelId: string;
  /** Image pills only: per-model capability settings (quality, format, …). */
  settings?: ImageModelSettings;
}

/** A source image attached to the composer (refine / reference / image-to-video). */
export interface SourceAttachment {
  uri: string;
  mimeType?: string;
  /** Set when the attachment came from the Create gallery. */
  galleryAssetId?: string;
}

export interface CreateImageOptions {
  style: StylePreset;
  size: SizeOption;
  count: number;
}

export interface CreateVideoOptions {
  modelId: string;
  durationSeconds: number;
  aspectRatio: string;
}

export type CreateAudioOperation = Extract<
  CreateMediaOperation,
  'text_to_speech' | 'sound_effect'
>;

export interface CreateAudioOptions {
  operation: CreateAudioOperation;
  /** Model memory per operation so switching TTS ↔ SFX round-trips cleanly. */
  ttsModelId: string;
  sfxModelId: string;
  voiceId: string;
  voiceName?: string;
  outputFormat: string;
  /** Sound-effect duration; undefined lets the model decide. */
  durationSeconds?: number;
  promptInfluence: number;
}

export type CreateAttachmentsByTab = Record<CreateTab, SourceAttachment[]>;
