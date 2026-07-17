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
import {
  Typography,
  GradientButton,
  HeaderIcon,
  SectionHeader,
  SegmentedControl,
  SheetHeader,
  InfoButton,
} from '../components/molecules';
import {
  Header,
  HeaderActions,
  CreateComposer,
  CreateEmptyState,
  CreateGenerationStatusCard,
  CreateMediaTabs,
  CreateOptionsSheet,
} from '../components/organisms';
import {
  RootState,
  AppDispatch,
  isApiKeyConfigured,
  setImageOptions,
  setAttachments,
  removeAttachment,
} from '../store';
import {
  generateCreateImages,
  setActiveCreateTab,
  markCreateActivitySeen,
  hydrateGallery,
  hydrateMediaGallery,
  generateCreateVideo,
  generateCreateAudio,
  selectCreateState,
} from '../store/createSlice';
import { useCreateComposerSelection } from '../hooks/create/useCreateComposerSelection';
import { RootStackParamList } from '../types';
import type { CreateMediaOperation, ElevenLabsSharedVoiceQuery, ElevenLabsVoiceListQuery, MediaProviderModelOption, MediaProviderOptionsResponse, MediaProviderVoiceOption } from '../types/media';
import { DebateVoicePicker } from '../components/organisms/debate/DebateVoicePicker';
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
import { HelpTopicId } from '../config/help/types';
import { getImageMimeType } from '../services/images/fileCache';
import APIKeyService from '../services/APIKeyService';
import MediaGenerationService from '../services/media/MediaGenerationService';
import {
  getElevenLabsCreditCheck,
  formatElevenLabsCreditSummary,
  type ElevenLabsSubscriptionInfo,
} from '../services/media/elevenLabsCredits';
import { ErrorService } from '../services/errors/ErrorService';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type AudioPickerType = 'voice' | 'model' | 'format';

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

function mergeAudioModels(
  existing: MediaProviderModelOption[],
  incoming: MediaProviderModelOption[]
): MediaProviderModelOption[] {
  const modelsById = new Map(existing.map((model) => [model.id, model]));
  incoming.forEach((model) => {
    modelsById.set(model.id, model);
  });
  return Array.from(modelsById.values());
}

