import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import { Typography } from '../../molecules';
import { LazyMarkdownRenderer, createMarkdownStyles } from '../../molecules/common/LazyMarkdownRenderer';
import { CompareImageDisplay } from './CompareImageDisplay';
import { CitationSources } from '../common/CitationSources';
import { StreamingIndicator } from '../common/StreamingIndicator';
import { supportsWebSearch } from '@/config/modelConfigs';
import { Message, AIConfig } from '../../../types';
import { useTheme } from '../../../theme';
import { sanitizeMarkdown, shouldLazyRender } from '@/utils/markdown';
import { processMessageContentWithCitations } from '@/utils/citationUtils';
import { selectableMarkdownRules } from '@/utils/markdownSelectable';
import { useStreamingMessage } from '@/hooks/streaming';
import { useMessageBubbleAnimation } from '@/hooks/useMessageBubbleAnimation';
import { useCitationInteractions } from '@/hooks/useCitationInteractions';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import useFeatureAccess from '@/hooks/useFeatureAccess';
import type { BrandColor } from '@/constants/aiColors';
import { getBrandPalette, getReadableBrandAccent } from '@/utils/aiBrandColors';

interface CompareMessageBubbleProps {
  message: Message;
  side: 'left' | 'right';
  brandPalette?: BrandColor | null;
  providerName?: string;
  onOpenLightbox?: (uri: string) => void;
}

