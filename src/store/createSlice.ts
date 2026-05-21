/**
 * Redux slice for Create mode media generation.
 * Manages provider selection, generation state, and persistent galleries.
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { AIProvider } from '../types';
import type {
  CreateMediaAssetStatus,
  CreateMediaOperation,
  CreateMediaType,
  CreateTab,
  MediaProviderId,
} from '../types/media';
import { resolveImageModelId } from '../config/imageGenerationModels';
import {
  RUNWAY_DEFAULT_ASPECT_RATIO,
  RUNWAY_DEFAULT_DURATION_SECONDS,
  RUNWAY_DEFAULT_VIDEO_MODEL,
  RUNWAY_VIDEO_MAX_POLL_MS,
  RUNWAY_VIDEO_POLL_INTERVAL_MS,
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_DEFAULT_SFX_MODEL,
  ELEVENLABS_DEFAULT_TTS_MODEL,
  ELEVENLABS_DEFAULT_VOICE_ID,
  isRunwayPromptRequired,
} from '../config/mediaProviders';
import {
  isFileSystemImageUri,
  isRemoteImageUri,
  persistImageUri,
} from '../services/images/fileCache';
import MediaGenerationService from '../services/media/MediaGenerationService';
import { persistMediaDataUri, persistRemoteMedia, deleteMediaFile } from '../services/media/mediaFileCache';
import { prepareRunwaySourceImage } from '../services/media/sourceImage';

// Constants
const GALLERY_STORAGE_KEY = 'create_gallery';
const MEDIA_GALLERY_STORAGE_KEY = 'create_media_gallery';
const ACTIVE_MEDIA_TASK_STORAGE_KEY = 'create_active_media_task';
export const LOCAL_GALLERY_ASSET_LIMIT = 500;

// Types
export type StylePreset =
  | 'none'
  | 'photo'
  | 'cinematic'
  | 'anime'
  | 'digital-art'
  | 'oil-painting'
  | 'watercolor'
  | 'sketch'
  | '3d-render';

export type SizeOption = 'auto' | 'square' | 'portrait' | 'landscape';
export type QualityOption = 'standard' | 'hd';
export type GenerationProgress = 'pending' | 'generating' | 'complete' | 'error';
export type GalleryAssetType = 'image' | 'video' | 'audio';
export type GalleryTab = 'all' | GalleryAssetType;
export type GallerySortMode = 'newest' | 'oldest' | 'provider' | 'model';
export type GalleryDateRangeFilter = 'all' | 'today' | 'week' | 'month';
export type GalleryAvailabilityFilter = 'all' | 'available' | 'remote_expiring' | 'failed';

export interface GalleryFilterState {
  providers: string[];
  models: string[];
  operations: string[];
  dateRange: GalleryDateRangeFilter;
  availability: GalleryAvailabilityFilter;
}

export interface GalleryAsset {
  id: string;
  type: GalleryAssetType;
  source: 'image' | 'media';
  entry: GeneratedImageEntry | GeneratedMediaEntry;
  prompt: string;
  originalPrompt?: string;
  revisedPrompt?: string;
  providerId: string;
  modelId: string;
  operation?: CreateMediaOperation;
  uri: string;
  mimeType?: string;
  durationSeconds?: number;
  status?: CreateMediaAssetStatus;
  createdAt: number;
  expiresAt?: number;
  isRefinement?: boolean;
  isUploaded?: boolean;
}

export interface GeneratedImageEntry {
  id: string;
  uri: string;                // Local file path
  prompt: string;
  originalPrompt: string;     // Without style/quality suffixes
  provider: AIProvider;
  model: string;
  style?: StylePreset;
  size?: SizeOption;
  quality?: QualityOption;
  createdAt: number;
  isRefinement: boolean;
  isUploaded: boolean;
  parentImageId?: string;     // For img2img refinements
  refinementInstructions?: string;
  revisedPrompt?: string;     // Provider's enhanced prompt
}

export interface GeneratedMediaEntry {
  id: string;
  mediaType: CreateMediaType;
  providerId: MediaProviderId;
  modelId: string;
  operation: CreateMediaOperation;
  prompt: string;
  uri: string;
  remoteUrl?: string;
  mimeType: string;
  durationSeconds?: number;
  providerTaskId?: string;
  status: CreateMediaAssetStatus;
  createdAt: number;
  expiresAt?: number;
  error?: string;
}

export function normalizeGalleryAssets(
  gallery: GeneratedImageEntry[],
  mediaGallery: GeneratedMediaEntry[]
): GalleryAsset[] {
  return [
    ...gallery.map((entry): GalleryAsset => ({
      id: entry.id,
      type: 'image',
      source: 'image',
      entry,
      prompt: entry.prompt,
      originalPrompt: entry.originalPrompt,
      revisedPrompt: entry.revisedPrompt,
      providerId: entry.provider,
      modelId: entry.model,
      uri: entry.uri,
      createdAt: entry.createdAt,
      isRefinement: entry.isRefinement,
      isUploaded: entry.isUploaded,
    })),
    ...mediaGallery.map((entry): GalleryAsset => ({
      id: entry.id,
      type: entry.mediaType,
      source: 'media',
      entry,
      prompt: entry.prompt,
      providerId: entry.providerId,
      modelId: entry.modelId,
      operation: entry.operation,
      uri: entry.uri,
      mimeType: entry.mimeType,
      durationSeconds: entry.durationSeconds,
      status: entry.status,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);
}

export function getGalleryAssetCounts(assets: GalleryAsset[]): Record<GalleryTab, number> {
  return assets.reduce<Record<GalleryTab, number>>(
    (counts, asset) => {
      counts.all += 1;
      counts[asset.type] += 1;
      return counts;
    },
    { all: 0, image: 0, video: 0, audio: 0 }
  );
}

function matchesGalleryDateRange(asset: GalleryAsset, dateRange: GalleryDateRangeFilter, now = Date.now()): boolean {
  if (dateRange === 'all') return true;
  const age = now - asset.createdAt;
  if (dateRange === 'today') return age <= 24 * 60 * 60 * 1000;
  if (dateRange === 'week') return age <= 7 * 24 * 60 * 60 * 1000;
  return age <= 30 * 24 * 60 * 60 * 1000;
}

function matchesGalleryAvailability(asset: GalleryAsset, availability: GalleryAvailabilityFilter): boolean {
  if (availability === 'all') return true;
  if (availability === 'failed') return asset.status === 'failed';
  if (availability === 'remote_expiring') return Boolean(asset.expiresAt && asset.uri.startsWith('http'));
  return Boolean(asset.uri) && asset.status !== 'failed';
}

export function getFilteredGalleryAssets(
  assets: GalleryAsset[],
  searchQuery: string,
  filters: GalleryFilterState,
  now = Date.now()
): GalleryAsset[] {
  const query = searchQuery.trim().toLowerCase();

  return assets.filter((asset) => {
    if (filters.providers.length > 0 && !filters.providers.includes(asset.providerId)) {
      return false;
    }
    if (filters.models.length > 0 && !filters.models.includes(asset.modelId)) {
      return false;
    }
    if (filters.operations.length > 0 && !filters.operations.includes(asset.operation || asset.type)) {
      return false;
    }
    if (!matchesGalleryDateRange(asset, filters.dateRange, now)) {
      return false;
    }
    if (!matchesGalleryAvailability(asset, filters.availability)) {
      return false;
    }

    if (!query) return true;

    const searchable = [
      asset.type,
      asset.prompt,
      asset.originalPrompt,
      asset.revisedPrompt,
      asset.providerId,
      asset.modelId,
      asset.operation,
      asset.mimeType,
      asset.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(query);
  });
}

export function getSortedGalleryAssets(assets: GalleryAsset[], sortMode: GallerySortMode): GalleryAsset[] {
  const sorted = [...assets];
  if (sortMode === 'oldest') {
    return sorted.sort((a, b) => a.createdAt - b.createdAt);
  }
  if (sortMode === 'provider') {
    return sorted.sort((a, b) => (
      a.providerId.localeCompare(b.providerId) ||
      b.createdAt - a.createdAt
    ));
  }
  if (sortMode === 'model') {
    return sorted.sort((a, b) => (
      a.modelId.localeCompare(b.modelId) ||
      b.createdAt - a.createdAt
    ));
  }
  return sorted.sort((a, b) => b.createdAt - a.createdAt);
}

export function getGalleryRetentionOverflow(
  gallery: GeneratedImageEntry[],
  mediaGallery: GeneratedMediaEntry[]
): { images: GeneratedImageEntry[]; media: GeneratedMediaEntry[] } {
  const combined = [
    ...gallery.map((entry) => ({ source: 'image' as const, entry, createdAt: entry.createdAt })),
    ...mediaGallery.map((entry) => ({ source: 'media' as const, entry, createdAt: entry.createdAt })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const overflow = combined.slice(LOCAL_GALLERY_ASSET_LIMIT);
  return {
    images: overflow
      .filter((item): item is { source: 'image'; entry: GeneratedImageEntry; createdAt: number } => item.source === 'image')
      .map((item) => item.entry),
    media: overflow
      .filter((item): item is { source: 'media'; entry: GeneratedMediaEntry; createdAt: number } => item.source === 'media')
      .map((item) => item.entry),
  };
}

export interface MediaGenerationState {
  id: string;
  mediaType: CreateMediaType;
  providerId: MediaProviderId;
  operation: CreateMediaOperation;
  modelId: string;
  prompt: string;
  status: CreateMediaAssetStatus;
  phase: GenerationProgress | 'queued' | 'rendering';
  startedAt: number;
  providerTaskId?: string;
  message?: string;
  error?: string;
}

export interface ActiveRunwayTask {
  id: string;
  providerTaskId: string;
  prompt: string;
  operation: Extract<CreateMediaOperation, 'text_to_video' | 'image_to_video'>;
  modelId: string;
  durationSeconds: number;
  aspectRatio: string;
  startedAt: number;
  sourceImage?: string;
}

export interface CreateActivityState {
  status: 'idle' | 'running' | 'completed' | 'failed';
  hasUnseenActivity: boolean;
  lastEventId?: string;
  lastMessage?: string;
  lastCompletedAt?: number;
}

export interface CreateState {
  activeTab: CreateTab;

  // Provider selection
  selectedProviders: AIProvider[];
  selectedModels: Partial<Record<AIProvider, string>>;
  mode: 'single' | 'compare';

  // Current generation state
  isGenerating: boolean;
  generationProgress: Record<string, GenerationProgress>;
  generationError?: string;

  // Prompt and options
  currentPrompt: string;
  selectedStyle: StylePreset;
  selectedSize: SizeOption;
  selectedQuality: QualityOption;

  // Gallery (persisted)
  gallery: GeneratedImageEntry[];
  galleryHydrated: boolean;
  mediaGallery: GeneratedMediaEntry[];
  mediaGalleryHydrated: boolean;
  mediaGeneration: Record<CreateMediaType, MediaGenerationState | null>;
  lastMediaGenerationResult?: {
    id: string;
    mediaType: CreateMediaType;
    status: 'succeeded' | 'failed' | 'canceled';
    message: string;
    completedAt: number;
  };
  activeRunwayTask?: ActiveRunwayTask;
  createActivity: CreateActivityState;

  // Refinement state
  isRefining: boolean;
  refiningImageId?: string;
  refinementPrompt: string;

  // Source image for img2img upload
  sourceImageUri?: string;
  sourceImageBase64?: string;

  // UI state
  focusedImageId?: string;
}

const initialState: CreateState = {
  activeTab: 'image',
  selectedProviders: [],
  selectedModels: {},
  mode: 'single',
  isGenerating: false,
  generationProgress: {},
  currentPrompt: '',
  selectedStyle: 'none',
  selectedSize: 'auto',
  selectedQuality: 'standard',
  gallery: [],
  galleryHydrated: false,
  mediaGallery: [],
  mediaGalleryHydrated: false,
  mediaGeneration: {
    video: null,
    audio: null,
  },
  createActivity: {
    status: 'idle',
    hasUnseenActivity: false,
  },
  isRefining: false,
  refinementPrompt: '',
};

async function deleteGalleryFile(uri?: string): Promise<void> {
  if (!uri || !isFileSystemImageUri(uri)) {
    return;
  }

  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore cleanup failures
  }
}

async function persistActiveRunwayTask(task?: ActiveRunwayTask): Promise<void> {
  try {
    if (task) {
      await AsyncStorage.setItem(ACTIVE_MEDIA_TASK_STORAGE_KEY, JSON.stringify(task));
    } else {
      await AsyncStorage.removeItem(ACTIVE_MEDIA_TASK_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('[createSlice] Failed to persist active media task:', error);
  }
}

async function persistGalleryEntries(gallery: GeneratedImageEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(gallery));
  } catch (error) {
    console.warn('[createSlice] Failed to persist gallery:', error);
  }
}

async function persistMediaGalleryEntries(mediaGallery: GeneratedMediaEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MEDIA_GALLERY_STORAGE_KEY, JSON.stringify(dedupeMediaGalleryEntries(mediaGallery)));
  } catch (error) {
    console.warn('[createSlice] Failed to persist media gallery:', error);
  }
}

function dedupeMediaGalleryEntries(entries: GeneratedMediaEntry[]): GeneratedMediaEntry[] {
  const seen = new Set<string>();
  const deduped: GeneratedMediaEntry[] = [];
  entries.forEach((entry) => {
    if (!entry.uri || seen.has(entry.id)) return;
    seen.add(entry.id);
    deduped.push(entry);
  });
  return deduped;
}

async function deleteGeneratedMediaFile(entry?: GeneratedMediaEntry): Promise<void> {
  if (!entry?.uri) return;
  await deleteMediaFile(entry.uri);
}

async function pruneGalleryOverflow(
  dispatch: (action: unknown) => void,
  getState: () => unknown
): Promise<void> {
  const state = getState() as { create: CreateState };
  const overflow = getGalleryRetentionOverflow(state.create.gallery, state.create.mediaGallery);
  if (overflow.images.length === 0 && overflow.media.length === 0) {
    return;
  }

  dispatch(pruneGalleryAssets({
    imageIds: overflow.images.map((entry) => entry.id),
    mediaIds: overflow.media.map((entry) => entry.id),
  }));

  await Promise.all([
    ...overflow.images.map((entry) => entry.uri ? deleteGalleryFile(entry.uri) : Promise.resolve()),
    ...overflow.media.map((entry) => deleteGeneratedMediaFile(entry)),
  ]);

  const nextState = getState() as { create: CreateState };
  await Promise.all([
    persistGalleryEntries(nextState.create.gallery),
    persistMediaGalleryEntries(nextState.create.mediaGallery),
  ]);
}

async function getStoredProviderKey(providerId: MediaProviderId): Promise<string | null> {
  const module = await import('../services/APIKeyService');
  return module.default.getKey(providerId);
}

// Async thunk to hydrate gallery from AsyncStorage
export const hydrateGallery = createAsyncThunk(
  'create/hydrateGallery',
  async () => {
    try {
      const stored = await AsyncStorage.getItem(GALLERY_STORAGE_KEY);
      if (stored) {
        const gallery = JSON.parse(stored) as GeneratedImageEntry[];
        // Validate that files still exist
        const validGallery: GeneratedImageEntry[] = [];
        let didNormalizeGallery = false;
        for (const entry of gallery) {
          if (entry.uri) {
            if (isRemoteImageUri(entry.uri)) {
              const persistedUri = await persistImageUri(entry.uri, { prefix: 'gallery' });
              if (persistedUri && persistedUri !== entry.uri) {
                validGallery.push({ ...entry, uri: persistedUri });
                didNormalizeGallery = true;
              } else {
                validGallery.push(entry);
              }
              continue;
            }

            const persistedUri = await persistImageUri(entry.uri, { prefix: 'gallery' });
            if (persistedUri) {
              validGallery.push(persistedUri === entry.uri ? entry : { ...entry, uri: persistedUri });
              if (persistedUri !== entry.uri) {
                didNormalizeGallery = true;
              }
            } else {
              didNormalizeGallery = true;
            }
          }
        }
        if (didNormalizeGallery || validGallery.length !== gallery.length) {
          await AsyncStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(validGallery));
        }
        return validGallery;
      }
      return [];
    } catch (error) {
      console.warn('[createSlice] Failed to hydrate gallery:', error);
      return [];
    }
  }
);

// Async thunk to persist gallery to AsyncStorage
export const persistGallery = createAsyncThunk(
  'create/persistGallery',
  async (gallery: GeneratedImageEntry[]) => {
    await persistGalleryEntries(gallery);
  }
);

export const hydrateMediaGallery = createAsyncThunk(
  'create/hydrateMediaGallery',
  async () => {
    try {
      const [storedGallery, storedTask] = await Promise.all([
        AsyncStorage.getItem(MEDIA_GALLERY_STORAGE_KEY),
        AsyncStorage.getItem(ACTIVE_MEDIA_TASK_STORAGE_KEY),
      ]);
      const mediaGallery = storedGallery
        ? dedupeMediaGalleryEntries(JSON.parse(storedGallery) as GeneratedMediaEntry[])
        : [];
      const activeRunwayTask = storedTask
        ? JSON.parse(storedTask) as ActiveRunwayTask
        : undefined;
      return { mediaGallery, activeRunwayTask };
    } catch (error) {
      console.warn('[createSlice] Failed to hydrate media gallery:', error);
      return { mediaGallery: [], activeRunwayTask: undefined };
    }
  }
);

export const persistMediaGallery = createAsyncThunk(
  'create/persistMediaGallery',
  async (mediaGallery: GeneratedMediaEntry[]) => {
    await persistMediaGalleryEntries(mediaGallery);
  }
);

export const addToMediaGalleryWithCleanup = createAsyncThunk(
  'create/addToMediaGalleryWithCleanup',
  async (entry: GeneratedMediaEntry, { dispatch, getState }) => {
    const state = getState() as { create: CreateState };
    const existing = state.create.mediaGallery.find((item) => item.id === entry.id);

    dispatch(addToMediaGallery(entry));

    if (existing && existing.uri !== entry.uri) {
      await deleteGeneratedMediaFile(existing);
    }

    await pruneGalleryOverflow(dispatch, getState);
    const nextState = getState() as { create: CreateState };
    await Promise.all([
      persistGalleryEntries(nextState.create.gallery),
      persistMediaGalleryEntries(nextState.create.mediaGallery),
    ]);
  }
);

export const removeFromMediaGalleryWithCleanup = createAsyncThunk(
  'create/removeFromMediaGalleryWithCleanup',
  async (mediaId: string, { dispatch, getState }) => {
    const state = getState() as { create: CreateState };
    const removed = state.create.mediaGallery.find((entry) => entry.id === mediaId);

    dispatch(removeFromMediaGallery(mediaId));

    await deleteGeneratedMediaFile(removed);

    const nextState = getState() as { create: CreateState };
    await persistMediaGalleryEntries(nextState.create.mediaGallery);
  }
);

export const clearMediaGalleryWithCleanup = createAsyncThunk(
  'create/clearMediaGalleryWithCleanup',
  async (_, { dispatch, getState }) => {
    const state = getState() as { create: CreateState };
    const entries = state.create.mediaGallery;

    dispatch(clearMediaGallery());
    await Promise.all(entries.map((entry) => deleteGeneratedMediaFile(entry)));
    await persistMediaGalleryEntries([]);
  }
);

export const addToGalleryWithCleanup = createAsyncThunk(
  'create/addToGalleryWithCleanup',
  async (entry: GeneratedImageEntry, { dispatch, getState }) => {
    dispatch(addToGallery(entry));

    await pruneGalleryOverflow(dispatch, getState);
    const nextState = getState() as { create: CreateState };
    await Promise.all([
      persistGalleryEntries(nextState.create.gallery),
      persistMediaGalleryEntries(nextState.create.mediaGallery),
    ]);
  }
);

export const removeFromGalleryWithCleanup = createAsyncThunk(
  'create/removeFromGalleryWithCleanup',
  async (imageId: string, { dispatch, getState }) => {
    const state = getState() as { create: CreateState };
    const removed = state.create.gallery.find((image) => image.id === imageId);

    dispatch(removeFromGallery(imageId));

    if (removed?.uri) {
      await deleteGalleryFile(removed.uri);
    }

    const nextState = getState() as { create: CreateState };
    await persistGalleryEntries(nextState.create.gallery);
  }
);

export const clearGalleryWithCleanup = createAsyncThunk(
  'create/clearGalleryWithCleanup',
  async (_, { dispatch, getState }) => {
    const state = getState() as { create: CreateState };
    const urisToDelete = state.create.gallery
      .map((image) => image.uri)
      .filter((uri): uri is string => Boolean(uri));

    dispatch(clearGallery());
    await Promise.all(urisToDelete.map((uri) => deleteGalleryFile(uri)));
    await persistGalleryEntries([]);
  }
);

function buildMediaGenerationId(providerId: MediaProviderId): string {
  return `media_${Date.now()}_${providerId}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapMediaStatusToPhase(status: CreateMediaAssetStatus): MediaGenerationState['phase'] {
  if (status === 'running') return 'rendering';
  if (status === 'succeeded') return 'complete';
  if (status === 'failed' || status === 'canceled') return 'error';
  return 'queued';
}

function getRunwayTimeoutMessage(providerTaskId: string, startedAt: number, now = Date.now()): string {
  const elapsedMinutes = Math.max(1, Math.round((now - startedAt) / 60_000));
  return `Runway has not returned a video after ${elapsedMinutes} minutes. The task may still be delayed in Runway. Task ID: ${providerTaskId}.`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GenerateCreateVideoPayload {
  prompt: string;
  modelId?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  sourceImageUri?: string;
}

export interface GenerateCreateAudioPayload {
  prompt: string;
  operation: Extract<CreateMediaOperation, 'text_to_speech' | 'sound_effect'>;
  modelId?: string;
  voiceId?: string;
  outputFormat?: string;
  durationSeconds?: number;
  promptInfluence?: number;
}

async function pollRunwayTaskToCompletion(
  apiKey: string,
  activeTask: ActiveRunwayTask,
  dispatch: (action: unknown) => unknown
): Promise<GeneratedMediaEntry> {
  let currentStatus: CreateMediaAssetStatus = 'queued';

  while (true) {
    if (Date.now() - activeTask.startedAt >= RUNWAY_VIDEO_MAX_POLL_MS) {
      throw new Error(getRunwayTimeoutMessage(activeTask.providerTaskId, activeTask.startedAt));
    }

    await delay(RUNWAY_VIDEO_POLL_INTERVAL_MS);
    const statusResult = await MediaGenerationService.getRunwayTaskStatus(apiKey, activeTask.providerTaskId);
    currentStatus = statusResult.status;

    dispatch(updateMediaGeneration({
      mediaType: 'video',
      status: currentStatus,
      phase: mapMediaStatusToPhase(currentStatus),
      message: currentStatus === 'running' ? 'Rendering video...' : 'Queued at Runway...',
    }));

    if (currentStatus === 'failed' || currentStatus === 'canceled') {
      throw new Error(statusResult.error || `Runway video ${currentStatus}.`);
    }

    if (currentStatus === 'succeeded') {
      const remoteUrl = statusResult.outputUrls?.[0];
      if (!remoteUrl) {
        throw new Error('Runway completed without returning a video URL.');
      }

      const id = activeTask.id;
      const mimeType = 'video/mp4';
      let uri = remoteUrl;
      try {
        uri = await persistRemoteMedia(remoteUrl, { id, mediaType: 'video', mimeType });
      } catch {
        uri = remoteUrl;
      }

      return {
        id,
        mediaType: 'video',
        providerId: 'runway',
        modelId: activeTask.modelId,
        operation: activeTask.operation,
        prompt: activeTask.prompt,
        uri,
        remoteUrl,
        mimeType,
        durationSeconds: activeTask.durationSeconds,
        providerTaskId: activeTask.providerTaskId,
        status: 'succeeded',
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
    }
  }
}

export const generateCreateVideo = createAsyncThunk(
  'create/generateCreateVideo',
  async (payload: GenerateCreateVideoPayload, { dispatch, getState }) => {
    const prompt = payload.prompt.trim();
    const modelId = payload.modelId || RUNWAY_DEFAULT_VIDEO_MODEL;
    const operation: Extract<CreateMediaOperation, 'text_to_video' | 'image_to_video'> = payload.sourceImageUri
      ? 'image_to_video'
      : 'text_to_video';

    if (isRunwayPromptRequired(modelId, operation) && !prompt) {
      throw new Error('A prompt is required for this Runway model.');
    }

    const id = buildMediaGenerationId('runway');
    dispatch(startMediaGeneration({
      id,
      mediaType: 'video',
      providerId: 'runway',
      operation,
      modelId,
      prompt,
      message: 'Starting Runway video task...',
    }));

    try {
      const apiKey = await getStoredProviderKey('runway');
      if (!apiKey) {
        throw new Error('Add a Runway API key before generating video.');
      }

      if (payload.sourceImageUri) {
        dispatch(updateMediaGeneration({
          mediaType: 'video',
          message: 'Preparing source image...',
        }));
      }

      const preparedSource = payload.sourceImageUri
        ? (await prepareRunwaySourceImage(payload.sourceImageUri)).sourceImage
        : undefined;

      dispatch(updateMediaGeneration({
        mediaType: 'video',
        message: 'Submitting to Runway...',
      }));

      const task = await MediaGenerationService.startRunwayVideo({
        apiKey,
        operation,
        prompt,
        modelId,
        durationSeconds: payload.durationSeconds || RUNWAY_DEFAULT_DURATION_SECONDS,
        aspectRatio: payload.aspectRatio || RUNWAY_DEFAULT_ASPECT_RATIO,
        sourceImage: preparedSource,
      });

      const activeTask: ActiveRunwayTask = {
        id,
        providerTaskId: task.providerTaskId,
        prompt,
        operation,
        modelId,
        durationSeconds: payload.durationSeconds || RUNWAY_DEFAULT_DURATION_SECONDS,
        aspectRatio: payload.aspectRatio || RUNWAY_DEFAULT_ASPECT_RATIO,
        sourceImage: preparedSource,
        startedAt: Date.now(),
      };
      dispatch(setActiveRunwayTask(activeTask));
      await persistActiveRunwayTask(activeTask);

      dispatch(updateMediaGeneration({
        mediaType: 'video',
        status: task.status,
        phase: mapMediaStatusToPhase(task.status),
        providerTaskId: task.providerTaskId,
        message: 'Runway task queued...',
      }));

      const entry = await pollRunwayTaskToCompletion(apiKey, activeTask, dispatch);
      dispatch(addToMediaGalleryWithCleanup(entry));
      dispatch(completeMediaGeneration({
        mediaType: 'video',
        status: 'succeeded',
        message: 'Video generation complete.',
        resultId: entry.id,
      }));
      dispatch(setActiveRunwayTask(undefined));
      await persistActiveRunwayTask(undefined);
      await MediaGenerationService.recordMediaGeneration({
        providerId: 'runway',
        mediaType: 'video',
        operation,
        modelId,
      });
      return entry;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video generation failed.';
      dispatch(failMediaGeneration({ mediaType: 'video', message }));
      dispatch(setActiveRunwayTask(undefined));
      await persistActiveRunwayTask(undefined);
      throw error;
    } finally {
      const state = getState() as { create: CreateState };
      await persistMediaGalleryEntries(state.create.mediaGallery);
    }
  }
);

export const resumeCreateMediaTasks = createAsyncThunk(
  'create/resumeCreateMediaTasks',
  async (_, { dispatch, getState }) => {
    const state = getState() as { create: CreateState };
    const activeTask = state.create.activeRunwayTask;
    if (!activeTask) return undefined;

    if (Date.now() - activeTask.startedAt >= RUNWAY_VIDEO_MAX_POLL_MS) {
      const message = getRunwayTimeoutMessage(activeTask.providerTaskId, activeTask.startedAt);
      dispatch(failMediaGeneration({ mediaType: 'video', message }));
      dispatch(setActiveRunwayTask(undefined));
      await persistActiveRunwayTask(undefined);
      return undefined;
    }

    const apiKey = await getStoredProviderKey('runway');
    if (!apiKey) {
      dispatch(failMediaGeneration({
        mediaType: 'video',
        message: 'Runway API key is missing, so video polling could not resume.',
      }));
      return undefined;
    }

    dispatch(startMediaGeneration({
      id: activeTask.id,
      mediaType: 'video',
      providerId: 'runway',
      operation: activeTask.operation,
      modelId: activeTask.modelId,
      prompt: activeTask.prompt,
      providerTaskId: activeTask.providerTaskId,
      message: 'Resuming Runway video polling...',
    }));

    try {
      const entry = await pollRunwayTaskToCompletion(apiKey, activeTask, dispatch);
      dispatch(addToMediaGalleryWithCleanup(entry));
      dispatch(completeMediaGeneration({
        mediaType: 'video',
        status: 'succeeded',
        message: 'Video generation complete.',
        resultId: entry.id,
      }));
      dispatch(setActiveRunwayTask(undefined));
      await persistActiveRunwayTask(undefined);
      return entry;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video generation failed.';
      dispatch(failMediaGeneration({ mediaType: 'video', message }));
      dispatch(setActiveRunwayTask(undefined));
      await persistActiveRunwayTask(undefined);
      return undefined;
    }
  }
);

export const generateCreateAudio = createAsyncThunk(
  'create/generateCreateAudio',
  async (payload: GenerateCreateAudioPayload, { dispatch, getState }) => {
    const prompt = payload.prompt.trim();
    if (!prompt) {
      throw new Error('Enter audio text or a sound prompt first.');
    }

    const id = buildMediaGenerationId('elevenlabs');
    const modelId = payload.modelId || (payload.operation === 'text_to_speech'
      ? ELEVENLABS_DEFAULT_TTS_MODEL
      : ELEVENLABS_DEFAULT_SFX_MODEL);

    dispatch(startMediaGeneration({
      id,
      mediaType: 'audio',
      providerId: 'elevenlabs',
      operation: payload.operation,
      modelId,
      prompt,
      message: 'Generating audio with ElevenLabs...',
    }));

    try {
      const apiKey = await getStoredProviderKey('elevenlabs');
      if (!apiKey) {
        throw new Error('Add an ElevenLabs API key before generating audio.');
      }

      const audio = await MediaGenerationService.generateElevenLabsAudio({
        apiKey,
        operation: payload.operation,
        prompt,
        modelId,
        voiceId: payload.voiceId || ELEVENLABS_DEFAULT_VOICE_ID,
        outputFormat: payload.outputFormat || ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
        durationSeconds: payload.durationSeconds,
        promptInfluence: payload.promptInfluence,
      });

      const persisted = await persistMediaDataUri(audio.dataUri, {
        id,
        mediaType: 'audio',
        fallbackMimeType: audio.mimeType,
      });

      const entry: GeneratedMediaEntry = {
        id,
        mediaType: 'audio',
        providerId: 'elevenlabs',
        modelId: audio.modelId,
        operation: payload.operation,
        prompt,
        uri: persisted.uri,
        mimeType: persisted.mimeType,
        durationSeconds: payload.durationSeconds,
        status: 'succeeded',
        createdAt: Date.now(),
      };

      dispatch(addToMediaGalleryWithCleanup(entry));
      dispatch(completeMediaGeneration({
        mediaType: 'audio',
        status: 'succeeded',
        message: 'Audio generation complete.',
        resultId: entry.id,
      }));
      await MediaGenerationService.recordMediaGeneration({
        providerId: 'elevenlabs',
        mediaType: 'audio',
        operation: payload.operation,
        modelId: audio.modelId,
      });
      return entry;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Audio generation failed.';
      dispatch(failMediaGeneration({ mediaType: 'audio', message }));
      throw error;
    } finally {
      const state = getState() as { create: CreateState };
      await persistMediaGalleryEntries(state.create.mediaGallery);
    }
  }
);

const createSlice_ = createSlice({
  name: 'create',
  initialState,
  reducers: {
    setActiveCreateTab: (state, action: PayloadAction<CreateTab>) => {
      state.activeTab = action.payload;
    },
    markCreateActivitySeen: (state) => {
      state.createActivity.hasUnseenActivity = false;
    },

    // Provider selection
    setSelectedProviders: (state, action: PayloadAction<AIProvider[]>) => {
      state.selectedProviders = action.payload.slice(0, 3); // Max 3 for compare
      state.mode = action.payload.length > 1 ? 'compare' : 'single';
    },
    setSelectedModel: (state, action: PayloadAction<{ provider: AIProvider; modelId: string }>) => {
      state.selectedModels[action.payload.provider] = resolveImageModelId(
        action.payload.provider,
        action.payload.modelId
      ) || action.payload.modelId;
    },
    toggleProvider: (state, action: PayloadAction<AIProvider>) => {
      const provider = action.payload;
      const index = state.selectedProviders.indexOf(provider);
      if (index >= 0) {
        state.selectedProviders.splice(index, 1);
      } else if (state.selectedProviders.length < 3) {
        state.selectedProviders.push(provider);
      }
      state.mode = state.selectedProviders.length > 1 ? 'compare' : 'single';
    },
    setMode: (state, action: PayloadAction<'single' | 'compare'>) => {
      state.mode = action.payload;
      if (action.payload === 'single' && state.selectedProviders.length > 1) {
        state.selectedProviders = [state.selectedProviders[0]];
      }
    },

    // Prompt and options
    setPrompt: (state, action: PayloadAction<string>) => {
      state.currentPrompt = action.payload;
    },
    setStyle: (state, action: PayloadAction<StylePreset>) => {
      state.selectedStyle = action.payload;
    },
    setSize: (state, action: PayloadAction<SizeOption>) => {
      state.selectedSize = action.payload;
    },
    setQuality: (state, action: PayloadAction<QualityOption>) => {
      state.selectedQuality = action.payload;
    },

    // Generation state
    startGeneration: (state, action: PayloadAction<AIProvider[]>) => {
      state.isGenerating = true;
      state.generationError = undefined;
      state.generationProgress = {};
      state.createActivity.status = 'running';
      action.payload.forEach(provider => {
        state.generationProgress[provider] = 'pending';
      });
    },
    updateGenerationProgress: (state, action: PayloadAction<{ provider: AIProvider; progress: GenerationProgress }>) => {
      state.generationProgress[action.payload.provider] = action.payload.progress;
    },
    completeGeneration: (state) => {
      state.isGenerating = false;
      state.createActivity.status = 'completed';
      state.createActivity.hasUnseenActivity = true;
      state.createActivity.lastCompletedAt = Date.now();
      state.createActivity.lastEventId = `image_${state.createActivity.lastCompletedAt}`;
      state.createActivity.lastMessage = 'Image generation complete.';
      // Mark any pending providers as complete
      Object.keys(state.generationProgress).forEach(provider => {
        if (state.generationProgress[provider] === 'generating') {
          state.generationProgress[provider] = 'complete';
        }
      });
    },
    generationError: (state, action: PayloadAction<string>) => {
      state.isGenerating = false;
      state.generationError = action.payload;
      state.createActivity.status = 'failed';
      state.createActivity.hasUnseenActivity = true;
      state.createActivity.lastCompletedAt = Date.now();
      state.createActivity.lastEventId = `image_error_${state.createActivity.lastCompletedAt}`;
      state.createActivity.lastMessage = action.payload;
    },
    clearGenerationError: (state) => {
      state.generationError = undefined;
    },

    // Gallery management
    addToGallery: (state, action: PayloadAction<GeneratedImageEntry>) => {
      state.gallery.unshift(action.payload);
    },
    updateGalleryEntryUri: (state, action: PayloadAction<{ id: string; uri: string }>) => {
      const entry = state.gallery.find((image) => image.id === action.payload.id);
      if (entry) {
        entry.uri = action.payload.uri;
      }
    },
    removeFromGallery: (state, action: PayloadAction<string>) => {
      const index = state.gallery.findIndex(img => img.id === action.payload);
      if (index >= 0) {
        state.gallery.splice(index, 1);
      }
    },
    clearGallery: (state) => {
      state.gallery = [];
    },
    startMediaGeneration: (state, action: PayloadAction<{
      id: string;
      mediaType: CreateMediaType;
      providerId: MediaProviderId;
      operation: CreateMediaOperation;
      modelId: string;
      prompt: string;
      providerTaskId?: string;
      message?: string;
    }>) => {
      const { mediaType } = action.payload;
      state.mediaGeneration[mediaType] = {
        ...action.payload,
        status: 'queued',
        phase: 'queued',
        startedAt: Date.now(),
      };
      state.createActivity.status = 'running';
      state.createActivity.lastMessage = action.payload.message;
    },
    updateMediaGeneration: (state, action: PayloadAction<{
      mediaType: CreateMediaType;
      status?: CreateMediaAssetStatus;
      phase?: MediaGenerationState['phase'];
      providerTaskId?: string;
      message?: string;
      error?: string;
    }>) => {
      const current = state.mediaGeneration[action.payload.mediaType];
      if (!current) return;
      if (action.payload.status) current.status = action.payload.status;
      if (action.payload.phase) current.phase = action.payload.phase;
      if (action.payload.providerTaskId) current.providerTaskId = action.payload.providerTaskId;
      if (action.payload.message) {
        current.message = action.payload.message;
        state.createActivity.lastMessage = action.payload.message;
      }
      if (action.payload.error) current.error = action.payload.error;
    },
    completeMediaGeneration: (state, action: PayloadAction<{
      mediaType: CreateMediaType;
      status: 'succeeded' | 'failed' | 'canceled';
      message: string;
      resultId?: string;
    }>) => {
      const current = state.mediaGeneration[action.payload.mediaType];
      if (current) {
        current.status = action.payload.status;
        current.phase = action.payload.status === 'succeeded' ? 'complete' : 'error';
        current.message = action.payload.message;
      }
      const completedAt = Date.now();
      state.lastMediaGenerationResult = {
        id: action.payload.resultId || current?.id || `media_${completedAt}`,
        mediaType: action.payload.mediaType,
        status: action.payload.status,
        message: action.payload.message,
        completedAt,
      };
      state.mediaGeneration[action.payload.mediaType] = null;
      state.createActivity.status = action.payload.status === 'succeeded' ? 'completed' : 'failed';
      state.createActivity.hasUnseenActivity = true;
      state.createActivity.lastCompletedAt = completedAt;
      state.createActivity.lastEventId = state.lastMediaGenerationResult.id;
      state.createActivity.lastMessage = action.payload.message;
    },
    failMediaGeneration: (state, action: PayloadAction<{
      mediaType: CreateMediaType;
      message: string;
    }>) => {
      const current = state.mediaGeneration[action.payload.mediaType];
      if (current) {
        current.status = 'failed';
        current.phase = 'error';
        current.error = action.payload.message;
        current.message = action.payload.message;
      }
      const completedAt = Date.now();
      state.lastMediaGenerationResult = {
        id: current?.id || `media_error_${completedAt}`,
        mediaType: action.payload.mediaType,
        status: 'failed',
        message: action.payload.message,
        completedAt,
      };
      state.mediaGeneration[action.payload.mediaType] = null;
      state.createActivity.status = 'failed';
      state.createActivity.hasUnseenActivity = true;
      state.createActivity.lastCompletedAt = completedAt;
      state.createActivity.lastEventId = state.lastMediaGenerationResult.id;
      state.createActivity.lastMessage = action.payload.message;
    },
    addToMediaGallery: (state, action: PayloadAction<GeneratedMediaEntry>) => {
      const existingIndex = state.mediaGallery.findIndex((entry) => entry.id === action.payload.id);
      if (existingIndex >= 0) {
        state.mediaGallery.splice(existingIndex, 1);
      }
      state.mediaGallery.unshift(action.payload);
    },
    removeFromMediaGallery: (state, action: PayloadAction<string>) => {
      const index = state.mediaGallery.findIndex((entry) => entry.id === action.payload);
      if (index >= 0) {
        state.mediaGallery.splice(index, 1);
      }
    },
    clearMediaGallery: (state) => {
      state.mediaGallery = [];
    },
    pruneGalleryAssets: (state, action: PayloadAction<{ imageIds: string[]; mediaIds: string[] }>) => {
      if (action.payload.imageIds.length > 0) {
        const imageIds = new Set(action.payload.imageIds);
        state.gallery = state.gallery.filter((entry) => !imageIds.has(entry.id));
      }
      if (action.payload.mediaIds.length > 0) {
        const mediaIds = new Set(action.payload.mediaIds);
        state.mediaGallery = state.mediaGallery.filter((entry) => !mediaIds.has(entry.id));
      }
    },
    setActiveRunwayTask: (state, action: PayloadAction<ActiveRunwayTask | undefined>) => {
      state.activeRunwayTask = action.payload;
    },

    // Refinement state
    startRefinement: (state, action: PayloadAction<string>) => {
      state.isRefining = true;
      state.refiningImageId = action.payload;
      state.refinementPrompt = '';
    },
    setRefinementPrompt: (state, action: PayloadAction<string>) => {
      state.refinementPrompt = action.payload;
    },
    cancelRefinement: (state) => {
      state.isRefining = false;
      state.refiningImageId = undefined;
      state.refinementPrompt = '';
    },
    completeRefinement: (state) => {
      state.isRefining = false;
      state.refiningImageId = undefined;
      state.refinementPrompt = '';
    },

    // Source image for upload
    setSourceImage: (state, action: PayloadAction<{ uri: string; base64?: string }>) => {
      state.sourceImageUri = action.payload.uri;
      state.sourceImageBase64 = action.payload.base64;
    },
    clearSourceImage: (state) => {
      state.sourceImageUri = undefined;
      state.sourceImageBase64 = undefined;
    },

    // UI state
    setFocusedImage: (state, action: PayloadAction<string | undefined>) => {
      state.focusedImageId = action.payload;
    },

    // Reset state (for cleanup)
    resetCreateState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateGallery.fulfilled, (state, action) => {
        state.gallery = action.payload;
        state.galleryHydrated = true;
      })
      .addCase(hydrateGallery.rejected, (state) => {
        state.galleryHydrated = true; // Mark as hydrated even on error
      })
      .addCase(hydrateMediaGallery.fulfilled, (state, action) => {
        state.mediaGallery = action.payload.mediaGallery;
        state.activeRunwayTask = action.payload.activeRunwayTask;
        state.mediaGalleryHydrated = true;
      })
      .addCase(hydrateMediaGallery.rejected, (state) => {
        state.mediaGalleryHydrated = true;
      });
  },
});

export const {
  setActiveCreateTab,
  markCreateActivitySeen,
  setSelectedProviders,
  setSelectedModel,
  toggleProvider,
  setMode,
  setPrompt,
  setStyle,
  setSize,
  setQuality,
  startGeneration,
  updateGenerationProgress,
  completeGeneration,
  generationError,
  clearGenerationError,
  addToGallery,
  updateGalleryEntryUri,
  removeFromGallery,
  clearGallery,
  startMediaGeneration,
  updateMediaGeneration,
  completeMediaGeneration,
  failMediaGeneration,
  addToMediaGallery,
  removeFromMediaGallery,
  clearMediaGallery,
  pruneGalleryAssets,
  setActiveRunwayTask,
  startRefinement,
  setRefinementPrompt,
  cancelRefinement,
  completeRefinement,
  setSourceImage,
  clearSourceImage,
  setFocusedImage,
  resetCreateState,
} = createSlice_.actions;

export default createSlice_.reducer;

// Selectors
export const selectCreateState = (state: { create: CreateState }) => state.create;
export const selectGallery = (state: { create: CreateState }) => state.create.gallery;
export const selectMediaGallery = (state: { create: CreateState }) => state.create.mediaGallery;
export const selectGalleryAssets = (state: { create: CreateState }) => (
  normalizeGalleryAssets(state.create.gallery, state.create.mediaGallery)
);
export const selectGalleryAssetCounts = (state: { create: CreateState }) => (
  getGalleryAssetCounts(selectGalleryAssets(state))
);
export const selectIsGenerating = (state: { create: CreateState }) => state.create.isGenerating;
export const selectSelectedProviders = (state: { create: CreateState }) => state.create.selectedProviders;
export const selectGenerationProgress = (state: { create: CreateState }) => state.create.generationProgress;
export const selectCreateSelectedModels = (state: { create: CreateState }) => state.create.selectedModels;
export const selectCreateActivity = (state: { create: CreateState }) => state.create.createActivity;
export const selectMediaGeneration = (state: { create: CreateState }) => state.create.mediaGeneration;
