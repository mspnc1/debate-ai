/**
 * CreateScreen - Active image generation session screen
 * Shows generation progress, image gallery, and refinement options
 */
import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorService } from '@/services/errors/ErrorService';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { VideoView, useVideoPlayer, type PlayingChangeEventPayload } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme';
import { Typography } from '../components/molecules';
import { ImageRefinementModal, RefinementProvider } from '../components/organisms/chat/ImageRefinementModal';
import { RootState, AppDispatch, isApiKeyConfigured } from '../store';
import {
  selectCreateState,
  selectGallery,
  selectIsGenerating,
  addToGalleryWithCleanup,
  startGeneration,
  updateGenerationProgress,
  completeGeneration,
  generationError,
  removeFromGalleryWithCleanup,
  persistGallery,
  updateGalleryEntryUri,
  GeneratedImageEntry,
  GeneratedMediaEntry,
  hydrateMediaGallery,
  markCreateActivitySeen,
  removeFromMediaGalleryWithCleanup,
  persistMediaGallery,
  LOCAL_GALLERY_ASSET_LIMIT,
  normalizeGalleryAssets,
  getGalleryAssetCounts,
  getFilteredGalleryAssets,
  getSortedGalleryAssets,
} from '../store/createSlice';
import type {
  GalleryAsset,
  GalleryAssetType,
  GalleryFilterState,
  GallerySortMode,
  GalleryTab,
} from '../store/createSlice';
import { RootStackParamList, AIProvider } from '../types';
import { ImageService, GeneratedImage } from '../services/images/ImageService';
import APIKeyService from '../services/APIKeyService';
import { buildEnhancedPrompt } from '../config/create/stylePresets';
import { mapSizeToProvider } from '../config/create/sizeOptions';
import {
  getImageInputModels,
  getImageModelDisplayName,
  getImageProviderDisplayName,
  resolveImageModelId,
  supportsImageInput,
} from '../config/imageGenerationModels';
import {
  getImageShareUti,
  getImageMimeType,
  isDocumentImageUri,
  loadBase64FromFileUri,
  persistImageUri,
} from '../services/images/fileCache';
import MediaSaveService from '../services/media/MediaSaveService';
import { getMediaShareUti } from '../services/media/mediaFileCache';
import useFeatureAccess from '../hooks/useFeatureAccess';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'CreateSession'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 32;
const LIBRARY_GAP = 12;
const LIBRARY_CARD_WIDTH = (SCREEN_WIDTH - 32 - LIBRARY_GAP) / 2;
const RETENTION_WARNING_THRESHOLD = Math.floor(LOCAL_GALLERY_ASSET_LIMIT * 0.9);

const EMPTY_GALLERY_FILTERS: GalleryFilterState = {
  providers: [],
  models: [],
  operations: [],
  dateRange: 'all',
  availability: 'all',
};

const GALLERY_TABS: Array<{ value: GalleryTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'all', label: 'All', icon: 'albums-outline' },
  { value: 'image', label: 'Images', icon: 'image-outline' },
  { value: 'video', label: 'Videos', icon: 'videocam-outline' },
  { value: 'audio', label: 'Audio', icon: 'musical-notes-outline' },
];

const GALLERY_SORT_OPTIONS: Array<{ value: GallerySortMode; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'provider', label: 'Provider' },
  { value: 'model', label: 'Model' },
];

const GALLERY_DATE_FILTERS: Array<{ value: GalleryFilterState['dateRange']; label: string }> = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
];

const GALLERY_AVAILABILITY_FILTERS: Array<{ value: GalleryFilterState['availability']; label: string }> = [
  { value: 'all', label: 'Any status' },
  { value: 'available', label: 'Available' },
  { value: 'remote_expiring', label: 'Expiring links' },
  { value: 'failed', label: 'Failed' },
];

type GalleryListItem =
  | { kind: 'image'; entry: GeneratedImageEntry }
  | { kind: 'media'; entry: GeneratedMediaEntry };

type VideoPlaybackState = {
  isPlaying: boolean;
  hasEnded: boolean;
};

type AudioPlaybackPhase = 'idle' | 'playing' | 'paused' | 'ended';

type AudioPlayerResetRequest = {
  id: number;
  seekTime: number;
  shouldPlay: boolean;
};

const AUDIO_END_EPSILON_SECONDS = 0.05;
const AUDIO_SKIP_SECONDS = 1;

function getAudioPhase(status: ReturnType<typeof useAudioPlayerStatus>): AudioPlaybackPhase {
  if (status.playing) return 'playing';
  const hasDuration = Number.isFinite(status.duration) && status.duration > 0;
  const endedByPosition = hasDuration && status.currentTime >= Math.max(0, status.duration - AUDIO_END_EPSILON_SECONDS);
  if (status.didJustFinish || endedByPosition) return 'ended';
  if (status.currentTime > 0) return 'paused';
  return 'idle';
}

function clampAudioTime(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds)) return 0;
  const upperBound = Number.isFinite(duration) && duration > 0 ? duration : Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(seconds, upperBound));
}

function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function VideoPreview({
  mediaId,
  uri,
  style,
  onPlaybackStateChange,
}: {
  mediaId: string;
  uri: string;
  style: object;
  onPlaybackStateChange?: (mediaId: string, state: VideoPlaybackState) => void;
}) {
  const player = useVideoPlayer(uri);
  const [isPlaying, setIsPlaying] = useState(Boolean(player.playing));
  const [nativeControlsVisible, setNativeControlsVisible] = useState(!player.playing);

  const notifyPlaybackState = useCallback((state: VideoPlaybackState) => {
    setIsPlaying(state.isPlaying);
    setNativeControlsVisible(!state.isPlaying);
    onPlaybackStateChange?.(mediaId, state);
  }, [mediaId, onPlaybackStateChange]);

  useEffect(() => {
    notifyPlaybackState({ isPlaying: Boolean(player.playing), hasEnded: false });
  }, [notifyPlaybackState, player]);

  useEffect(() => {
    const playingSubscription = player.addListener('playingChange', ({ isPlaying }: PlayingChangeEventPayload) => {
      notifyPlaybackState({ isPlaying, hasEnded: false });
    });
    const endSubscription = player.addListener('playToEnd', () => {
      notifyPlaybackState({ isPlaying: false, hasEnded: true });
    });

    return () => {
      playingSubscription.remove();
      endSubscription.remove();
    };
  }, [notifyPlaybackState, player]);

  const handleHiddenControlsPress = useCallback(() => {
    player.pause();
    notifyPlaybackState({ isPlaying: false, hasEnded: false });
  }, [notifyPlaybackState, player]);

  return (
    <View style={style}>
      <VideoView
        player={player}
        style={styles.videoPlayerSurface}
        nativeControls={nativeControlsVisible}
        contentFit="cover"
        fullscreenOptions={{ enable: false }}
        showsTimecodes={false}
        buttonOptions={{
          showBottomBar: false,
          showSeekBackward: false,
          showSeekForward: false,
          showSettings: false,
          showNext: false,
          showPrevious: false,
          showSubtitles: false,
        }}
        testID={`gallery-video-surface-${mediaId}`}
      />
      {isPlaying && !nativeControlsVisible && (
        <Pressable
          style={styles.videoPressSurface}
          onPress={handleHiddenControlsPress}
          accessibilityRole="button"
          accessibilityLabel="Pause video"
        />
      )}
    </View>
  );
}

