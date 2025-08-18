/**
 * Document processing utilities for Claude API
 */

import { MessageAttachment } from '../types';

/**
 * Supported document types for Claude
 */
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'application/json',
  'application/xml',
  'text/xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
];

/**
 * Maximum file size for documents (5MB for Claude)
 */
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Check if a MIME type is a supported document type
 */
export function isSupportedDocumentType(mimeType: string): boolean {
  return SUPPORTED_DOCUMENT_TYPES.includes(mimeType);
}

/**
 * Check if a MIME type is an image type
 */
export function isSupportedImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/') && [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ].includes(mimeType);
}

/**
 * Validate document size
 */
export function validateDocumentSize(fileSize: number): { valid: boolean; error?: string } {
  if (fileSize > MAX_DOCUMENT_SIZE) {
    return {
      valid: false,
      error: `Document size exceeds ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB limit`,
    };
  }
  return { valid: true };
}

/**
 * Process document for Claude API
 */
export async function processDocumentForClaude(
  uri: string,
  mimeType: string,
  fileName?: string
): Promise<MessageAttachment> {
  try {
    // For documents, we'll need to read the file content
    // In React Native, we'd use the FileSystem API
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Convert to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
    
    reader.readAsDataURL(blob);
    const base64 = await base64Promise;
    
    return {
      type: 'document',
      uri,
      mimeType,
      base64,
      fileName,
      fileSize: blob.size,
    };
  } catch (error) {
    throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file extension from MIME type
 */
export function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/csv': 'csv',
    'text/html': 'html',
    'application/json': 'json',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  };
  
  return mimeToExt[mimeType] || 'file';
}

/**
 * Format attachment for display
 */
export function formatAttachmentForDisplay(attachment: MessageAttachment): string {
  if (attachment.type === 'image') {
    return `📷 Image`;
  }
  
  const ext = getFileExtensionFromMimeType(attachment.mimeType);
  const icon = getDocumentIcon(ext);
  
  if (attachment.fileName) {
    return `${icon} ${attachment.fileName}`;
  }
  
  return `${icon} ${ext.toUpperCase()} Document`;
}

/**
 * Get appropriate icon for document type
 */
export function getDocumentIcon(extension: string): string {
  const iconMap: Record<string, string> = {
    pdf: '📄',
    txt: '📝',
    md: '📝',
    csv: '📊',
    json: '📋',
    xml: '📋',
    html: '🌐',
    docx: '📄',
    xlsx: '📊',
    pptx: '📑',
  };
  
  return iconMap[extension] || '📎';
}