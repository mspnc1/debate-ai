import { MessageAttachment } from '../types';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

// Maximum dimensions for Claude API (will be auto-resized if larger)
const MAX_IMAGE_DIMENSION = 1568;
const MAX_FILE_SIZE = 3.75 * 1024 * 1024; // 3.75 MB in bytes

// Supported MIME types for Claude API
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif', // Non-animated only
  'image/webp',
];

export interface ProcessedImage {
  base64: string;
  mimeType: string;
  fileSize: number;
  fileName?: string;
  wasResized: boolean;
}

/**
 * Validates if the image format is supported by Claude API
 */
export const isImageFormatSupported = (mimeType: string): boolean => {
  return SUPPORTED_MIME_TYPES.includes(mimeType.toLowerCase());
};

/**
 * Converts a file URI to base64 string
 */
export const fileUriToBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw new Error('Failed to convert image to base64');
  }
};

/**
 * Gets file information including size
 */
export const getFileInfo = async (uri: string): Promise<{ size: number; exists: true; uri: string }> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }
    // Type assertion for file with size property
    return fileInfo as { size: number; exists: true; uri: string };
  } catch (error) {
    console.error('Error getting file info:', error);
    throw new Error('Failed to get file information');
  }
};

/**
 * Resizes an image if it exceeds maximum dimensions
 */
export const resizeImageIfNeeded = async (
  uri: string,
  mimeType: string
): Promise<{ uri: string; wasResized: boolean }> => {
  try {
    // Get image dimensions
    const imageInfo = await ImageManipulator.manipulateAsync(uri, [], {
      base64: false,
    });
    
    const { width, height } = imageInfo;
    const maxDimension = Math.max(width, height);
    
    // Check if resize is needed
    if (maxDimension <= MAX_IMAGE_DIMENSION) {
      return { uri, wasResized: false };
    }
    
    // Calculate new dimensions maintaining aspect ratio
    const scale = MAX_IMAGE_DIMENSION / maxDimension;
    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);
    
    // Resize the image
    const resizedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: newWidth, height: newHeight } }],
      {
        compress: 0.9,
        format: mimeType === 'image/png' 
          ? ImageManipulator.SaveFormat.PNG 
          : ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    return { uri: resizedImage.uri, wasResized: true };
  } catch (error) {
    console.error('Error resizing image:', error);
    // Return original if resize fails
    return { uri, wasResized: false };
  }
};

/**
 * Validates image size
 */
export const validateImageSize = async (uri: string): Promise<boolean> => {
  try {
    const fileInfo = await getFileInfo(uri);
    return fileInfo.size <= MAX_FILE_SIZE;
  } catch (error) {
    console.error('Error validating image size:', error);
    return false;
  }
};

/**
 * Processes an image for Claude API
 * - Validates format
 * - Resizes if needed
 * - Converts to base64
 * - Validates file size
 */
export const processImageForClaude = async (
  uri: string,
  mimeType: string,
  fileName?: string
): Promise<ProcessedImage> => {
  // Validate format
  if (!isImageFormatSupported(mimeType)) {
    throw new Error(`Unsupported image format: ${mimeType}`);
  }
  
  // Resize if needed
  const { uri: processedUri, wasResized } = await resizeImageIfNeeded(uri, mimeType);
  
  // Validate file size
  const fileInfo = await getFileInfo(processedUri);
  if (fileInfo.size > MAX_FILE_SIZE) {
    throw new Error(`Image file too large: ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB (max: 3.75MB)`);
  }
  
  // Convert to base64
  const base64 = await fileUriToBase64(processedUri);
  
  return {
    base64,
    mimeType,
    fileSize: fileInfo.size,
    fileName,
    wasResized,
  };
};

/**
 * Processes multiple images for Claude API
 * Maximum 20 images per request
 */
export const processMultipleImagesForClaude = async (
  attachments: MessageAttachment[]
): Promise<ProcessedImage[]> => {
  if (attachments.length > 20) {
    throw new Error('Maximum 20 images allowed per message');
  }
  
  const processedImages = await Promise.all(
    attachments
      .filter(att => att.type === 'image')
      .map(att => processImageForClaude(att.uri, att.mimeType, att.fileName))
  );
  
  return processedImages;
};

/**
 * Formats image attachments for Claude API message format
 */
export const formatImagesForClaudeMessage = (
  images: ProcessedImage[],
  textContent: string
): Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }> => {
  const content: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }> = [];
  
  // Add images first
  images.forEach(image => {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mimeType,
        data: image.base64,
      },
    });
  });
  
  // Add text content
  if (textContent) {
    content.push({
      type: 'text',
      text: textContent,
    });
  }
  
  return content;
};

/**
 * Gets a human-readable file size
 */
export const getReadableFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};