function AudioPreview({
  uri,
  theme,
}: {
  uri: string;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  const [playerGeneration, setPlayerGeneration] = useState(0);
  const [resetRequest, setResetRequest] = useState<AudioPlayerResetRequest>({
    id: 0,
    seekTime: 0,
    shouldPlay: false,
  });

  const handleResetPlayer = useCallback((seekTime = 0, shouldPlay = true) => {
    setResetRequest((current) => ({
      id: current.id + 1,
      seekTime,
      shouldPlay,
    }));
    setPlayerGeneration((current) => current + 1);
  }, []);

  return (
    <AudioPreviewPlayer
      key={`${uri}-${playerGeneration}`}
      uri={uri}
      theme={theme}
      resetRequest={resetRequest}
      onResetPlayer={handleResetPlayer}
    />
  );
}

function AudioPreviewPlayer({
  uri,
  theme,
  resetRequest,
  onResetPlayer,
}: {
  uri: string;
  theme: ReturnType<typeof useTheme>['theme'];
  resetRequest: AudioPlayerResetRequest;
  onResetPlayer: (seekTime?: number, shouldPlay?: boolean) => void;
}) {
  const player = useAudioPlayer(uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const statusPhase = getAudioPhase(status);
  const [playbackPhase, setPlaybackPhase] = useState<AudioPlaybackPhase>(statusPhase);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const isMountedRef = useRef(true);
  const wasPlayingBeforeScrubRef = useRef(false);
  const duration = Number.isFinite(status.duration) && status.duration > 0 ? status.duration : 0;
  const currentTime = clampAudioTime(status.currentTime, duration);
  const displayedTime = clampAudioTime(scrubTime ?? currentTime, duration);
  const canSeek = duration > 0;
  const canSkipBackward = canSeek && displayedTime > 0;
  const canSkipForward = canSeek && displayedTime < Math.max(0, duration - AUDIO_END_EPSILON_SECONDS);

  useEffect(() => {
    setPlaybackPhase(statusPhase);
  }, [statusPhase]);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    if (resetRequest.id === 0) {
      return;
    }

    let cancelled = false;
    const nextTime = clampAudioTime(resetRequest.seekTime, duration);
    const autoPlayTimer = setTimeout(() => {
      void player.seekTo(nextTime, 0, 0).catch(() => undefined).finally(() => {
        if (cancelled) return;
        if (resetRequest.shouldPlay) {
          player.play();
          if (isMountedRef.current) {
            setPlaybackPhase('playing');
          }
        } else {
          if (isMountedRef.current) {
            setPlaybackPhase(nextTime > 0 ? 'paused' : 'idle');
          }
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(autoPlayTimer);
    };
  }, [duration, player, resetRequest]);

  const handlePress = useCallback(() => {
    if (playbackPhase === 'playing') {
      player.pause();
      setPlaybackPhase('paused');
      return;
    }

    if (playbackPhase === 'ended') {
      onResetPlayer(0, true);
      return;
    }

    player.play();
    setPlaybackPhase('playing');
  }, [onResetPlayer, playbackPhase, player]);

  const seekToTime = useCallback((nextTime: number, shouldResume: boolean) => {
    const clampedTime = clampAudioTime(nextTime, duration);

    if (playbackPhase === 'ended' || statusPhase === 'ended') {
      onResetPlayer(clampedTime, shouldResume);
      return;
    }

    void player.seekTo(clampedTime, 0, 0).catch(() => undefined).finally(() => {
      if (!isMountedRef.current) return;
      if (shouldResume) {
        player.play();
        setPlaybackPhase('playing');
        return;
      }

      if (duration > 0 && clampedTime >= duration - AUDIO_END_EPSILON_SECONDS) {
        setPlaybackPhase('ended');
      } else {
        setPlaybackPhase(clampedTime > 0 ? 'paused' : 'idle');
      }
    });
  }, [duration, onResetPlayer, playbackPhase, player, statusPhase]);

  const handleSeekStart = useCallback(() => {
    wasPlayingBeforeScrubRef.current = playbackPhase === 'playing';
    setScrubTime(displayedTime);
    if (playbackPhase === 'playing') {
      player.pause();
      setPlaybackPhase('paused');
    }
  }, [displayedTime, playbackPhase, player]);

  const handleSeekChange = useCallback((nextTime: number) => {
    setScrubTime(clampAudioTime(nextTime, duration));
  }, [duration]);

  const handleSeekComplete = useCallback((nextTime: number) => {
    const shouldResume = wasPlayingBeforeScrubRef.current;
    wasPlayingBeforeScrubRef.current = false;
    setScrubTime(null);
    seekToTime(nextTime, shouldResume);
  }, [seekToTime]);

  const handleSkipBackward = useCallback(() => {
    seekToTime(displayedTime - AUDIO_SKIP_SECONDS, playbackPhase === 'playing');
  }, [displayedTime, playbackPhase, seekToTime]);

  const handleSkipForward = useCallback(() => {
    seekToTime(displayedTime + AUDIO_SKIP_SECONDS, playbackPhase === 'playing');
  }, [displayedTime, playbackPhase, seekToTime]);

  const buttonIcon = playbackPhase === 'playing'
    ? 'pause'
    : playbackPhase === 'ended'
      ? 'refresh'
      : 'play';
  const accessibilityLabel = playbackPhase === 'playing'
    ? 'Pause audio'
    : playbackPhase === 'ended'
      ? 'Replay audio'
      : 'Play audio';
  const statusLabel = playbackPhase === 'playing'
    ? 'Playing'
    : playbackPhase === 'ended'
      ? 'Replay'
      : playbackPhase === 'paused'
        ? 'Paused'
        : 'Ready';

  return (
    <View style={[styles.audioPreview, { backgroundColor: theme.colors.primary[50] }]}>
      <View style={styles.audioControlsRow}>
        <TouchableOpacity
          style={[
            styles.audioSecondaryControlButton,
            { backgroundColor: theme.colors.surface, opacity: canSkipBackward ? 1 : 0.45 },
          ]}
          onPress={handleSkipBackward}
          disabled={!canSkipBackward}
          accessibilityRole="button"
          accessibilityLabel="Rewind audio 1 second"
        >
          <Ionicons name="play-back" size={22} color={theme.colors.primary[700]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.audioControlButton, { backgroundColor: theme.colors.primary[500] }]}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          <Ionicons name={buttonIcon} size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.audioSecondaryControlButton,
            { backgroundColor: theme.colors.surface, opacity: canSkipForward ? 1 : 0.45 },
          ]}
          onPress={handleSkipForward}
          disabled={!canSkipForward}
          accessibilityRole="button"
          accessibilityLabel="Advance audio 1 second"
        >
          <Ionicons name="play-forward" size={22} color={theme.colors.primary[700]} />
        </TouchableOpacity>
      </View>
      <View style={styles.audioPlaybackInfo}>
        <Typography variant="body" weight="semibold" style={{ color: theme.colors.text.primary }}>
          {statusLabel}
        </Typography>
        <View style={styles.audioProgressRow}>
          <Typography variant="caption" color="secondary" style={styles.audioTimeText}>
            {formatPlaybackTime(displayedTime)}
          </Typography>
          <Slider
            style={styles.audioProgressSlider}
            value={displayedTime}
            minimumValue={0}
            maximumValue={duration || 1}
            disabled={!canSeek}
            onSlidingStart={handleSeekStart}
            onValueChange={handleSeekChange}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor={theme.colors.primary[500]}
            maximumTrackTintColor={theme.colors.primary[100]}
            thumbTintColor={theme.colors.primary[600]}
            accessibilityLabel="Audio playback position"
            accessibilityRole="adjustable"
            accessibilityValue={{
              min: 0,
              max: duration || 1,
              now: displayedTime,
              text: `${formatPlaybackTime(displayedTime)} of ${formatPlaybackTime(duration)}`,
            }}
          />
          <Typography variant="caption" color="secondary" style={styles.audioTimeText}>
            {formatPlaybackTime(duration)}
          </Typography>
        </View>
      </View>
    </View>
  );
}

function getMediaProviderDisplayName(providerId: string): string {
  if (providerId === 'runway') return 'Runway';
  if (providerId === 'elevenlabs') return 'ElevenLabs';
  return providerId;
}

function isImageProvider(providerId: string): providerId is AIProvider {
  return ['claude', 'openai', 'chatgpt', 'google', 'perplexity', 'mistral', 'cohere', 'deepseek', 'grok'].includes(providerId);
}

function getGalleryProviderFilterLabel(providerId: string): string {
  if (isImageProvider(providerId)) {
    return getImageProviderDisplayName(providerId);
  }
  return getMediaProviderDisplayName(providerId);
}

function getGalleryAssetProviderLabel(asset: GalleryAsset): string {
  if (asset.source === 'image') {
    return getImageProviderDisplayName((asset.entry as GeneratedImageEntry).provider);
  }
  return getMediaProviderDisplayName(asset.providerId);
}

function getGalleryAssetModelLabel(asset: GalleryAsset): string {
  if (asset.source === 'image') {
    const image = asset.entry as GeneratedImageEntry;
    return getImageModelDisplayName(image.provider, image.model);
  }
  return asset.modelId;
}

function getGalleryAssetTypeLabel(type: GalleryAssetType): string {
  if (type === 'image') return 'Image';
  if (type === 'video') return 'Video';
  return 'Audio';
}

function formatGalleryDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp));
}

function formatGalleryDuration(durationSeconds?: number): string | undefined {
  if (!durationSeconds) return undefined;
  return `${durationSeconds}s`;
}

function buildFilterOptions(assets: GalleryAsset[], field: 'providerId' | 'modelId' | 'operation'): string[] {
  return Array.from(new Set(
    assets
      .map((asset) => asset[field])
      .filter((value): value is string => Boolean(value))
  )).sort((a, b) => a.localeCompare(b));
}