export const CompareMessageBubble: React.FC<CompareMessageBubbleProps> = ({
  message,
  side,
  brandPalette,
  providerName,
  onOpenLightbox,
}) => {
  const { theme, isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const { isDemo } = useFeatureAccess();

  // Unified animation hook - fade-in for Compare mode
  const { animatedStyle } = useMessageBubbleAnimation({
    type: 'fade-in',
    isNew: true,
  });

  // Hook for streaming messages
  const {
    content: streamingContent,
    isStreaming,
    error: streamingError
  } = useStreamingMessage(message.id);

  // Determine what content to display
  const displayContent = useMemo(() => {
    if (streamingError) {
      // If there's an error, show original content or error message
      return streamingContent || message.content || 'Error loading message';
    } else if (isStreaming && streamingContent) {
      // Use streaming content while streaming
      return streamingContent;
    }
    return message.content;
  }, [message.content, streamingContent, streamingError, isStreaming]);

  // Process message content to add citation links
  const processedContent = useMemo(() => {
    if (message.metadata?.citations && message.metadata.citations.length > 0) {
      return processMessageContentWithCitations(displayContent, message.metadata.citations);
    }
    return displayContent;
  }, [displayContent, message.metadata?.citations]);

  // Process markdown content
  const markdownContent = useMemo(() => {
    return sanitizeMarkdown(processedContent, { showWarning: false });
  }, [processedContent]);

  // Check if content needs lazy rendering
  const isLongContent = useMemo(() => {
    return shouldLazyRender(markdownContent);
  }, [markdownContent]);

  // Create markdown styles
  const markdownStyles = useMemo(() => createMarkdownStyles(theme, isDark), [theme, isDark]);
  
  const resolvedPalette = useMemo(() => {
    if (brandPalette) {
      return brandPalette;
    }
    return getBrandPalette(message.metadata?.providerId, providerName || message.sender);
  }, [brandPalette, message.metadata?.providerId, providerName, message.sender]);

  // Theme-aware accent so near-monochrome palettes (e.g. Grok) stay visible
  // against a dark surface instead of collapsing into the background.
  const brandAccent = resolvedPalette
    ? getReadableBrandAccent(resolvedPalette, isDark)
    : null;

  const bubbleStyle = isDark
    ? {
        backgroundColor: theme.colors.surface,
        borderColor: brandAccent || theme.colors.border,
      }
    : {
        backgroundColor: resolvedPalette ? resolvedPalette[50] : theme.colors.card,
        borderColor: brandAccent || theme.colors.border,
      };

  const headerColor = brandAccent || theme.colors.text.secondary;

  const copyButtonFill = isDark
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)';

  const copyIconColor = theme.colors.text.primary;

  // Check for image attachments
  const imageAttachments = useMemo(() => {
    return (message.attachments || []).filter(a => a.type === 'image');
  }, [message.attachments]);

  // Create a mock AI config for CompareImageDisplay
  const aiConfig: AIConfig = useMemo(() => ({
    id: message.metadata?.providerId || message.sender,
    name: providerName || message.sender,
    provider: (message.metadata?.providerId || 'unknown') as AIConfig['provider'],
    model: (message.metadata?.modelUsed || 'unknown') as string,
    color: brandAccent || '#666',
  }), [message, providerName, brandAccent]);

  // Get brand color for citation preview
  const citationBrandColor = brandAccent || undefined;
  const { handleCitationLinkPress } = useCitationInteractions(citationBrandColor);

  // Handle link press - check if it's a citation first
  const handleLinkPress = useCallback((url: string): boolean => {
    return handleCitationLinkPress(url, message.metadata?.citations);
  }, [handleCitationLinkPress, message.metadata?.citations]);

  return (
    <Animated.View style={[
      styles.row,
      side === 'left' ? styles.alignStart : styles.alignEnd,
      animatedStyle,
    ]}>
      <View style={styles.stack}>
        <View style={[styles.container, bubbleStyle]}>
        {isDemo && (
          <View style={{ position: 'absolute', top: 6, left: 6, transform: [{ rotate: '-18deg' }], pointerEvents: 'none' }}>
            <Typography variant="caption" style={{ fontSize: 18, fontWeight: '800', letterSpacing: 1, color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              DEMO
            </Typography>
          </View>
        )}
        <View style={styles.header}>
          <Typography
            variant="caption"
            weight="semibold"
            style={{ color: headerColor }}
          >
            {message.sender}
          </Typography>
        </View>
        {isStreaming && !streamingContent && (
          // Nothing has arrived yet — say what the AI is doing instead of an
          // empty bubble (search retrieval can take a while).
          <View style={styles.streamingStatusRow}>
            <StreamingIndicator visible variant="dots" color={headerColor} size={12} />
            <Typography variant="caption" color="secondary">
              {supportsWebSearch(message.metadata?.providerId || '', message.metadata?.modelUsed || '')
                ? 'Searching the web…'
                : 'Thinking…'}
            </Typography>
          </View>
        )}
        {isLongContent ? (
          <LazyMarkdownRenderer
            content={markdownContent}
            style={markdownStyles}
            onLinkPress={handleLinkPress}
            rules={{
              ...selectableMarkdownRules,
              // Custom image renderer
              image: (node: { key?: string; attributes?: { src?: string; href?: string; alt?: string } }) => {
                const src: string | undefined = node?.attributes?.src || node?.attributes?.href;
                const alt: string | undefined = node?.attributes?.alt;
                if (!src) return null;
                return (
                  <View key={node?.key || `img_${Math.random()}`} style={{ marginVertical: 8 }}>
                    <Image
                      source={{ uri: src }}
                      style={{ width: '100%', height: 180, borderRadius: 8 }}
                      resizeMode="cover"
                      accessible
                      accessibilityLabel={alt || 'image'}
                    />
                  </View>
                );
              },
            }}
          />
        ) : (
          <Markdown
            style={markdownStyles}
            onLinkPress={handleLinkPress}
            rules={{
              ...selectableMarkdownRules,
              // Custom image renderer
              image: (node: { key?: string; attributes?: { src?: string; href?: string; alt?: string } }) => {
                const src: string | undefined = node?.attributes?.src || node?.attributes?.href;
                const alt: string | undefined = node?.attributes?.alt;
                if (!src) return null;
                return (
                  <View key={node?.key || `img_${Math.random()}`} style={{ marginVertical: 8 }}>
                    <Image
                      source={{ uri: src }}
                      style={{ width: '100%', height: 180, borderRadius: 8 }}
                      resizeMode="cover"
                      accessible
                      accessibilityLabel={alt || 'image'}
                    />
                  </View>
                );
              },
            }}
          >
            {markdownContent}
          </Markdown>
        )}
        {/* Image Attachments */}
        {imageAttachments.length > 0 && onOpenLightbox && (
          <View style={styles.imageAttachments}>
            {imageAttachments.map((attachment, idx) => (
              <CompareImageDisplay
                key={`${attachment.uri}-${idx}`}
                ai={aiConfig}
                side={side}
                uri={attachment.uri}
                mimeType={attachment.mimeType}
                timestamp={message.timestamp}
                onOpenLightbox={onOpenLightbox}
                brandPalette={resolvedPalette}
              />
            ))}
          </View>
        )}
        {/* Copy button */}
        <TouchableOpacity
          onPress={async () => {
            try {
              await Clipboard.setStringAsync(displayContent || '');
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              void 0;
            }
          }}
          accessibilityLabel="Copy message"
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={[
            styles.copyButton,
            { backgroundColor: copyButtonFill },
          ]}
        >
          <Ionicons
            name={copied ? 'checkmark-outline' : 'copy-outline'}
            size={16}
            color={copyIconColor}
          />
        </TouchableOpacity>
        </View>
        <CitationSources
          citations={message.metadata?.citations}
          initialVisible={3}
          brandColor={citationBrandColor}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    width: '100%',
    paddingHorizontal: 8,
    flexDirection: 'row',
  },
  alignStart: {
    justifyContent: 'flex-start',
  },
  alignEnd: {
    justifyContent: 'flex-end',
  },
  stack: {
    width: '100%',
  },
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10, // Compact padding
    width: '100%', // Use full width available
    position: 'relative',
  },
  header: {
    marginBottom: 4,
  },
  streamingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  content: {
    lineHeight: 20,
  },
  imageAttachments: {
    marginTop: 8,
  },
  copyButton: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    borderRadius: 12,
    padding: 6,
  },
});
