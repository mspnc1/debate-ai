import type { Message } from '@/types';
import type { GalleryAsset, GeneratedMediaEntry } from '@/store/createSlice';
import type {
  GeneratedContentReportContentType,
  GeneratedContentReportMetadataValue,
  GeneratedContentReportSurface,
  GeneratedContentReportTarget,
} from '@/services/reports/GeneratedContentReportService';

const TEXT_EXCERPT_LIMIT = 2400;
const PROMPT_EXCERPT_LIMIT = 1600;

function truncate(value: string | undefined, limit: number): string | undefined {
  if (!value) return undefined;
  const sanitized = value
    .replace(/data:[^;\s]+;base64,[A-Za-z0-9+/=]+/g, '[base64 omitted]')
    .trim();
  if (!sanitized) return undefined;
  return sanitized.length > limit ? `${sanitized.slice(0, limit)}...` : sanitized;
}

function getMessageContentType(message: Message): GeneratedContentReportContentType {
  const attachments = message.attachments || [];
  if (attachments.some((attachment) => attachment.type === 'image')) return 'image';
  if (attachments.some((attachment) => attachment.type === 'video')) return 'video';
  if (attachments.some((attachment) => attachment.type === 'audio')) return 'audio';
  if (attachments.length > 1) return 'mixed';
  return message.content ? 'text' : 'unknown';
}

function compactMetadata(
  entries: Record<string, GeneratedContentReportMetadataValue | undefined>
): Record<string, GeneratedContentReportMetadataValue> | undefined {
  const result: Record<string, GeneratedContentReportMetadataValue> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function buildMessageReportTarget(
  message: Message,
  surface: Extract<GeneratedContentReportSurface, 'chat' | 'compare' | 'debate'>,
  sessionId?: string
): GeneratedContentReportTarget {
  const generatedImage = message.metadata?.generatedImage;
  const debateInterstitial = message.metadata?.debateInterstitial;
  const contentType = getMessageContentType(message);
  const providerId = generatedImage?.providerId || message.metadata?.providerId;
  const modelId = generatedImage?.model || message.metadata?.modelUsed;
  const prompt = generatedImage?.prompt;
  const surfaceLabel = surface === 'debate'
    ? 'Debate'
    : surface === 'compare'
      ? 'Compare'
      : 'Chat';

  return {
    surface,
    contentType,
    contentId: message.id,
    sessionId: message.metadata?.sessionId || sessionId,
    title: `${surfaceLabel} ${contentType} from ${message.sender}`,
    prompt: truncate(prompt, PROMPT_EXCERPT_LIMIT),
    contentText: contentType === 'text' || contentType === 'mixed'
      ? truncate(message.content, TEXT_EXCERPT_LIMIT)
      : undefined,
    providerId,
    modelId,
    metadata: compactMetadata({
      sender: message.sender,
      senderType: message.senderType,
      attachmentCount: message.attachments?.length || 0,
      hasCitations: Boolean(message.metadata?.citations?.length),
      debateInterstitialKind: debateInterstitial?.kind,
      debateInterstitialLabel: debateInterstitial?.label,
      debateAudioStatus: message.metadata?.debateAudio?.status,
    }),
  };
}

export function buildGalleryAssetReportTarget(asset: GalleryAsset): GeneratedContentReportTarget {
  const mediaEntry = asset.source === 'media' ? asset.entry as GeneratedMediaEntry : undefined;

  return {
    surface: 'create',
    contentType: asset.type,
    contentId: asset.id,
    title: `${asset.type[0].toUpperCase()}${asset.type.slice(1)} generated with ${asset.providerId}`,
    prompt: truncate(asset.prompt || asset.originalPrompt, PROMPT_EXCERPT_LIMIT),
    providerId: asset.providerId,
    modelId: asset.modelId,
    metadata: compactMetadata({
      operation: asset.operation,
      status: asset.status,
      mimeType: asset.mimeType,
      durationSeconds: asset.durationSeconds,
      isRefinement: asset.isRefinement,
      isUploaded: asset.isUploaded,
      hasRemoteUrl: Boolean(mediaEntry?.remoteUrl),
      hasVoicePack: Boolean(mediaEntry?.voicePack),
    }),
  };
}
