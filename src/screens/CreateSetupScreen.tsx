/**
 * CreateSetupScreen - Tab screen for setting up image, video, and audio generation.
 * Premium-only feature with provider selection, prompt input, and options.
 */
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Keyboard,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import { useTheme } from '../theme';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useGreeting } from '../hooks/useGreeting';
import {
  Typography,
  GradientButton,
  HeaderIcon,
  SectionHeader,
  PromptHeroInput,
  ImageModelSelector,
  SegmentedControl,
  SheetHeader,
} from '../components/molecules';
import { Header, HeaderActions, DynamicAISelector } from '../components/organisms';
import { RootState, AppDispatch, isApiKeyConfigured } from '../store';
import {
  generateCreateImages,
  setPrompt,
  setStyle,
  setSize,
  setQuality,
  setImageCount,
  setImageResolution,
  setImageOutputFormat,
  setImageOutputCompression,
  setImageBackground,
  setImageModeration,
  setSelectedModel,
  setSelectedProviders,
  setActiveCreateTab,
  markCreateActivitySeen,
  hydrateGallery,
  hydrateMediaGallery,
  generateCreateVideo,
  generateCreateAudio,
  selectCreateState,
} from '../store/createSlice';
import { RootStackParamList, AIProvider, AIConfig } from '../types';
import type { CreateMediaOperation, MediaProviderModelOption, MediaProviderVoiceOption } from '../types/media';
import { STYLE_PRESETS } from '../config/create/stylePresets';
import {
  ELEVENLABS_DEFAULT_OUTPUT_FORMAT,
  ELEVENLABS_DEFAULT_SFX_MODEL,
  ELEVENLABS_DEFAULT_TTS_MODEL,
  ELEVENLABS_DEFAULT_VOICE_ID,
  ELEVENLABS_OUTPUT_FORMATS,
  RUNWAY_DEFAULT_ASPECT_RATIO,
  RUNWAY_DEFAULT_DURATION_SECONDS,
  RUNWAY_DEFAULT_VIDEO_MODEL,
  getMediaModels,
  getRunwayAspectRatios,
  getRunwayVideoDurations,
} from '../config/mediaProviders';
import {
  getResolvedImageModel,
  type ImageBackgroundOption,
  type ImageModelConfig,
  type ImageModerationOption,
  type ImageOutputFormat,
  type ImageOutputQuality,
  resolveImageModelId,
  supportsImageGeneration,
} from '../config/imageGenerationModels';
import { AI_PROVIDERS } from '../config/aiProviders';
import { getAIProviderIcon } from '../utils/aiProviderAssets';
import { getImageMimeType } from '../services/images/fileCache';
import APIKeyService from '../services/APIKeyService';
import MediaGenerationService from '../services/media/MediaGenerationService';
import { ErrorService } from '../services/errors/ErrorService';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type AudioPickerType = 'voice' | 'model' | 'format';

const MAX_PROMPT_LENGTH = 4000;

// Image generation capable providers
const IMAGE_GEN_PROVIDERS = ['openai', 'google', 'grok'];

const IMAGE_QUALITY_LABELS: Record<ImageOutputQuality, string> = {
  auto: 'Match model',
  low: 'Draft',
  medium: 'Medium',
  high: 'High',
  standard: 'Standard',
  hd: 'HD',
};

const IMAGE_FORMAT_LABELS: Record<ImageOutputFormat, string> = {
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
};

const IMAGE_BACKGROUND_LABELS: Record<ImageBackgroundOption, string> = {
  auto: 'Default background',
  opaque: 'Opaque',
  transparent: 'Transparent',
};

const IMAGE_MODERATION_LABELS: Record<ImageModerationOption, string> = {
  auto: 'Default safety',
  low: 'Less restrictive',
};

const DEFAULT_IMAGE_QUALITY_OPTIONS: ImageOutputQuality[] = ['auto'];
const DEFAULT_IMAGE_FORMAT_OPTIONS: ImageOutputFormat[] = ['png'];
const DEFAULT_IMAGE_BACKGROUND_OPTIONS: ImageBackgroundOption[] = ['auto'];
const DEFAULT_IMAGE_MODERATION_OPTIONS: ImageModerationOption[] = ['auto'];

function intersectValues<T extends string>(lists: T[][]): T[] {
  if (lists.length === 0) return [];
  return lists[0].filter((value) => lists.every((list) => list.includes(value)));
}

function getSelectedImageModels(
  providers: AIProvider[],
  selectedModels: Partial<Record<AIProvider, string>>
): ImageModelConfig[] {
  return providers
    .map((provider) => getResolvedImageModel(provider, selectedModels[provider]))
    .filter((model): model is ImageModelConfig => Boolean(model));
}

function mergeAudioVoices(
  existing: MediaProviderVoiceOption[],
  incoming: MediaProviderVoiceOption[]
): MediaProviderVoiceOption[] {
  const voicesById = new Map(existing.map((voice) => [voice.id, voice]));
  incoming.forEach((voice) => {
    voicesById.set(voice.id, voice);
  });
  return Array.from(voicesById.values());
}

