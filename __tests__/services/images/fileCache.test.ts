jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  documentDirectory: '/documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  downloadAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

import * as FileSystem from 'expo-file-system/legacy';
import {
  loadBase64FromFileUri,
  persistImageUri,
  saveBase64Image,
} from '@/services/images/fileCache';

const mockGetInfoAsync = FileSystem.getInfoAsync as jest.Mock;
const mockMakeDirectoryAsync = FileSystem.makeDirectoryAsync as jest.Mock;
const mockWriteAsStringAsync = FileSystem.writeAsStringAsync as jest.Mock;
const mockReadAsStringAsync = FileSystem.readAsStringAsync as jest.Mock;
const mockCopyAsync = FileSystem.copyAsync as jest.Mock;
const mockDownloadAsync = FileSystem.downloadAsync as jest.Mock;

describe('fileCache.saveBase64Image', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    mockGetInfoAsync.mockResolvedValue({ exists: true });
    mockMakeDirectoryAsync.mockResolvedValue(undefined);
    mockWriteAsStringAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates directory when missing and returns png path by default', async () => {
    const path = await saveBase64Image('YmFzZTY0', 'image/png');

    expect(mockMakeDirectoryAsync).toHaveBeenCalledWith('/documents/images/', { intermediates: true });
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      '/documents/images/image_1700000000000_4fzzzxjylrx.png',
      'YmFzZTY0',
      { encoding: FileSystem.EncodingType.Base64 }
    );
    expect(path).toBe('/documents/images/image_1700000000000_4fzzzxjylrx.png');
  });

  it('uses jpg extension when mime suggests jpeg', async () => {
    const path = await saveBase64Image('YmFzZTY0', 'image/jpeg');
    expect(path.endsWith('.jpg')).toBe(true);
  });

  it('uses webp extension when mime suggests webp', async () => {
    const path = await saveBase64Image('YmFzZTY0', 'image/webp');
    expect(path.endsWith('.webp')).toBe(true);
  });

  it('ignores directory errors but still writes file', async () => {
    mockMakeDirectoryAsync.mockRejectedValueOnce(new Error('fs error'));

    const path = await saveBase64Image('YmFzZTY0', 'image/png');

    expect(mockWriteAsStringAsync).toHaveBeenCalled();
    expect(path).toContain('/documents/images/');
  });

  it('supports cache storage for temporary files', async () => {
    const path = await saveBase64Image('YmFzZTY0', 'image/png', { location: 'cache', prefix: 'tmp' });
    expect(path).toContain('/cache/images/tmp_');
  });
});

describe('fileCache.persistImageUri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    mockGetInfoAsync.mockResolvedValue({ exists: true });
    mockMakeDirectoryAsync.mockResolvedValue(undefined);
    mockWriteAsStringAsync.mockResolvedValue(undefined);
    mockCopyAsync.mockResolvedValue(undefined);
    mockDownloadAsync.mockResolvedValue({ uri: '/documents/images/image_1700000000000_4fzzzxjylrx.png' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('downloads remote images into durable storage', async () => {
    const result = await persistImageUri('https://example.com/test.png');

    expect(mockDownloadAsync).toHaveBeenCalledWith(
      'https://example.com/test.png',
      '/documents/images/image_1700000000000_4fzzzxjylrx.png'
    );
    expect(result).toBe('/documents/images/image_1700000000000_4fzzzxjylrx.png');
  });

  it('copies local cache files into document storage', async () => {
    const result = await persistImageUri('/cache/images/test.png');

    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: '/cache/images/test.png',
      to: '/documents/images/image_1700000000000_4fzzzxjylrx.png',
    });
    expect(result).toBe('/documents/images/image_1700000000000_4fzzzxjylrx.png');
  });

  it('returns existing document URIs unchanged', async () => {
    const result = await persistImageUri('/documents/images/existing.png');
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(result).toBe('/documents/images/existing.png');
  });

  it('persists data URIs into document storage', async () => {
    const result = await persistImageUri('data:image/png;base64,YWJjZA==');

    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      '/documents/images/image_1700000000000_4fzzzxjylrx.png',
      'YWJjZA==',
      { encoding: FileSystem.EncodingType.Base64 }
    );
    expect(result).toBe('/documents/images/image_1700000000000_4fzzzxjylrx.png');
  });

  it('returns null when the local file no longer exists', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false });
    const result = await persistImageUri('/cache/images/missing.png');
    expect(result).toBeNull();
  });
});

