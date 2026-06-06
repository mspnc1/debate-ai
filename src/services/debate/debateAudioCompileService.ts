import * as FileSystem from 'expo-file-system/legacy';
import type { DebateVoicePackCompiledAudio, DebateVoicePackManifest } from '@/types/media';

interface CompileSessionClipRequest {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  pauseAfterMs: number;
}

interface CreateCompileSessionRequest {
  topic: string;
  clips: CompileSessionClipRequest[];
}

interface CompileUploadTarget {
  clipId: string;
  uploadUrl: string;
  storagePath: string;
  expiresAt: number;
  contentType: string;
}

interface CreateCompileSessionResponse {
  jobId: string;
  uploadUrls: CompileUploadTarget[];
  outputMimeType: string;
}

interface CompilePackRequest {
  jobId: string;
}

interface CompilePackResponse {
  jobId: string;
  downloadUrl: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: number;
}

interface CompileDependencies {
  now?: () => number;
  getInfoAsync?: typeof FileSystem.getInfoAsync;
  makeDirectoryAsync?: typeof FileSystem.makeDirectoryAsync;
  deleteAsync?: typeof FileSystem.deleteAsync;
  uploadAsync?: typeof FileSystem.uploadAsync;
  downloadAsync?: typeof FileSystem.downloadAsync;
  createSession?: (request: CreateCompileSessionRequest) => Promise<CreateCompileSessionResponse>;
  compilePack?: (request: CompilePackRequest) => Promise<CompilePackResponse>;
  onStageChange?: (stage: DebateAudioCompileStage) => void;
  createSessionTimeoutMs?: number;
  uploadTimeoutMs?: number;
  compileTimeoutMs?: number;
  downloadTimeoutMs?: number;
}

let functionsModulePromise: Promise<typeof import('@react-native-firebase/functions')> | null = null;

export type DebateAudioCompileStage =
  | 'preparing'
  | 'creating_session'
  | 'uploading'
  | 'compiling'
  | 'downloading';

export const DEBATE_AUDIO_CREATE_SESSION_TIMEOUT_MS = 60_000;
export const DEBATE_AUDIO_UPLOAD_TIMEOUT_MS = 120_000;
export const DEBATE_AUDIO_COMPILE_TIMEOUT_MS = 8 * 60_000;
export const DEBATE_AUDIO_DOWNLOAD_TIMEOUT_MS = 120_000;

const FOREGROUND_FILE_SESSION_TYPE = FileSystem.FileSystemSessionType?.FOREGROUND ?? 1;

async function loadFunctionsModule(): Promise<typeof import('@react-native-firebase/functions')> {
  if (!functionsModulePromise) {
    functionsModulePromise = import('@react-native-firebase/functions').catch((error) => {
      functionsModulePromise = null;
      throw error;
    });
  }
  return functionsModulePromise;
}

async function callFunction<Request, Response>(
  name: string,
  payload: Request,
  timeoutMs?: number
): Promise<Response> {
  const functionsModule = await loadFunctionsModule();
  const functions = functionsModule.getFunctions();
  const options = timeoutMs ? { timeout: timeoutMs } : undefined;
  const callable = functionsModule.httpsCallable<Request, Response>(functions, name, options);
  const result = await callable(payload);
  return result.data;
}

async function createCompileSession(
  request: CreateCompileSessionRequest,
  timeoutMs = DEBATE_AUDIO_CREATE_SESSION_TIMEOUT_MS
): Promise<CreateCompileSessionResponse> {
  return callFunction<CreateCompileSessionRequest, CreateCompileSessionResponse>(
    'createDebateAudioCompileSession',
    request,
    timeoutMs
  );
}

async function compilePack(
  request: CompilePackRequest,
  timeoutMs = DEBATE_AUDIO_COMPILE_TIMEOUT_MS
): Promise<CompilePackResponse> {
  return callFunction<CompilePackRequest, CompilePackResponse>('compileDebateAudioPack', request, timeoutMs);
}

function ensureVoicePackDirectory(manifest: DebateVoicePackManifest): string {
  if (manifest.directoryUri) {
    return manifest.directoryUri.endsWith('/') ? manifest.directoryUri : `${manifest.directoryUri}/`;
  }
  const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!baseDirectory) {
    throw new Error('No local directory is available for compiled debate audio.');
  }
  const normalizedBase = baseDirectory.endsWith('/') ? baseDirectory : `${baseDirectory}/`;
  return `${normalizedBase}gallery-voice-packs/${manifest.sessionId}/`;
}

function getFileSize(info: Awaited<ReturnType<typeof FileSystem.getInfoAsync>>): number | undefined {
  if (!info.exists) return undefined;
  const maybeSize = (info as { size?: unknown }).size;
  return typeof maybeSize === 'number' && Number.isFinite(maybeSize) && maybeSize > 0 ? maybeSize : undefined;
}

function buildLocalCompiledFileName(jobId: string): string {
  return `compiled_${jobId}.mp3`;
}

