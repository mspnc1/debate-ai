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
}

let functionsModulePromise: Promise<typeof import('@react-native-firebase/functions')> | null = null;

async function loadFunctionsModule(): Promise<typeof import('@react-native-firebase/functions')> {
  if (!functionsModulePromise) {
    functionsModulePromise = import('@react-native-firebase/functions').catch((error) => {
      functionsModulePromise = null;
      throw error;
    });
  }
  return functionsModulePromise;
}

async function callFunction<Request, Response>(name: string, payload: Request): Promise<Response> {
  const functionsModule = await loadFunctionsModule();
  const functions = functionsModule.getFunctions();
  const callable = functionsModule.httpsCallable<Request, Response>(functions, name);
  const result = await callable(payload);
  return result.data;
}

async function createCompileSession(request: CreateCompileSessionRequest): Promise<CreateCompileSessionResponse> {
  return callFunction<CreateCompileSessionRequest, CreateCompileSessionResponse>(
    'createDebateAudioCompileSession',
    request
  );
}

async function compilePack(request: CompilePackRequest): Promise<CompilePackResponse> {
  return callFunction<CompilePackRequest, CompilePackResponse>('compileDebateAudioPack', request);
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
  const directoryUri = ensureVoicePackDirectory(manifest);

  const request = await buildCompileSessionRequest(manifest, getInfoAsync);
  const session = await sessionFactory(request);
  const uploadTargetsById = new Map(session.uploadUrls.map((target) => [target.clipId, target]));

  await Promise.all(manifest.clips.map(async (clip) => {
    const target = uploadTargetsById.get(clip.id);
    if (!target) {
      throw new Error(`Upload target missing for ${clip.speakerName}.`);
    }
    const result = await uploadAsync(target.uploadUrl, clip.uri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': target.contentType || clip.mimeType,
      },
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Failed to upload ${clip.speakerName}'s voice clip.`);
    }
  }));

  const compiled = await compiler({ jobId: session.jobId });
  await makeDirectoryAsync(directoryUri, { intermediates: true }).catch(() => undefined);

  const previousCompiledUri = manifest.compiledAudio?.uri;
  if (previousCompiledUri?.startsWith('file:')) {
    await deleteAsync(previousCompiledUri, { idempotent: true }).catch(() => undefined);
  }

  const fileName = buildLocalCompiledFileName(session.jobId);
  const localUri = `${directoryUri}${fileName}`;
  await downloadAsync(compiled.downloadUrl, localUri);

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
