/**
 * Tests for createSlice - Redux slice for Create mode AI image generation
 */
import reducer, {
  setSelectedProviders,
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
  setActiveCreateTab,
  markCreateActivitySeen,
  startMediaGeneration,
  updateMediaGeneration,
  completeMediaGeneration,
  failMediaGeneration,
  addToGallery,
  addToGalleryWithCleanup,
  removeFromGallery,
  removeFromGalleryWithCleanup,
  clearGallery,
  clearGalleryWithCleanup,
  addToMediaGallery,
  addToMediaGalleryWithCleanup,
  removeFromMediaGallery,
  removeFromMediaGalleryWithCleanup,
  clearMediaGallery,
  clearMediaGalleryWithCleanup,
  setActiveRunwayTask,
  startRefinement,
  setRefinementPrompt,
  cancelRefinement,
  completeRefinement,
  setSourceImage,
  clearSourceImage,
  setFocusedImage,
  resetCreateState,
  selectCreateState,
  selectGallery,
  selectIsGenerating,
  selectSelectedProviders,
  selectGenerationProgress,
  hydrateGallery,
  persistGallery,
  hydrateMediaGallery,
  persistMediaGallery,
  type GeneratedImageEntry,
  type GeneratedMediaEntry,
  type ActiveRunwayTask,
} from '@/store/createSlice';
import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock expo-file-system
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  documentDirectory: '/documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue({ uri: '/documents/images/downloaded.png' }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

const initialState = reducer(undefined, { type: 'init' });

