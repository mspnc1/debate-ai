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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorService } from '@/services/errors/ErrorService';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme';
import { Typography } from '../components/molecules';
import { ImageRefinementModal, RefinementProvider } from '../components/organisms/chat/ImageRefinementModal';
import { RootState, AppDispatch } from '../store';
import {
  selectCreateState,
  selectGallery,
  selectIsGenerating,
  addToGalleryWithCleanup,
  startGeneration,
  updateGenerationProgress,
  completeGeneration,
  removeFromGalleryWithCleanup,
  persistGallery,
  updateGalleryEntryUri,
  GeneratedImageEntry,
} from '../store/createSlice';
import { RootStackParamList, AIProvider } from '../types';
import { ImageService, GeneratedImage } from '../services/images/ImageService';
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
import useFeatureAccess from '../hooks/useFeatureAccess';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'CreateSession'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 32;

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
  } = createState;

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [sharingImageId, setSharingImageId] = useState<string | null>(null);
  const [refiningImage, setRefiningImage] = useState<GeneratedImageEntry | null>(null);
  const longPressHandledRef = useRef<string | null>(null);

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
      hasApiKey: Boolean(apiKeys[provider]),
    }));
  }, [apiKeys]);

  // Auto-persist gallery whenever it changes
  useEffect(() => {
    if (galleryHydrated || gallery.length > 0) {
      dispatch(persistGallery(gallery));
    }
  }, [dispatch, gallery, galleryHydrated]);

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
      const apiKey = apiKeys[provider];
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
    apiKeys,
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
          const apiKey = apiKeys[provider];
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

    // Show error toast if any providers failed
    const failedProviders = results.filter(r => r.images instanceof Error);
    if (failedProviders.length > 0) {
      const failedNames = failedProviders
        .map(r => getImageProviderDisplayName(r.provider, {
          includeModel: true,
          modelId: activeSelectedModels[r.provider],
        }))
        .join(', ');
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
    apiKeys,
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

  // In gallery mode (no initialPrompt), show all images
  // In generation mode, show only recent images from selected providers
  const isGalleryMode = !initialPrompt && !sourceImage && !refinementInstructions && providers.length === 0;
  const sessionGallery = isGalleryMode
    ? gallery
    : gallery.filter(img =>
        providers.includes(img.provider) &&
        activeSelectedModels[img.provider] === img.model &&
        img.createdAt >= Date.now() - 3600000 // Last hour
      );

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
            {isGalleryMode ? 'Gallery' : 'Create'}
          </Typography>
          <Typography variant="caption" color="secondary">
            {isGalleryMode
              ? `${gallery.length} images`
              : providers.map(p => getImageProviderDisplayName(p, {
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
        data={sessionGallery}
        keyExtractor={(item) => item.id}
        renderItem={renderImageItem}
        contentContainerStyle={[
          styles.galleryContent,
          { paddingBottom: insets.bottom + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isGenerating ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="image-outline"
                size={64}
                color={theme.colors.text.secondary}
              />
              <Typography variant="body" color="secondary" style={styles.emptyText}>
                No images generated yet
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
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
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