export default function CreateSetupScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { isDemo } = useFeatureAccess();

  const createState = useSelector(selectCreateState);
  const apiKeys = useSelector((state: RootState) => state.settings.apiKeys || {});

  const {
    activeTab = 'image',
    galleryHydrated,
    gallery,
    mediaGalleryHydrated = false,
    mediaGallery = [],
    imageGeneration = null,
    mediaGeneration = { video: null, audio: null },
    lastImageGenerationResult,
    lastMediaGenerationResult,
  } = createState;

  // Composer draft selection (pills + persisted options + attachments).
  const composer = useCreateComposerSelection(activeTab);
  const imageAttachments = useSelector(
    (state: RootState) => state.createSelection.attachments.image
  );

  const galleryCount = gallery.length + mediaGallery.length;
  // Prompt drafts stay local like Home's inputText; sending clears them.
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageOptionsSheetOpen, setImageOptionsSheetOpen] = useState(false);
  // Video/audio settings live in a shared bottom sheet until their composer port.
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
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
  const [audioVoiceName, setAudioVoiceName] = useState<string | undefined>();
  const [audioOutputFormat, setAudioOutputFormat] = useState(ELEVENLABS_DEFAULT_OUTPUT_FORMAT);
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined);
  const [promptInfluence, setPromptInfluence] = useState(0.3);
  const [audioVoices, setAudioVoices] = useState<MediaProviderVoiceOption[]>([]);
  const [audioModels, setAudioModels] = useState<MediaProviderModelOption[]>([]);
  const [loadingAudioOptions, setLoadingAudioOptions] = useState(false);
  const [audioVoiceTotalCount, setAudioVoiceTotalCount] = useState<number | undefined>();
  const [audioPicker, setAudioPicker] = useState<AudioPickerType | null>(null);
  const [elevenLabsSubscription, setElevenLabsSubscription] = useState<ElevenLabsSubscriptionInfo | undefined>();
  const [elevenLabsSubscriptionLoading, setElevenLabsSubscriptionLoading] = useState(false);
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
  const elevenLabsCreditSummary = formatElevenLabsCreditSummary(elevenLabsSubscription, elevenLabsSubscriptionLoading);

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

  useEffect(() => {
    let cancelled = false;
    if (!hasElevenLabsKey || activeTab !== 'audio') {
      setElevenLabsSubscription(undefined);
      setElevenLabsSubscriptionLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setElevenLabsSubscriptionLoading(true);
    APIKeyService.getKey('elevenlabs')
      .then((key) => key ? MediaGenerationService.getElevenLabsSubscription(key) : undefined)
      .then((subscription) => {
        if (!cancelled) setElevenLabsSubscription(subscription);
      })
      .catch(() => {
        if (!cancelled) setElevenLabsSubscription(undefined);
      })
      .finally(() => {
        if (!cancelled) setElevenLabsSubscriptionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, hasElevenLabsKey]);

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
        setAudioModels(mergeAudioModels(getMediaModels('elevenlabs'), options.models || []));
        setAudioVoiceTotalCount(options.voiceTotalCount);
        const firstVoice = options.voices?.[0];
        if (firstVoice) {
          setAudioVoiceId(firstVoice.id);
          setAudioVoiceName(firstVoice.name);
        }
      } catch (error) {
        ErrorService.handleWithToast(error, { feature: 'create', provider: 'elevenlabs' });
      } finally {
        setLoadingAudioOptions(false);
      }
    };

    loadAudioOptions();
  }, [activeTab, audioVoices.length, hasElevenLabsKey, loadingAudioOptions]);

  // An attachment turns a plain generation into a refinement; send blocks
  // only when an attachment exists and no selected model can edit images.
  const attachmentBlocked =
    imageAttachments.length > 0 && !composer.imageSupportsSourceInput;
  const imageValidationMessage = !composer.hasEnoughAIs
    ? 'Add an AI to create images'
    : attachmentBlocked
      ? 'Attached image needs a model that can edit images — tap a pill to switch models'
      : null;
  const canSendImage =
    composer.hasEnoughAIs &&
    imagePrompt.trim().length > 0 &&
    !attachmentBlocked &&
    !imageGeneration;

  const recentImageAssets = useMemo(
    () =>
      gallery
        .slice(0, 10)
        .map((entry) => ({ id: entry.id, uri: entry.uri, type: 'image' as const })),
    [gallery]
  );

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

    const imageMaxReferenceImages = composer.imageMaxReferenceImages;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: imageMaxReferenceImages > 1,
      selectionLimit: imageMaxReferenceImages,
      allowsEditing: imageMaxReferenceImages <= 1,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const attachments = result.assets
        .map((asset) => asset.uri)
        .filter(Boolean)
        .slice(0, imageMaxReferenceImages)
        .map((uri) => ({ uri, mimeType: getImageMimeType(uri) }));
      dispatch(setAttachments({ tab: 'image', attachments }));
    }
  }, [composer.imageMaxReferenceImages, dispatch]);

  const handleUseLatestImageAsImageSource = useCallback(() => {
    const latest = gallery[0];
    if (!latest?.uri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(setAttachments({
      tab: 'image',
      attachments: [{ uri: latest.uri, galleryAssetId: latest.id }],
    }));
  }, [gallery, dispatch]);

  const handleSendImage = useCallback(async (text: string) => {
    if (!canSendImage) return;

    const { providers, selectedModels, modelSettings } = composer.imageSelectionMaps;
    const { style, size, count } = composer.imageOptions;

    try {
      const result = await dispatch(generateCreateImages({
        prompt: text,
        providers,
        selectedModels,
        style,
        size,
        imageCount: count,
        modelSettings,
        sourceImages: imageAttachments.map((attachment) => ({
          uri: attachment.uri,
          mimeType: attachment.mimeType || getImageMimeType(attachment.uri),
        })),
        isUploaded: imageAttachments.length > 0,
        refinementInstructions: imageAttachments.length > 0 ? text : undefined,
      })).unwrap();

      setImagePrompt('');
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
    canSendImage,
    composer.imageSelectionMaps,
    composer.imageOptions,
    dispatch,
    imageAttachments,
    navigation,
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
    setSettingsSheetOpen(false);
    dispatch(setActiveCreateTab(tab));
  }, [dispatch]);

  const handleAudioOperationChange = useCallback((operation: typeof audioOperation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAudioOperation(operation);
    setAudioPicker(null);
  }, []);

  const handleOpenAudioPicker = useCallback((picker: AudioPickerType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    const submittedPrompt = audioPrompt;
    try {
      if (audioOperation === 'text_to_speech') {
        const key = await APIKeyService.getKey('elevenlabs');
        if (!key) {
          throw new Error('Add an ElevenLabs API key before generating audio.');
        }
        const subscription = await MediaGenerationService.getElevenLabsSubscription(key).catch(() => undefined);
        const creditCheck = getElevenLabsCreditCheck(submittedPrompt.trim(), activeAudioModelId, subscription);
        if (creditCheck.shouldBlock) {
          ErrorService.showWarning(creditCheck.message || 'Not enough ElevenLabs credits to generate audio.', 'create');
          return;
        }
        if (creditCheck.shouldWarn && creditCheck.message) {
          const confirmed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Use ElevenLabs credits?',
              creditCheck.message,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Generate', onPress: () => resolve(true) },
              ],
              { cancelable: true, onDismiss: () => resolve(false) }
            );
          });
          if (!confirmed) return;
        }
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  // Voice-picker callbacks (shared with the debate path's DebateVoicePicker).
  const handleLoadCreateVoices = useCallback(async (
    query: ElevenLabsVoiceListQuery
  ): Promise<MediaProviderOptionsResponse> => {
    const key = await APIKeyService.getKey('elevenlabs');
    if (!key) throw new Error('Add an ElevenLabs API key to browse voices.');
    return MediaGenerationService.listElevenLabsOptions(key, query);
  }, []);

  const handleLoadCreateSharedVoices = useCallback(async (
    query: ElevenLabsSharedVoiceQuery
  ): Promise<MediaProviderOptionsResponse> => {
    const key = await APIKeyService.getKey('elevenlabs');
    if (!key) throw new Error('Add an ElevenLabs API key to browse community voices.');
    return MediaGenerationService.listElevenLabsSharedVoices(key, query);
  }, []);

  const handleAddCreateSharedVoice = useCallback(async (
    voice: MediaProviderVoiceOption
  ): Promise<MediaProviderVoiceOption> => {
    const publicOwnerId = voice.publicOwnerId || voice.public_owner_id;
    if (!publicOwnerId) throw new Error('This community voice cannot be added.');
    const key = await APIKeyService.getKey('elevenlabs');
    if (!key) throw new Error('Add an ElevenLabs API key before adding voices.');
    try {
      const newVoiceId = await MediaGenerationService.addElevenLabsSharedVoice(key, publicOwnerId, voice.id, voice.name);
      const addedVoice: MediaProviderVoiceOption = {
        ...voice,
        id: newVoiceId,
        voice_id: newVoiceId,
        isCommunity: false,
        sourceVoiceType: 'personal',
        isAddedByUser: true,
        is_added_by_user: true,
      };
      setAudioVoices((current) => mergeAudioVoices(current, [addedVoice]));
      return addedVoice;
    } catch (error) {
      ErrorService.handleWithToast(error, { feature: 'create', provider: 'elevenlabs' });
      throw error;
    }
  }, []);

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
    helpTopicId,
  }: {
    label: string;
    value: string;
    description?: string;
    onPress: () => void;
    testID: string;
    helpTopicId?: HelpTopicId;
  }) => (
    <View
      style={[
        styles.selectorRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.selectorPressable}
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
      {helpTopicId && <InfoButton topicId={helpTopicId} size="small" />}
    </View>
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

  const renderOutputControlGroup = (
    label: string,
    children: React.ReactNode,
    options?: { helpTopicId?: HelpTopicId; testID?: string }
  ) => (
    <View style={styles.outputControlGroup} testID={options?.testID}>
      <View style={styles.outputControlLabelRow}>
        <Typography variant="caption" weight="semibold" color="secondary" style={styles.outputControlLabel}>
          {label}
        </Typography>
        {options?.helpTopicId && <InfoButton topicId={options.helpTopicId} size="small" />}
      </View>
      {children}
    </View>
  );

  // Shared bottom-sheet shell used by all three tabs (one tab active at a time).
  const renderSettingsSheetShell = (title: string, content: React.ReactNode) => {
    if (!settingsSheetOpen) return null;
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setSettingsSheetOpen(false)}>
        <View style={styles.pickerOverlay} testID="create-settings-sheet">
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setSettingsSheetOpen(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: theme.colors.background }]}>
            <SheetHeader title={title} onClose={() => setSettingsSheetOpen(false)} showHandle />
            <ScrollView contentContainerStyle={styles.settingsSheetContent} showsVerticalScrollIndicator={false}>
              {content}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderVideoTab = () => {
    const activeRunwayModel = runwayModels.find((model) => model.id === videoModelId) || runwayModels[0];
    const videoSettingsSummary = `${activeRunwayModel?.label || 'Model'} · ${videoDuration}s · ${videoAspectRatio}`;

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
          <SectionHeader title="Source" subtitle="Optional image-to-video input" icon="🖼️" helpTopicId="create-video-source" />
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
          <TouchableOpacity
            style={[styles.selectorRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSettingsSheetOpen(true); }}
            accessibilityRole="button"
            accessibilityLabel="Video settings"
            testID="create-open-settings"
          >
            <Ionicons name="options-outline" size={22} color={theme.colors.text.secondary} />
            <View style={styles.selectorText}>
              <Typography variant="body" weight="semibold">Video settings</Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>{videoSettingsSummary}</Typography>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {renderSettingsSheetShell('Video settings', (
          <>
            {renderOutputControlGroup(
              'Model',
              renderOptionGrid(
                runwayModels.map((model) => ({ id: model.id, label: model.label, description: model.description })),
                videoModelId,
                (modelId) => {
                  setVideoModelId(modelId);
                  const nextDurations = getRunwayVideoDurations(modelId, videoOperation);
                  const nextRatios = getRunwayAspectRatios(modelId, videoOperation);
                  setVideoDuration(nextDurations.includes(videoDuration) ? videoDuration : nextDurations[0] || RUNWAY_DEFAULT_DURATION_SECONDS);
                  setVideoAspectRatio(nextRatios.some((ratio) => ratio.id === videoAspectRatio) ? videoAspectRatio : nextRatios[0]?.id || RUNWAY_DEFAULT_ASPECT_RATIO);
                },
                'create-video-model-grid'
              ),
              { helpTopicId: 'create-video-model' }
            )}
            {renderOutputControlGroup(
              'Duration',
              renderDiscreteSlider({
                options: videoDurations,
                value: videoDuration,
                getLabel: (duration) => `${duration}s`,
                onChange: setVideoDuration,
                testID: 'create-video-duration-slider',
              }),
              { helpTopicId: 'create-video-duration' }
            )}
            {renderOutputControlGroup('Frame', renderAspectRatioGrid(), { helpTopicId: 'create-video-frame' })}
          </>
        ))}
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
        {hasElevenLabsKey && elevenLabsCreditSummary && (
          <View style={styles.section}>
            <Typography variant="caption" color="secondary">
              {elevenLabsCreditSummary}
            </Typography>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Audio Mode" subtitle="Voiceover or generated sound" icon="🎧" helpTopicId="create-audio-mode" />
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
              helpTopicId="create-audio-voice"
            />
            {renderSelectorRow({
              label: 'Voice',
              value: audioVoiceName || selectedVoice?.label || 'Default voice',
              description: selectedVoice?.description,
              onPress: () => handleOpenAudioPicker('voice'),
              testID: 'create-audio-voice-selector',
            })}
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.selectorRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSettingsSheetOpen(true); }}
            accessibilityRole="button"
            accessibilityLabel="Audio settings"
            testID="create-open-settings"
          >
            <Ionicons name="options-outline" size={22} color={theme.colors.text.secondary} />
            <View style={styles.selectorText}>
              <Typography variant="body" weight="semibold">Audio settings</Typography>
              <Typography variant="caption" color="secondary" numberOfLines={1}>{audioSettingsSummary}</Typography>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {renderSettingsSheetShell('Audio settings', (
          <>
            {renderSelectorRow({
              label: 'Model',
              value: selectedAudioModel?.label || 'Default model',
              description: selectedAudioModel?.description,
              onPress: () => handleOpenAudioPicker('model'),
              testID: 'create-audio-model-selector',
              helpTopicId: 'create-audio-model',
            })}

            {renderSelectorRow({
              label: 'Format',
              value: selectedOutputFormat.label,
              onPress: () => handleOpenAudioPicker('format'),
              testID: 'create-audio-format-selector',
              helpTopicId: 'create-audio-format',
            })}

            {audioOperation === 'sound_effect' && (
              <View style={styles.soundControls}>
                {renderOutputControlGroup(
                  'Duration',
                  renderDiscreteSlider({
                    options: audioDurationOptions,
                    value: audioDuration,
                    getLabel: (duration) => (duration === undefined ? 'Auto duration' : `${duration}s`),
                    onChange: setAudioDuration,
                    testID: 'create-audio-duration-slider',
                  }),
                  { helpTopicId: 'create-audio-duration' }
                )}
                {renderOutputControlGroup(
                  'Prompt influence',
                  renderDiscreteSlider({
                    options: promptInfluenceOptions,
                    value: promptInfluence,
                    getLabel: (value) => `Influence ${value}`,
                    onChange: setPromptInfluence,
                    testID: 'create-audio-influence-slider',
                  }),
                  { helpTopicId: 'create-audio-influence' }
                )}
              </View>
            )}
          </>
        ))}

        <DebateVoicePicker
          visible={audioPicker === 'voice'}
          target={{ kind: 'single', label: 'Voiceover' }}
          currentVoiceId={audioVoiceId}
          elevenLabsTier={elevenLabsSubscription?.tier}
          onClose={() => setAudioPicker(null)}
          onLoadVoices={handleLoadCreateVoices}
          onLoadSharedVoices={handleLoadCreateSharedVoices}
          onAddSharedVoice={handleAddCreateSharedVoice}
          onSelectVoice={(voice) => {
            setAudioVoiceId(voice.id);
            setAudioVoiceName(voice.name);
            setAudioVoices((current) => mergeAudioVoices(current, [voice]));
          }}
        />
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
          slim
          title="The Studio"
          rightElement={<HeaderActions variant="gradient" helpCategoryId="create" />}
        />
        <View style={styles.premiumGate}>
          <Ionicons
            name="sparkles"
            size={64}
            color={theme.colors.primary[500]}
          />
          <Typography variant="title" style={styles.premiumTitle}>
            The Studio
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
        slim
        title="The Studio"
        rightElement={renderHeaderRight()}
      />
      {activeTab === 'image' ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.composerLayout}>
            <CreateMediaTabs activeTab={activeTab} onChange={handleTabChange} testID="create-tabs" />

            {imageGeneration || lastImageGenerationResult ? (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.statusScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <CreateGenerationStatusCard
                  generation={imageGeneration}
                  result={lastImageGenerationResult}
                  selectedModels={composer.imageSelectionMaps.selectedModels}
                  onViewInGallery={handleViewImagesInGallery}
                />
              </ScrollView>
            ) : (
              <CreateEmptyState
                tab="image"
                hasConfiguredProviders={composer.configuredProviderIds.length > 0}
                recentAssets={recentImageAssets}
                onPressRecent={(asset) =>
                  navigation.navigate('CreateSession', { focusAssetId: asset.id, galleryTab: 'image' })
                }
                onConfigureProviders={handleAddAI}
                testID="create-empty-state"
              />
            )}

            <CreateComposer
              tab="image"
              configs={composer.configs}
              maxAIs={3}
              onAddProvider={composer.addProvider}
              onUpdateConfig={composer.updateConfig}
              onRemoveConfig={composer.removeConfig}
              pickerProviders={composer.pickerProviders}
              configuredProviderIds={composer.configuredProviderIds}
              onRequestAddKey={handleAddAI}
              attachments={imageAttachments}
              onRemoveAttachment={(uri) => dispatch(removeAttachment({ tab: 'image', uri }))}
              onOpenOptions={() => setImageOptionsSheetOpen(true)}
              inputText={imagePrompt}
              onChangeText={setImagePrompt}
              onSend={handleSendImage}
              canSend={canSendImage}
              validationMessage={imageValidationMessage}
              placeholder="Describe the image to create…"
              testID="create-composer"
            />
          </View>
        </KeyboardAvoidingView>
      ) : (
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
            <CreateMediaTabs activeTab={activeTab} onChange={handleTabChange} testID="create-tabs" />

            {activeTab === 'video' && renderVideoTab()}
            {activeTab === 'audio' && renderAudioTab()}
          </ScrollView>

          {/* Generate Button - hidden when keyboard is visible */}
          {!isKeyboardVisible && activeTab === 'video' && renderMediaActionRail('video')}
          {!isKeyboardVisible && activeTab === 'audio' && renderMediaActionRail('audio')}
        </KeyboardAvoidingView>
      )}

      <CreateOptionsSheet
        visible={imageOptionsSheetOpen}
        onClose={() => setImageOptionsSheetOpen(false)}
        style={composer.imageOptions.style}
        onChangeStyle={(style) => dispatch(setImageOptions({ style }))}
        size={composer.imageOptions.size}
        onChangeSize={(size) => dispatch(setImageOptions({ size }))}
        count={composer.imageOptions.count}
        maxCount={composer.imageMaxCount}
        onChangeCount={(count) => dispatch(setImageOptions({ count }))}
        onAttachImage={handlePickImageSource}
        onUseLatestImage={gallery.length > 0 ? handleUseLatestImageAsImageSource : undefined}
        attachDisabledReason={
          composer.imageSupportsSourceInput
            ? undefined
            : 'Select a model with image input to use references'
        }
        testID="create-options-sheet"
      />
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
  composerLayout: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  statusScroll: {
    paddingBottom: 16,
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
  selectorPressable: {
    flex: 1,
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
  imageProviderStatusList: {
    gap: 8,
  },
  imageProviderStatusRow: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageProviderStatusCopy: {
    flex: 1,
    minWidth: 0,
  },
  imageProviderStatusMessage: {
    marginTop: 2,
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
  outputControlGroup: {
    gap: 8,
  },
  outputControlLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  outputControlLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modeToggleWrap: {
    marginTop: 12,
  },
  settingsSheetContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  settingsGroupLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  modelSettingsBlock: {
    gap: 12,
  },
  modelSettingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