describe('fileCache.loadBase64FromFileUri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    mockGetInfoAsync.mockResolvedValue({ exists: true });
    mockMakeDirectoryAsync.mockResolvedValue(undefined);
    mockDownloadAsync.mockResolvedValue({ uri: '/documents/images/refine-source_1700000000000_4fzzzxjylrx.png' });
    mockReadAsStringAsync.mockResolvedValue('aGVsbG8gd29ybGQ=');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extracts base64 from data URI directly', async () => {
    const dataUri = 'data:image/png;base64,aGVsbG8gd29ybGQ=';

    const result = await loadBase64FromFileUri(dataUri);

    expect(result).toBe('aGVsbG8gd29ybGQ=');
    expect(mockGetInfoAsync).not.toHaveBeenCalled();
    expect(mockReadAsStringAsync).not.toHaveBeenCalled();
  });

  it('returns null for malformed data URI', async () => {
    const badDataUri = 'data:image/png,notbase64';

    const result = await loadBase64FromFileUri(badDataUri);

    expect(result).toBeNull();
  });

  it('reads file and returns base64 for file URI', async () => {
    const fileUri = '/cache/images/test.png';
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce('YmFzZTY0ZGF0YQ==');

    const result = await loadBase64FromFileUri(fileUri);

    expect(mockGetInfoAsync).toHaveBeenCalledWith(fileUri);
    expect(mockReadAsStringAsync).toHaveBeenCalledWith(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    expect(result).toBe('YmFzZTY0ZGF0YQ==');
  });

  it('downloads remote images before reading base64 for refinement', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce('cmVtb3RlLWJhc2U2NA==');

    const result = await loadBase64FromFileUri('https://example.com/test.png');

    expect(mockDownloadAsync).toHaveBeenCalledWith(
      'https://example.com/test.png',
      '/documents/images/refine-source_1700000000000_4fzzzxjylrx.png'
    );
    expect(mockReadAsStringAsync).toHaveBeenCalledWith(
      '/documents/images/refine-source_1700000000000_4fzzzxjylrx.png',
      { encoding: FileSystem.EncodingType.Base64 }
    );
    expect(result).toBe('cmVtb3RlLWJhc2U2NA==');
  });

  it('normalizes Optional-wrapped remote URIs before reading base64', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockResolvedValueOnce('b3B0aW9uYWw=');

    const result = await loadBase64FromFileUri('Optional("https://example.com/test.png")');

    expect(mockDownloadAsync).toHaveBeenCalledWith(
      'https://example.com/test.png',
      '/documents/images/refine-source_1700000000000_4fzzzxjylrx.png'
    );
    expect(result).toBe('b3B0aW9uYWw=');
  });

  it('returns null when file does not exist', async () => {
    const fileUri = '/cache/images/nonexistent.png';
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false });

    const result = await loadBase64FromFileUri(fileUri);

    expect(result).toBeNull();
    expect(mockReadAsStringAsync).not.toHaveBeenCalled();
  });

  it('returns null and logs warning when read fails', async () => {
    const fileUri = '/cache/images/test.png';
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });
    mockReadAsStringAsync.mockRejectedValueOnce(new Error('Read error'));

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await loadBase64FromFileUri(fileUri);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[fileCache] Failed to load base64 from file:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it('returns null and logs warning when getInfoAsync fails', async () => {
    const fileUri = '/cache/images/test.png';
    mockGetInfoAsync.mockRejectedValueOnce(new Error('Info error'));

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const result = await loadBase64FromFileUri(fileUri);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
