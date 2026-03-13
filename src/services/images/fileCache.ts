import * as FileSystem from 'expo-file-system/legacy';

type ImageStorageLocation = 'cache' | 'document';

function normalizeImageUri(uri: string): string {
  const trimmed = uri.trim();
  const optionalWrappedMatch = trimmed.match(/^Optional\((['"])(.*)\1\)$/);
  if (optionalWrappedMatch) {
    return optionalWrappedMatch[2];
  }

  const quotedMatch = trimmed.match(/^(['"])(.*)\1$/);
  if (quotedMatch) {
    return quotedMatch[2];
  }

  return trimmed;
}

function getWritableBaseDirectory(location: ImageStorageLocation): string {
  const baseDirectory = location === 'document'
    ? (FileSystem.documentDirectory || FileSystem.cacheDirectory)
    : (FileSystem.cacheDirectory || FileSystem.documentDirectory);

  if (!baseDirectory) {
    throw new Error('No writable filesystem directory is available.');
  }

  return baseDirectory;
}

function getImagesDirectory(location: ImageStorageLocation): string {
  return getWritableBaseDirectory(location) + 'images/';
}

function getExtensionForMimeType(mimeType: string): string {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

function inferExtensionFromUri(uri: string): string {
  const normalizedUri = uri.split('?')[0].toLowerCase();
  if (normalizedUri.endsWith('.jpg') || normalizedUri.endsWith('.jpeg')) return 'jpg';
  if (normalizedUri.endsWith('.webp')) return 'webp';
  return 'png';
}

function buildImagePath(location: ImageStorageLocation, extension: string, prefix = 'image'): string {
  return `${getImagesDirectory(location)}${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
}

async function ensureDirectoryExists(dir: string): Promise<void> {
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // ignore
  }
}

export function isRemoteImageUri(uri: string): boolean {
  return /^https?:\/\//i.test(normalizeImageUri(uri));
}

export function isDataImageUri(uri: string): boolean {
  return normalizeImageUri(uri).startsWith('data:');
}

export function isFileSystemImageUri(uri: string): boolean {
  return !isRemoteImageUri(uri) && !isDataImageUri(uri);
}

export function isDocumentImageUri(uri: string): boolean {
  const normalizedUri = normalizeImageUri(uri);
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) {
    return false;
  }

  return normalizedUri.startsWith(documentDirectory);
}

export function getImageMimeType(uri: string): string {
  const normalizedUri = normalizeImageUri(uri).split('?')[0].toLowerCase();
  if (normalizedUri.endsWith('.jpg') || normalizedUri.endsWith('.jpeg')) return 'image/jpeg';
  if (normalizedUri.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

export function getImageShareUti(uri: string): string {
  const mimeType = getImageMimeType(uri);
  if (mimeType === 'image/jpeg') return 'public.jpeg';
  if (mimeType === 'image/png') return 'public.png';
  return 'public.image';
}

export async function saveBase64Image(
  b64: string,
  mimeType: string,
  options?: { location?: ImageStorageLocation; prefix?: string }
): Promise<string> {
  const location = options?.location || 'document';
  const dir = getImagesDirectory(location);
  await ensureDirectoryExists(dir);

  const ext = getExtensionForMimeType(mimeType);
  const path = buildImagePath(location, ext, options?.prefix || 'image');
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
  return path;
}

export async function persistImageUri(
  uri: string,
  options?: { mimeType?: string; prefix?: string }
): Promise<string | null> {
  try {
    const normalizedUri = normalizeImageUri(uri);

    if (isDataImageUri(normalizedUri)) {
      const match = normalizedUri.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return null;
      return saveBase64Image(match[2], match[1], { location: 'document', prefix: options?.prefix || 'image' });
    }

    if (isRemoteImageUri(normalizedUri)) {
      const extension = options?.mimeType
        ? getExtensionForMimeType(options.mimeType)
        : inferExtensionFromUri(normalizedUri);
      const target = buildImagePath('document', extension, options?.prefix || 'image');
      await ensureDirectoryExists(getImagesDirectory('document'));
      const result = await FileSystem.downloadAsync(normalizedUri, target);
      return result.uri;
    }

    const info = await FileSystem.getInfoAsync(normalizedUri);
    if (!info.exists) {
      return null;
    }

    const documentDir = getImagesDirectory('document');
    if (normalizedUri.startsWith(documentDir)) {
      return normalizedUri;
    }

    await ensureDirectoryExists(documentDir);
    const target = buildImagePath('document', inferExtensionFromUri(normalizedUri), options?.prefix || 'image');
    await FileSystem.copyAsync({ from: normalizedUri, to: target });
    return target;
  } catch (error) {
    console.warn('[fileCache] Failed to persist image URI:', error);
    return null;
  }
}

/**
 * Load base64 data from a file URI (for img2img refinement)
 * @param fileUri - The file:// URI or cache path of the image
 * @returns Base64 string of the image, or null if loading fails
 */
export async function loadBase64FromFileUri(fileUri: string): Promise<string | null> {
  try {
    const normalizedUri = normalizeImageUri(fileUri);

    // Handle data URIs - extract base64 directly
    if (normalizedUri.startsWith('data:')) {
      const match = normalizedUri.match(/^data:[^;]+;base64,(.+)$/);
      return match ? match[1] : null;
    }

    const readableUri = isRemoteImageUri(normalizedUri)
      ? await persistImageUri(normalizedUri, { prefix: 'refine-source' })
      : normalizedUri;

    if (!readableUri) {
      console.warn('[fileCache] Could not resolve image URI:', normalizedUri);
      return null;
    }

    // Check if file exists
    const info = await FileSystem.getInfoAsync(readableUri);
    if (!info.exists) {
      console.warn('[fileCache] File not found:', readableUri);
      return null;
    }

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(readableUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return base64;
  } catch (error) {
    console.warn('[fileCache] Failed to load base64 from file:', error);
    return null;
  }
}
