import * as FileSystem from 'expo-file-system/legacy';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import {
  buildCompileSessionRequest,
  compileDebateVoicePack,
  DEBATE_AUDIO_COMPILE_TIMEOUT_MS,
  DEBATE_AUDIO_CREATE_SESSION_TIMEOUT_MS,
  DEBATE_AUDIO_DOWNLOAD_TIMEOUT_MS,
  DEBATE_AUDIO_UPLOAD_TIMEOUT_MS,
} from '@/services/debate/debateAudioCompileService';
import type { DebateVoicePackManifest } from '@/types/media';

describe('debateAudioCompileService', () => {
  const manifest: DebateVoicePackManifest = {
    kind: 'debate_podcast_playlist',
    version: 1,
    sessionId: 'debate_1',
    topic: 'Resolved: testing matters.',
    participants: [{ id: 'openai', name: 'ChatGPT' }],
    clips: [
      {
        id: 'clip_1',
        messageId: 'msg_1',
        order: 0,
        speakerId: 'openai',
        speakerName: 'ChatGPT',
        speechLabel: 'Opening statement',
        textPreview: 'Opening statement.',
        uri: 'file:///packs/debate_1/001.mp3',
        mimeType: 'audio/mpeg',
        fileName: '001.mp3',
        pauseAfterMs: 900,
      },
      {
        id: 'clip_2',
        messageId: 'msg_2',
        order: 1,
        speakerId: 'google',
        speakerName: 'Gemini',
        speechLabel: 'Opening response',
        textPreview: 'Opening response.',
        uri: 'file:///packs/debate_1/002.mp3',
        mimeType: 'audio/mpeg',
        fileName: '002.mp3',
        pauseAfterMs: 900,
      },
    ],
    pauseMs: 900,
    directoryUri: 'file:///packs/debate_1/',
    createdAt: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds compile session clip metadata from local files', async () => {
    const getInfoAsync = jest.fn(async (uri: string) => ({
      exists: true,
      uri,
      size: uri.endsWith('001.mp3') ? 1024 : 2048,
      isDirectory: false,
      modificationTime: 0,
    })) as unknown as typeof FileSystem.getInfoAsync;

    await expect(buildCompileSessionRequest(manifest, getInfoAsync)).resolves.toEqual({
      topic: manifest.topic,
      clips: [
        {
          id: 'clip_1',
          fileName: '001.mp3',
          mimeType: 'audio/mpeg',
          sizeBytes: 1024,
          pauseAfterMs: 900,
        },
        {
          id: 'clip_2',
          fileName: '002.mp3',
          mimeType: 'audio/mpeg',
          sizeBytes: 2048,
          pauseAfterMs: 900,
        },
      ],
    });
  });

  it('uploads clips, compiles the pack, and downloads the single MP3', async () => {
    const getInfoAsync = jest.fn(async (uri: string) => ({
      exists: true,
      uri,
      size: 1024,
      isDirectory: false,
      modificationTime: 0,
    })) as unknown as typeof FileSystem.getInfoAsync;
    const uploadAsync = jest.fn().mockResolvedValue({ status: 200, body: '', headers: {} }) as unknown as typeof FileSystem.uploadAsync;
    const downloadAsync = jest.fn().mockResolvedValue({ uri: 'file:///packs/debate_1/compiled_job-1.mp3', status: 200, headers: {} }) as unknown as typeof FileSystem.downloadAsync;
    const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined) as unknown as typeof FileSystem.makeDirectoryAsync;
    const onStageChange = jest.fn();
    const createSession = jest.fn().mockResolvedValue({
      jobId: 'job-1',
      outputMimeType: 'audio/mpeg',
      uploadUrls: [
        {
          clipId: 'clip_1',
          uploadUrl: 'https://upload.example/clip-1',
          storagePath: 'tmp/clip-1.mp3',
          expiresAt: 2000,
          contentType: 'audio/mpeg',
        },
        {
          clipId: 'clip_2',
          uploadUrl: 'https://upload.example/clip-2',
          storagePath: 'tmp/clip-2.mp3',
          expiresAt: 2000,
          contentType: 'audio/mpeg',
        },
      ],
    });
    const compilePack = jest.fn().mockResolvedValue({
      jobId: 'job-1',
      downloadUrl: 'https://download.example/output.mp3',
      storagePath: 'tmp/output.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 4096,
      expiresAt: 3000,
    });

    await expect(compileDebateVoicePack(manifest, {
      now: () => 1500,
      getInfoAsync,
      uploadAsync,
      downloadAsync,
      makeDirectoryAsync,
      createSession,
      compilePack,
      onStageChange,
    })).resolves.toEqual({
      id: 'job-1',
      uri: 'file:///packs/debate_1/compiled_job-1.mp3',
      mimeType: 'audio/mpeg',
      fileName: 'compiled_job-1.mp3',
      createdAt: 1500,
      remoteUrl: 'https://download.example/output.mp3',
      storagePath: 'tmp/output.mp3',
      expiresAt: 3000,
    });

    expect(createSession).toHaveBeenCalledWith(expect.objectContaining({
      topic: manifest.topic,
      clips: expect.arrayContaining([
        expect.objectContaining({ id: 'clip_1', sizeBytes: 1024 }),
      ]),
    }));
    expect(uploadAsync).toHaveBeenCalledWith(
      'https://upload.example/clip-1',
      'file:///packs/debate_1/001.mp3',
      expect.objectContaining({
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        sessionType: 1,
        headers: { 'Content-Type': 'audio/mpeg' },
      })
    );
    expect(compilePack).toHaveBeenCalledWith({ jobId: 'job-1' });
    expect(makeDirectoryAsync).toHaveBeenCalledWith('file:///packs/debate_1/', { intermediates: true });
    expect(downloadAsync).toHaveBeenCalledWith(
      'https://download.example/output.mp3',
      'file:///packs/debate_1/compiled_job-1.mp3',
      { sessionType: 1 }
    );
    expect(onStageChange).toHaveBeenNthCalledWith(1, 'preparing');
    expect(onStageChange).toHaveBeenNthCalledWith(2, 'creating_session');
    expect(onStageChange).toHaveBeenNthCalledWith(3, 'uploading');
    expect(onStageChange).toHaveBeenNthCalledWith(4, 'compiling');
    expect(onStageChange).toHaveBeenNthCalledWith(5, 'downloading');
  });

  it('uses the static Firebase Functions callable path for podcast compile', async () => {
    const functions = {} as ReturnType<typeof getFunctions>;
    const createCallable = jest.fn().mockResolvedValue({
      data: {
        jobId: 'job-1',
        outputMimeType: 'audio/mpeg',
        uploadUrls: [
          {
            clipId: 'clip_1',
            uploadUrl: 'https://upload.example/clip-1',
            storagePath: 'tmp/clip-1.mp3',
            expiresAt: 2000,
            contentType: 'audio/mpeg',
          },
          {
            clipId: 'clip_2',
            uploadUrl: 'https://upload.example/clip-2',
            storagePath: 'tmp/clip-2.mp3',
            expiresAt: 2000,
            contentType: 'audio/mpeg',
          },
        ],
      },
    });
    const compileCallable = jest.fn().mockResolvedValue({
      data: {
        jobId: 'job-1',
        downloadUrl: 'https://download.example/output.mp3',
        storagePath: 'tmp/output.mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: 4096,
        expiresAt: 3000,
      },
    });
    const getInfoAsync = jest.fn(async (uri: string) => ({
      exists: true,
      uri,
      size: 1024,
      isDirectory: false,
      modificationTime: 0,
    })) as unknown as typeof FileSystem.getInfoAsync;
    const uploadAsync = jest.fn().mockResolvedValue({ status: 200, body: '', headers: {} }) as unknown as typeof FileSystem.uploadAsync;
    const downloadAsync = jest.fn().mockResolvedValue({ uri: 'file:///packs/debate_1/compiled_job-1.mp3', status: 200, headers: {} }) as unknown as typeof FileSystem.downloadAsync;
    const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined) as unknown as typeof FileSystem.makeDirectoryAsync;

    (getFunctions as unknown as jest.Mock).mockReturnValue(functions);
    (httpsCallable as unknown as jest.Mock)
      .mockReturnValueOnce(createCallable)
      .mockReturnValueOnce(compileCallable);

    await expect(compileDebateVoicePack(manifest, {
      now: () => 1500,
      getInfoAsync,
      uploadAsync,
      downloadAsync,
      makeDirectoryAsync,
    })).resolves.toEqual(expect.objectContaining({
      id: 'job-1',
      uri: 'file:///packs/debate_1/compiled_job-1.mp3',
    }));

    expect(httpsCallable).toHaveBeenNthCalledWith(
      1,
      functions,
      'createDebateAudioCompileSession',
      { timeout: DEBATE_AUDIO_CREATE_SESSION_TIMEOUT_MS }
    );
    expect(httpsCallable).toHaveBeenNthCalledWith(
      2,
      functions,
      'compileDebateAudioPack',
      { timeout: DEBATE_AUDIO_COMPILE_TIMEOUT_MS }
    );
    expect(createCallable).toHaveBeenCalledWith(expect.objectContaining({ topic: manifest.topic }));
    expect(compileCallable).toHaveBeenCalledWith({ jobId: 'job-1' });
  });

  it('rejects instead of spinning forever when the compile callable does not settle', async () => {
    const getInfoAsync = jest.fn(async (uri: string) => ({
      exists: true,
      uri,
      size: 1024,
      isDirectory: false,
      modificationTime: 0,
    })) as unknown as typeof FileSystem.getInfoAsync;
    const uploadAsync = jest.fn().mockResolvedValue({ status: 200, body: '', headers: {} }) as unknown as typeof FileSystem.uploadAsync;
    const downloadAsync = jest.fn() as unknown as typeof FileSystem.downloadAsync;
    const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined) as unknown as typeof FileSystem.makeDirectoryAsync;
    const createSession = jest.fn().mockResolvedValue({
      jobId: 'job-1',
      outputMimeType: 'audio/mpeg',
      uploadUrls: [
        {
          clipId: 'clip_1',
          uploadUrl: 'https://upload.example/clip-1',
          storagePath: 'tmp/clip-1.mp3',
          expiresAt: 2000,
          contentType: 'audio/mpeg',
        },
        {
          clipId: 'clip_2',
          uploadUrl: 'https://upload.example/clip-2',
          storagePath: 'tmp/clip-2.mp3',
          expiresAt: 2000,
          contentType: 'audio/mpeg',
        },
      ],
    });
    const compilePack = jest.fn(() => new Promise(() => undefined));

    const promise = compileDebateVoicePack(manifest, {
      getInfoAsync,
      uploadAsync,
      downloadAsync,
      makeDirectoryAsync,
      createSession,
      compilePack,
      uploadTimeoutMs: DEBATE_AUDIO_UPLOAD_TIMEOUT_MS,
      compileTimeoutMs: 1,
      downloadTimeoutMs: DEBATE_AUDIO_DOWNLOAD_TIMEOUT_MS,
    });

    await expect(promise).rejects.toThrow('Podcast generation timed out while compiling the podcast');
    expect(downloadAsync).not.toHaveBeenCalled();
  });
});