describe('createSlice', () => {
  const mockMedia: GeneratedMediaEntry = {
    id: 'media_1',
    mediaType: 'video',
    providerId: 'runway',
    modelId: 'gen4.5',
    operation: 'text_to_video',
    prompt: 'A cinematic orbital shot',
    uri: 'file:///test/video.mp4',
    remoteUrl: 'https://example.com/video.mp4',
    mimeType: 'video/mp4',
    durationSeconds: 5,
    providerTaskId: 'task_1',
    status: 'succeeded',
    createdAt: 123456,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('provider selection', () => {
    it('sets selected providers and updates mode', () => {
      const state = reducer(initialState, setSelectedProviders(['openai', 'google']));
      expect(state.selectedProviders).toEqual(['openai', 'google']);
      expect(state.mode).toBe('compare');
    });

    it('limits providers to maximum of 3', () => {
      const state = reducer(initialState, setSelectedProviders(['openai', 'google', 'grok', 'claude']));
      expect(state.selectedProviders).toHaveLength(3);
      expect(state.selectedProviders).toEqual(['openai', 'google', 'grok']);
    });

    it('sets mode to single when only one provider selected', () => {
      const state = reducer(initialState, setSelectedProviders(['openai']));
      expect(state.selectedProviders).toEqual(['openai']);
      expect(state.mode).toBe('single');
    });

    it('toggles provider on when not selected', () => {
      const state = reducer(initialState, toggleProvider('openai'));
      expect(state.selectedProviders).toContain('openai');
    });

    it('toggles provider off when already selected', () => {
      let state = reducer(initialState, toggleProvider('openai'));
      state = reducer(state, toggleProvider('openai'));
      expect(state.selectedProviders).not.toContain('openai');
    });

    it('does not add more than 3 providers via toggle', () => {
      let state = reducer(initialState, toggleProvider('openai'));
      state = reducer(state, toggleProvider('google'));
      state = reducer(state, toggleProvider('grok'));
      state = reducer(state, toggleProvider('claude'));
      expect(state.selectedProviders).toHaveLength(3);
      expect(state.selectedProviders).not.toContain('claude');
    });

    it('updates mode when toggling providers', () => {
      let state = reducer(initialState, toggleProvider('openai'));
      expect(state.mode).toBe('single');

      state = reducer(state, toggleProvider('google'));
      expect(state.mode).toBe('compare');
    });
  });

  describe('mode management', () => {
    it('sets mode to single', () => {
      const state = reducer(initialState, setMode('single'));
      expect(state.mode).toBe('single');
    });

    it('sets mode to compare', () => {
      const state = reducer(initialState, setMode('compare'));
      expect(state.mode).toBe('compare');
    });

    it('keeps only first provider when switching to single mode with multiple providers', () => {
      let state = reducer(initialState, setSelectedProviders(['openai', 'google']));
      state = reducer(state, setMode('single'));
      expect(state.selectedProviders).toHaveLength(1);
      expect(state.selectedProviders).toEqual(['openai']);
    });
  });

  describe('prompt and options', () => {
    it('sets prompt', () => {
      const state = reducer(initialState, setPrompt('A beautiful sunset'));
      expect(state.currentPrompt).toBe('A beautiful sunset');
    });

    it('sets style', () => {
      const state = reducer(initialState, setStyle('cinematic'));
      expect(state.selectedStyle).toBe('cinematic');
    });

    it('sets size', () => {
      const state = reducer(initialState, setSize('portrait'));
      expect(state.selectedSize).toBe('portrait');
    });

    it('sets quality', () => {
      const state = reducer(initialState, setQuality('hd'));
      expect(state.selectedQuality).toBe('hd');
    });

    it('supports all style presets', () => {
      const styles = ['none', 'photo', 'cinematic', 'anime', 'digital-art', 'oil-painting', 'watercolor', 'sketch', '3d-render'] as const;
      styles.forEach(style => {
        const state = reducer(initialState, setStyle(style));
        expect(state.selectedStyle).toBe(style);
      });
    });

    it('supports all size options', () => {
      const sizes = ['auto', 'square', 'portrait', 'landscape'] as const;
      sizes.forEach(size => {
        const state = reducer(initialState, setSize(size));
        expect(state.selectedSize).toBe(size);
      });
    });

    it('supports all quality options', () => {
      const qualities = ['standard', 'hd'] as const;
      qualities.forEach(quality => {
        const state = reducer(initialState, setQuality(quality));
        expect(state.selectedQuality).toBe(quality);
      });
    });
  });

  describe('generation state', () => {
    it('starts generation with providers', () => {
      const providers = ['openai', 'google'] as const;
      const state = reducer(initialState, startGeneration([...providers]));

      expect(state.isGenerating).toBe(true);
      expect(state.generationError).toBeUndefined();
      expect(state.generationProgress['openai']).toBe('pending');
      expect(state.generationProgress['google']).toBe('pending');
    });

    it('updates generation progress for specific provider', () => {
      let state = reducer(initialState, startGeneration(['openai']));
      state = reducer(state, updateGenerationProgress({ provider: 'openai', progress: 'generating' }));
      expect(state.generationProgress['openai']).toBe('generating');
    });

    it('completes generation and marks generating providers as complete', () => {
      let state = reducer(initialState, startGeneration(['openai']));
      state = reducer(state, updateGenerationProgress({ provider: 'openai', progress: 'generating' }));
      state = reducer(state, completeGeneration());

      expect(state.isGenerating).toBe(false);
      expect(state.generationProgress['openai']).toBe('complete');
    });

    it('sets generation error', () => {
      let state = reducer(initialState, startGeneration(['openai']));
      state = reducer(state, generationError('API rate limit exceeded'));

      expect(state.isGenerating).toBe(false);
      expect(state.generationError).toBe('API rate limit exceeded');
    });

    it('clears generation error', () => {
      let state = reducer(initialState, generationError('Some error'));
      state = reducer(state, clearGenerationError());

      expect(state.generationError).toBeUndefined();
    });

    it('handles error progress state', () => {
      let state = reducer(initialState, startGeneration(['openai']));
      state = reducer(state, updateGenerationProgress({ provider: 'openai', progress: 'error' }));
      expect(state.generationProgress['openai']).toBe('error');
    });
  });

  describe('media generation state', () => {
    it('sets active Create tab without changing image state', () => {
      const state = reducer(initialState, setActiveCreateTab('video'));

      expect(state.activeTab).toBe('video');
      expect(state.currentPrompt).toBe('');
      expect(state.mediaGeneration.video).toBeNull();
    });

    it('tracks video generation lifecycle and unseen activity', () => {
      let state = reducer(initialState, startMediaGeneration({
        id: 'generation_1',
        mediaType: 'video',
        providerId: 'runway',
        operation: 'text_to_video',
        modelId: 'gen4.5',
        prompt: 'A city at sunrise',
        message: 'Starting video generation...',
      }));

      expect(state.mediaGeneration.video).toMatchObject({
        id: 'generation_1',
        mediaType: 'video',
        providerId: 'runway',
        status: 'queued',
        phase: 'queued',
      });
      expect(state.createActivity.status).toBe('running');
      expect(state.createActivity.hasUnseenActivity).toBe(false);

      state = reducer(state, updateMediaGeneration({
        mediaType: 'video',
        status: 'processing',
        phase: 'rendering',
        providerTaskId: 'task_1',
        message: 'Rendering video...',
      }));

      expect(state.mediaGeneration.video).toMatchObject({
        status: 'processing',
        phase: 'rendering',
        providerTaskId: 'task_1',
        message: 'Rendering video...',
      });

      state = reducer(state, completeMediaGeneration({
        mediaType: 'video',
        status: 'succeeded',
        message: 'Video generation complete.',
        resultId: mockMedia.id,
      }));

      expect(state.mediaGeneration.video).toBeNull();
      expect(state.lastMediaGenerationResult).toMatchObject({
        id: mockMedia.id,
        mediaType: 'video',
        status: 'succeeded',
        message: 'Video generation complete.',
      });
      expect(state.createActivity).toMatchObject({
        status: 'completed',
        hasUnseenActivity: true,
        lastEventId: mockMedia.id,
      });
    });

    it('tracks failed audio generation and clears unseen activity', () => {
      let state = reducer(initialState, startMediaGeneration({
        id: 'audio_generation_1',
        mediaType: 'audio',
        providerId: 'elevenlabs',
        operation: 'text_to_speech',
        modelId: 'eleven_multilingual_v2',
        prompt: 'Read this line',
      }));

      state = reducer(state, failMediaGeneration({
        mediaType: 'audio',
        message: 'ElevenLabs request failed.',
      }));

      expect(state.mediaGeneration.audio).toBeNull();
      expect(state.lastMediaGenerationResult).toMatchObject({
        id: 'audio_generation_1',
        mediaType: 'audio',
        status: 'failed',
        message: 'ElevenLabs request failed.',
      });
      expect(state.createActivity.status).toBe('failed');
      expect(state.createActivity.hasUnseenActivity).toBe(true);

      state = reducer(state, markCreateActivitySeen());
      expect(state.createActivity.hasUnseenActivity).toBe(false);
    });

    it('marks completed image generation as unseen create activity too', () => {
      let state = reducer(initialState, startGeneration(['openai']));
      expect(state.createActivity.status).toBe('running');

      state = reducer(state, completeGeneration());
      expect(state.createActivity).toMatchObject({
        status: 'completed',
        hasUnseenActivity: true,
        lastMessage: 'Image generation complete.',
      });
    });
  });

  describe('gallery management', () => {
    const mockImage: GeneratedImageEntry = {
      id: 'img_1',
      uri: 'file:///test/image.png',
      prompt: 'A sunset. Photorealistic style',
      originalPrompt: 'A sunset',
      provider: 'openai',
      model: 'gpt-image-1',
      style: 'photo',
      size: 'square',
      quality: 'standard',
      createdAt: Date.now(),
      isRefinement: false,
      isUploaded: false,
    };

    it('adds image to gallery at the beginning', () => {
      const state = reducer(initialState, addToGallery(mockImage));
      expect(state.gallery).toHaveLength(1);
      expect(state.gallery[0]).toEqual(mockImage);
    });

    it('prepends new images to gallery', () => {
      let state = reducer(initialState, addToGallery(mockImage));
      const secondImage = { ...mockImage, id: 'img_2' };
      state = reducer(state, addToGallery(secondImage));

      expect(state.gallery).toHaveLength(2);
      expect(state.gallery[0].id).toBe('img_2');
      expect(state.gallery[1].id).toBe('img_1');
    });

    it('removes image from gallery by id', () => {
      let state = reducer(initialState, addToGallery(mockImage));
      state = reducer(state, removeFromGallery('img_1'));

      expect(state.gallery).toHaveLength(0);
    });

    it('does not perform filesystem side effects in reducer when removing image', () => {
      const state = reducer(initialState, addToGallery(mockImage));
      reducer(state, removeFromGallery('img_1'));

      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    });

    it('clears entire gallery', () => {
      let state = reducer(initialState, addToGallery(mockImage));
      state = reducer(state, addToGallery({ ...mockImage, id: 'img_2' }));
      state = reducer(state, clearGallery());

      expect(state.gallery).toHaveLength(0);
    });

    it('does not perform filesystem side effects in reducer when clearing gallery', () => {
      const image1 = { ...mockImage, uri: 'file:///test/image1.png' };
      const image2 = { ...mockImage, id: 'img_2', uri: 'file:///test/image2.png' };

      let state = reducer(initialState, addToGallery(image1));
      state = reducer(state, addToGallery(image2));
      reducer(state, clearGallery());

      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    });

    it('auto-prunes gallery when exceeding max size (50)', () => {
      let state = initialState;

      // Add 51 images to trigger auto-prune
      for (let i = 0; i < 51; i++) {
        state = reducer(state, addToGallery({
          ...mockImage,
          id: `img_${i}`,
          uri: `file:///test/image_${i}.png`,
        }));
      }

      expect(state.gallery).toHaveLength(50);
      // First image should be removed (oldest)
      expect(state.gallery.find(img => img.id === 'img_0')).toBeUndefined();
    });

    it('does not perform filesystem side effects in reducer when auto-pruning', () => {
      let state = initialState;

      for (let i = 0; i < 51; i++) {
        state = reducer(state, addToGallery({
          ...mockImage,
          id: `img_${i}`,
          uri: `file:///test/image_${i}.png`,
        }));
      }

      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    });
  });

  describe('media gallery management', () => {
    it('adds media to gallery at the beginning', () => {
      const state = reducer(initialState, addToMediaGallery(mockMedia));

      expect(state.mediaGallery).toHaveLength(1);
      expect(state.mediaGallery[0]).toEqual(mockMedia);
    });

    it('removes media from gallery by id', () => {
      let state = reducer(initialState, addToMediaGallery(mockMedia));
      state = reducer(state, removeFromMediaGallery(mockMedia.id));

      expect(state.mediaGallery).toEqual([]);
    });

    it('clears media gallery', () => {
      let state = reducer(initialState, addToMediaGallery(mockMedia));
      state = reducer(state, addToMediaGallery({
        ...mockMedia,
        id: 'media_2',
        mediaType: 'audio',
        providerId: 'elevenlabs',
        operation: 'text_to_speech',
        uri: 'file:///test/audio.mp3',
        mimeType: 'audio/mpeg',
      }));
      state = reducer(state, clearMediaGallery());

      expect(state.mediaGallery).toEqual([]);
    });

    it('auto-prunes media gallery when exceeding max size', () => {
      let state = initialState;

      for (let i = 0; i < 51; i++) {
        state = reducer(state, addToMediaGallery({
          ...mockMedia,
          id: `media_${i}`,
          uri: `file:///test/media_${i}.mp4`,
        }));
      }

      expect(state.mediaGallery).toHaveLength(50);
      expect(state.mediaGallery.find(entry => entry.id === 'media_0')).toBeUndefined();
    });

    it('sets active Runway task metadata for resume', () => {
      const task: ActiveRunwayTask = {
        id: 'generation_1',
        providerTaskId: 'task_1',
        prompt: 'A city at sunrise',
        operation: 'text_to_video',
        modelId: 'gen4.5',
        durationSeconds: 5,
        aspectRatio: '1280:720',
        startedAt: 123456,
      };

      const state = reducer(initialState, setActiveRunwayTask(task));
      expect(state.activeRunwayTask).toEqual(task);
    });
  });

  describe('refinement state', () => {
    it('starts refinement with image id', () => {
      const state = reducer(initialState, startRefinement('img_1'));
      expect(state.isRefining).toBe(true);
      expect(state.refiningImageId).toBe('img_1');
      expect(state.refinementPrompt).toBe('');
    });

    it('sets refinement prompt', () => {
      let state = reducer(initialState, startRefinement('img_1'));
      state = reducer(state, setRefinementPrompt('Make it more vibrant'));
      expect(state.refinementPrompt).toBe('Make it more vibrant');
    });

    it('cancels refinement', () => {
      let state = reducer(initialState, startRefinement('img_1'));
      state = reducer(state, setRefinementPrompt('Some instructions'));
      state = reducer(state, cancelRefinement());

      expect(state.isRefining).toBe(false);
      expect(state.refiningImageId).toBeUndefined();
      expect(state.refinementPrompt).toBe('');
    });

    it('completes refinement', () => {
      let state = reducer(initialState, startRefinement('img_1'));
      state = reducer(state, setRefinementPrompt('Add more contrast'));
      state = reducer(state, completeRefinement());

      expect(state.isRefining).toBe(false);
      expect(state.refiningImageId).toBeUndefined();
      expect(state.refinementPrompt).toBe('');
    });
  });

  describe('source image management', () => {
    it('sets source image with uri', () => {
      const state = reducer(initialState, setSourceImage({ uri: 'file:///source.png' }));
      expect(state.sourceImageUri).toBe('file:///source.png');
      expect(state.sourceImageBase64).toBeUndefined();
    });

    it('sets source image with uri and base64', () => {
      const state = reducer(initialState, setSourceImage({
        uri: 'file:///source.png',
        base64: 'base64encodeddata',
      }));
      expect(state.sourceImageUri).toBe('file:///source.png');
      expect(state.sourceImageBase64).toBe('base64encodeddata');
    });

    it('clears source image', () => {
      let state = reducer(initialState, setSourceImage({
        uri: 'file:///source.png',
        base64: 'base64data',
      }));
      state = reducer(state, clearSourceImage());

      expect(state.sourceImageUri).toBeUndefined();
      expect(state.sourceImageBase64).toBeUndefined();
    });
  });

  describe('UI state', () => {
    it('sets focused image id', () => {
      const state = reducer(initialState, setFocusedImage('img_1'));
      expect(state.focusedImageId).toBe('img_1');
    });

    it('clears focused image id', () => {
      let state = reducer(initialState, setFocusedImage('img_1'));
      state = reducer(state, setFocusedImage(undefined));
      expect(state.focusedImageId).toBeUndefined();
    });
  });

  describe('reset state', () => {
    it('resets entire state to initial values', () => {
      let state = reducer(initialState, setSelectedProviders(['openai', 'google']));
      state = reducer(state, setPrompt('Test prompt'));
      state = reducer(state, setStyle('cinematic'));
      state = reducer(state, startGeneration(['openai']));
      state = reducer(state, resetCreateState());

      expect(state).toEqual({
        ...initialState,
        gallery: [], // Gallery preserved as empty array
        galleryHydrated: false,
      });
    });
  });

  describe('selectors', () => {
    const mockRootState = { create: initialState };

    it('selectCreateState returns entire create state', () => {
      expect(selectCreateState(mockRootState)).toEqual(initialState);
    });

    it('selectGallery returns gallery array', () => {
      expect(selectGallery(mockRootState)).toEqual([]);
    });

    it('selectIsGenerating returns generation status', () => {
      expect(selectIsGenerating(mockRootState)).toBe(false);

      const generatingState = reducer(initialState, startGeneration(['openai']));
      expect(selectIsGenerating({ create: generatingState })).toBe(true);
    });

    it('selectSelectedProviders returns selected providers', () => {
      expect(selectSelectedProviders(mockRootState)).toEqual([]);

      const stateWithProviders = reducer(initialState, setSelectedProviders(['openai', 'google']));
      expect(selectSelectedProviders({ create: stateWithProviders })).toEqual(['openai', 'google']);
    });

    it('selectGenerationProgress returns progress object', () => {
      expect(selectGenerationProgress(mockRootState)).toEqual({});

      const stateWithProgress = reducer(initialState, startGeneration(['openai']));
      expect(selectGenerationProgress({ create: stateWithProgress })).toEqual({ openai: 'pending' });
    });
  });

  describe('async thunks', () => {
    const thunkImage: GeneratedImageEntry = {
      id: 'img_thunk',
      uri: 'file:///test/thunk-image.png',
      prompt: 'Test',
      originalPrompt: 'Test',
      provider: 'openai',
      model: 'gpt-image-1',
      createdAt: Date.now(),
      isRefinement: false,
      isUploaded: false,
    };

    it('hydrateGallery loads valid entries from storage', async () => {
      const mockGallery: GeneratedImageEntry[] = [
        {
          id: 'img_1',
          uri: 'file:///test/image.png',
          prompt: 'Test',
          originalPrompt: 'Test',
          provider: 'openai',
          model: 'gpt-image-1',
          createdAt: Date.now(),
          isRefinement: false,
          isUploaded: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockGallery));
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

      const store = configureStore({
        reducer: { create: reducer },
      });

      await store.dispatch(hydrateGallery());
      const state = store.getState().create;

      expect(state.galleryHydrated).toBe(true);
      expect(state.gallery).toHaveLength(1);
    });

    it('hydrateGallery filters out entries with missing files', async () => {
      const mockGallery: GeneratedImageEntry[] = [
        {
          id: 'img_1',
          uri: 'file:///test/existing.png',
          prompt: 'Test',
          originalPrompt: 'Test',
          provider: 'openai',
          model: 'gpt-image-1',
          createdAt: Date.now(),
          isRefinement: false,
          isUploaded: false,
        },
        {
          id: 'img_2',
          uri: 'file:///test/missing.png',
          prompt: 'Test',
          originalPrompt: 'Test',
          provider: 'openai',
          model: 'gpt-image-1',
          createdAt: Date.now(),
          isRefinement: false,
          isUploaded: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockGallery));
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true })
        .mockResolvedValueOnce({ exists: false });

      const store = configureStore({
        reducer: { create: reducer },
      });

      await store.dispatch(hydrateGallery());
      const state = store.getState().create;

      expect(state.gallery).toHaveLength(1);
      expect(state.gallery[0].id).toBe('img_1');
    });

    it('hydrateGallery handles empty storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const store = configureStore({
        reducer: { create: reducer },
      });

      await store.dispatch(hydrateGallery());
      const state = store.getState().create;

      expect(state.galleryHydrated).toBe(true);
      expect(state.gallery).toHaveLength(0);
    });

    it('hydrateGallery marks as hydrated even on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const store = configureStore({
        reducer: { create: reducer },
      });

      await store.dispatch(hydrateGallery());
      const state = store.getState().create;

      expect(state.galleryHydrated).toBe(true);
    });

    it('persistGallery saves gallery to storage', async () => {
      const mockGallery: GeneratedImageEntry[] = [
        {
          id: 'img_1',
          uri: 'file:///test/image.png',
          prompt: 'Test',
          originalPrompt: 'Test',
          provider: 'openai',
          model: 'gpt-image-1',
          createdAt: Date.now(),
          isRefinement: false,
          isUploaded: false,
        },
      ];

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const store = configureStore({
        reducer: { create: reducer },
      });

      await store.dispatch(persistGallery(mockGallery));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'create_gallery',
        JSON.stringify(mockGallery)
      );
    });

    it('addToGalleryWithCleanup deletes the pruned local file outside the reducer', async () => {
      const store = configureStore({
        reducer: { create: reducer },
        preloadedState: {
          create: {
            ...initialState,
            gallery: Array.from({ length: 50 }, (_, index) => 49 - index).map((index) => ({
              ...thunkImage,
              id: `img_${index}`,
              uri: `file:///test/image_${index}.png`,
            })),
          },
        },
      });

      await store.dispatch(addToGalleryWithCleanup({
        ...thunkImage,
        id: 'img_new',
        uri: 'file:///test/new-image.png',
      }));

      expect(store.getState().create.gallery).toHaveLength(50);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///test/image_0.png', { idempotent: true });
      expect(store.getState().create.gallery[0].id).toBe('img_new');
      expect(store.getState().create.gallery.find((image) => image.id === 'img_0')).toBeUndefined();
    });

    it('removeFromGalleryWithCleanup deletes the removed local file outside the reducer', async () => {
      const store = configureStore({
        reducer: { create: reducer },
        preloadedState: {
          create: {
            ...initialState,
            gallery: [thunkImage],
          },
        },
      });

      await store.dispatch(removeFromGalleryWithCleanup(thunkImage.id));

      expect(store.getState().create.gallery).toHaveLength(0);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(thunkImage.uri, { idempotent: true });
    });

    it('clearGalleryWithCleanup deletes all local gallery files outside the reducer', async () => {
      const secondImage = { ...thunkImage, id: 'img_2', uri: 'file:///test/second.png' };
      const store = configureStore({
        reducer: { create: reducer },
        preloadedState: {
          create: {
            ...initialState,
            gallery: [thunkImage, secondImage],
          },
        },
      });

      await store.dispatch(clearGalleryWithCleanup());

      expect(store.getState().create.gallery).toEqual([]);
      expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(thunkImage.uri, { idempotent: true });
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(secondImage.uri, { idempotent: true });
    });

    it('hydrateMediaGallery loads media entries and resumable Runway task metadata', async () => {
      const activeTask: ActiveRunwayTask = {
        id: 'generation_1',
        providerTaskId: 'task_1',
        prompt: 'A city at sunrise',
        operation: 'text_to_video',
        modelId: 'gen4.5',
        durationSeconds: 5,
        aspectRatio: '1280:720',
        startedAt: 123456,
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === 'create_media_gallery') {
          return Promise.resolve(JSON.stringify([mockMedia]));
        }
        if (key === 'create_active_media_task') {
          return Promise.resolve(JSON.stringify(activeTask));
        }
        return Promise.resolve(null);
      });

      const store = configureStore({
        reducer: { create: reducer },
      });

      await store.dispatch(hydrateMediaGallery());
      const state = store.getState().create;

      expect(state.mediaGalleryHydrated).toBe(true);
      expect(state.mediaGallery).toEqual([mockMedia]);
      expect(state.activeRunwayTask).toEqual(activeTask);
    });

    it('persistMediaGallery saves media entries to storage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const store = configureStore({
        reducer: { create: reducer },
      });

      await store.dispatch(persistMediaGallery([mockMedia]));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'create_media_gallery',
        JSON.stringify([mockMedia])
      );
    });

    it('addToMediaGalleryWithCleanup deletes pruned local media outside the reducer', async () => {
      const store = configureStore({
        reducer: { create: reducer },
        preloadedState: {
          create: {
            ...initialState,
            mediaGallery: Array.from({ length: 50 }, (_, index) => 49 - index).map((index) => ({
              ...mockMedia,
              id: `media_${index}`,
              uri: `file:///test/media_${index}.mp4`,
            })),
          },
        },
      });

      await store.dispatch(addToMediaGalleryWithCleanup({
        ...mockMedia,
        id: 'media_new',
        uri: 'file:///test/new-media.mp4',
      }));

      expect(store.getState().create.mediaGallery).toHaveLength(50);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///test/media_0.mp4', { idempotent: true });
      expect(store.getState().create.mediaGallery[0].id).toBe('media_new');
      expect(store.getState().create.mediaGallery.find((entry) => entry.id === 'media_0')).toBeUndefined();
    });

    it('removeFromMediaGalleryWithCleanup deletes removed local media outside the reducer', async () => {
      const store = configureStore({
        reducer: { create: reducer },
        preloadedState: {
          create: {
            ...initialState,
            mediaGallery: [mockMedia],
          },
        },
      });

      await store.dispatch(removeFromMediaGalleryWithCleanup(mockMedia.id));

      expect(store.getState().create.mediaGallery).toEqual([]);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(mockMedia.uri, { idempotent: true });
    });

    it('clearMediaGalleryWithCleanup deletes all local media files outside the reducer', async () => {
      const audioMedia: GeneratedMediaEntry = {
        ...mockMedia,
        id: 'media_audio',
        mediaType: 'audio',
        providerId: 'elevenlabs',
        operation: 'text_to_speech',
        uri: 'file:///test/audio.mp3',
        mimeType: 'audio/mpeg',
      };
      const store = configureStore({
        reducer: { create: reducer },
        preloadedState: {
          create: {
            ...initialState,
            mediaGallery: [mockMedia, audioMedia],
          },
        },
      });

      await store.dispatch(clearMediaGalleryWithCleanup());

      expect(store.getState().create.mediaGallery).toEqual([]);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(mockMedia.uri, { idempotent: true });
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(audioMedia.uri, { idempotent: true });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('create_media_gallery', JSON.stringify([]));
    });
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      expect(initialState.selectedProviders).toEqual([]);
      expect(initialState.mode).toBe('single');
      expect(initialState.isGenerating).toBe(false);
      expect(initialState.generationProgress).toEqual({});
      expect(initialState.currentPrompt).toBe('');
      expect(initialState.selectedStyle).toBe('none');
      expect(initialState.selectedSize).toBe('auto');
      expect(initialState.selectedQuality).toBe('standard');
      expect(initialState.gallery).toEqual([]);
      expect(initialState.galleryHydrated).toBe(false);
      expect(initialState.activeTab).toBe('image');
      expect(initialState.mediaGallery).toEqual([]);
      expect(initialState.mediaGalleryHydrated).toBe(false);
      expect(initialState.mediaGeneration).toEqual({ video: null, audio: null });
      expect(initialState.activeRunwayTask).toBeUndefined();
      expect(initialState.lastMediaGenerationResult).toBeUndefined();
      expect(initialState.createActivity).toEqual({
        status: 'idle',
        hasUnseenActivity: false,
      });
      expect(initialState.isRefining).toBe(false);
      expect(initialState.refinementPrompt).toBe('');
    });
  });
});