export default function CreateScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const flatListRef = useRef<FlatList>(null);

  const {
    providers = [],
    selectedModels: routeSelectedModels = {},
    initialPrompt,
    sourceImage,
    refinementInstructions,
    focusMediaId,
  } = route.params || {};

  const createState = useSelector(selectCreateState);
  const gallery = useSelector(selectGallery);
  const isGenerating = useSelector(selectIsGenerating);
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const { isDemo, loading: subscriptionLoading } = useFeatureAccess();

  const {
    selectedModels: storedSelectedModels = {},
    selectedStyle,
    selectedSize,
    selectedQuality,
    generationProgress,
    generationError: errorMessage,
    galleryHydrated,
    mediaGallery = [],
    mediaGalleryHydrated = false,
    mediaGeneration = { video: null, audio: null },
  } = createState;
  const isGalleryMode = !initialPrompt && !sourceImage && !refinementInstructions && providers.length === 0;

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [savingMediaId, setSavingMediaId] = useState<string | null>(null);
  const [sharingImageId, setSharingImageId] = useState<string | null>(null);
  const [sharingMediaId, setSharingMediaId] = useState<string | null>(null);
  const [refiningImage, setRefiningImage] = useState<GeneratedImageEntry | null>(null);
  const [videoPlaybackStates, setVideoPlaybackStates] = useState<Record<string, VideoPlaybackState>>({});
  const [galleryTab, setGalleryTab] = useState<GalleryTab>(route.params?.galleryTab || 'all');
  const [gallerySearch, setGallerySearch] = useState('');
  const [galleryFilters, setGalleryFilters] = useState<GalleryFilterState>(EMPTY_GALLERY_FILTERS);
  const [gallerySortMode, setGallerySortMode] = useState<GallerySortMode>('newest');
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const longPressHandledRef = useRef<string | null>(null);
  const focusedMediaRef = useRef<string | undefined>(undefined);

  const activeSelectedModels = useMemo(() => {
    return providers.reduce((acc, provider) => {
      const resolvedModelId = resolveImageModelId(
        provider,
        routeSelectedModels[provider] || storedSelectedModels[provider]
      );
      if (resolvedModelId) {
        acc[provider] = resolvedModelId;
      }
      return acc;
    }, {} as Partial<Record<AIProvider, string>>);
  }, [providers, routeSelectedModels, storedSelectedModels]);

  // Build available providers for refinement
  const availableRefinementProviders: RefinementProvider[] = useMemo(() => {
    const imageProviders: AIProvider[] = ['openai', 'google', 'grok'];
    return imageProviders.map(provider => ({
      provider,
      name: getImageProviderDisplayName(provider),
      supportsImg2Img: getImageInputModels(provider).length > 0,
      hasApiKey: isApiKeyConfigured(apiKeys[provider]),
    }));
  }, [apiKeys]);

  const galleryAssets = useMemo(
    () => normalizeGalleryAssets(gallery, mediaGallery),
    [gallery, mediaGallery]
  );
  const galleryCounts = useMemo(() => getGalleryAssetCounts(galleryAssets), [galleryAssets]);
  const activeFilterCount = useMemo(() => (
    galleryFilters.providers.length +
    galleryFilters.models.length +
    galleryFilters.operations.length +
    (galleryFilters.dateRange === 'all' ? 0 : 1) +
    (galleryFilters.availability === 'all' ? 0 : 1)
  ), [galleryFilters]);
  const tabbedGalleryAssets = useMemo(
    () => galleryTab === 'all'
      ? galleryAssets
      : galleryAssets.filter((asset) => asset.type === galleryTab),
    [galleryAssets, galleryTab]
  );
  const visibleGalleryAssets = useMemo(
    () => getSortedGalleryAssets(
      getFilteredGalleryAssets(tabbedGalleryAssets, gallerySearch, galleryFilters),
      gallerySortMode
    ),
    [galleryFilters, gallerySearch, gallerySortMode, tabbedGalleryAssets]
  );
  const selectedAsset = useMemo(
    () => galleryAssets.find((asset) => asset.id === selectedAssetId),
    [galleryAssets, selectedAssetId]
  );
  const selectedBulkAssets = useMemo(
    () => galleryAssets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [galleryAssets, selectedAssetIds]
  );
  const providerFilterOptions = useMemo(() => buildFilterOptions(galleryAssets, 'providerId'), [galleryAssets]);
  const modelFilterOptions = useMemo(() => buildFilterOptions(galleryAssets, 'modelId'), [galleryAssets]);
  const operationFilterOptions = useMemo(() => buildFilterOptions(galleryAssets, 'operation'), [galleryAssets]);
  const isNearRetentionLimit = galleryAssets.length >= RETENTION_WARNING_THRESHOLD;

  // Auto-persist gallery whenever it changes
  useEffect(() => {
    if (galleryHydrated || gallery.length > 0) {
      dispatch(persistGallery(gallery));
    }
  }, [dispatch, gallery, galleryHydrated]);

  useEffect(() => {
    if (!mediaGalleryHydrated) {
      dispatch(hydrateMediaGallery());
    } else {
      dispatch(persistMediaGallery(mediaGallery));
    }
  }, [dispatch, mediaGallery, mediaGalleryHydrated]);

  useEffect(() => {
    dispatch(markCreateActivitySeen());
  }, [dispatch]);

  useEffect(() => {
    if (route.params?.galleryTab) {
      setGalleryTab(route.params.galleryTab);
    }
  }, [route.params?.galleryTab]);

  useEffect(() => {
    const validIds = new Set(galleryAssets.map((asset) => asset.id));
    setSelectedAssetIds((current) => {
      const next = current.filter((id) => validIds.has(id));
      return next.length === current.length ? current : next;
    });
    if (selectedAssetId && !validIds.has(selectedAssetId)) {
      setSelectedAssetId(null);
    }
  }, [galleryAssets, selectedAssetId]);

  // Start generation once subscription status is loaded
  useEffect(() => {
    // Wait for subscription data to load before checking isDemo
    if (subscriptionLoading) return;

    // Normal generation: prompt + providers
    if (initialPrompt && providers.length > 0) {
      generateImages();
    }
    // Uploaded image refinement: sourceImage + refinementInstructions + providers
    else if (sourceImage && refinementInstructions && providers.length > 0) {
      generateRefinement();
    }
  }, [subscriptionLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate refinement for uploaded image
  const generateRefinement = useCallback(async () => {
    if (isDemo) {
      ErrorService.showInfo('Image generation requires a subscription. Start a free trial to unlock this feature.', 'create');
      return;
    }
    if (!sourceImage || !refinementInstructions || providers.length === 0) return;

    const provider = providers[0]; // Use the first (and typically only) provider for refinement
    const modelId = activeSelectedModels[provider];
    dispatch(startGeneration([provider]));
    dispatch(updateGenerationProgress({ provider, progress: 'generating' }));

    try {
      const apiKey = await APIKeyService.getKey(provider);
      if (!apiKey) {
        throw new Error(`No API key for ${provider}`);
      }

      const size = mapSizeToProvider(selectedSize, provider, modelId);

      // Load base64 from the uploaded file URI
      const base64Image = await loadBase64FromFileUri(sourceImage);

      const images = await ImageService.generateImage({
        provider,
        model: modelId,
        apiKey,
        prompt: refinementInstructions,
        size,
        sourceImage: base64Image || undefined,
      });

      dispatch(updateGenerationProgress({ provider, progress: 'complete' }));

      // Add to gallery
      for (const image of images) {
        const entry: GeneratedImageEntry = {
          id: `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri: image.url || '',
          prompt: refinementInstructions,
          originalPrompt: refinementInstructions,
          provider,
          model: modelId || resolveImageModelId(provider) || provider,
          style: selectedStyle,
          size: selectedSize,
          quality: selectedQuality,
          createdAt: Date.now(),
          isRefinement: true,
          isUploaded: true, // Mark as uploaded image refinement
        };
        dispatch(addToGalleryWithCleanup(entry));
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error(`[CreateScreen] Refinement error for ${provider}:`, error);
      dispatch(updateGenerationProgress({ provider, progress: 'error' }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      ErrorService.handleWithToast(error, { feature: 'create', provider });
    }

    dispatch(completeGeneration());
  }, [
    isDemo,
    sourceImage,
    refinementInstructions,
    providers,
    activeSelectedModels,
    selectedStyle,
    selectedSize,
    selectedQuality,
    dispatch,
  ]);

  const generateImages = useCallback(async () => {
    if (isDemo) {
      ErrorService.showInfo('Image generation requires a subscription. Start a free trial to unlock this feature.', 'create');
      return;
    }
    if (!initialPrompt) return;

    dispatch(startGeneration(providers));

    const enhancedPrompt = buildEnhancedPrompt(initialPrompt, selectedStyle);

    // Generate with each provider
    const results: { provider: AIProvider; images: GeneratedImage[] | Error }[] = [];

    await Promise.all(
      providers.map(async (provider) => {
        const modelId = activeSelectedModels[provider];
        dispatch(updateGenerationProgress({ provider, progress: 'generating' }));

        try {
          const apiKey = await APIKeyService.getKey(provider);
          if (!apiKey) {
            throw new Error(`No API key for ${provider}`);
          }

          const size = mapSizeToProvider(selectedSize, provider, modelId);

          const images = await ImageService.generateImage({
            provider,
            model: modelId,
            apiKey,
            prompt: enhancedPrompt,
            size,
            sourceImage,
          });

          dispatch(updateGenerationProgress({ provider, progress: 'complete' }));

          // Add to gallery
          for (const image of images) {
            const entry: GeneratedImageEntry = {
              id: `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              uri: image.url || '',
              prompt: enhancedPrompt,
              originalPrompt: initialPrompt,
              provider,
              model: modelId || resolveImageModelId(provider) || provider,
              style: selectedStyle,
              size: selectedSize,
              quality: selectedQuality,
              createdAt: Date.now(),
              isRefinement: Boolean(sourceImage),
              isUploaded: false,
            };
            dispatch(addToGalleryWithCleanup(entry));
          }

          results.push({ provider, images });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.error(`[CreateScreen] Generation error for ${provider}:`, error);
          dispatch(updateGenerationProgress({ provider, progress: 'error' }));
          results.push({ provider, images: error as Error });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      })
    );

    dispatch(completeGeneration());

    // Show error details if any providers failed
    const failedProviders = results.filter(r => r.images instanceof Error);
    if (failedProviders.length > 0) {
      const failedNames = failedProviders
        .map(r => getImageProviderDisplayName(r.provider, {
          includeModel: true,
          modelId: activeSelectedModels[r.provider],
        }))
        .join(', ');
      const failureDetails = failedProviders
        .map(r => {
          const error = r.images as Error;
          const providerName = getImageProviderDisplayName(r.provider, {
            includeModel: true,
            modelId: activeSelectedModels[r.provider],
          });
          return `${providerName}: ${error.message.slice(0, 260)}`;
        })
        .join('\n');
      dispatch(generationError(failureDetails));
      ErrorService.showWarning(
        `Image generation failed for: ${failedNames}. ${failedProviders.length < providers.length ? 'Other providers succeeded.' : 'Please try again.'}`,
        'create'
      );
    }
  }, [
    isDemo,
    initialPrompt,
    providers,
    activeSelectedModels,
    selectedStyle,
    selectedSize,
    selectedQuality,
    sourceImage,
    dispatch,
  ]);

  const handleRefine = useCallback((imageId: string) => {
    if (isDemo) {
      ErrorService.showInfo('Image refinement requires a subscription. Start a free trial to unlock this feature.', 'create');
      return;
    }

    const image = gallery.find(img => img.id === imageId);
    if (!image) return;

    // Check if any provider supports refinement
    const hasRefinementProvider = availableRefinementProviders.some((providerInfo) => (
      providerInfo.supportsImg2Img && providerInfo.hasApiKey
    ));
    if (!hasRefinementProvider) {
      ErrorService.showInfo('No providers with image refinement capability are configured. Add an OpenAI, Google, or Grok API key to enable refinement.', 'create');
      return;
    }

    setRefiningImage(image);
  }, [isDemo, gallery, availableRefinementProviders]);

  const getResolvedGalleryImage = useCallback(async (imageId: string): Promise<GeneratedImageEntry | null> => {
    const image = gallery.find((entry) => entry.id === imageId);
    if (!image) return null;

    if (isDocumentImageUri(image.uri)) {
      return image;
    }

    const persistedUri = await persistImageUri(image.uri, { prefix: 'gallery' });
    if (!persistedUri) {
      return null;
    }

    if (persistedUri !== image.uri) {
      dispatch(updateGalleryEntryUri({ id: image.id, uri: persistedUri }));
      return { ...image, uri: persistedUri };
    }

    return image;
  }, [dispatch, gallery]);

  const handleRefinementSubmit = useCallback(async (opts: { instructions: string; provider: AIProvider; modelId: string }) => {
    if (!refiningImage) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefiningImage(null);

    const resolvedImage = await getResolvedGalleryImage(refiningImage.id);
    if (!resolvedImage) {
      ErrorService.handleWithToast(new Error('Image file is unavailable.'), { feature: 'create' });
      return;
    }

    // Load base64 from the image file
    const base64 = await loadBase64FromFileUri(resolvedImage.uri);
    if (!base64) {
      ErrorService.handleWithToast(new Error('Could not load image for refinement.'), { feature: 'create' });
      return;
    }

    // Navigate to a new session with this image as source
    navigation.replace('CreateSession', {
      providers: [opts.provider],
      selectedModels: { [opts.provider]: opts.modelId },
      initialPrompt: `${resolvedImage.originalPrompt}. Refinement: ${opts.instructions}`,
      sourceImage: base64,
    });
  }, [getResolvedGalleryImage, refiningImage, navigation]);

  const handleSaveToPhotos = useCallback(async (imageId: string) => {
    const image = await getResolvedGalleryImage(imageId);
    if (!image) {
      ErrorService.handleWithToast(new Error('Image file is unavailable.'), { feature: 'create' });
      return;
    }

    setSavingImage(true);
    try {
      const currentPermission = await MediaLibrary.getPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await MediaLibrary.requestPermissionsAsync();
      const { status } = permission;
      if (status !== 'granted') {
        ErrorService.showWarning('Please allow access to save images.', 'create');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(image.uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      ErrorService.showSuccess('Image saved to your photo library.', 'create');
    } catch (error) {
      console.error('[CreateScreen] Save error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      ErrorService.handleWithToast(new Error('Failed to save image.'), { feature: 'create' });
    } finally {
      setSavingImage(false);
    }
  }, [getResolvedGalleryImage]);

  const handleShare = useCallback(async (imageId: string) => {
    setSharingImageId(imageId);

    try {
      const image = await getResolvedGalleryImage(imageId);
      if (!image) {
        ErrorService.handleWithToast(new Error('Image file is unavailable.'), { feature: 'create' });
        return;
      }

      const shareMessage = `Generated with ${getImageProviderDisplayName(image.provider, {
        includeModel: true,
        modelId: image.model,
      })}: "${image.originalPrompt}"`;
      const localMimeType = getImageMimeType(image.uri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(image.uri, {
          mimeType: localMimeType,
          UTI: Platform.OS === 'ios' ? getImageShareUti(image.uri) : undefined,
          dialogTitle: 'Share Image',
        });
        return;
      }

      await Share.share({
        url: image.uri,
        message: shareMessage,
        title: 'Share Image',
      });
    } catch (error) {
      console.error('[CreateScreen] Share error:', error);
      ErrorService.handleWithToast(new Error('Failed to share image.'), { feature: 'create' });
    } finally {
      setSharingImageId(null);
    }
  }, [getResolvedGalleryImage]);

  const handleDelete = useCallback((imageId: string) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            dispatch(removeFromGalleryWithCleanup(imageId));
          },
        },
      ]
    );
  }, [dispatch]);

  const handleSaveMediaToPhotos = useCallback(async (mediaId: string) => {
    const media = mediaGallery.find((entry) => entry.id === mediaId);
    if (!media) return;

    setSavingMediaId(mediaId);
    try {
      if (media.uri.startsWith('http')) {
        await MediaSaveService.saveRemoteUrl(media.uri, { album: 'Symposium AI' });
      } else {
        await MediaSaveService.saveFileUri(media.uri, { album: 'Symposium AI' });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      ErrorService.showSuccess(`${media.mediaType === 'video' ? 'Video' : 'Audio'} saved to your photo library.`, 'create');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      ErrorService.handleWithToast(error, { feature: 'create' });
    } finally {
      setSavingMediaId(null);
    }
  }, [mediaGallery]);

  const handleShareMedia = useCallback(async (mediaId: string) => {
    const media = mediaGallery.find((entry) => entry.id === mediaId);
    if (!media) return;

    setSharingMediaId(mediaId);
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(media.uri, {
          mimeType: media.mimeType,
          UTI: Platform.OS === 'ios' ? getMediaShareUti(media.mimeType) : undefined,
          dialogTitle: `Share ${media.mediaType}`,
        });
        return;
      }

      await Share.share({
        url: media.uri,
        message: `Generated with ${media.providerId}: "${media.prompt}"`,
        title: `Share ${media.mediaType}`,
      });
    } catch (error) {
      ErrorService.handleWithToast(error, { feature: 'create' });
    } finally {
      setSharingMediaId(null);
    }
  }, [mediaGallery]);

  const handleDeleteMedia = useCallback((mediaId: string) => {
    Alert.alert(
      'Delete Media',
      'Are you sure you want to delete this generated media?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            dispatch(removeFromMediaGalleryWithCleanup(mediaId));
          },
        },
      ]
    );
  }, [dispatch]);

  const saveAssetToLibrary = useCallback(async (asset: GalleryAsset): Promise<void> => {
    if (asset.source === 'image') {
      const image = await getResolvedGalleryImage(asset.id);
      if (!image) {
        throw new Error('Image file is unavailable.');
      }

      const currentPermission = await MediaLibrary.getPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await MediaLibrary.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Photo library permission is required.');
      }
      await MediaLibrary.saveToLibraryAsync(image.uri);
      return;
    }

    const media = asset.entry as GeneratedMediaEntry;
    if (media.uri.startsWith('http')) {
      await MediaSaveService.saveRemoteUrl(media.uri, { album: 'Symposium AI' });
    } else {
      await MediaSaveService.saveFileUri(media.uri, { album: 'Symposium AI' });
    }
  }, [getResolvedGalleryImage]);

  const handleSaveAsset = useCallback(async (asset: GalleryAsset) => {
    if (asset.source === 'image') {
      await handleSaveToPhotos(asset.id);
      return;
    }
    await handleSaveMediaToPhotos(asset.id);
  }, [handleSaveMediaToPhotos, handleSaveToPhotos]);

  const handleShareAsset = useCallback(async (asset: GalleryAsset) => {
    if (asset.source === 'image') {
      await handleShare(asset.id);
      return;
    }
    await handleShareMedia(asset.id);
  }, [handleShare, handleShareMedia]);

  const handleDeleteAsset = useCallback((asset: GalleryAsset) => {
    const label = getGalleryAssetTypeLabel(asset.type).toLowerCase();
    Alert.alert(
      `Delete ${getGalleryAssetTypeLabel(asset.type)}`,
      `Are you sure you want to delete this ${label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setSelectedAssetId(null);
            setSelectedAssetIds((current) => current.filter((id) => id !== asset.id));
            if (asset.source === 'image') {
              dispatch(removeFromGalleryWithCleanup(asset.id));
            } else {
              dispatch(removeFromMediaGalleryWithCleanup(asset.id));
            }
          },
        },
      ]
    );
  }, [dispatch]);

  const handleRefineAsset = useCallback((asset: GalleryAsset) => {
    if (asset.source !== 'image') return;
    handleRefine(asset.id);
  }, [handleRefine]);

  const toggleAssetSelection = useCallback((assetId: string) => {
    setSelectedAssetIds((current) => (
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId]
    ));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedAssetIds([]);
  }, []);

  const handleLibraryAssetPress = useCallback((asset: GalleryAsset) => {
    if (selectionMode) {
      toggleAssetSelection(asset.id);
      return;
    }
    setSelectedAssetId(asset.id);
  }, [selectionMode, toggleAssetSelection]);

  const handleLibraryAssetLongPress = useCallback((asset: GalleryAsset) => {
    setSelectionMode(true);
    setSelectedAssetIds((current) => current.includes(asset.id) ? current : [...current, asset.id]);
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedBulkAssets.length === 0) return;
    Alert.alert(
      'Delete Assets',
      `Delete ${selectedBulkAssets.length} selected asset${selectedBulkAssets.length === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            selectedBulkAssets.forEach((asset) => {
              if (asset.source === 'image') {
                dispatch(removeFromGalleryWithCleanup(asset.id));
              } else {
                dispatch(removeFromMediaGalleryWithCleanup(asset.id));
              }
            });
            exitSelectionMode();
          },
        },
      ]
    );
  }, [dispatch, exitSelectionMode, selectedBulkAssets]);

  const handleBulkSave = useCallback(async () => {
    if (selectedBulkAssets.length === 0 || bulkSaving) return;
    setBulkSaving(true);
    let failures = 0;
    try {
      for (const asset of selectedBulkAssets) {
        try {
          await saveAssetToLibrary(asset);
        } catch {
          failures += 1;
        }
      }

      if (failures > 0) {
        ErrorService.showWarning(
          `${selectedBulkAssets.length - failures} saved. ${failures} failed.`,
          'create'
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        ErrorService.showSuccess(`${selectedBulkAssets.length} asset${selectedBulkAssets.length === 1 ? '' : 's'} saved.`, 'create');
        exitSelectionMode();
      }
    } finally {
      setBulkSaving(false);
    }
  }, [bulkSaving, exitSelectionMode, saveAssetToLibrary, selectedBulkAssets]);

  const toggleGalleryFilterValue = useCallback((field: 'providers' | 'models' | 'operations', value: string) => {
    setGalleryFilters((current) => {
      const values = current[field];
      return {
        ...current,
        [field]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
  }, []);

  const resetGalleryFilters = useCallback(() => {
    setGalleryFilters(EMPTY_GALLERY_FILTERS);
    setGallerySearch('');
    setGallerySortMode('newest');
  }, []);

  const handleVideoPlaybackStateChange = useCallback((mediaId: string, playbackState: VideoPlaybackState) => {
    setVideoPlaybackStates((current) => {
      if (
        current[mediaId]?.isPlaying === playbackState.isPlaying &&
        current[mediaId]?.hasEnded === playbackState.hasEnded
      ) {
        return current;
      }

      return {
        ...current,
        [mediaId]: playbackState,
      };
    });
  }, []);

  const handleImagePress = useCallback((imageId: string) => {
    if (longPressHandledRef.current === imageId) {
      longPressHandledRef.current = null;
      return;
    }

    setSelectedImageId((current) => (current === imageId ? null : imageId));
  }, []);

  const handleImageLongPress = useCallback((imageId: string) => {
    longPressHandledRef.current = imageId;
    handleDelete(imageId);
  }, [handleDelete]);

  const renderImageItem = useCallback(({ item }: { item: GeneratedImageEntry }) => {
    const isSelected = selectedImageId === item.id;
    const canRefine = supportsImageInput(item.provider, item.model);
    const providerName = getImageProviderDisplayName(item.provider, {
      includeModel: true,
      modelId: item.model,
    });
    const badgeLabel = getImageModelDisplayName(item.provider, item.model);
    const isSharing = sharingImageId === item.id;

    return (
      <TouchableOpacity
        style={[styles.imageCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleImagePress(item.id)}
        onLongPress={() => handleImageLongPress(item.id)}
        delayLongPress={350}
        activeOpacity={0.9}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Image generated by ${providerName}${item.isRefinement ? ', refined' : ''}`}
        accessibilityHint={isSelected ? "Tap to hide actions or long press to delete" : "Tap to show save, share, and refine options, or long press to delete"}
        accessibilityState={{ selected: isSelected }}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Provider Badge */}
        <View style={[styles.providerBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <Typography variant="caption" style={{ color: '#FFFFFF' }}>
            {badgeLabel}
          </Typography>
          {item.isRefinement && (
            <View style={[styles.refinedBadge, { backgroundColor: theme.colors.primary[500] }]}>
              <Typography variant="caption" style={{ color: '#FFFFFF', fontSize: 10 }}>
                Refined
              </Typography>
            </View>
          )}
        </View>

        {/* Actions */}
        {isSelected && (
          <View style={[styles.actionsOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSaveToPhotos(item.id)}
                disabled={savingImage}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Save to photos"
                accessibilityHint="Saves this image to your photo library"
                accessibilityState={{ disabled: savingImage }}
              >
                {savingImage ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="download-outline" size={24} color="#FFFFFF" />
                )}
                <Typography variant="caption" style={{ color: '#FFFFFF', marginTop: 4 }}>
                  Save
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShare(item.id)}
                disabled={isSharing}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Share image"
                accessibilityHint="Opens share sheet to share this image"
                accessibilityState={{ disabled: isSharing }}
              >
                {isSharing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="share-outline" size={24} color="#FFFFFF" />
                )}
                <Typography variant="caption" style={{ color: '#FFFFFF', marginTop: 4 }}>
                  Share
                </Typography>
              </TouchableOpacity>

              {canRefine && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRefine(item.id)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Refine image"
                  accessibilityHint="Opens refinement options to modify this image"
                >
                  <Ionicons name="color-wand-outline" size={24} color="#FFFFFF" />
                  <Typography variant="caption" style={{ color: '#FFFFFF', marginTop: 4 }}>
                    Refine
                  </Typography>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(item.id)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Delete image"
                accessibilityHint="Permanently deletes this image from gallery"
              >
                <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                <Typography variant="caption" style={{ color: '#FF6B6B', marginTop: 4 }}>
                  Delete
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [
    theme,
    selectedImageId,
    savingImage,
    handleSaveToPhotos,
    handleShare,
    handleRefine,
    handleDelete,
    handleImageLongPress,
    handleImagePress,
    sharingImageId,
  ]);

  const renderMediaItem = useCallback(({ item }: { item: GeneratedMediaEntry }) => {
    const isSelected = selectedMediaId === item.id;
    const isVideo = item.mediaType === 'video';
    const isSharing = sharingMediaId === item.id;
    const isSaving = savingMediaId === item.id;
    const isVideoPlaying = isVideo && Boolean(videoPlaybackStates[item.id]?.isPlaying);
    const shouldShowActions = isSelected && !isVideoPlaying;
    const mediaActionButtons = (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleSaveMediaToPhotos(item.id)}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={`Save ${item.mediaType}`}
        >
          {isSaving ? (
            <ActivityIndicator color={isVideo ? theme.colors.primary[500] : '#FFFFFF'} size="small" />
          ) : (
            <Ionicons name="download-outline" size={24} color={isVideo ? theme.colors.text.primary : '#FFFFFF'} />
          )}
          <Typography variant="caption" style={{ color: isVideo ? theme.colors.text.primary : '#FFFFFF', marginTop: 4 }}>
            Save
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleShareMedia(item.id)}
          disabled={isSharing}
          accessibilityRole="button"
          accessibilityLabel={`Share ${item.mediaType}`}
        >
          {isSharing ? (
            <ActivityIndicator color={isVideo ? theme.colors.primary[500] : '#FFFFFF'} size="small" />
          ) : (
            <Ionicons name="share-outline" size={24} color={isVideo ? theme.colors.text.primary : '#FFFFFF'} />
          )}
          <Typography variant="caption" style={{ color: isVideo ? theme.colors.text.primary : '#FFFFFF', marginTop: 4 }}>
            Share
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteMedia(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.mediaType}`}
        >
          <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
          <Typography variant="caption" style={{ color: '#FF6B6B', marginTop: 4 }}>
            Delete
          </Typography>
        </TouchableOpacity>
      </View>
    );

    return (
      <View>
        <TouchableOpacity
          style={[styles.imageCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => setSelectedMediaId((current) => (current === item.id ? null : item.id))}
          onLongPress={() => handleDeleteMedia(item.id)}
          delayLongPress={350}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`${isVideo ? 'Video' : 'Audio'} generated by ${item.providerId}`}
          accessibilityHint={isSelected ? 'Tap to hide actions or long press to delete' : 'Tap to show save and share actions, or long press to delete'}
          accessibilityState={{ selected: isSelected }}
        >
          {isVideo ? (
            <VideoPreview
              mediaId={item.id}
              uri={item.uri}
              style={styles.videoPreview}
              onPlaybackStateChange={handleVideoPlaybackStateChange}
            />
          ) : (
            <AudioPreview uri={item.uri} theme={theme} />
          )}

          <View style={[styles.providerBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <Typography variant="caption" style={{ color: '#FFFFFF' }}>
              {isVideo ? 'Runway' : 'ElevenLabs'} • {item.modelId}
            </Typography>
          </View>

          {item.expiresAt && item.uri.startsWith('http') && (
            <View style={[styles.expiryBadge, { backgroundColor: theme.colors.warning[500] }]}>
              <Typography variant="caption" style={{ color: '#FFFFFF', fontSize: 10 }}>
                Link expires
              </Typography>
            </View>
          )}

          {shouldShowActions && !isVideo && (
            <View style={[styles.actionsOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
              {mediaActionButtons}
            </View>
          )}
        </TouchableOpacity>

        {shouldShowActions && isVideo && (
          <View style={[styles.mediaActionsPanel, { backgroundColor: theme.colors.surface }]}>
            {mediaActionButtons}
          </View>
        )}
      </View>
    );
  }, [
    handleDeleteMedia,
    handleSaveMediaToPhotos,
    handleShareMedia,
    handleVideoPlaybackStateChange,
    savingMediaId,
    selectedMediaId,
    sharingMediaId,
    theme,
    videoPlaybackStates,
  ]);

  const renderFilterChip = useCallback((
    label: string,
    selected: boolean,
    onPress: () => void,
    key?: string
  ) => (
    <TouchableOpacity
      key={key || label}
      style={[
        styles.libraryChip,
        {
          backgroundColor: selected ? theme.colors.primary[500] : theme.colors.surface,
          borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Typography
        variant="caption"
        weight="semibold"
        style={{ color: selected ? '#FFFFFF' : theme.colors.text.primary }}
      >
        {label}
      </Typography>
    </TouchableOpacity>
  ), [theme]);

  const renderLibraryAssetItem = useCallback(({ item }: { item: GalleryAsset }) => {
    const selected = selectedAssetIds.includes(item.id);
    const providerLabel = getGalleryAssetProviderLabel(item);
    const modelLabel = getGalleryAssetModelLabel(item);
    const title = item.originalPrompt || item.prompt || getGalleryAssetTypeLabel(item.type);
    const isAudioRow = galleryTab === 'audio';
    const isVideo = item.type === 'video';
    const isAudio = item.type === 'audio';

    return (
      <TouchableOpacity
        style={[
          isAudioRow ? styles.audioLibraryRow : styles.libraryCard,
          {
            width: isAudioRow ? '100%' : LIBRARY_CARD_WIDTH,
            backgroundColor: theme.colors.surface,
            borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
          },
        ]}
        onPress={() => handleLibraryAssetPress(item)}
        onLongPress={() => handleLibraryAssetLongPress(item)}
        delayLongPress={350}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${getGalleryAssetTypeLabel(item.type)} generated by ${providerLabel}`}
        accessibilityState={{ selected }}
      >
        {isAudioRow ? (
          <>
            <View style={[styles.audioLibraryIcon, { backgroundColor: theme.colors.primary[50] }]}>
              <Ionicons name="musical-notes-outline" size={22} color={theme.colors.primary[600]} />
            </View>
            <View style={styles.audioLibraryText}>
              <Typography variant="body" weight="semibold" numberOfLines={1}>
                {title}
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {providerLabel} • {modelLabel}{formatGalleryDuration(item.durationSeconds) ? ` • ${formatGalleryDuration(item.durationSeconds)}` : ''}
              </Typography>
            </View>
          </>
        ) : (
          <>
            <View style={styles.libraryPreview}>
              {item.type === 'image' ? (
                <Image source={{ uri: item.uri }} style={styles.libraryImage} resizeMode="cover" />
              ) : (
                <View style={[styles.libraryMediaPlaceholder, { backgroundColor: isVideo ? '#111827' : theme.colors.primary[50] }]}>
                  <Ionicons
                    name={isVideo ? 'play-circle-outline' : 'musical-notes-outline'}
                    size={36}
                    color={isVideo ? '#FFFFFF' : theme.colors.primary[600]}
                  />
                </View>
              )}
              <View style={[styles.libraryTypeBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                <Ionicons
                  name={isVideo ? 'videocam-outline' : isAudio ? 'musical-notes-outline' : 'image-outline'}
                  size={13}
                  color="#FFFFFF"
                />
                <Typography variant="caption" style={{ color: '#FFFFFF', fontSize: 11 }}>
                  {getGalleryAssetTypeLabel(item.type)}
                </Typography>
              </View>
              {selectionMode && (
                <View style={[styles.selectionBadge, { backgroundColor: selected ? theme.colors.primary[500] : 'rgba(0,0,0,0.45)' }]}>
                  <Ionicons name={selected ? 'checkmark' : 'ellipse-outline'} size={18} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.libraryCardBody}>
              <Typography variant="caption" weight="semibold" numberOfLines={1}>
                {title}
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {providerLabel} • {modelLabel}
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {formatGalleryDate(item.createdAt)}
              </Typography>
            </View>
          </>
        )}
        {isAudioRow && selectionMode && (
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={selected ? theme.colors.primary[500] : theme.colors.text.secondary}
          />
        )}
      </TouchableOpacity>
    );
  }, [
    galleryTab,
    handleLibraryAssetLongPress,
    handleLibraryAssetPress,
    selectedAssetIds,
    selectionMode,
    theme,
  ]);

  const renderLibraryControls = () => (
    <View style={[styles.libraryControls, { backgroundColor: theme.colors.background }]}>
      <View style={styles.librarySummaryRow}>
        <Typography variant="caption" color="secondary">
          {galleryAssets.length} / {LOCAL_GALLERY_ASSET_LIMIT} assets
        </Typography>
        {isNearRetentionLimit && (
          <Typography variant="caption" style={{ color: theme.colors.warning[600] }}>
            Near limit
          </Typography>
        )}
      </View>

      <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.colors.text.secondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text.primary }]}
          placeholder="Search Gallery"
          placeholderTextColor={theme.colors.text.secondary}
          value={gallerySearch}
          onChangeText={setGallerySearch}
          returnKeyType="search"
        />
        {gallerySearch.length > 0 && (
          <TouchableOpacity onPress={() => setGallerySearch('')} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryTabScroll}>
        {GALLERY_TABS.map((tab) => {
          const selected = galleryTab === tab.value;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[
                styles.galleryTabButton,
                {
                  backgroundColor: selected ? theme.colors.primary[500] : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
                },
              ]}
              onPress={() => setGalleryTab(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Ionicons name={tab.icon} size={16} color={selected ? '#FFFFFF' : theme.colors.text.secondary} />
              <Typography
                variant="caption"
                weight="semibold"
                style={{ color: selected ? '#FFFFFF' : theme.colors.text.primary }}
              >
                {tab.label} {galleryCounts[tab.value]}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.libraryToolbar}>
        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          onPress={() => setFilterSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open gallery filters"
        >
          <Ionicons name="options-outline" size={18} color={theme.colors.text.primary} />
          <Typography variant="caption" weight="semibold">
            Filters{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
          </Typography>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolbarButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          onPress={() => setSelectionMode((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={selectionMode ? 'Exit select mode' : 'Select assets'}
        >
          <Ionicons name={selectionMode ? 'close-outline' : 'checkmark-circle-outline'} size={18} color={theme.colors.text.primary} />
          <Typography variant="caption" weight="semibold">
            {selectionMode ? 'Cancel' : 'Select'}
          </Typography>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterSheet = () => (
    <Modal
      visible={filterSheetVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setFilterSheetVisible(false)}
    >
      <View style={styles.modalScrim}>
        <View style={[styles.filterSheet, { backgroundColor: theme.colors.background }]}>
          <View style={styles.sheetHeader}>
            <Typography variant="subtitle" weight="semibold">
              Gallery Filters
            </Typography>
            <TouchableOpacity onPress={() => setFilterSheetVisible(false)} accessibilityRole="button" accessibilityLabel="Close filters">
              <Ionicons name="close-outline" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterSheetContent}>
            <View style={styles.filterGroup}>
              <Typography variant="caption" color="secondary" weight="semibold">
                Sort
              </Typography>
              <View style={styles.filterChipGrid}>
                {GALLERY_SORT_OPTIONS.map((option) => renderFilterChip(
                  option.label,
                  gallerySortMode === option.value,
                  () => setGallerySortMode(option.value),
                  option.value
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Typography variant="caption" color="secondary" weight="semibold">
                Date
              </Typography>
              <View style={styles.filterChipGrid}>
                {GALLERY_DATE_FILTERS.map((option) => renderFilterChip(
                  option.label,
                  galleryFilters.dateRange === option.value,
                  () => setGalleryFilters((current) => ({ ...current, dateRange: option.value })),
                  option.value
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Typography variant="caption" color="secondary" weight="semibold">
                Status
              </Typography>
              <View style={styles.filterChipGrid}>
                {GALLERY_AVAILABILITY_FILTERS.map((option) => renderFilterChip(
                  option.label,
                  galleryFilters.availability === option.value,
                  () => setGalleryFilters((current) => ({ ...current, availability: option.value })),
                  option.value
                ))}
              </View>
            </View>

            {providerFilterOptions.length > 0 && (
              <View style={styles.filterGroup}>
                <Typography variant="caption" color="secondary" weight="semibold">
                  Provider
                </Typography>
                <View style={styles.filterChipGrid}>
                  {providerFilterOptions.map((providerId) => renderFilterChip(
                    getGalleryProviderFilterLabel(providerId),
                    galleryFilters.providers.includes(providerId),
                    () => toggleGalleryFilterValue('providers', providerId),
                    providerId
                  ))}
                </View>
              </View>
            )}

            {modelFilterOptions.length > 0 && (
              <View style={styles.filterGroup}>
                <Typography variant="caption" color="secondary" weight="semibold">
                  Model
                </Typography>
                <View style={styles.filterChipGrid}>
                  {modelFilterOptions.map((modelId) => renderFilterChip(
                    modelId,
                    galleryFilters.models.includes(modelId),
                    () => toggleGalleryFilterValue('models', modelId),
                    modelId
                  ))}
                </View>
              </View>
            )}

            {operationFilterOptions.length > 0 && (
              <View style={styles.filterGroup}>
                <Typography variant="caption" color="secondary" weight="semibold">
                  Operation
                </Typography>
                <View style={styles.filterChipGrid}>
                  {operationFilterOptions.map((operation) => renderFilterChip(
                    operation.replace(/_/g, ' '),
                    galleryFilters.operations.includes(operation),
                    () => toggleGalleryFilterValue('operations', operation),
                    operation
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[styles.sheetActionButton, { borderColor: theme.colors.border }]}
              onPress={resetGalleryFilters}
              accessibilityRole="button"
            >
              <Typography variant="body" weight="semibold">
                Reset
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetActionButton, { backgroundColor: theme.colors.primary[500], borderColor: theme.colors.primary[500] }]}
              onPress={() => setFilterSheetVisible(false)}
              accessibilityRole="button"
            >
              <Typography variant="body" weight="semibold" style={{ color: '#FFFFFF' }}>
                Done
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDetailRow = (label: string, value?: string | number) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <View style={styles.detailMetaRow}>
        <Typography variant="caption" color="secondary">
          {label}
        </Typography>
        <Typography variant="caption" weight="semibold" style={styles.detailMetaValue}>
          {String(value)}
        </Typography>
      </View>
    );
  };

  const renderAssetDetail = () => {
    if (!selectedAsset) return null;
    const canRefineSelected = selectedAsset.source === 'image' &&
      supportsImageInput(
        (selectedAsset.entry as GeneratedImageEntry).provider,
        (selectedAsset.entry as GeneratedImageEntry).model
      );
    const title = selectedAsset.originalPrompt || selectedAsset.prompt || getGalleryAssetTypeLabel(selectedAsset.type);
    const providerLabel = getGalleryAssetProviderLabel(selectedAsset);
    const modelLabel = getGalleryAssetModelLabel(selectedAsset);
    const isSavingSelected = selectedAsset.source === 'image'
      ? savingImage
      : savingMediaId === selectedAsset.id;
    const isSharingSelected = selectedAsset.source === 'image'
      ? sharingImageId === selectedAsset.id
      : sharingMediaId === selectedAsset.id;

    return (
      <Modal
        visible={Boolean(selectedAsset)}
        animationType="slide"
        onRequestClose={() => setSelectedAssetId(null)}
      >
        <View style={[styles.detailContainer, { backgroundColor: theme.colors.background, paddingTop: insets.top + 8 }]}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedAssetId(null)} accessibilityRole="button" accessibilityLabel="Close preview">
              <Ionicons name="close-outline" size={28} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.detailHeaderText}>
              <Typography variant="subtitle" weight="semibold" numberOfLines={1}>
                {getGalleryAssetTypeLabel(selectedAsset.type)}
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>
                {providerLabel} • {modelLabel}
              </Typography>
            </View>
            <TouchableOpacity onPress={() => handleDeleteAsset(selectedAsset)} accessibilityRole="button" accessibilityLabel="Delete asset">
              <Ionicons name="trash-outline" size={24} color={theme.colors.error[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            {selectedAsset.type === 'image' && (
              <Image source={{ uri: selectedAsset.uri }} style={styles.detailImage} resizeMode="contain" />
            )}
            {selectedAsset.type === 'video' && (
              <VideoPreview
                mediaId={selectedAsset.id}
                uri={selectedAsset.uri}
                style={styles.detailVideo}
                onPlaybackStateChange={handleVideoPlaybackStateChange}
              />
            )}
            {selectedAsset.type === 'audio' && (
              <AudioPreview uri={selectedAsset.uri} theme={theme} />
            )}

            <View style={[styles.detailPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Typography variant="body" weight="semibold">
                {title}
              </Typography>
              {selectedAsset.prompt !== title && (
                <Typography variant="caption" color="secondary" style={styles.detailPrompt}>
                  {selectedAsset.prompt}
                </Typography>
              )}
              <View style={styles.detailMeta}>
                {renderDetailRow('Type', getGalleryAssetTypeLabel(selectedAsset.type))}
                {renderDetailRow('Provider', providerLabel)}
                {renderDetailRow('Model', modelLabel)}
                {renderDetailRow('Operation', selectedAsset.operation?.replace(/_/g, ' '))}
                {renderDetailRow('Duration', formatGalleryDuration(selectedAsset.durationSeconds))}
                {renderDetailRow('Created', formatGalleryDate(selectedAsset.createdAt))}
                {renderDetailRow('Status', selectedAsset.status)}
                {renderDetailRow('MIME', selectedAsset.mimeType)}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.detailActions, { paddingBottom: insets.bottom + 12, borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[styles.detailActionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => handleSaveAsset(selectedAsset)}
              disabled={isSavingSelected}
              accessibilityRole="button"
            >
              {isSavingSelected ? (
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              ) : (
                <Ionicons name="download-outline" size={22} color={theme.colors.text.primary} />
              )}
              <Typography variant="caption" weight="semibold">
                Save
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.detailActionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={() => handleShareAsset(selectedAsset)}
              disabled={isSharingSelected}
              accessibilityRole="button"
            >
              {isSharingSelected ? (
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
              ) : (
                <Ionicons name="share-outline" size={22} color={theme.colors.text.primary} />
              )}
              <Typography variant="caption" weight="semibold">
                Share
              </Typography>
            </TouchableOpacity>

            {canRefineSelected && (
              <TouchableOpacity
                style={[styles.detailActionButton, { backgroundColor: theme.colors.primary[500], borderColor: theme.colors.primary[500] }]}
                onPress={() => handleRefineAsset(selectedAsset)}
                accessibilityRole="button"
              >
                <Ionicons name="color-wand-outline" size={22} color="#FFFFFF" />
                <Typography variant="caption" weight="semibold" style={{ color: '#FFFFFF' }}>
                  Refine
                </Typography>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderBulkActionBar = () => {
    if (!selectionMode) return null;
    const disabled = selectedAssetIds.length === 0;
    return (
      <View style={[styles.bulkBar, { paddingBottom: insets.bottom + 10, backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <Typography variant="caption" weight="semibold">
          {selectedAssetIds.length} selected
        </Typography>
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={[styles.bulkButton, { borderColor: theme.colors.border }]}
            onPress={handleBulkSave}
            disabled={disabled || bulkSaving}
            accessibilityRole="button"
          >
            {bulkSaving ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            ) : (
              <Ionicons name="download-outline" size={18} color={disabled ? theme.colors.text.disabled : theme.colors.text.primary} />
            )}
            <Typography variant="caption" weight="semibold" color={disabled ? 'disabled' : 'primary'}>
              Save
            </Typography>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkButton, { borderColor: theme.colors.error[500] }]}
            onPress={handleBulkDelete}
            disabled={disabled}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color={disabled ? theme.colors.text.disabled : theme.colors.error[500]} />
            <Typography variant="caption" weight="semibold" style={{ color: disabled ? theme.colors.text.disabled : theme.colors.error[500] }}>
              Delete
            </Typography>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGalleryItem = useCallback(({ item }: { item: GalleryListItem }) => (
    item.kind === 'image'
      ? renderImageItem({ item: item.entry })
      : renderMediaItem({ item: item.entry })
  ), [renderImageItem, renderMediaItem]);

  // In gallery mode, the library renderer uses normalized assets.
  // In generation mode, keep the existing recent full-preview feed for the active session.
  const sessionGallery = isGalleryMode
    ? gallery
    : gallery.filter(img =>
        providers.includes(img.provider) &&
        activeSelectedModels[img.provider] === img.model &&
        img.createdAt >= Date.now() - 3600000 // Last hour
      );
  const galleryItems: GalleryListItem[] = [
    ...sessionGallery.map((entry) => ({ kind: 'image' as const, entry })),
    ...mediaGallery.map((entry) => ({ kind: 'media' as const, entry })),
  ].sort((a, b) => b.entry.createdAt - a.entry.createdAt);
  const hasActiveMediaGeneration = Boolean(mediaGeneration.video || mediaGeneration.audio);
  const libraryColumnCount = galleryTab === 'audio' ? 1 : 2;

  useEffect(() => {
    if (!focusMediaId || focusedMediaRef.current === focusMediaId) {
      return;
    }

    if (isGalleryMode) {
      const focusedAsset = galleryAssets.find((asset) => asset.source === 'media' && asset.id === focusMediaId);
      if (!focusedAsset) return;
      focusedMediaRef.current = focusMediaId;
      setGalleryTab(focusedAsset.type);
      setSelectedAssetId(focusMediaId);
      return;
    }

    const focusIndex = galleryItems.findIndex((item) => (
      item.kind === 'media' && item.entry.id === focusMediaId
    ));
    if (focusIndex < 0) {
      return;
    }

    focusedMediaRef.current = focusMediaId;
    setSelectedImageId(null);
    setSelectedMediaId(focusMediaId);

    try {
      flatListRef.current?.scrollToIndex({
        index: focusIndex,
        animated: true,
        viewPosition: 0.08,
      });
    } catch {
      // The selection still gives the user a clear target if layout is not ready yet.
    }
  }, [focusMediaId, galleryAssets, galleryItems, isGalleryMode]);

  if (isGalleryMode) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Typography variant="subtitle">
              Gallery
            </Typography>
            <Typography variant="caption" color="secondary">
              {galleryCounts.all} asset{galleryCounts.all === 1 ? '' : 's'} • {galleryCounts.image} images • {galleryCounts.video} videos • {galleryCounts.audio} audio
            </Typography>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {hasActiveMediaGeneration && (
          <View style={[styles.progressContainer, { backgroundColor: theme.colors.surface }]}>
            {(['video', 'audio'] as const).map((mediaType) => {
              const current = mediaGeneration[mediaType];
              if (!current) return null;
              return (
                <View key={mediaType} style={styles.progressItem}>
                  <Typography variant="body">
                    {mediaType === 'video' ? 'Runway video' : 'ElevenLabs audio'}
                  </Typography>
                  <View style={styles.progressRight}>
                    <Typography variant="caption" color="secondary">
                      {current.message || current.phase}
                    </Typography>
                    <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {errorMessage && (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.error[100] }]}>
            <Typography variant="body" style={{ color: theme.colors.error[700] }}>
              {errorMessage}
            </Typography>
          </View>
        )}

        {renderLibraryControls()}

        <FlatList
          key={`gallery-library-${libraryColumnCount}`}
          data={visibleGalleryAssets}
          keyExtractor={(item) => `${item.source}_${item.id}`}
          renderItem={renderLibraryAssetItem}
          numColumns={libraryColumnCount}
          columnWrapperStyle={libraryColumnCount > 1 ? styles.libraryColumnWrapper : undefined}
          contentContainerStyle={[
            styles.libraryContent,
            { paddingBottom: (selectionMode ? 96 : 16) + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={gallerySearch || activeFilterCount > 0 ? 'search-outline' : 'images-outline'}
                size={58}
                color={theme.colors.text.secondary}
              />
              <Typography variant="body" color="secondary" style={styles.emptyText}>
                {gallerySearch || activeFilterCount > 0 ? 'No matching assets' : 'No generated media yet'}
              </Typography>
              {(gallerySearch || activeFilterCount > 0) && (
                <TouchableOpacity
                  style={[styles.emptyAction, { borderColor: theme.colors.border }]}
                  onPress={resetGalleryFilters}
                  accessibilityRole="button"
                >
                  <Typography variant="caption" weight="semibold">
                    Reset filters
                  </Typography>
                </TouchableOpacity>
              )}
            </View>
          }
        />

        {renderBulkActionBar()}
        {renderFilterSheet()}
        {renderAssetDetail()}

        <ImageRefinementModal
          visible={refiningImage !== null}
          imageUri={refiningImage?.uri || ''}
          originalProvider={refiningImage?.provider || 'openai'}
          originalModelId={refiningImage?.model}
          availableProviders={availableRefinementProviders}
          onClose={() => setRefiningImage(null)}
          onRefine={handleRefinementSubmit}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Typography variant="subtitle">
            Create
          </Typography>
          <Typography variant="caption" color="secondary">
            {providers.map(p => getImageProviderDisplayName(p, {
              includeModel: true,
              modelId: activeSelectedModels[p],
            })).join(', ')}
          </Typography>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Generation Progress */}
      {isGenerating && (
        <View style={[styles.progressContainer, { backgroundColor: theme.colors.surface }]}>
          {providers.map(provider => {
            const progress = generationProgress[provider] || 'pending';
            return (
              <View key={provider} style={styles.progressItem}>
                <Typography variant="body">
                  {getImageModelDisplayName(provider, activeSelectedModels[provider])}
                </Typography>
                {progress === 'generating' && (
                  <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                )}
                {progress === 'complete' && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.success[500]} />
                )}
                {progress === 'error' && (
                  <Ionicons name="close-circle" size={20} color={theme.colors.error[500]} />
                )}
              </View>
            );
          })}
        </View>
      )}

      {hasActiveMediaGeneration && (
        <View style={[styles.progressContainer, { backgroundColor: theme.colors.surface }]}>
          {(['video', 'audio'] as const).map((mediaType) => {
            const current = mediaGeneration[mediaType];
            if (!current) return null;
            return (
              <View key={mediaType} style={styles.progressItem}>
                <Typography variant="body">
                  {mediaType === 'video' ? 'Runway video' : 'ElevenLabs audio'}
                </Typography>
                <View style={styles.progressRight}>
                  <Typography variant="caption" color="secondary">
                    {current.message || current.phase}
                  </Typography>
                  <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Error Message */}
      {errorMessage && (
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.error[100] }]}>
          <Typography variant="body" style={{ color: theme.colors.error[700] }}>
            {errorMessage}
          </Typography>
        </View>
      )}

      {/* Gallery */}
      <FlatList
        ref={flatListRef}
        data={galleryItems}
        keyExtractor={(item) => `${item.kind}_${item.entry.id}`}
        renderItem={renderGalleryItem}
        contentContainerStyle={[
          styles.galleryContent,
          { paddingBottom: insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={({ averageItemLength, index }) => {
          flatListRef.current?.scrollToOffset({
            offset: Math.max(0, averageItemLength * index),
            animated: true,
          });
        }}
        ListEmptyComponent={
          !isGenerating && !hasActiveMediaGeneration ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="images-outline"
                size={64}
                color={theme.colors.text.secondary}
              />
              <Typography variant="body" color="secondary" style={styles.emptyText}>
                No generated media yet
              </Typography>
            </View>
          ) : null
        }
      />

      {/* Refinement Modal */}
      <ImageRefinementModal
        visible={refiningImage !== null}
        imageUri={refiningImage?.uri || ''}
        originalProvider={refiningImage?.provider || 'openai'}
        originalModelId={refiningImage?.model}
        availableProviders={availableRefinementProviders}
        onClose={() => setRefiningImage(null)}
        onRefine={handleRefinementSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  progressContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  galleryContent: {
    padding: 16,
    gap: 16,
  },
  imageCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  videoPreview: {
    width: IMAGE_SIZE,
    height: Math.round(IMAGE_SIZE * 9 / 16),
    backgroundColor: '#000000',
  },
  videoPlayerSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  videoPressSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  audioPreview: {
    width: IMAGE_SIZE,
    minHeight: 156,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 18,
  },
  audioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  audioControlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioSecondaryControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlaybackInfo: {
    gap: 10,
  },
  audioProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioProgressSlider: {
    flex: 1,
    minHeight: 36,
  },
  audioTimeText: {
    minWidth: 34,
    textAlign: 'center',
  },
  providerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refinedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  mediaActionsPanel: {
    marginTop: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  libraryControls: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  librarySummaryRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBox: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 16,
    paddingVertical: 0,
  },
  galleryTabScroll: {
    gap: 8,
    paddingRight: 16,
  },
  galleryTabButton: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  libraryToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  toolbarButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  libraryContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: LIBRARY_GAP,
  },
  libraryColumnWrapper: {
    gap: LIBRARY_GAP,
  },
  libraryCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: LIBRARY_GAP,
  },
  libraryPreview: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  libraryImage: {
    width: '100%',
    height: '100%',
  },
  libraryMediaPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryTypeBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectionBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryCardBody: {
    padding: 10,
    gap: 2,
  },
  audioLibraryRow: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: LIBRARY_GAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioLibraryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioLibraryText: {
    flex: 1,
    minWidth: 0,
  },
  libraryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  filterSheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  sheetHeader: {
    minHeight: 40,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 18,
  },
  filterGroup: {
    gap: 8,
  },
  filterChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetActions: {
    padding: 16,
    flexDirection: 'row',
    gap: 10,
  },
  sheetActionButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  detailContent: {
    padding: 16,
    gap: 16,
  },
  detailImage: {
    width: '100%',
    height: Math.min(IMAGE_SIZE, 460),
  },
  detailVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  detailPrompt: {
    marginTop: 4,
  },
  detailMeta: {
    gap: 8,
  },
  detailMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailMetaValue: {
    flex: 1,
    textAlign: 'right',
  },
  detailActions: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  detailActionButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bulkBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyAction: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
  },
});