export default function CreateSetupScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isDemo } = useFeatureAccess();
  const greeting = useGreeting({ screenCategory: 'create' });

  const createState = useSelector(selectCreateState);
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});
  const verifiedProviders = useSelector((state: RootState) => state.settings.verifiedProviders || []);

  const {
    activeTab = 'image',
    selectedProviders,
    selectedModels = {},
    currentPrompt,
    selectedStyle,
    selectedSize,
    selectedQuality,
    selectedImageCount = 1,
    selectedImageResolution,
    selectedImageOutputFormat = 'png',
    selectedImageOutputCompression = 80,
    selectedImageBackground = 'auto',
    selectedImageModeration = 'auto',
    galleryHydrated,
    gallery,
    mediaGalleryHydrated = false,
    mediaGallery = [],
    imageGeneration = null,
    mediaGeneration = { video: null, audio: null },
    lastImageGenerationResult,
    lastMediaGenerationResult,
  } = createState;

  const galleryCount = gallery.length + mediaGallery.length;
  const [selectedAIs, setSelectedAIs] = useState<AIConfig[]>([]);
  const [imageMode, setImageMode] = useState<'create' | 'refine'>('create');
  const [imageSourceUris, setImageSourceUris] = useState<string[]>([]);
  const [videoSourceUri, setVideoSourceUri] = useState<string | undefined>();
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoModelId, setVideoModelId] = useState(RUNWAY_DEFAULT_VIDEO_MODEL);
  const [videoDuration, setVideoDuration] = useState(RUNWAY_DEFAULT_DURATION_SECONDS);
  const [videoAspectRatio, setVideoAspectRatio] = useState(RUNWAY_DEFAULT_ASPECT_RATIO);
  const [audioPrompt, setAudioPrompt] = useState('');
  const [audioOperation, setAudioOperation] = useState<Extract<CreateMediaOperation, 'text_to_speech' | 'sound_effect'>>('text_to_speech');
  const [audioTtsModelId, setAudioTtsModelId] = useState(ELEVENLABS_DEFAULT_TTS_MODEL);
  const [audioSfxModelId, setAudioSfxModelId] = useState(ELEVENLABS_DEFAULT_SFX_MODEL);
  const [audioVoiceId, setAudioVoiceId] = useState(ELEVENLABS_DEFAULT_VOICE_ID);
  const [audioOutputFormat, setAudioOutputFormat] = useState(ELEVENLABS_DEFAULT_OUTPUT_FORMAT);
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined);
  const [promptInfluence, setPromptInfluence] = useState(0.3);
  const [audioVoices, setAudioVoices] = useState<MediaProviderVoiceOption[]>([]);
  const [audioModels, setAudioModels] = useState<MediaProviderModelOption[]>([]);
  const [loadingAudioOptions, setLoadingAudioOptions] = useState(false);
  const [loadingMoreAudioVoices, setLoadingMoreAudioVoices] = useState(false);
  const [audioVoiceHasMore, setAudioVoiceHasMore] = useState(false);
  const [audioVoiceNextPageToken, setAudioVoiceNextPageToken] = useState<string | null>(null);
  const [audioVoiceTotalCount, setAudioVoiceTotalCount] = useState<number | undefined>();
  const [audioVoiceSearch, setAudioVoiceSearch] = useState('');
  const [isAudioSettingsExpanded, setIsAudioSettingsExpanded] = useState(false);
  const [audioPicker, setAudioPicker] = useState<AudioPickerType | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const videoOperation: Extract<CreateMediaOperation, 'text_to_video' | 'image_to_video'> = videoSourceUri
    ? 'image_to_video'
    : 'text_to_video';
  const runwayModels = useMemo(() => getMediaModels('runway', videoOperation), [videoOperation]);
  const videoDurations = useMemo(
    () => getRunwayVideoDurations(videoModelId, videoOperation),
    [videoModelId, videoOperation]
  );
  const videoAspectRatios = useMemo(
    () => getRunwayAspectRatios(videoModelId, videoOperation),
    [videoModelId, videoOperation]
  );
  const hasRunwayKey = isApiKeyConfigured(apiKeys.runway);
  const hasElevenLabsKey = isApiKeyConfigured(apiKeys.elevenlabs);
  const activeAudioModelId = audioOperation === 'text_to_speech' ? audioTtsModelId : audioSfxModelId;
  const canGenerateVideoInput = videoPrompt.trim().length > 0 || Boolean(videoSourceUri);
  const canGenerateVideo = hasRunwayKey && canGenerateVideoInput;
  const canGenerateAudioInput = audioPrompt.trim().length > 0;
  const canGenerateAudio = hasElevenLabsKey && canGenerateAudioInput;
  const primaryTintBackground = isDark ? theme.colors.overlays.medium : theme.colors.primary[50];
  const primaryTintStrongBackground = isDark ? theme.colors.overlays.strong : theme.colors.primary[100];
  const primaryAccentColor = isDark ? theme.colors.primary[300] : theme.colors.primary[600];

  useEffect(() => {
    if (runwayModels.some((model) => model.id === videoModelId)) {
      return;
    }

    const nextModelId = runwayModels[0]?.id || RUNWAY_DEFAULT_VIDEO_MODEL;
    setVideoModelId(nextModelId);
    const nextDurations = getRunwayVideoDurations(nextModelId, videoOperation);
    const nextRatios = getRunwayAspectRatios(nextModelId, videoOperation);
    setVideoDuration(nextDurations[0] || RUNWAY_DEFAULT_DURATION_SECONDS);
    setVideoAspectRatio(nextRatios[0]?.id || RUNWAY_DEFAULT_ASPECT_RATIO);
  }, [runwayModels, videoModelId, videoOperation]);

  // Listen for keyboard show/hide to toggle Generate button visibility
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Hydrate gallery on mount (skip in demo mode - demo images are URLs, not local files)
  useEffect(() => {
    if (!galleryHydrated && !isDemo) {
      dispatch(hydrateGallery());
    }
    if (!mediaGalleryHydrated && !isDemo) {
      dispatch(hydrateMediaGallery());
    }
  }, [dispatch, galleryHydrated, isDemo, mediaGalleryHydrated]);

  useEffect(() => {
    dispatch(markCreateActivitySeen());
  }, [dispatch]);

  useEffect(() => {
    const loadAudioOptions = async () => {
      if (activeTab !== 'audio' || !hasElevenLabsKey || loadingAudioOptions || audioVoices.length > 0) {
        return;
      }

      setLoadingAudioOptions(true);
      try {
        const key = await APIKeyService.getKey('elevenlabs');
        if (!key) return;
        const options = await MediaGenerationService.listElevenLabsOptions(key, {
          pageSize: 100,
          includeTotalCount: true,
          sort: 'name',
          sortDirection: 'asc',
        });
        setAudioVoices(options.voices || []);
        setAudioModels(options.models || []);
        setAudioVoiceHasMore(Boolean(options.voiceHasMore));
        setAudioVoiceNextPageToken(options.voiceNextPageToken || null);
        setAudioVoiceTotalCount(options.voiceTotalCount);
        const firstVoice = options.voices?.[0]?.id;
        if (firstVoice) {
          setAudioVoiceId(firstVoice);
        }
      } catch (error) {
        ErrorService.handleWithToast(error, { feature: 'create', provider: 'elevenlabs' });
      } finally {
        setLoadingAudioOptions(false);
      }
    };

    loadAudioOptions();
  }, [activeTab, audioVoices.length, hasElevenLabsKey, loadingAudioOptions]);

  // Build AIConfig objects for image-capable providers
  const configuredImageAIs = useMemo(() => {
    return AI_PROVIDERS
      .filter(provider => {
        // Only image generation capable providers
        if (!IMAGE_GEN_PROVIDERS.includes(provider.id)) return false;
        // Must have API key and be verified (or in demo mode)
        if (isDemo) return IMAGE_GEN_PROVIDERS.includes(provider.id);
        const hasKey = isApiKeyConfigured(apiKeys[provider.id]);
        const isVerified = verifiedProviders.includes(provider.id);
        return hasKey && isVerified && supportsImageGeneration(provider.id as AIProvider);
      })
      .map(provider => {
        const iconData = getAIProviderIcon(provider.id);
        return {
          id: provider.id,
          provider: provider.id as AIProvider,
          name: provider.name,
          model: resolveImageModelId(provider.id as AIProvider, selectedModels[provider.id as AIProvider]) || 'default',
          icon: iconData.icon,
          iconType: iconData.iconType,
          color: provider.color,
        } as AIConfig;
      });
  }, [apiKeys, verifiedProviders, isDemo, selectedModels]);

  // Sync selectedAIs with selectedProviders from Redux
  useEffect(() => {
    const ais = configuredImageAIs.filter(ai =>
      selectedProviders.includes(ai.provider)
    );
    // Only update if the selected AIs have actually changed to prevent infinite loops
    setSelectedAIs(prev => {
      const prevIds = prev.map(a => a.id).sort().join(',');
      const newIds = ais.map(a => a.id).sort().join(',');
      return prevIds === newIds ? prev : ais;
    });
  }, [selectedProviders, configuredImageAIs]);

  const handleToggleAI = useCallback((ai: AIConfig) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const isSelected = selectedProviders.includes(ai.provider);
    let newProviders: AIProvider[];

    if (isSelected) {
      newProviders = selectedProviders.filter(p => p !== ai.provider);
    } else if (selectedProviders.length < 3) {
      newProviders = [...selectedProviders, ai.provider];
    } else {
      return; // Max 3 selected
    }

    dispatch(setSelectedProviders(newProviders));
  }, [selectedProviders, dispatch]);

  const handleStyleSelect = useCallback((styleId: typeof selectedStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(setStyle(styleId));
  }, [dispatch]);

  const handleSizeSelect = useCallback((sizeId: typeof selectedSize) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(setSize(sizeId));
  }, [dispatch]);

  const handleQualitySelect = useCallback((quality: typeof selectedQuality) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(setQuality(quality));
  }, [dispatch]);

  const selectedImageModels = useMemo(
    () => getSelectedImageModels(selectedProviders, selectedModels),
    [selectedModels, selectedProviders]
  );
  const imageSupportsSourceInput = selectedImageModels.some((model) => model.supportsImageInput);
  const imageMaxReferenceImages = Math.max(1, ...selectedImageModels.map((model) => model.maxReferenceImages || 0));
  const imageMaxCount = selectedImageModels.length > 0
    ? Math.max(1, Math.min(...selectedImageModels.map((model) => model.maxImagesPerRequest || 1), 10))
    : 1;
  const imageResolutionOptions = useMemo(
    () => intersectValues(selectedImageModels.map((model) => model.resolutions || [])),
    [selectedImageModels]
  );
  const imageQualityOptions = useMemo(() => {
    const common = intersectValues<ImageOutputQuality>(
      selectedImageModels.map((model) => model.qualityOptions || DEFAULT_IMAGE_QUALITY_OPTIONS)
    );
    return common.length > 0 ? common : DEFAULT_IMAGE_QUALITY_OPTIONS;
  }, [selectedImageModels]);
  const imageFormatOptions = useMemo(() => {
    const common = intersectValues<ImageOutputFormat>(
      selectedImageModels.map((model) => model.outputFormats || DEFAULT_IMAGE_FORMAT_OPTIONS)
    );
    return common.length > 0 ? common : DEFAULT_IMAGE_FORMAT_OPTIONS;
  }, [selectedImageModels]);
  const imageBackgroundOptions = useMemo(() => {
    const common = intersectValues<ImageBackgroundOption>(
      selectedImageModels.map((model) => model.backgroundOptions || DEFAULT_IMAGE_BACKGROUND_OPTIONS)
    );
    return common.length > 0 ? common : DEFAULT_IMAGE_BACKGROUND_OPTIONS;
  }, [selectedImageModels]);
  const imageModerationOptions = useMemo(() => {
    const common = intersectValues<ImageModerationOption>(
      selectedImageModels.map((model) => model.moderationOptions || DEFAULT_IMAGE_MODERATION_OPTIONS)
    );
    return common.length > 0 ? common : DEFAULT_IMAGE_MODERATION_OPTIONS;
  }, [selectedImageModels]);
  const selectedImageModelSummary = selectedImageModels.map((model) => model.displayName).join(' • ');
  const canUseImageSources = imageMode === 'refine' || imageSourceUris.length > 0;
  const canGenerateImageInput = currentPrompt.trim().length > 0 &&
    selectedProviders.length > 0 &&
    (imageMode === 'create' || imageSourceUris.length > 0) &&
    (!canUseImageSources || imageSupportsSourceInput);
  const canGenerateImage = canGenerateImageInput && !imageGeneration;

  useEffect(() => {
    if (selectedImageCount > imageMaxCount) {
      dispatch(setImageCount(imageMaxCount));
    }
  }, [dispatch, imageMaxCount, selectedImageCount]);

  useEffect(() => {
    if (selectedImageResolution && imageResolutionOptions.length > 0 && !imageResolutionOptions.includes(selectedImageResolution)) {
      dispatch(setImageResolution(imageResolutionOptions[0]));
    }
  }, [dispatch, imageResolutionOptions, selectedImageResolution]);

  useEffect(() => {
    if (!imageFormatOptions.includes(selectedImageOutputFormat)) {
      dispatch(setImageOutputFormat(imageFormatOptions[0] || 'png'));
    }
  }, [dispatch, imageFormatOptions, selectedImageOutputFormat]);

  useEffect(() => {
    if (!imageQualityOptions.includes(selectedQuality as ImageOutputQuality)) {
      dispatch(setQuality(imageQualityOptions[0] || 'auto'));
    }
  }, [dispatch, imageQualityOptions, selectedQuality]);

  useEffect(() => {
    if (!imageBackgroundOptions.includes(selectedImageBackground)) {
      dispatch(setImageBackground(imageBackgroundOptions[0] || 'auto'));
    }
  }, [dispatch, imageBackgroundOptions, selectedImageBackground]);

  useEffect(() => {
    if (!imageModerationOptions.includes(selectedImageModeration)) {
      dispatch(setImageModeration(imageModerationOptions[0] || 'auto'));
    }
  }, [dispatch, imageModerationOptions, selectedImageModeration]);

  const handlePickImageSource = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to upload image references.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: imageMaxReferenceImages > 1,
      selectionLimit: imageMaxReferenceImages,
      allowsEditing: imageMaxReferenceImages <= 1,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const nextUris = result.assets
        .map((asset) => asset.uri)
        .filter(Boolean)
        .slice(0, imageMaxReferenceImages);
      setImageSourceUris(nextUris);
    }
  }, [imageMaxReferenceImages]);

  const handleUseLatestImageAsImageSource = useCallback(() => {
    const latest = gallery[0];
    if (!latest?.uri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImageSourceUris([latest.uri]);
    setImageMode('refine');
  }, [gallery]);

  const handleRemoveImageSource = useCallback((uri: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setImageSourceUris((current) => current.filter((item) => item !== uri));
  }, []);

  const handleGenerateImage = useCallback(async () => {
    if (!canGenerateImageInput) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const sessionSelectedModels = selectedProviders.reduce((acc, provider) => {
      const resolvedModelId = resolveImageModelId(provider, selectedModels[provider]);
      if (resolvedModelId) {
        acc[provider] = resolvedModelId;
      }
      return acc;
    }, {} as Partial<Record<AIProvider, string>>);

    try {
      const result = await dispatch(generateCreateImages({
        prompt: currentPrompt,
        providers: selectedProviders,
        selectedModels: sessionSelectedModels,
        style: selectedStyle,
        size: selectedSize,
        quality: selectedQuality,
        imageCount: selectedImageCount,
        resolution: selectedImageResolution,
        outputFormat: selectedImageOutputFormat,
        outputCompression: selectedImageOutputCompression,
        background: selectedImageBackground,
        moderation: selectedImageModeration,
        sourceImages: imageSourceUris.map((uri) => ({
          uri,
          mimeType: getImageMimeType(uri),
        })),
        isUploaded: imageSourceUris.length > 0,
        refinementInstructions: imageMode === 'refine' ? currentPrompt : undefined,
      })).unwrap();

      dispatch(setPrompt(''));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.ids.length === 1) {
        navigation.navigate('CreateSession', { focusAssetId: result.ids[0], galleryTab: 'image' });
      } else if (result.ids.length > 1) {
        navigation.navigate('CreateSession', { galleryTab: 'image' });
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      ErrorService.handleWithToast(error, { feature: 'create' });
    }
  }, [
    canGenerateImageInput,
    currentPrompt,
    dispatch,
    imageMode,
    imageSourceUris,
    navigation,
    selectedImageBackground,
    selectedImageCount,
    selectedImageModeration,
    selectedImageOutputCompression,
    selectedImageOutputFormat,
    selectedImageResolution,
    selectedModels,
    selectedProviders,
    selectedQuality,
    selectedSize,
    selectedStyle,
  ]);

  const handleGalleryPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isDemo) {
      Alert.alert(
        'Gallery Unavailable in Demo',
        'The media gallery is available with a premium subscription. Upgrade to save and manage your generated assets.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }

    navigation.navigate('CreateSession', {});
  }, [navigation, isDemo]);

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(setActiveCreateTab(tab));
  }, [dispatch]);

  const handleAudioOperationChange = useCallback((operation: typeof audioOperation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAudioOperation(operation);
    setAudioPicker(null);
  }, []);

  const handleOpenAudioPicker = useCallback((picker: AudioPickerType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (picker === 'voice') {
      setAudioVoiceSearch('');
    }
    setAudioPicker(picker);
  }, []);

  const handlePickVideoSource = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      ErrorService.showWarning('Please allow photo access to use a source image.', 'create');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setVideoSourceUri(result.assets[0].uri);
    }
  }, []);

  const handleUseLatestImageAsVideoSource = useCallback(() => {
    const latest = gallery[0];
    if (!latest?.uri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVideoSourceUri(latest.uri);
  }, [gallery]);

  const handleGenerateVideo = useCallback(async () => {
    if (!hasRunwayKey) {
      navigation.navigate('APIConfig');
      return;
    }
    if (!canGenerateVideoInput) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const submittedPrompt = videoPrompt;
    try {
      await dispatch(generateCreateVideo({
        prompt: submittedPrompt,
        modelId: videoModelId,
        durationSeconds: videoDuration,
        aspectRatio: videoAspectRatio,
        sourceImageUri: videoSourceUri,
      })).unwrap();
      setVideoPrompt((draftPrompt) => draftPrompt === submittedPrompt ? '' : draftPrompt);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      ErrorService.handleWithToast(error, { feature: 'create', provider: 'runway' });
    }
  }, [
    canGenerateVideoInput,
    dispatch,
    hasRunwayKey,
    navigation,
    videoAspectRatio,
    videoDuration,
    videoModelId,
    videoPrompt,
    videoSourceUri,
  ]);

  const handleGenerateAudio = useCallback(async () => {
    if (!hasElevenLabsKey) {
      navigation.navigate('APIConfig');
      return;
    }
    if (!canGenerateAudioInput) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const submittedPrompt = audioPrompt;
    try {
      await dispatch(generateCreateAudio({
        prompt: submittedPrompt,
        operation: audioOperation,
        modelId: activeAudioModelId,
        voiceId: audioOperation === 'text_to_speech' ? audioVoiceId : undefined,
        outputFormat: audioOutputFormat,
        durationSeconds: audioOperation === 'sound_effect' ? audioDuration : undefined,
        promptInfluence: audioOperation === 'sound_effect' ? promptInfluence : undefined,
      })).unwrap();
      setAudioPrompt((draftPrompt) => draftPrompt === submittedPrompt ? '' : draftPrompt);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      ErrorService.handleWithToast(error, { feature: 'create', provider: 'elevenlabs' });
    }
  }, [
    activeAudioModelId,
    audioDuration,
    audioOperation,
    audioOutputFormat,
    audioPrompt,
    audioVoiceId,
    canGenerateAudioInput,
    dispatch,
    hasElevenLabsKey,
    navigation,
    promptInfluence,
  ]);

  const handleLoadMoreAudioVoices = useCallback(async () => {
    if (!hasElevenLabsKey || !audioVoiceNextPageToken || loadingMoreAudioVoices) {
      return;
    }

    setLoadingMoreAudioVoices(true);
    try {
      const key = await APIKeyService.getKey('elevenlabs');
      if (!key) return;

      const options = await MediaGenerationService.listElevenLabsOptions(key, {
        pageSize: 100,
        includeTotalCount: true,
        sort: 'name',
        sortDirection: 'asc',
        nextPageToken: audioVoiceNextPageToken,
      });

      setAudioVoices((current) => mergeAudioVoices(current, options.voices || []));
      if (options.models?.length) {
        setAudioModels(options.models);
      }
      setAudioVoiceHasMore(Boolean(options.voiceHasMore));
      setAudioVoiceNextPageToken(options.voiceNextPageToken || null);
      setAudioVoiceTotalCount(options.voiceTotalCount);
    } catch (error) {
      ErrorService.handleWithToast(error, { feature: 'create', provider: 'elevenlabs' });
    } finally {
      setLoadingMoreAudioVoices(false);
    }
  }, [audioVoiceNextPageToken, hasElevenLabsKey, loadingMoreAudioVoices]);

  const handleAddAI = useCallback(() => {
    navigation.navigate('APIConfig');
  }, [navigation]);

  // Custom right element with gallery icon and header actions
  const renderHeaderRight = () => (
    <View style={styles.headerRight}>
      <HeaderIcon
        name="images-outline"
        onPress={handleGalleryPress}
        color={theme.colors.text.inverse}
        accessibilityLabel={`Gallery (${galleryCount} assets)`}
        testID="header-gallery-button"
        badge={galleryCount > 0 ? galleryCount : undefined}
      />
      <HeaderActions variant="gradient" helpCategoryId="create" />
    </View>
  );

  const renderCreateTabs = () => (
    <View style={[styles.tabRow, { backgroundColor: theme.colors.surface }]}>
      {(['image', 'video', 'audio'] as const).map((tab) => {
        const isSelected = activeTab === tab;
        const label = tab === 'image' ? 'Image' : tab === 'video' ? 'Video' : 'Audio';
        const icon = tab === 'image' ? 'image-outline' : tab === 'video' ? 'videocam-outline' : 'musical-notes-outline';
        return (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              {
                backgroundColor: isSelected ? theme.colors.primary[500] : 'transparent',
              },
            ]}
            onPress={() => handleTabChange(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={isSelected ? '#FFFFFF' : theme.colors.text.secondary}
            />
            <Typography
              variant="caption"
              weight="semibold"
              style={{ color: isSelected ? '#FFFFFF' : theme.colors.text.primary }}
            >
              {label}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderChip = (
    label: string,
    selected: boolean,
    onPress: () => void,
    key?: string
  ) => (
    <TouchableOpacity
      key={key || label}
      style={[
        styles.optionChip,
        {
          backgroundColor: selected ? theme.colors.primary[500] : theme.colors.surface,
          borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <Typography
        variant="caption"
        weight="semibold"
        style={{ color: selected ? '#FFFFFF' : theme.colors.text.primary }}
      >
        {label}
      </Typography>
    </TouchableOpacity>
  );

  const renderProviderSetup = (providerName: string) => (
    <View style={[styles.setupCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Ionicons name="key-outline" size={24} color={theme.colors.primary[500]} />
      <View style={styles.setupCardText}>
        <Typography variant="body" weight="semibold">
          Add {providerName} key
        </Typography>
        <Typography variant="caption" color="secondary">
          Mobile media keys stay in secure local storage and are sent directly to the provider.
        </Typography>
      </View>
      <TouchableOpacity
        style={[styles.setupButton, { backgroundColor: theme.colors.primary[500] }]}
        onPress={() => navigation.navigate('APIConfig')}
      >
        <Typography variant="caption" weight="semibold" style={{ color: '#FFFFFF' }}>
          Connect
        </Typography>
      </TouchableOpacity>
    </View>
  );

  const handleViewMediaInGallery = useCallback((mediaId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const media = mediaGallery.find((entry) => entry.id === mediaId);
    navigation.navigate('CreateSession', media?.mediaType
      ? { focusMediaId: mediaId, galleryTab: media.mediaType }
      : { focusMediaId: mediaId });
  }, [mediaGallery, navigation]);

  const handleViewImagesInGallery = useCallback((imageIds?: string[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ids = imageIds || lastImageGenerationResult?.ids || [];
    navigation.navigate('CreateSession', ids.length === 1
      ? { focusAssetId: ids[0], galleryTab: 'image' }
      : { galleryTab: 'image' });
  }, [lastImageGenerationResult, navigation]);

  const renderOptionGrid = <T extends string,>(
    options: Array<{ id: T; label: string; description?: string }>,
    selectedId: T,
    onSelect: (id: T) => void,
    testID?: string
  ) => (
    <View style={styles.optionGrid} testID={testID}>
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionTile,
              {
                backgroundColor: selected ? primaryTintBackground : theme.colors.surface,
                borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
              },
            ]}
            onPress={() => onSelect(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <View style={styles.optionTileHeader}>
              <Typography variant="caption" weight="semibold" style={{ color: theme.colors.text.primary }}>
                {option.label}
              </Typography>
              {selected && <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary[500]} />}
            </View>
            {option.description && (
              <Typography variant="caption" color="secondary" numberOfLines={2}>
                {option.description}
              </Typography>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSelectorRow = ({
    label,
    value,
    description,
    onPress,
    testID,
  }: {
    label: string;
    value: string;
    description?: string;
    onPress: () => void;
    testID: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.selectorRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <View style={styles.selectorText}>
        <Typography variant="caption" color="secondary" style={styles.selectorLabel}>
          {label}
        </Typography>
        <Typography variant="body" weight="semibold">
          {value}
        </Typography>
        {description && (
          <Typography variant="caption" color="secondary" numberOfLines={2} style={styles.selectorDescription}>
            {description}
          </Typography>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
    </TouchableOpacity>
  );

  const renderAudioPickerModal = ({
    visible,
    title,
    options,
    selectedId,
    onSelect,
    searchValue,
    onSearchChange,
    searchPlaceholder,
    emptyMessage = 'No options available.',
    footer,
  }: {
    visible: boolean;
    title: string;
    options: Array<{ id: string; label: string; description?: string }>;
    selectedId: string;
    onSelect: (id: string) => void;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    emptyMessage?: string;
    footer?: React.ReactNode;
  }) => {
    if (!visible) return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setAudioPicker(null)}
      >
        <View style={styles.pickerOverlay} testID="create-audio-picker-modal">
          <TouchableOpacity
            style={styles.pickerBackdrop}
            activeOpacity={1}
            onPress={() => setAudioPicker(null)}
            accessibilityRole="button"
            accessibilityLabel="Close picker"
          />
          <View style={[styles.pickerSheet, { backgroundColor: theme.colors.background }]}>
            <SheetHeader
              title={title}
              onClose={() => setAudioPicker(null)}
              showHandle
            />
            {onSearchChange && (
              <View style={[styles.pickerSearchRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="search-outline" size={18} color={theme.colors.text.secondary} />
                <TextInput
                  value={searchValue}
                  onChangeText={onSearchChange}
                  placeholder={searchPlaceholder || 'Search'}
                  placeholderTextColor={theme.colors.text.disabled}
                  style={[styles.pickerSearchInput, { color: theme.colors.text.primary }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="create-audio-voice-search-input"
                />
              </View>
            )}
            <FlatList
              data={options}
              keyExtractor={(option) => option.id}
              style={styles.pickerList}
              contentContainerStyle={styles.pickerListContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={24}
              windowSize={8}
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <Typography variant="body" color="secondary" style={{ textAlign: 'center' }}>
                    {emptyMessage}
                  </Typography>
                </View>
              }
              ListFooterComponent={footer ? <View style={styles.pickerFooter}>{footer}</View> : null}
              renderItem={({ item: option }) => {
                const selected = option.id === selectedId;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.pickerOption,
                      {
                        backgroundColor: selected ? primaryTintBackground : theme.colors.surface,
                        borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onSelect(option.id);
                      setAudioPicker(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    testID={`create-audio-picker-option-${option.id}`}
                  >
                    <View style={styles.pickerOptionText}>
                      <Typography variant="body" weight="semibold">
                        {option.label}
                      </Typography>
                      {option.description && (
                        <Typography variant="caption" color="secondary" numberOfLines={2}>
                          {option.description}
                        </Typography>
                      )}
                    </View>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const renderDiscreteSlider = <T extends string | number | undefined,>({
    options,
    value,
    getLabel,
    onChange,
    testID,
  }: {
    options: readonly T[];
    value: T;
    getLabel: (value: T) => string;
    onChange: (value: T) => void;
    testID: string;
  }) => {
    const currentIndex = Math.max(0, options.findIndex((option) => option === value));
    const maxIndex = Math.max(0, options.length - 1);
    const selectedValue = options[currentIndex] as T;
    const canDecrease = currentIndex > 0;
    const canIncrease = currentIndex < maxIndex;
    const sliderDisabled = options.length <= 1;
    const updateByIndex = (rawIndex: number) => {
      const nextIndex = Math.min(maxIndex, Math.max(0, Math.round(rawIndex)));
      onChange(options[nextIndex] as T);
    };

    return (
      <View style={[styles.discreteSlider, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.discreteSliderHeader}>
          <Typography variant="body" weight="semibold">
            {getLabel(selectedValue)}
          </Typography>
          <View style={styles.sliderStepper}>
            <TouchableOpacity
              testID={`${testID}-decrement`}
              style={[
                styles.stepperButton,
                {
                  borderColor: theme.colors.border,
                  opacity: canDecrease ? 1 : 0.4,
                },
              ]}
              onPress={() => updateByIndex(currentIndex - 1)}
              disabled={!canDecrease}
              accessibilityRole="button"
              accessibilityLabel="Decrease value"
            >
              <Ionicons name="remove" size={18} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              testID={`${testID}-increment`}
              style={[
                styles.stepperButton,
                {
                  borderColor: theme.colors.border,
                  opacity: canIncrease ? 1 : 0.4,
                },
              ]}
              onPress={() => updateByIndex(currentIndex + 1)}
              disabled={!canIncrease}
              accessibilityRole="button"
              accessibilityLabel="Increase value"
            >
              <Ionicons name="add" size={18} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <Slider
          testID={testID}
          value={currentIndex}
          minimumValue={0}
          maximumValue={maxIndex}
          step={1}
          disabled={sliderDisabled}
          onValueChange={updateByIndex}
          minimumTrackTintColor={theme.colors.primary[500]}
          maximumTrackTintColor={theme.colors.border}
          thumbTintColor={theme.colors.primary[500]}
        />
      </View>
    );
  };

  const renderAspectRatioGrid = () => (
    <View style={styles.aspectGrid} testID="create-video-aspect-grid">
      {videoAspectRatios.map((ratio) => {
        const selected = videoAspectRatio === ratio.id;
        const [widthValue, heightValue] = ratio.id.split(':').map((part) => Number(part));
        const isPortrait = heightValue > widthValue;
        const isSquare = heightValue === widthValue;
        return (
          <TouchableOpacity
            key={ratio.id}
            style={[
              styles.aspectTile,
              {
                backgroundColor: selected ? primaryTintBackground : theme.colors.surface,
                borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
              },
            ]}
            onPress={() => setVideoAspectRatio(ratio.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <View
              style={[
                styles.aspectPreview,
                {
                  width: isSquare ? 24 : isPortrait ? 18 : 30,
                  height: isSquare ? 24 : isPortrait ? 30 : 18,
                  borderColor: selected ? theme.colors.primary[500] : theme.colors.text.secondary,
                  backgroundColor: selected ? primaryTintStrongBackground : 'transparent',
                },
              ]}
            />
            <Typography variant="caption" weight="semibold" style={{ color: theme.colors.text.primary, textAlign: 'center' }}>
              {ratio.label}
            </Typography>
            <Typography variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              {ratio.description}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderMediaActionRail = (mediaType: 'video' | 'audio') => {
    const isVideo = mediaType === 'video';
    const label = isVideo ? 'Video' : audioOperation === 'text_to_speech' ? 'Voiceover' : 'Sound Effect';
    const providerName = isVideo ? 'Runway' : 'ElevenLabs';
    const current = mediaGeneration[mediaType];
    const result = lastMediaGenerationResult?.mediaType === mediaType ? lastMediaGenerationResult : undefined;
    const isRunning = Boolean(current);
    const isSuccess = !isRunning && result?.status === 'succeeded';
    const isFailed = !isRunning && result?.status === 'failed';
    const hasProviderKey = isVideo ? hasRunwayKey : hasElevenLabsKey;
    const canGenerate = isVideo ? canGenerateVideo : canGenerateAudio;
    const handleGeneratePress = isVideo ? handleGenerateVideo : handleGenerateAudio;
    const message = current?.message || result?.message;
    const primaryTitle = isRunning
      ? `Generating ${label}...`
      : !hasProviderKey
        ? `Connect ${providerName}`
        : isSuccess
          ? `Generate Another ${label}`
          : isFailed
            ? `Retry ${label}`
            : `Generate ${label}`;

    return (
      <View
        style={[
          styles.mediaRail,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
        testID={`create-${mediaType}-rail`}
      >
        {(current || result) && (
          <View
            style={[
              styles.railStatus,
              {
                backgroundColor: theme.colors.surface,
                borderColor: isFailed ? theme.colors.error[500] : isSuccess ? theme.colors.success[500] : theme.colors.border,
              },
            ]}
            testID={`create-${mediaType}-status`}
          >
            {isRunning ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            ) : (
              <Ionicons
                name={isFailed ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={20}
                color={isFailed ? theme.colors.error[500] : theme.colors.success[500]}
              />
            )}
            <Typography variant="caption" color="secondary" style={styles.railStatusText}>
              {message || (isRunning ? `Generating ${label.toLowerCase()}...` : `${label} ready.`)}
            </Typography>
          </View>
        )}

        {isSuccess && result?.id && (
          <TouchableOpacity
            style={[styles.galleryCta, { borderColor: theme.colors.primary[500], backgroundColor: primaryTintBackground }]}
            onPress={() => handleViewMediaInGallery(result.id)}
            accessibilityRole="button"
            accessibilityLabel={`View ${label.toLowerCase()} in Gallery`}
            testID={`create-${mediaType}-gallery-cta`}
          >
            <Ionicons name="images-outline" size={18} color={primaryAccentColor} />
            <Typography variant="button" weight="semibold" style={{ color: primaryAccentColor }}>
              View in Gallery
            </Typography>
          </TouchableOpacity>
        )}

        <GradientButton
          title={primaryTitle}
          onPress={handleGeneratePress}
          disabled={isRunning || (hasProviderKey && !canGenerate)}
          fullWidth
        />
      </View>
    );
  };

  const renderImageActionRail = () => {
    const current = imageGeneration;
    const result = lastImageGenerationResult;
    const isRunning = Boolean(current);
    const isSuccess = !isRunning && result?.status === 'succeeded';
    const isFailed = !isRunning && result?.status === 'failed';
    const message = current?.message || result?.message;
    const title = isRunning
      ? 'Generating Images...'
      : selectedProviders.length === 0
        ? 'Select an AI to generate'
        : imageMode === 'refine' && imageSourceUris.length === 0
          ? 'Add an image to refine'
            : !imageSupportsSourceInput && imageSourceUris.length > 0
              ? 'Select a model with image input'
            : isSuccess
              ? 'Generate More Images'
              : isFailed
                ? 'Retry Images'
                : selectedProviders.length > 1
                  ? `Generate with ${selectedProviders.length} AIs`
                  : imageMode === 'refine'
                    ? 'Refine Image'
                    : 'Generate Image';

    return (
      <View
        style={[
          styles.mediaRail,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
        testID="create-image-rail"
      >
        {(current || result) && (
          <View
            style={[
              styles.railStatus,
              {
                backgroundColor: theme.colors.surface,
                borderColor: isFailed ? theme.colors.error[500] : isSuccess ? theme.colors.success[500] : theme.colors.border,
              },
            ]}
            testID="create-image-status"
          >
            {isRunning ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            ) : (
              <Ionicons
                name={isFailed ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={20}
                color={isFailed ? theme.colors.error[500] : theme.colors.success[500]}
              />
            )}
            <Typography variant="caption" color="secondary" style={styles.railStatusText}>
              {message || (isRunning ? 'Generating images...' : 'Images ready.')}
            </Typography>
          </View>
        )}

        {isSuccess && result?.ids.length > 0 && (
          <TouchableOpacity
            style={[styles.galleryCta, { borderColor: theme.colors.primary[500], backgroundColor: primaryTintBackground }]}
            onPress={() => handleViewImagesInGallery(result.ids)}
            accessibilityRole="button"
            accessibilityLabel="View generated images in Gallery"
            testID="create-image-gallery-cta"
          >
            <Ionicons name="images-outline" size={18} color={primaryAccentColor} />
            <Typography variant="button" weight="semibold" style={{ color: primaryAccentColor }}>
              View in Gallery
            </Typography>
          </TouchableOpacity>
        )}

        <GradientButton
          title={title}
          onPress={handleGenerateImage}
          disabled={isRunning || !canGenerateImage}
          fullWidth
        />
      </View>
    );
  };

  const renderImageSourceSection = () => (
    <View style={styles.section}>
      <SectionHeader
        title={imageMode === 'refine' ? 'Source Image' : 'References'}
        subtitle={imageSupportsSourceInput ? 'Upload or reuse images to guide generation' : 'Select a model with image input to use references'}
        icon="🖼️"
      />
      {imageSourceUris.length > 0 && (
        <View style={styles.imageSourceTray} testID="create-image-source-tray">
          {imageSourceUris.map((uri) => (
            <View
              key={uri}
              style={[styles.imageSourceTile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Image source={{ uri }} style={styles.imageSourcePreview} />
              <TouchableOpacity
                onPress={() => handleRemoveImageSource(uri)}
                style={styles.imageSourceRemove}
                accessibilityRole="button"
                accessibilityLabel="Remove image reference"
              >
                <Ionicons name="close-circle" size={22} color={theme.colors.error[500]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      <View style={styles.inlineActions}>
        {gallery.length > 0 && renderChip('Use latest image', false, handleUseLatestImageAsImageSource)}
        {renderChip(imageSourceUris.length > 0 ? 'Replace image' : 'Upload image', false, handlePickImageSource)}
        {imageSourceUris.length > 0 && renderChip('Clear source', false, () => setImageSourceUris([]))}
      </View>
    </View>
  );

  const renderImageProviderSummary = () => (
    <View style={styles.section}>
      <DynamicAISelector
        configuredAIs={configuredImageAIs}
        selectedAIs={selectedAIs}
        maxAIs={3}
        onToggleAI={handleToggleAI}
        onAddAI={handleAddAI}
        hideStartButton={true}
        hideAddAI={isDemo}
        customSubtitle={`${configuredImageAIs.length} image providers • Select up to 3`}
        selectedModels={selectedModels}
        onModelChange={(aiId, modelId) => {
          dispatch(setSelectedModel({ provider: aiId as AIProvider, modelId }));
        }}
        renderModelSelector={(ai, selectedModelId) => (
          <ImageModelSelector
            providerId={ai.provider}
            selectedModel={selectedModelId}
            onSelectModel={(modelId) => {
              dispatch(setSelectedModel({ provider: ai.provider, modelId }));
            }}
            aiName={ai.name}
          />
        )}
        getBadge={(ai) => {
          const model = getResolvedImageModel(ai.provider, selectedModels[ai.provider] || ai.model);
          if (model?.supportsImageInput) return { text: 'refine' };
          return undefined;
        }}
      />
      {selectedImageModels.length > 0 && (
        <View style={styles.capabilityRow}>
          <Ionicons
            name={imageSupportsSourceInput ? 'layers-outline' : 'text-outline'}
            size={16}
            color={imageSupportsSourceInput ? theme.colors.primary[500] : theme.colors.text.secondary}
          />
          <Typography variant="caption" color="secondary" style={styles.capabilityText} numberOfLines={2}>
            {`${imageSupportsSourceInput ? 'Supports refinement and reference images' : 'Creates from text prompts only'} • ${selectedImageModelSummary}`}
          </Typography>
        </View>
      )}
    </View>
  );

  const renderOutputControlGroup = (
    label: string,
    children: React.ReactNode,
    testID?: string
  ) => (
    <View style={styles.outputControlGroup} testID={testID}>
      <Typography variant="caption" weight="semibold" color="secondary" style={styles.outputControlLabel}>
        {label}
      </Typography>
      {children}
    </View>
  );

  const renderImageOutputSection = () => {
    const countOptions = Array.from({ length: imageMaxCount }, (_, index) => index + 1);
    const qualityOptions = imageQualityOptions.map((quality) => ({
      id: quality,
      label: IMAGE_QUALITY_LABELS[quality] || quality,
    }));
    const formatOptions = imageFormatOptions.map((format) => ({
      id: format,
      label: IMAGE_FORMAT_LABELS[format] || format,
    }));
    const backgroundOptions = imageBackgroundOptions.map((background) => ({
      id: background,
      label: IMAGE_BACKGROUND_LABELS[background] || background,
    }));
    const moderationOptions = imageModerationOptions.map((moderation) => ({
      id: moderation,
      label: IMAGE_MODERATION_LABELS[moderation] || moderation,
    }));
    const shouldShowCompression = selectedImageOutputFormat !== 'png' &&
      selectedImageModels.some((model) => model.supportsOutputCompression);

    return (
      <View style={styles.section}>
        <SectionHeader title="Output" subtitle="Frame, count, and model-specific delivery options" icon="▣" />
        <View style={styles.outputGroup}>
          {renderOutputControlGroup(
            'Frame',
            renderOptionGrid(
              [
                { id: 'auto', label: 'Model default', description: 'Provider frame' },
                { id: 'square', label: 'Square', description: '1:1' },
                { id: 'portrait', label: 'Portrait', description: 'Vertical' },
                { id: 'landscape', label: 'Landscape', description: 'Wide' },
              ],
              selectedSize,
              handleSizeSelect,
              'create-image-frame-grid'
            )
          )}
          {imageResolutionOptions.length > 0 && renderOutputControlGroup(
            'Resolution',
            renderOptionGrid(
              imageResolutionOptions.map((resolution) => ({ id: resolution, label: resolution })),
              selectedImageResolution || imageResolutionOptions[0],
              (resolution) => dispatch(setImageResolution(resolution)),
              'create-image-resolution-grid'
            )
          )}
          {renderOutputControlGroup(
            'Quality',
            renderOptionGrid(
              qualityOptions,
              imageQualityOptions.includes(selectedQuality as ImageOutputQuality)
                ? selectedQuality as ImageOutputQuality
                : imageQualityOptions[0],
              (quality) => handleQualitySelect(quality),
              'create-image-quality-grid'
            )
          )}
          {imageMaxCount > 1 && renderOutputControlGroup(
            'Count',
            renderDiscreteSlider({
              options: countOptions,
              value: Math.min(selectedImageCount, imageMaxCount),
              getLabel: (count) => `${count} image${count === 1 ? '' : 's'}`,
              onChange: (count) => dispatch(setImageCount(count || 1)),
              testID: 'create-image-count-slider',
            })
          )}
          {formatOptions.length > 1 && renderOutputControlGroup(
            'Format',
            renderOptionGrid(
              formatOptions,
              selectedImageOutputFormat,
              (format) => dispatch(setImageOutputFormat(format)),
              'create-image-format-grid'
            )
          )}
          {backgroundOptions.length > 1 && renderOutputControlGroup(
            'Background',
            renderOptionGrid(
              backgroundOptions,
              selectedImageBackground,
              (background) => dispatch(setImageBackground(background)),
              'create-image-background-grid'
            )
          )}
          {moderationOptions.length > 1 && renderOutputControlGroup(
            'Safety',
            renderOptionGrid(
              moderationOptions,
              selectedImageModeration,
              (moderation) => dispatch(setImageModeration(moderation)),
              'create-image-moderation-grid'
            )
          )}
          {shouldShowCompression && renderOutputControlGroup(
            'Compression',
            renderDiscreteSlider({
              options: [40, 60, 80, 100] as const,
              value: selectedImageOutputCompression,
              getLabel: (value) => `${value}`,
              onChange: (value) => dispatch(setImageOutputCompression(value || 80)),
              testID: 'create-image-compression-slider',
            })
          )}
        </View>
      </View>
    );
  };

  const renderImageTab = () => (
    <>
      {configuredImageAIs.length === 0 && renderProviderSetup('OpenAI, Google, or Grok')}

      <View style={styles.section}>
        <SectionHeader title="Image Mode" subtitle="Generate from text or refine existing visuals" icon="✨" />
        <SegmentedControl
          fullWidth
          options={[
            { label: 'Create', value: 'create' },
            { label: 'Refine', value: 'refine' },
          ]}
          value={imageMode}
          onChange={(mode) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setImageMode(mode);
          }}
        />
      </View>

      {renderImageSourceSection()}

      <View style={styles.section}>
        <SectionHeader
          title={imageMode === 'refine' ? 'Instructions' : 'Prompt'}
          subtitle={imageMode === 'refine' ? 'Describe the exact changes to make' : 'Describe the image to create'}
          icon="✍️"
        />
        <PromptHeroInput
          value={currentPrompt}
          onChangeText={(text) => dispatch(setPrompt(text))}
          maxLength={MAX_PROMPT_LENGTH}
          placeholder={imageMode === 'refine' ? 'Change the lighting, preserve the subject, add...' : 'Describe what you want to create...'}
          testID="create-prompt-input"
        />
      </View>

      {renderImageProviderSummary()}

      <View style={styles.section}>
        <SectionHeader title="Style" subtitle="Prompt styling" icon="🎨" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.styleScroll}
        >
          {STYLE_PRESETS.map(style => {
            const isSelected = selectedStyle === style.id;
            return (
              <TouchableOpacity
                key={style.id}
                style={[
                  styles.styleChip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary[500]
                      : theme.colors.surface,
                    borderColor: isSelected
                      ? theme.colors.primary[500]
                      : theme.colors.border,
                  },
                ]}
                onPress={() => handleStyleSelect(style.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Ionicons
                  name={style.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={isSelected ? '#FFFFFF' : theme.colors.text.secondary}
                />
                <Typography
                  variant="caption"
                  numberOfLines={1}
                  style={{
                    color: isSelected ? '#FFFFFF' : theme.colors.text.primary,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                >
                  {style.label}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {renderImageOutputSection()}
    </>
  );

  const renderVideoTab = () => {
    return (
      <>
        {!hasRunwayKey && renderProviderSetup('Runway')}

        <View style={styles.section}>
          <SectionHeader
            title="Video Prompt"
            subtitle={videoSourceUri ? 'Describe how the image should move' : 'Describe the video to generate'}
            icon="🎬"
          />
          <TextInput
            value={videoPrompt}
            onChangeText={setVideoPrompt}
            placeholder="A cinematic tracking shot of..."
            placeholderTextColor={theme.colors.text.disabled}
            multiline
            maxLength={1000}
            style={[
              styles.mediaInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text.primary,
              },
            ]}
            testID="create-video-prompt-input"
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Source" subtitle="Optional image-to-video input" icon="🖼️" />
          {videoSourceUri && (
            <View style={styles.sourcePreviewRow}>
              <Image source={{ uri: videoSourceUri }} style={styles.sourcePreview} />
              <TouchableOpacity onPress={() => setVideoSourceUri(undefined)} style={styles.clearSourceButton}>
                <Ionicons name="close-circle" size={24} color={theme.colors.error[500]} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inlineActions}>
            {gallery.length > 0 && renderChip('Use latest image', false, handleUseLatestImageAsVideoSource)}
            {renderChip(videoSourceUri ? 'Replace image' : 'Upload image', false, handlePickVideoSource)}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Model" subtitle={videoOperation === 'image_to_video' ? 'Image-to-video capable models' : 'Text-to-video capable models'} icon="⚙️" />
          {renderOptionGrid(
            runwayModels.map((model) => ({
              id: model.id,
              label: model.label,
              description: model.description,
            })),
            videoModelId,
            (modelId) => {
              setVideoModelId(modelId);
              const nextDurations = getRunwayVideoDurations(modelId, videoOperation);
              const nextRatios = getRunwayAspectRatios(modelId, videoOperation);
              setVideoDuration(nextDurations.includes(videoDuration) ? videoDuration : nextDurations[0] || RUNWAY_DEFAULT_DURATION_SECONDS);
              setVideoAspectRatio(nextRatios.some((ratio) => ratio.id === videoAspectRatio) ? videoAspectRatio : nextRatios[0]?.id || RUNWAY_DEFAULT_ASPECT_RATIO);
            },
            'create-video-model-grid'
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Duration" subtitle="Clip length" icon="⏱️" />
          {renderDiscreteSlider({
            options: videoDurations,
            value: videoDuration,
            getLabel: (duration) => `${duration}s`,
            onChange: setVideoDuration,
            testID: 'create-video-duration-slider',
          })}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Frame" subtitle="Aspect ratio" icon="▣" />
          {renderAspectRatioGrid()}
        </View>
      </>
    );
  };

  const renderAudioTab = () => {
    const fallbackModels = getMediaModels('elevenlabs', audioOperation);
    const modelsForOperation = (audioModels.length > 0 ? audioModels : fallbackModels)
      .filter((model) => model.operations.includes(audioOperation));
    const voiceOptions: Array<{ id: string; label: string; description?: string }> = audioVoices.length > 0
      ? audioVoices.map((voice) => ({
          id: voice.id,
          label: voice.name,
          description: voice.description || voice.category || undefined,
        }))
      : [{ id: ELEVENLABS_DEFAULT_VOICE_ID, label: 'Default voice' }];
    const normalizedVoiceSearch = audioVoiceSearch.trim().toLowerCase();
    const filteredVoiceOptions = normalizedVoiceSearch
      ? voiceOptions.filter((voice) => (
          voice.label.toLowerCase().includes(normalizedVoiceSearch) ||
          voice.description?.toLowerCase().includes(normalizedVoiceSearch)
        ))
      : voiceOptions;
    const loadedVoiceCount = audioVoices.length || voiceOptions.length;
    const voiceCountLabel = audioVoiceTotalCount
      ? `${loadedVoiceCount} of ${audioVoiceTotalCount} voices loaded`
      : `${loadedVoiceCount} voice${loadedVoiceCount === 1 ? '' : 's'} loaded`;
    const audioDurationOptions = [undefined, 1, 3, 5, 8, 10, 15, 20] as const;
    const promptInfluenceOptions = [0.2, 0.3, 0.5, 0.7] as const;
    const selectedVoice = voiceOptions.find((voice) => voice.id === audioVoiceId) || voiceOptions[0];
    const selectedAudioModel = modelsForOperation.find((model) => model.id === activeAudioModelId) || modelsForOperation[0];
    const selectedOutputFormat = ELEVENLABS_OUTPUT_FORMATS.find((format) => format.id === audioOutputFormat) || ELEVENLABS_OUTPUT_FORMATS[0];
    const audioSettingsSummary = audioOperation === 'text_to_speech'
      ? `${selectedAudioModel?.label || 'Default model'} • ${selectedOutputFormat.label}`
      : `${selectedAudioModel?.label || 'Default model'} • ${audioDuration === undefined ? 'Auto duration' : `${audioDuration}s`}`;

    return (
      <>
        {!hasElevenLabsKey && renderProviderSetup('ElevenLabs')}

        <View style={styles.section}>
          <SectionHeader title="Audio Mode" subtitle="Voiceover or generated sound" icon="🎧" />
          <SegmentedControl
            fullWidth
            options={[
              { label: 'Voiceover', value: 'text_to_speech' },
              { label: 'Sound effect', value: 'sound_effect' },
            ]}
            value={audioOperation}
            onChange={handleAudioOperationChange}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title={audioOperation === 'text_to_speech' ? 'Script' : 'Sound Prompt'}
            subtitle={audioOperation === 'text_to_speech' ? 'Text to speak' : 'Describe the sound to create'}
            icon="✍️"
          />
          <TextInput
            value={audioPrompt}
            onChangeText={setAudioPrompt}
            placeholder={audioOperation === 'text_to_speech' ? 'Read this in a warm, clear voice...' : 'Soft rain on a window with distant thunder...'}
            placeholderTextColor={theme.colors.text.disabled}
            multiline
            maxLength={audioOperation === 'text_to_speech' ? 5000 : 450}
            style={[
              styles.mediaInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text.primary,
              },
            ]}
            testID="create-audio-prompt-input"
          />
        </View>

        {audioOperation === 'text_to_speech' && (
          <View style={styles.section}>
            <SectionHeader
              title="Voice"
              subtitle={loadingAudioOptions ? 'Loading voices...' : voiceCountLabel}
              icon="🗣️"
            />
            {renderSelectorRow({
              label: 'Voice',
              value: selectedVoice?.label || 'Default voice',
              description: selectedVoice?.description || (audioVoiceHasMore ? 'More voices available in the picker' : undefined),
              onPress: () => handleOpenAudioPicker('voice'),
              testID: 'create-audio-voice-selector',
            })}
          </View>
        )}

        <View style={styles.section}>
          <View
            style={[
              styles.audioSettingsCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <TouchableOpacity
              style={styles.audioSettingsHeader}
              onPress={() => setIsAudioSettingsExpanded((expanded) => !expanded)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isAudioSettingsExpanded }}
              accessibilityLabel="Audio settings"
              testID="create-audio-settings-toggle"
            >
              <View style={styles.audioSettingsText}>
                <Typography variant="body" weight="semibold">
                  Audio Settings
                </Typography>
                <Typography variant="caption" color="secondary" numberOfLines={1}>
                  {audioSettingsSummary}
                </Typography>
              </View>
              <Ionicons
                name={isAudioSettingsExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.text.secondary}
              />
            </TouchableOpacity>

            {isAudioSettingsExpanded && (
              <View style={[styles.audioSettingsContent, { borderTopColor: theme.colors.border }]} testID="create-audio-settings-content">
                {renderSelectorRow({
                  label: 'Model',
                  value: selectedAudioModel?.label || 'Default model',
                  description: selectedAudioModel?.description,
                  onPress: () => handleOpenAudioPicker('model'),
                  testID: 'create-audio-model-selector',
                })}

                {renderSelectorRow({
                  label: 'Format',
                  value: selectedOutputFormat.label,
                  onPress: () => handleOpenAudioPicker('format'),
                  testID: 'create-audio-format-selector',
                })}

                {audioOperation === 'sound_effect' && (
                  <View style={styles.soundControls}>
                    {renderDiscreteSlider({
                      options: audioDurationOptions,
                      value: audioDuration,
                      getLabel: (duration) => (duration === undefined ? 'Auto duration' : `${duration}s`),
                      onChange: setAudioDuration,
                      testID: 'create-audio-duration-slider',
                    })}
                    {renderDiscreteSlider({
                      options: promptInfluenceOptions,
                      value: promptInfluence,
                      getLabel: (value) => `Influence ${value}`,
                      onChange: setPromptInfluence,
                      testID: 'create-audio-influence-slider',
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {renderAudioPickerModal({
          visible: audioPicker === 'voice',
          title: 'Select Voice',
          options: filteredVoiceOptions,
          selectedId: audioVoiceId,
          onSelect: setAudioVoiceId,
          searchValue: audioVoiceSearch,
          onSearchChange: setAudioVoiceSearch,
          searchPlaceholder: 'Search voices',
          emptyMessage: audioVoiceSearch.trim()
            ? 'No loaded voices match this search.'
            : 'No voices available.',
          footer: audioVoices.length > 0 ? (
            audioVoiceHasMore ? (
              <TouchableOpacity
                style={[
                  styles.loadMoreVoicesButton,
                  {
                    backgroundColor: primaryTintBackground,
                    borderColor: theme.colors.primary[500],
                    opacity: loadingMoreAudioVoices ? 0.7 : 1,
                  },
                ]}
                onPress={handleLoadMoreAudioVoices}
                disabled={loadingMoreAudioVoices}
                accessibilityRole="button"
                accessibilityLabel="Load more voices"
                testID="create-audio-load-more-voices"
              >
                {loadingMoreAudioVoices ? (
                  <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                ) : (
                  <Ionicons name="add-circle-outline" size={18} color={primaryAccentColor} />
                )}
                <Typography variant="button" weight="semibold" style={{ color: primaryAccentColor }}>
                  Load More Voices
                </Typography>
              </TouchableOpacity>
            ) : (
              <Typography variant="caption" color="secondary" style={{ textAlign: 'center' }}>
                Showing all loaded voices
              </Typography>
            )
          ) : null,
        })}
        {renderAudioPickerModal({
          visible: audioPicker === 'model',
          title: 'Select Model',
          options: modelsForOperation.map((model) => ({
            id: model.id,
            label: model.label,
            description: model.description,
          })),
          selectedId: activeAudioModelId,
          onSelect: (modelId) => {
            if (audioOperation === 'text_to_speech') {
              setAudioTtsModelId(modelId);
            } else {
              setAudioSfxModelId(modelId);
            }
          },
        })}
        {renderAudioPickerModal({
          visible: audioPicker === 'format',
          title: 'Select Format',
          options: ELEVENLABS_OUTPUT_FORMATS.map((format) => ({
            id: format.id,
            label: format.label,
          })),
          selectedId: audioOutputFormat,
          onSelect: setAudioOutputFormat,
        })}
      </>
    );
  };

  // Demo mode gate - only demo users should be blocked
  if (isDemo) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['left', 'right']}
      >
        <Header
          variant="gradient"
          title="Create"
          subtitle="Image, Video, and Audio Generation"
          rightElement={<HeaderActions variant="gradient" helpCategoryId="create" />}
        />
        <View style={styles.premiumGate}>
          <Ionicons
            name="sparkles"
            size={64}
            color={theme.colors.primary[500]}
          />
          <Typography variant="title" style={styles.premiumTitle}>
            Create Mode
          </Typography>
          <Typography
            variant="body"
            color="secondary"
            style={styles.premiumDescription}
          >
            Generate images, videos, voiceovers, and sound effects with your own provider keys.
            This is a premium feature.
          </Typography>
          <GradientButton
            title="Upgrade to Premium"
            onPress={() => navigation.navigate('Subscription')}
            style={styles.upgradeButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <Header
        variant="gradient"
        title={greeting.timeBasedGreeting}
        subtitle={greeting.welcomeMessage}
        showTime={true}
        showDate={true}
        rightElement={renderHeaderRight()}
        showDemoBadge={isDemo}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {renderCreateTabs()}

          {activeTab === 'video' && renderVideoTab()}
          {activeTab === 'audio' && renderAudioTab()}

          {activeTab === 'image' && renderImageTab()}
        </ScrollView>

        {/* Generate Button - hidden when keyboard is visible */}
        {!isKeyboardVisible && activeTab === 'image' && renderImageActionRail()}
        {!isKeyboardVisible && activeTab === 'video' && renderMediaActionRail('video')}
        {!isKeyboardVisible && activeTab === 'audio' && renderMediaActionRail('audio')}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chipRow: {
    paddingRight: 16,
    gap: 8,
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionTile: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  optionTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionNote: {
    marginTop: 8,
  },
  selectorRow: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    flex: 1,
    gap: 2,
  },
  selectorLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorDescription: {
    marginTop: 2,
  },
  audioSettingsCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  audioSettingsHeader: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  audioSettingsText: {
    flex: 1,
    gap: 2,
  },
  audioSettingsContent: {
    borderTopWidth: 1,
    padding: 12,
    gap: 12,
  },
  soundControls: {
    gap: 12,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  pickerSheet: {
    maxHeight: '76%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  pickerSearchRow: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    minHeight: 42,
    fontSize: 16,
    paddingVertical: 0,
  },
  pickerList: {
    maxHeight: 420,
  },
  pickerListContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
  },
  pickerEmpty: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pickerFooter: {
    paddingTop: 4,
  },
  pickerOption: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerOptionText: {
    flex: 1,
    gap: 4,
  },
  loadMoreVoicesButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  discreteSlider: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  discreteSliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  sliderStepper: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  aspectTile: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 106,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  aspectPreview: {
    borderWidth: 2,
    borderRadius: 4,
  },
  mediaInput: {
    minHeight: 118,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  mediaStatus: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mediaStatusText: {
    flex: 1,
  },
  setupCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setupCardText: {
    flex: 1,
  },
  setupButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sourcePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourcePreview: {
    width: 96,
    height: 72,
    borderRadius: 8,
  },
  clearSourceButton: {
    padding: 8,
  },
  mediaGenerateSpacer: {
    marginBottom: 24,
  },
  mediaRail: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  railStatus: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  railStatusText: {
    flex: 1,
  },
  galleryCta: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  capabilityText: {
    flex: 1,
  },
  imageSourceTray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  imageSourceTile: {
    width: 96,
    height: 96,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageSourcePreview: {
    width: '100%',
    height: '100%',
  },
  imageSourceRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  outputGroup: {
    gap: 12,
  },
  outputControlGroup: {
    gap: 8,
  },
  outputControlLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  styleScroll: {
    paddingRight: 16,
  },
  styleChip: {
    minWidth: 88,
    height: 80,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  premiumGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  premiumTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  premiumDescription: {
    textAlign: 'center',
    marginBottom: 24,
  },
  upgradeButton: {
    width: '100%',
  },
});