function stageTimeoutMessage(stage: string): string {
  return `Podcast generation timed out while ${stage}. Please try again with fewer clips or a stronger connection.`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export async function buildCompileSessionRequest(
  manifest: DebateVoicePackManifest,
  getInfoAsync: typeof FileSystem.getInfoAsync = FileSystem.getInfoAsync
): Promise<CreateCompileSessionRequest> {
  if (manifest.clips.length === 0) {
    throw new Error('This voice pack has no clips to compile.');
  }

  const clips = await Promise.all(manifest.clips.map(async (clip): Promise<CompileSessionClipRequest> => {
    const info = await getInfoAsync(clip.uri);
    if (!info.exists) {
      throw new Error(`Voice clip for ${clip.speakerName} is unavailable.`);
    }
    return {
      id: clip.id,
      fileName: clip.fileName,
      mimeType: clip.mimeType,
      sizeBytes: getFileSize(info),
      pauseAfterMs: clip.pauseAfterMs,
    };
  }));

  return {
    topic: manifest.topic,
    clips,
  };
}

export async function compileDebateVoicePack(
  manifest: DebateVoicePackManifest,
  dependencies: CompileDependencies = {}
): Promise<DebateVoicePackCompiledAudio> {
  const now = dependencies.now || Date.now;
  const getInfoAsync = dependencies.getInfoAsync || FileSystem.getInfoAsync;
  const makeDirectoryAsync = dependencies.makeDirectoryAsync || FileSystem.makeDirectoryAsync;
  const deleteAsync = dependencies.deleteAsync || FileSystem.deleteAsync;
  const uploadAsync = dependencies.uploadAsync || FileSystem.uploadAsync;
  const downloadAsync = dependencies.downloadAsync || FileSystem.downloadAsync;
  const sessionFactory = dependencies.createSession || createCompileSession;
  const compiler = dependencies.compilePack || compilePack;
  const onStageChange = dependencies.onStageChange;
  const createSessionTimeoutMs = dependencies.createSessionTimeoutMs ?? DEBATE_AUDIO_CREATE_SESSION_TIMEOUT_MS;
  const uploadTimeoutMs = dependencies.uploadTimeoutMs ?? DEBATE_AUDIO_UPLOAD_TIMEOUT_MS;
  const compileTimeoutMs = dependencies.compileTimeoutMs ?? DEBATE_AUDIO_COMPILE_TIMEOUT_MS;
  const downloadTimeoutMs = dependencies.downloadTimeoutMs ?? DEBATE_AUDIO_DOWNLOAD_TIMEOUT_MS;
  const directoryUri = ensureVoicePackDirectory(manifest);

  onStageChange?.('preparing');
  const request = await buildCompileSessionRequest(manifest, getInfoAsync);
  onStageChange?.('creating_session');
  const session = await withTimeout(
    sessionFactory(request),
    createSessionTimeoutMs,
    stageTimeoutMessage('starting the compile job')
  );
  const uploadTargetsById = new Map(session.uploadUrls.map((target) => [target.clipId, target]));

  onStageChange?.('uploading');
  await Promise.all(manifest.clips.map(async (clip) => {
    const target = uploadTargetsById.get(clip.id);
    if (!target) {
      throw new Error(`Upload target missing for ${clip.speakerName}.`);
    }
    const result = await withTimeout(
      uploadAsync(target.uploadUrl, clip.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        sessionType: FOREGROUND_FILE_SESSION_TYPE,
        headers: {
          'Content-Type': target.contentType || clip.mimeType,
        },
      }),
      uploadTimeoutMs,
      stageTimeoutMessage(`uploading ${clip.speakerName}'s voice clip`)
    );
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Failed to upload ${clip.speakerName}'s voice clip.`);
    }
  }));

  onStageChange?.('compiling');
  const compiled = await withTimeout(
    compiler({ jobId: session.jobId }),
    compileTimeoutMs,
    stageTimeoutMessage('compiling the podcast')
  );
  await makeDirectoryAsync(directoryUri, { intermediates: true }).catch(() => undefined);

  const previousCompiledUri = manifest.compiledAudio?.uri;
  if (previousCompiledUri?.startsWith('file:')) {
    await deleteAsync(previousCompiledUri, { idempotent: true }).catch(() => undefined);
  }

  const fileName = buildLocalCompiledFileName(session.jobId);
  const localUri = `${directoryUri}${fileName}`;
  onStageChange?.('downloading');
  const downloadResult = await withTimeout(
    downloadAsync(compiled.downloadUrl, localUri, {
      sessionType: FOREGROUND_FILE_SESSION_TYPE,
    }),
    downloadTimeoutMs,
    stageTimeoutMessage('downloading the podcast file')
  );
  if (downloadResult.status < 200 || downloadResult.status >= 300) {
    throw new Error('Failed to download the generated podcast file.');
  }

  return {
    id: session.jobId,
    uri: localUri,
    mimeType: compiled.mimeType || session.outputMimeType || 'audio/mpeg',
    fileName,
    createdAt: now(),
    remoteUrl: compiled.downloadUrl,
    storagePath: compiled.storagePath,
    expiresAt: compiled.expiresAt,
  };
}

export const DebateAudioCompileService = {
  buildCompileSessionRequest,
  compileDebateVoicePack,
};

export default DebateAudioCompileService;
