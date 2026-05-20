/**
 * CreateSetupScreen - Tab screen for setting up image generation
 * Premium-only feature with provider selection, prompt input, and options
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useGreeting } from '../hooks/useGreeting';
import {
  Typography,
  Badge,
  GradientButton,
  HeaderIcon,
  SectionHeader,
  PromptHeroInput,
  AdvancedOptionsSection,
  ImageModelSelector,
} from '../components/molecules';
import { Header, HeaderActions, DynamicAISelector, ImageRefinementModal } from '../components/organisms';
import type { RefinementProvider } from '../components/organisms/chat/ImageRefinementModal';
import { RootState, AppDispatch, isApiKeyConfigured } from '../store';
import {
  setPrompt,
  setStyle,
  setSize,
  setQuality,
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
  getImageInputModels,
  getImageProviderDisplayName,
  resolveImageModelId,
  supportsImageGeneration,
  supportsImageInput,
} from '../config/imageGenerationModels';
import { AI_PROVIDERS } from '../config/aiProviders';
import { getAIProviderIcon } from '../utils/aiProviderAssets';
import APIKeyService from '../services/APIKeyService';
import MediaGenerationService from '../services/media/MediaGenerationService';
import { ErrorService } from '../services/errors/ErrorService';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const MAX_PROMPT_LENGTH = 4000;

// Image generation capable providers
const IMAGE_GEN_PROVIDERS = ['openai', 'google', 'grok'];

export default function CreateSetupScreen() {
  const { theme } = useTheme();
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
    galleryHydrated,
    gallery,
    mediaGalleryHydrated = false,
    mediaGallery = [],
    mediaGeneration = { video: null, audio: null },
    lastMediaGenerationResult,
  } = createState;

  const galleryCount = gallery.length + mediaGallery.length;
  const [selectedAIs, setSelectedAIs] = useState<AIConfig[]>([]);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
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
  const [showRefinementModal, setShowRefinementModal] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const videoOperation: Extract<CreateMediaOperation, 'text_to_video' | 'image_to_video'> = videoSourceUri
    ? 'image_to_video'
    : 'text_to_video';
  const runwayModels = getMediaModels('runway', videoOperation);
  const videoDurations = getRunwayVideoDurations(videoModelId, videoOperation);
  const videoAspectRatios = getRunwayAspectRatios(videoModelId, videoOperation);
  const hasRunwayKey = isApiKeyConfigured(apiKeys.runway);
  const hasElevenLabsKey = isApiKeyConfigured(apiKeys.elevenlabs);
  const activeAudioModelId = audioOperation === 'text_to_speech' ? audioTtsModelId : audioSfxModelId;

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

  const handleGenerate = useCallback(() => {
    if (!currentPrompt.trim() || selectedProviders.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const sessionSelectedModels = selectedProviders.reduce((acc, provider) => {
      const resolvedModelId = resolveImageModelId(provider, selectedModels[provider]);
      if (resolvedModelId) {
        acc[provider] = resolvedModelId;
      }
      return acc;
    }, {} as Partial<Record<AIProvider, string>>);

    navigation.navigate('CreateSession', {
      providers: selectedProviders,
      selectedModels: sessionSelectedModels,
      initialPrompt: currentPrompt,
    });
  }, [currentPrompt, navigation, selectedModels, selectedProviders]);

  const canGenerate = currentPrompt.trim().length > 0 && selectedProviders.length > 0;

  // Build available providers for refinement
  const availableRefinementProviders: RefinementProvider[] = useMemo(() => {
    return IMAGE_GEN_PROVIDERS.map(providerId => ({
      provider: providerId as AIProvider,
      name: getImageProviderDisplayName(providerId as AIProvider),
      supportsImg2Img: getImageInputModels(providerId as AIProvider).length > 0,
      hasApiKey: isApiKeyConfigured(apiKeys[providerId]) || isDemo,
    }));
  }, [apiKeys, isDemo]);

  // Check if refinement is available (any provider supports img2img and has API key)
  const canRefineImages = useMemo(() => {
    return availableRefinementProviders.some(p => p.supportsImg2Img && p.hasApiKey);
  }, [availableRefinementProviders]);

  // Image picker for refinement
  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to upload images for refinement.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadedImageUri(result.assets[0].uri);
      setShowRefinementModal(true);
    }
  }, []);

  // Handle refinement submission from modal
  const handleRefinement = useCallback(async (opts: { instructions: string; provider: AIProvider; modelId: string }) => {
    if (!uploadedImageUri) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowRefinementModal(false);

    // Navigate to CreateSession with the refinement params
    navigation.navigate('CreateSession', {
      providers: [opts.provider],
      selectedModels: { [opts.provider]: opts.modelId },
      sourceImage: uploadedImageUri,
      refinementInstructions: opts.instructions,
    });

    // Clear the uploaded image
    setUploadedImageUri(null);
  }, [navigation, uploadedImageUri]);

  const handleGalleryPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isDemo) {
      Alert.alert(
        'Gallery Unavailable in Demo',
        'The image gallery is available with a premium subscription. Upgrade to save and manage your generated images.',
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await dispatch(generateCreateVideo({
        prompt: videoPrompt,
        modelId: videoModelId,
        durationSeconds: videoDuration,
        aspectRatio: videoAspectRatio,
        sourceImageUri: videoSourceUri,
      })).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      ErrorService.handleWithToast(error, { feature: 'create', provider: 'runway' });
    }
  }, [
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await dispatch(generateCreateAudio({
        prompt: audioPrompt,
        operation: audioOperation,
        modelId: activeAudioModelId,
        voiceId: audioOperation === 'text_to_speech' ? audioVoiceId : undefined,
        outputFormat: audioOutputFormat,
        durationSeconds: audioOperation === 'sound_effect' ? audioDuration : undefined,
        promptInfluence: audioOperation === 'sound_effect' ? promptInfluence : undefined,
      })).unwrap();
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
    dispatch,
    hasElevenLabsKey,
    navigation,
    promptInfluence,
  ]);

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
        accessibilityLabel={`Gallery (${galleryCount} images)`}
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

  const renderMediaStatus = (mediaType: 'video' | 'audio') => {
    const current = mediaGeneration[mediaType];
    if (!current && lastMediaGenerationResult?.mediaType !== mediaType) {
      return null;
    }

    const result = lastMediaGenerationResult?.mediaType === mediaType ? lastMediaGenerationResult : undefined;
    const message = current?.message || result?.message;
    const isRunning = Boolean(current);
    return (
      <View style={[styles.mediaStatus, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {isRunning ? (
          <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        ) : (
          <Ionicons
            name={result?.status === 'failed' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
            size={20}
            color={result?.status === 'failed' ? theme.colors.error[500] : theme.colors.success[500]}
          />
        )}
        <Typography variant="caption" color="secondary" style={styles.mediaStatusText}>
          {message || (isRunning ? 'Generating...' : 'Ready')}
        </Typography>
      </View>
    );
  };

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

  const renderVideoTab = () => {
    const canGenerateVideo = hasRunwayKey && (videoPrompt.trim().length > 0 || Boolean(videoSourceUri));
    return (
      <>
        {!hasRunwayKey && renderProviderSetup('Runway')}
        {renderMediaStatus('video')}

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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {runwayModels.map((model) => renderChip(
              model.label,
              videoModelId === model.id,
              () => {
                setVideoModelId(model.id);
                const nextDurations = getRunwayVideoDurations(model.id, videoOperation);
                const nextRatios = getRunwayAspectRatios(model.id, videoOperation);
                setVideoDuration(nextDurations.includes(videoDuration) ? videoDuration : nextDurations[0] || RUNWAY_DEFAULT_DURATION_SECONDS);
                setVideoAspectRatio(nextRatios.some((ratio) => ratio.id === videoAspectRatio) ? videoAspectRatio : nextRatios[0]?.id || RUNWAY_DEFAULT_ASPECT_RATIO);
              },
              model.id
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Duration" subtitle="Clip length" icon="⏱️" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {videoDurations.map((duration) => renderChip(`${duration}s`, videoDuration === duration, () => setVideoDuration(duration), String(duration)))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Frame" subtitle="Aspect ratio" icon="▣" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {videoAspectRatios.map((ratio) => renderChip(ratio.label, videoAspectRatio === ratio.id, () => setVideoAspectRatio(ratio.id), ratio.id))}
          </ScrollView>
        </View>

        {!isKeyboardVisible && (
          <View style={styles.mediaGenerateSpacer}>
            <GradientButton
              title={mediaGeneration.video ? 'Generating Video...' : hasRunwayKey ? 'Generate Video' : 'Connect Runway'}
              onPress={handleGenerateVideo}
              disabled={Boolean(mediaGeneration.video) || !canGenerateVideo}
              fullWidth
            />
          </View>
        )}
      </>
    );
  };

  const renderAudioTab = () => {
    const fallbackModels = getMediaModels('elevenlabs', audioOperation);
    const modelsForOperation = (audioModels.length > 0 ? audioModels : fallbackModels)
      .filter((model) => model.operations.includes(audioOperation));
    const canGenerateAudio = hasElevenLabsKey && audioPrompt.trim().length > 0;

    return (
      <>
        {!hasElevenLabsKey && renderProviderSetup('ElevenLabs')}
        {renderMediaStatus('audio')}

        <View style={styles.section}>
          <SectionHeader title="Audio Mode" subtitle="Voiceover or generated sound" icon="🎧" />
          <View style={styles.inlineActions}>
            {renderChip('Voiceover', audioOperation === 'text_to_speech', () => setAudioOperation('text_to_speech'))}
            {renderChip('Sound effect', audioOperation === 'sound_effect', () => setAudioOperation('sound_effect'))}
          </View>
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
            <SectionHeader title="Voice" subtitle={loadingAudioOptions ? 'Loading voices...' : 'Choose a voice'} icon="🗣️" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {(audioVoices.length > 0 ? audioVoices.slice(0, 20) : [{ id: ELEVENLABS_DEFAULT_VOICE_ID, name: 'Default voice' }]).map((voice) => renderChip(
                voice.name,
                audioVoiceId === voice.id,
                () => setAudioVoiceId(voice.id),
                voice.id
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Model" subtitle="Generation model" icon="⚙️" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {modelsForOperation.map((model) => renderChip(
              model.label,
              activeAudioModelId === model.id,
              () => {
                if (audioOperation === 'text_to_speech') {
                  setAudioTtsModelId(model.id);
                } else {
                  setAudioSfxModelId(model.id);
                }
              },
              model.id
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Format" subtitle="Saved audio format" icon="💾" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {ELEVENLABS_OUTPUT_FORMATS.map((format) => renderChip(
              format.label,
              audioOutputFormat === format.id,
              () => setAudioOutputFormat(format.id),
              format.id
            ))}
          </ScrollView>
        </View>

        {audioOperation === 'sound_effect' && (
          <View style={styles.section}>
            <SectionHeader title="Sound Controls" subtitle="Optional duration and prompt influence" icon="🎚️" />
            <View style={styles.inlineActions}>
              {renderChip('Auto', audioDuration === undefined, () => setAudioDuration(undefined))}
              {[1, 3, 5, 8, 10, 15, 20].map((duration) => renderChip(`${duration}s`, audioDuration === duration, () => setAudioDuration(duration), String(duration)))}
            </View>
            <View style={styles.inlineActions}>
              {[0.2, 0.3, 0.5, 0.7].map((value) => renderChip(`Influence ${value}`, promptInfluence === value, () => setPromptInfluence(value), String(value)))}
            </View>
          </View>
        )}

        {!isKeyboardVisible && (
          <View style={styles.mediaGenerateSpacer}>
            <GradientButton
              title={mediaGeneration.audio ? 'Generating Audio...' : hasElevenLabsKey ? 'Generate Audio' : 'Connect ElevenLabs'}
              onPress={handleGenerateAudio}
              disabled={Boolean(mediaGeneration.audio) || !canGenerateAudio}
              fullWidth
            />
          </View>
        )}
      </>
    );
  };

  // Demo mode gate - only demo users should be blocked
  if (isDemo) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <Header
          variant="gradient"
          title="Create"
          subtitle="AI Image Generation"
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
            Generate and refine AI images with multiple providers. This is a premium feature.
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
      edges={['top', 'left', 'right']}
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

          {activeTab === 'image' && (
            <>
          {/* AI Provider Selection using tiles */}
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
            />
            {configuredImageAIs.some(ai => supportsImageInput(ai.provider, selectedModels[ai.id as AIProvider] || ai.model)) && (
              <View style={styles.legendRow}>
                <Badge label="img2img" type="new" />
                <Typography variant="caption" color="secondary">
                  Supports image refinement
                </Typography>
              </View>
            )}
          </View>

          {/* Hero Prompt Input */}
          <View style={styles.section}>
            <PromptHeroInput
              value={currentPrompt}
              onChangeText={(text) => dispatch(setPrompt(text))}
              maxLength={MAX_PROMPT_LENGTH}
              placeholder="Describe what you want to create..."
              testID="create-prompt-input"
            />
          </View>

          {/* Style Selection */}
          <View style={styles.section}>
            <SectionHeader
              title="Style"
              subtitle="Choose an artistic style"
              icon="🎨"
            />
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

          {/* Advanced Options - Collapsed by default */}
          <AdvancedOptionsSection
            selectedSize={selectedSize}
            onSizeChange={handleSizeSelect}
            selectedQuality={selectedQuality}
            onQualityChange={handleQualitySelect}
            canRefine={canRefineImages}
            onUploadImage={handlePickImage}
            testID="create-advanced-options"
          />
            </>
          )}
        </ScrollView>

        {/* Generate Button - hidden when keyboard is visible */}
        {!isKeyboardVisible && activeTab === 'image' && (
          <View
            style={[
              styles.generateContainer,
              {
                backgroundColor: theme.colors.background,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <GradientButton
              title={
                selectedProviders.length === 0
                  ? 'Select an AI to generate'
                  : selectedProviders.length > 1
                    ? `Generate with ${selectedProviders.length} AIs`
                    : 'Generate Image'
              }
              onPress={handleGenerate}
              disabled={!canGenerate}
              fullWidth
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Image Refinement Modal - only render when we have an image */}
      {uploadedImageUri && (
        <ImageRefinementModal
          visible={showRefinementModal}
          imageUri={uploadedImageUri}
          originalProvider="openai"
          availableProviders={availableRefinementProviders}
          onClose={() => {
            setShowRefinementModal(false);
            setUploadedImageUri(null);
          }}
          onRefine={handleRefinement}
        />
      )}
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
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
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
  generateContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
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
