import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Typography, GradientButton } from '@/components/molecules';
import { useGreeting } from '@/hooks/useGreeting';
import type { CreateTab } from '@/types/media';

export interface CreateRecentAsset {
  id: string;
  uri?: string;
  type: CreateTab;
}

interface CreateEmptyStateProps {
  tab: CreateTab;
  hasConfiguredProviders: boolean;
  recentAssets: CreateRecentAsset[];
  onPressRecent: (asset: CreateRecentAsset) => void;
  onConfigureProviders: () => void;
  testID?: string;
}

const CAPABILITY_HINTS: Record<
  CreateTab,
  Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }>
> = {
  image: [
    { icon: 'images-outline', label: 'Up to 3 models' },
    { icon: 'color-palette-outline', label: 'Styles' },
    { icon: 'layers-outline', label: 'Refine with a photo' },
  ],
  video: [
    { icon: 'videocam-outline', label: 'Text to video' },
    { icon: 'image-outline', label: 'Image to video' },
  ],
  audio: [
    { icon: 'mic-outline', label: 'Voiceovers' },
    { icon: 'musical-notes-outline', label: 'Sound effects' },
  ],
};

const RECENT_TILE_ICONS: Record<CreateTab, keyof typeof Ionicons.glyphMap> = {
  image: 'image-outline',
  video: 'videocam-outline',
  audio: 'musical-notes-outline',
};

const CONNECT_COPY: Record<CreateTab, string> = {
  image: 'Bring your own API keys — connect OpenAI, Google, or Grok to create images.',
  video: 'Bring your own API key — connect Runway to create videos.',
  audio: 'Bring your own API key — connect ElevenLabs to create voiceovers and sound effects.',
};

/**
 * Fills the space above the Studio's bottom-docked composer: witty greeting,
 * per-tab capability hints, a recent-creations strip, and a first-run CTA
 * when the tab has no configured provider yet.
 */
export const CreateEmptyState: React.FC<CreateEmptyStateProps> = ({
  tab,
  hasConfiguredProviders,
  recentAssets,
  onPressRecent,
  onConfigureProviders,
  testID,
}) => {
  const { theme } = useTheme();
  const { timeBasedGreeting, welcomeMessage } = useGreeting({ screenCategory: 'create' });

  const handlePressRecent = (asset: CreateRecentAsset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPressRecent(asset);
  };

  return (
    <View style={styles.container} testID={testID}>
      <Typography variant="title" align="center">
        {timeBasedGreeting}
      </Typography>
      <Typography variant="body" color="secondary" align="center" style={styles.subtitle}>
        {welcomeMessage}
      </Typography>

      {hasConfiguredProviders ? (
        <>
          <View style={styles.hintRow}>
            {CAPABILITY_HINTS[tab].map(hint => (
              <View key={hint.label} style={styles.hint}>
                <Ionicons name={hint.icon} size={14} color={theme.colors.text.secondary} />
                <Typography variant="caption" color="secondary">
                  {hint.label}
                </Typography>
              </View>
            ))}
          </View>

          {recentAssets.length > 0 && (
            <View style={styles.recentsBlock}>
              <Typography variant="caption" weight="semibold" color="secondary">
                RECENT
              </Typography>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentsRow}
                testID={testID ? `${testID}-recents` : undefined}
              >
                {recentAssets.map(asset => (
                  <TouchableOpacity
                    key={asset.id}
                    onPress={() => handlePressRecent(asset)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Open recent creation"
                    style={[
                      styles.recentTile,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    ]}
                  >
                    {asset.uri ? (
                      <Image
                        source={{ uri: asset.uri }}
                        style={styles.recentPreview}
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <Ionicons
                        name={RECENT_TILE_ICONS[asset.type]}
                        size={22}
                        color={theme.colors.text.secondary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      ) : (
        <View style={styles.configureCta}>
          <Typography variant="body" color="secondary" align="center" style={styles.configureCopy}>
            {CONNECT_COPY[tab]}
          </Typography>
          <GradientButton
            title="Connect a provider"
            onPress={onConfigureProviders}
            gradient={theme.colors.gradients.primary}
            testID={testID ? `${testID}-configure` : undefined}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentsBlock: {
    alignSelf: 'stretch',
    gap: 8,
    alignItems: 'center',
  },
  recentsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 4,
  },
  recentTile: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentPreview: {
    width: '100%',
    height: '100%',
  },
  configureCta: {
    alignSelf: 'stretch',
    gap: 16,
  },
  configureCopy: {
    paddingHorizontal: 8,
  },
});

export default CreateEmptyState;
