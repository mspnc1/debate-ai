import * as FileSystem from 'expo-file-system/legacy';
import { getMediaExtension, parseDataUri } from '@/services/media/mediaFileCache';

const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
const normalizedBaseDirectory = baseDirectory.endsWith('/') ? baseDirectory : `${baseDirectory}/`;
const DEBATE_AUDIO_ROOT_DIR = `${normalizedBaseDirectory}debate-audio/`;

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function ensureDirectory(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export function getDebateAudioSessionDirectory(sessionId: string): string {
  return `${DEBATE_AUDIO_ROOT_DIR}${sanitizePathSegment(sessionId)}/`;
}

export async function persistDebateAudioDataUri(
  dataUri: string,
  opts: { sessionId: string; messageId: string; fallbackMimeType: string }
): Promise<{ uri: string; mimeType: string; fileName: string }> {
  const parsed = parseDataUri(dataUri);
  if (!parsed) {
    throw new Error('Invalid debate audio data URI');
  }

  const mimeType = parsed.mimeType || opts.fallbackMimeType;
  const sessionDirectory = getDebateAudioSessionDirectory(opts.sessionId);
  await ensureDirectory(sessionDirectory);

  const ext = getMediaExtension(mimeType, 'audio');
  const fileName = `${sanitizePathSegment(opts.messageId)}.${ext}`;
  const uri = `${sessionDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, parsed.base64, { encoding: FileSystem.EncodingType.Base64 });
  return { uri, mimeType, fileName };
}

export async function deleteDebateAudioForSession(sessionId: string): Promise<void> {
  if (!DEBATE_AUDIO_ROOT_DIR || !sessionId) return;
  try {
    await FileSystem.deleteAsync(getDebateAudioSessionDirectory(sessionId), { idempotent: true });
  } catch {
    // Best-effort cleanup only.
  }
}

export async function deleteAllDebateAudio(): Promise<void> {
  if (!DEBATE_AUDIO_ROOT_DIR) return;
  try {
    await FileSystem.deleteAsync(DEBATE_AUDIO_ROOT_DIR, { idempotent: true });
  } catch {
    // Best-effort cleanup only.
  }
}
