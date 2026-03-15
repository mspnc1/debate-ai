/**
 * Redux slice for Create mode - AI image generation
 * Manages provider selection, generation state, and persistent gallery
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { AIProvider } from '../types';
import { resolveImageModelId } from '../config/imageGenerationModels';
import {
  isFileSystemImageUri,
  isRemoteImageUri,
  persistImageUri,
} from '../services/images/fileCache';

// Constants
const GALLERY_STORAGE_KEY = 'create_gallery';
const MAX_GALLERY_SIZE = 50;

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

export interface CreateState {
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
    try {
      await AsyncStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(gallery));
    } catch (error) {
      console.warn('[createSlice] Failed to persist gallery:', error);
    }
  }
);

export const addToGalleryWithCleanup = createAsyncThunk(
  'create/addToGalleryWithCleanup',
  async (entry: GeneratedImageEntry, { dispatch, getState }) => {
    const state = getState() as { create: CreateState };
    const removed = state.create.gallery.length >= MAX_GALLERY_SIZE
      ? state.create.gallery[state.create.gallery.length - 1]
      : undefined;

    dispatch(addToGallery(entry));

    if (removed?.uri) {
      await deleteGalleryFile(removed.uri);
    }
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
  }
);

const createSlice_ = createSlice({
  name: 'create',
  initialState,
  reducers: {
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
      action.payload.forEach(provider => {
        state.generationProgress[provider] = 'pending';
      });
    },
    updateGenerationProgress: (state, action: PayloadAction<{ provider: AIProvider; progress: GenerationProgress }>) => {
      state.generationProgress[action.payload.provider] = action.payload.progress;
    },
    completeGeneration: (state) => {
      state.isGenerating = false;
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
    },
    clearGenerationError: (state) => {
      state.generationError = undefined;
    },

    // Gallery management
    addToGallery: (state, action: PayloadAction<GeneratedImageEntry>) => {
      state.gallery.unshift(action.payload);
      if (state.gallery.length > MAX_GALLERY_SIZE) {
        state.gallery.pop();
      }
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
      });
  },
});

export const {
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
export const selectIsGenerating = (state: { create: CreateState }) => state.create.isGenerating;
export const selectSelectedProviders = (state: { create: CreateState }) => state.create.selectedProviders;
export const selectGenerationProgress = (state: { create: CreateState }) => state.create.generationProgress;
export const selectCreateSelectedModels = (state: { create: CreateState }) => state.create.selectedModels;
