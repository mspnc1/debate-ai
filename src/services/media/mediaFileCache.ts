import * as FileSystem from 'expo-file-system/legacy';
import type { CreateMediaType } from '@/types/media';

const MEDIA_CACHE_DIR = `${FileSystem.cacheDirectory || ''}create-media/`;

export function getMediaExtension(mimeType: string, fallback: CreateMediaType): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('quicktime')) return 'mov';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('opus')) return 'opus';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  return fallback === 'video' ? 'mp4' : 'mp3';
}

export function getMediaShareUti(mimeType: string): string | undefined {
  const ext = getMediaExtension(mimeType, mimeType.startsWith('video/') ? 'video' : 'audio');
  switch (ext) {
    case 'mp4':
      return 'public.mpeg-4';
    case 'mov':
      return 'com.apple.quicktime-movie';
    case 'wav':
      return 'com.microsoft.waveform-audio';
    case 'mp3':
      return 'public.mp3';
    default:
      return undefined;
  }
}

export function parseDataUri(dataUri: string): { mimeType: string; base64: string } | null {
  const match = dataUri.match(/^data:([^;,]+);base64,(.*)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64: match[2],
  };
}

async function ensureMediaCacheDir(): Promise<void> {
  if (!MEDIA_CACHE_DIR) return;
  const info = await FileSystem.getInfoAsync(MEDIA_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_CACHE_DIR, { intermediates: true });
  }
}

export async function persistMediaBase64(
  base64: string,
  opts: { id: string; mediaType: CreateMediaType; mimeType: string }
): Promise<string> {
  await ensureMediaCacheDir();
  const ext = getMediaExtension(opts.mimeType, opts.mediaType);
  const target = `${MEDIA_CACHE_DIR}${opts.id}.${ext}`;
  await FileSystem.writeAsStringAsync(target, base64, { encoding: FileSystem.EncodingType.Base64 });
  return target;
}

export async function persistMediaDataUri(
  dataUri: string,
  opts: { id: string; mediaType: CreateMediaType; fallbackMimeType: string }
): Promise<{ uri: string; mimeType: string }> {
  const parsed = parseDataUri(dataUri);
  if (!parsed) {
    throw new Error('Invalid generated media data URI');
  }
  const uri = await persistMediaBase64(parsed.base64, {
    id: opts.id,
    mediaType: opts.mediaType,
    mimeType: parsed.mimeType || opts.fallbackMimeType,
  });
  return { uri, mimeType: parsed.mimeType || opts.fallbackMimeType };
}

export async function persistRemoteMedia(
  url: string,
  opts: { id: string; mediaType: CreateMediaType; mimeType: string }
): Promise<string> {
  await ensureMediaCacheDir();
  const ext = getMediaExtension(opts.mimeType, opts.mediaType);
  const target = `${MEDIA_CACHE_DIR}${opts.id}.${ext}`;
  const result = await FileSystem.downloadAsync(url, target);
  return result.uri;
}

export async function deleteMediaFile(uri?: string): Promise<void> {
  if (!uri || !uri.startsWith('file:')) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort cache cleanup.
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let index = 0;

  for (; index + 2 < bytes.length; index += 3) {
    output += alphabet[bytes[index] >> 2];
    output += alphabet[((bytes[index] & 3) << 4) | (bytes[index + 1] >> 4)];
    output += alphabet[((bytes[index + 1] & 15) << 2) | (bytes[index + 2] >> 6)];
    output += alphabet[bytes[index + 2] & 63];
  }

  if (index < bytes.length) {
    output += alphabet[bytes[index] >> 2];
    if (index + 1 < bytes.length) {
      output += alphabet[((bytes[index] & 3) << 4) | (bytes[index + 1] >> 4)];
      output += alphabet[(bytes[index + 1] & 15) << 2];
      output += '=';
    } else {
      output += alphabet[(bytes[index] & 3) << 4];
      output += '==';
    }
  }

  return output;
}
