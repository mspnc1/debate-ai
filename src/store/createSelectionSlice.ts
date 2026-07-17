import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CreateTab } from '../types/media';
import type {
  CreateAttachmentsByTab,
  CreateAudioOptions,
  CreateImageOptions,
  CreateSelectionConfig,
  CreateVideoOptions,
  SourceAttachment,
} from '../types/createSelection';
import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_DEFAULT_SFX_MODEL,
  ELEVENLABS_DEFAULT_TTS_MODEL,
  ELEVENLABS_DEFAULT_VOICE_ID,
  RUNWAY_DEFAULT_ASPECT_RATIO,
  RUNWAY_DEFAULT_DURATION_SECONDS,
  RUNWAY_DEFAULT_VIDEO_MODEL,
} from '../config/mediaProviders';

export const MAX_IMAGE_PROVIDERS = 3;
const MIN_IMAGE_COUNT = 1;
const MAX_IMAGE_COUNT = 10;

/**
 * Composer draft selection for Create mode, independent of any generation run.
 * The pattern mirrors aiSelectionSlice: persisted raw (attachments excluded)
 * via CreateSelectionPersistenceService, hidden — not deleted — at read time
 * when a provider currently lacks an API key.
 */
export interface CreateSelectionState {
  /** Image pills, one per provider, max 3. */
  image: CreateSelectionConfig[];
  imageOptions: CreateImageOptions;
  videoOptions: CreateVideoOptions;
  audioOptions: CreateAudioOptions;
  /** Session-scoped source images per tab; never persisted. */
  attachments: CreateAttachmentsByTab;
  hydrated: boolean;
}

export interface PersistedCreateSelection {
  image: CreateSelectionConfig[];
  imageOptions?: Partial<CreateImageOptions>;
  videoOptions?: Partial<CreateVideoOptions>;
  audioOptions?: Partial<CreateAudioOptions>;
}

const initialImageOptions: CreateImageOptions = {
  style: 'none',
  size: 'auto',
  count: 1,
};

const initialVideoOptions: CreateVideoOptions = {
  modelId: RUNWAY_DEFAULT_VIDEO_MODEL,
  durationSeconds: RUNWAY_DEFAULT_DURATION_SECONDS,
  aspectRatio: RUNWAY_DEFAULT_ASPECT_RATIO,
};

const initialAudioOptions: CreateAudioOptions = {
  operation: 'text_to_speech',
  ttsModelId: ELEVENLABS_DEFAULT_TTS_MODEL,
  sfxModelId: ELEVENLABS_DEFAULT_SFX_MODEL,
  voiceId: ELEVENLABS_DEFAULT_VOICE_ID,
  outputFormat: ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  promptInfluence: 0.3,
};

const initialState: CreateSelectionState = {
  image: [],
  imageOptions: initialImageOptions,
  videoOptions: initialVideoOptions,
  audioOptions: initialAudioOptions,
  attachments: { image: [], video: [], audio: [] },
  hydrated: false,
};

const clampImageConfigs = (configs: CreateSelectionConfig[]): CreateSelectionConfig[] =>
  configs.slice(0, MAX_IMAGE_PROVIDERS);

const clampCount = (count: number): number =>
  Math.min(MAX_IMAGE_COUNT, Math.max(MIN_IMAGE_COUNT, Math.round(count)));

const createSelectionSlice = createSlice({
  name: 'createSelection',
  initialState,
  reducers: {
    hydrateCreateSelection: (
      state,
      action: PayloadAction<PersistedCreateSelection | null>
    ) => {
      const persisted = action.payload;
      if (persisted) {
        state.image = clampImageConfigs(persisted.image);
        state.imageOptions = { ...initialImageOptions, ...persisted.imageOptions };
        state.imageOptions.count = clampCount(state.imageOptions.count);
        state.videoOptions = { ...initialVideoOptions, ...persisted.videoOptions };
        state.audioOptions = { ...initialAudioOptions, ...persisted.audioOptions };
      }
      state.hydrated = true;
    },
    setImageSelection: (state, action: PayloadAction<CreateSelectionConfig[]>) => {
      state.image = clampImageConfigs(action.payload);
    },
    addImageSelection: (state, action: PayloadAction<CreateSelectionConfig>) => {
      if (state.image.length >= MAX_IMAGE_PROVIDERS) return;
      // Generation payloads key model/settings maps by provider — one pill each.
      if (state.image.some(c => c.providerId === action.payload.providerId)) return;
      state.image.push(action.payload);
    },
    updateImageSelection: (
      state,
      action: PayloadAction<{ index: number; config: CreateSelectionConfig }>
    ) => {
      const { index, config } = action.payload;
      if (index < 0 || index >= state.image.length) return;
      state.image[index] = config;
    },
    removeImageSelection: (state, action: PayloadAction<{ index: number }>) => {
      const { index } = action.payload;
      if (index < 0 || index >= state.image.length) return;
      state.image.splice(index, 1);
    },
    setImageOptions: (state, action: PayloadAction<Partial<CreateImageOptions>>) => {
      state.imageOptions = { ...state.imageOptions, ...action.payload };
      state.imageOptions.count = clampCount(state.imageOptions.count);
    },
    setVideoOptions: (state, action: PayloadAction<Partial<CreateVideoOptions>>) => {
      state.videoOptions = { ...state.videoOptions, ...action.payload };
    },
    setAudioOptions: (state, action: PayloadAction<Partial<CreateAudioOptions>>) => {
      state.audioOptions = { ...state.audioOptions, ...action.payload };
    },
    setAttachments: (
      state,
      action: PayloadAction<{ tab: CreateTab; attachments: SourceAttachment[] }>
    ) => {
      state.attachments[action.payload.tab] = action.payload.attachments;
    },
    addAttachment: (
      state,
      action: PayloadAction<{ tab: CreateTab; attachment: SourceAttachment }>
    ) => {
      const { tab, attachment } = action.payload;
      if (state.attachments[tab].some(a => a.uri === attachment.uri)) return;
      state.attachments[tab].push(attachment);
    },
    removeAttachment: (state, action: PayloadAction<{ tab: CreateTab; uri: string }>) => {
      const { tab, uri } = action.payload;
      state.attachments[tab] = state.attachments[tab].filter(a => a.uri !== uri);
    },
    clearAttachments: (state, action: PayloadAction<{ tab: CreateTab }>) => {
      state.attachments[action.payload.tab] = [];
    },
  },
});

export const {
  hydrateCreateSelection,
  setImageSelection,
  addImageSelection,
  updateImageSelection,
  removeImageSelection,
  setImageOptions,
  setVideoOptions,
  setAudioOptions,
  setAttachments,
  addAttachment,
  removeAttachment,
  clearAttachments,
} = createSelectionSlice.actions;

export default createSelectionSlice.reducer;
