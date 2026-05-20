import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const RUNWAY_SOURCE_IMAGE_MAX_DATA_URI_BYTES = 4_500_000;
const SUPPORTED_DATA_URI = /^data:image\/(?:png|jpeg|jpg|webp);base64,/i;

export interface RunwaySourceImagePreparationResult {
  sourceImage: string;
  originalBytes: number;
  optimizedBytes: number;
  wasOptimized: boolean;
}

function byteLength(text: string): number {
  return new Blob([text]).size;
}

function getMimeTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function dataUriFromBase64(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

async function readUriAsDataUri(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  if (/^https?:\/\//i.test(uri)) return uri;

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return dataUriFromBase64(base64, getMimeTypeFromUri(uri));
}

async function manipulateToDataUri(
  uri: string,
  width: number,
  compress: number
): Promise<string | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width } }],
      {
        compress,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );
    return result.base64 ? dataUriFromBase64(result.base64, 'image/jpeg') : null;
  } catch {
    return null;
  }
}

export async function prepareRunwaySourceImage(sourceImageUri: string): Promise<RunwaySourceImagePreparationResult> {
  const sourceImage = await readUriAsDataUri(sourceImageUri);
  const originalBytes = byteLength(sourceImage);

  if (/^https?:\/\//i.test(sourceImage)) {
    return {
      sourceImage,
      originalBytes,
      optimizedBytes: originalBytes,
      wasOptimized: false,
    };
  }

  if (!SUPPORTED_DATA_URI.test(sourceImage)) {
    throw new Error('Runway source images must be PNG, JPG, or WebP.');
  }

  if (originalBytes <= RUNWAY_SOURCE_IMAGE_MAX_DATA_URI_BYTES) {
    return {
      sourceImage,
      originalBytes,
      optimizedBytes: originalBytes,
      wasOptimized: false,
    };
  }

  const candidateWidths = [2048, 1600, 1280, 1024, 768, 640];
  const candidateQualities = [0.85, 0.75, 0.65, 0.55, 0.45];
  let smallestCandidate = sourceImage;
  let smallestBytes = originalBytes;

  for (const width of candidateWidths) {
    for (const quality of candidateQualities) {
      const candidate = await manipulateToDataUri(sourceImageUri, width, quality);
      if (!candidate) continue;

      const candidateBytes = byteLength(candidate);
      if (candidateBytes < smallestBytes) {
        smallestCandidate = candidate;
        smallestBytes = candidateBytes;
      }

      if (candidateBytes <= RUNWAY_SOURCE_IMAGE_MAX_DATA_URI_BYTES) {
        return {
          sourceImage: candidate,
          originalBytes,
          optimizedBytes: candidateBytes,
          wasOptimized: true,
        };
      }
    }
  }

  if (smallestBytes > RUNWAY_SOURCE_IMAGE_MAX_DATA_URI_BYTES) {
    throw new Error('Source image is too large for Runway. Choose a smaller image or crop it first.');
  }

  return {
    sourceImage: smallestCandidate,
    originalBytes,
    optimizedBytes: smallestBytes,
    wasOptimized: true,
  };
}
