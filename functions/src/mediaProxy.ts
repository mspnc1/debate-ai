import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getDecryptedApiKey, encryptionKey } from './apiKeys';

type MediaProviderId = 'runway' | 'elevenlabs';
type CreateMediaType = 'video' | 'audio';
type CreateMediaOperation = 'text_to_video' | 'image_to_video' | 'text_to_speech' | 'sound_effect';
type CreateMediaAssetStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

interface ProxyMediaGenerationRequest {
  providerId: MediaProviderId;
  mediaType: CreateMediaType;
  operation: CreateMediaOperation;
  modelId?: string;
  prompt: string;
  sourceImage?: string;
  voiceId?: string;
  outputFormat?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  promptInfluence?: number;
}

interface RunwayTask {
  id?: string;
  status?: string;
}

interface RunwayTaskStatus {
  id?: string;
  status?: string;
  output?: string[];
  failure?: string;
  failureCode?: string;
  error?: string | { message?: string };
}

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';
const RUNWAY_API_VERSION = '2024-11-06';
const RUNWAY_DEFAULT_MODEL = 'gen4.5';
const RUNWAY_DEFAULT_RATIO = '1280:720';
const RUNWAY_DEFAULT_DURATION = 5;

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io';
const ELEVENLABS_DEFAULT_TTS_MODEL = 'eleven_multilingual_v2';
const ELEVENLABS_DEFAULT_SFX_MODEL = 'eleven_text_to_sound_v2';
const ELEVENLABS_DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const ELEVENLABS_DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';

export interface RunwayVideoTaskRequest {
  endpoint: string;
  body: Record<string, unknown>;
}

function assertAuthenticated(request: { auth?: { uid: string } | null }) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to generate media');
  }
}

function validatePrompt(prompt: unknown, maxLength: number): string {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'Prompt is required');
  }

  const trimmed = prompt.trim();
  if (trimmed.length > maxLength) {
    throw new HttpsError('invalid-argument', `Prompt exceeds maximum length of ${maxLength} characters`);
  }

  return trimmed;
}

export function mapRunwayStatus(status: string | undefined): CreateMediaAssetStatus {
  const normalized = (status || '').toLowerCase();
  if (['succeeded', 'success', 'completed', 'complete'].includes(normalized)) return 'succeeded';
  if (['failed', 'error'].includes(normalized)) return 'failed';
  if (['canceled', 'cancelled'].includes(normalized)) return 'canceled';
  if (['running', 'processing'].includes(normalized)) return 'running';
  return 'queued';
}

function countRunwayOutputs(output: unknown): number {
  return Array.isArray(output) ? output.length : 0;
}

function extractProviderError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.message === 'string') {
      try {
        const parsed = JSON.parse(record.message);
        return parsed.error?.message || parsed.message || record.message;
      } catch {
        return record.message;
      }
    }
    if (typeof record.error === 'string') return record.error;
  }
  return 'Unknown error';
}

function mapProviderError(providerId: string, error: any, prefix: string): HttpsError {
  const message = extractProviderError(error);
  const lower = message.toLowerCase();

  if (error?.code) {
    return error;
  }
  if (error?.status === 401 || error?.status === 403 || lower.includes('unauthorized') || lower.includes('forbidden')) {
    return new HttpsError('permission-denied', `Invalid ${providerId} API key`);
  }
  if (error?.status === 429 || lower.includes('rate limit') || lower.includes('too many requests')) {
    return new HttpsError('resource-exhausted', `${providerId} rate limit exceeded. Please try again later.`);
  }
  if (lower.includes('safety') || lower.includes('content policy') || lower.includes('moderation')) {
    return new HttpsError('invalid-argument', 'Content policy violation. Please modify your prompt.');
  }
  if (error?.status === 402 || lower.includes('credit') || lower.includes('quota')) {
    return new HttpsError('resource-exhausted', `${providerId} credits or quota are exhausted.`);
  }

  return new HttpsError('internal', `${prefix}: ${message}`);
}

async function getUserApiKey(uid: string, providerId: MediaProviderId, keyValue: string): Promise<string> {
  const apiKey = await getDecryptedApiKey(uid, providerId, keyValue);
  if (!apiKey) {
    throw new HttpsError('failed-precondition', `No API key configured for ${providerId}`);
  }
  return apiKey;
}

export function buildRunwayVideoTaskRequest(input: ProxyMediaGenerationRequest, prompt: string): RunwayVideoTaskRequest {
  if (input.mediaType !== 'video' || !['text_to_video', 'image_to_video'].includes(input.operation)) {
    throw new HttpsError('invalid-argument', 'Runway only supports video generation in Create mode');
  }

  if (input.operation === 'image_to_video' && !input.sourceImage) {
    throw new HttpsError('invalid-argument', 'A source image is required for image-to-video generation');
  }

  const body: Record<string, unknown> = {
    model: input.modelId || RUNWAY_DEFAULT_MODEL,
    promptText: prompt,
    ratio: input.aspectRatio || RUNWAY_DEFAULT_RATIO,
    duration: input.durationSeconds || RUNWAY_DEFAULT_DURATION,
  };

  if (input.operation === 'image_to_video') {
    body.promptImage = input.sourceImage;
  }

  return {
    endpoint: input.operation === 'text_to_video' ? 'text_to_video' : 'image_to_video',
    body,
  };
}

async function createRunwayVideoTask(apiKey: string, input: ProxyMediaGenerationRequest, prompt: string): Promise<RunwayTask> {
  const { endpoint, body } = buildRunwayVideoTaskRequest(input, prompt);

  const response = await fetch(`${RUNWAY_API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': RUNWAY_API_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw { status: response.status, message: error };
  }

  return await response.json() as RunwayTask;
}

async function getRunwayTask(apiKey: string, providerTaskId: string): Promise<RunwayTaskStatus> {
  const response = await fetch(`${RUNWAY_API_BASE}/tasks/${encodeURIComponent(providerTaskId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': RUNWAY_API_VERSION,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw { status: response.status, message: error };
  }

  return await response.json() as RunwayTaskStatus;
}

function mimeTypeForOutputFormat(outputFormat: string): string {
  if (outputFormat.startsWith('wav')) return 'audio/wav';
  if (outputFormat.startsWith('pcm')) return 'audio/L16';
  if (outputFormat.startsWith('ulaw')) return 'audio/basic';
  return 'audio/mpeg';
}

async function generateElevenLabsAudio(
  apiKey: string,
  input: ProxyMediaGenerationRequest,
  prompt: string
) {
  if (input.mediaType !== 'audio' || !['text_to_speech', 'sound_effect'].includes(input.operation)) {
    throw new HttpsError('invalid-argument', 'ElevenLabs only supports audio generation in Create mode');
  }

  const outputFormat = input.outputFormat || ELEVENLABS_DEFAULT_OUTPUT_FORMAT;
  const mimeType = mimeTypeForOutputFormat(outputFormat);

  const isTts = input.operation === 'text_to_speech';
  const endpoint = isTts
    ? `${ELEVENLABS_API_BASE}/v1/text-to-speech/${encodeURIComponent(input.voiceId || ELEVENLABS_DEFAULT_VOICE_ID)}?output_format=${encodeURIComponent(outputFormat)}`
    : `${ELEVENLABS_API_BASE}/v1/sound-generation?output_format=${encodeURIComponent(outputFormat)}`;

  const body = isTts
    ? {
        text: prompt,
        model_id: input.modelId || ELEVENLABS_DEFAULT_TTS_MODEL,
      }
    : {
        text: prompt,
        model_id: input.modelId || ELEVENLABS_DEFAULT_SFX_MODEL,
        ...(typeof input.durationSeconds === 'number' ? { duration_seconds: input.durationSeconds } : {}),
        ...(typeof input.promptInfluence === 'number' ? { prompt_influence: input.promptInfluence } : {}),
      };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': mimeType,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw { status: response.status, message: error };
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const responseMimeType = response.headers.get('content-type')?.split(';')[0] || mimeType;

  return {
    id: `media_${Date.now()}_elevenlabs_${Math.random().toString(36).slice(2, 7)}`,
    mediaType: 'audio',
    providerId: 'elevenlabs',
    modelId: input.modelId || (isTts ? ELEVENLABS_DEFAULT_TTS_MODEL : ELEVENLABS_DEFAULT_SFX_MODEL),
    operation: input.operation,
    prompt,
    url: `data:${responseMimeType};base64,${base64}`,
    mimeType: responseMimeType,
    durationSeconds: input.durationSeconds,
    status: 'succeeded',
    createdAt: Date.now(),
  };
}

export const proxyMediaGeneration = onCall(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    secrets: [encryptionKey],
  },
  async (request) => {
    assertAuthenticated(request);

    const keyValue = encryptionKey.value();
    if (!keyValue) {
      throw new HttpsError('internal', 'Encryption not configured');
    }

    const input = request.data as ProxyMediaGenerationRequest;
    const { providerId } = input || {};

    if (!providerId || !['runway', 'elevenlabs'].includes(providerId)) {
      throw new HttpsError('invalid-argument', 'Invalid media provider');
    }

    const prompt = validatePrompt(input.prompt, providerId === 'runway' ? 1000 : input.operation === 'sound_effect' ? 450 : 5000);
    const apiKey = await getUserApiKey(request.auth!.uid, providerId, keyValue);

    try {
      if (providerId === 'runway') {
        const task = await createRunwayVideoTask(apiKey, input, prompt);
        if (!task.id) {
          throw new HttpsError('internal', 'Runway did not return a task ID');
        }

        console.info('Runway video task created', {
          providerId: 'runway',
          mediaType: input.mediaType,
          operation: input.operation,
          modelId: input.modelId || RUNWAY_DEFAULT_MODEL,
          durationSeconds: input.durationSeconds || RUNWAY_DEFAULT_DURATION,
          aspectRatio: input.aspectRatio || RUNWAY_DEFAULT_RATIO,
          providerTaskId: task.id,
          providerStatus: task.status,
          mappedStatus: mapRunwayStatus(task.status),
        });

        return {
          success: true,
          task: {
            providerTaskId: task.id,
            status: mapRunwayStatus(task.status),
            providerStatus: task.status,
            pollAfterMs: 5000,
          },
        };
      }

      const asset = await generateElevenLabsAudio(apiKey, input, prompt);
      return { success: true, asset };
    } catch (error: any) {
      console.error(`Media generation error for ${providerId}:`, error);
      throw mapProviderError(providerId, error, 'Media generation failed');
    }
  }
);

export const getMediaTaskStatus = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    secrets: [encryptionKey],
  },
  async (request) => {
    assertAuthenticated(request);

    const keyValue = encryptionKey.value();
    if (!keyValue) {
      throw new HttpsError('internal', 'Encryption not configured');
    }

    const { providerId, providerTaskId } = request.data || {};
    if (providerId !== 'runway') {
      throw new HttpsError('invalid-argument', 'Only Runway tasks can be polled');
    }
    if (!providerTaskId || typeof providerTaskId !== 'string') {
      throw new HttpsError('invalid-argument', 'Runway task ID is required');
    }

    const apiKey = await getUserApiKey(request.auth!.uid, 'runway', keyValue);

    try {
      const task = await getRunwayTask(apiKey, providerTaskId);
      const status = mapRunwayStatus(task.status);
      const providerError = typeof task.error === 'string'
        ? task.error
        : task.error?.message;

      console.info('Runway task status', {
        providerTaskId,
        providerStatus: task.status,
        mappedStatus: status,
        outputCount: countRunwayOutputs(task.output),
        failureCode: task.failureCode,
        hasFailure: Boolean(providerError || task.failure || task.failureCode),
      });

      return {
        success: true,
        status,
        providerStatus: task.status,
        outputUrls: Array.isArray(task.output) ? task.output : undefined,
        error: providerError || task.failure || task.failureCode,
      };
    } catch (error: any) {
      console.error('Runway task status error:', error);
      throw mapProviderError('runway', error, 'Failed to get Runway task status');
    }
  }
);

export const listMediaProviderOptions = onCall(
  {
    timeoutSeconds: 60,
    memory: '256MiB',
    secrets: [encryptionKey],
  },
  async (request) => {
    assertAuthenticated(request);

    const { providerId } = request.data || {};
    if (!providerId || !['runway', 'elevenlabs'].includes(providerId)) {
      throw new HttpsError('invalid-argument', 'Invalid media provider');
    }

    if (providerId === 'runway') {
      return {
        success: true,
        providerId: 'runway',
        models: [
          {
            id: RUNWAY_DEFAULT_MODEL,
            label: 'Gen-4.5',
            mediaType: 'video',
            operations: ['text_to_video', 'image_to_video'],
          },
        ],
      };
    }

    const keyValue = encryptionKey.value();
    if (!keyValue) {
      throw new HttpsError('internal', 'Encryption not configured');
    }

    const apiKey = await getUserApiKey(request.auth!.uid, 'elevenlabs', keyValue);

    try {
      const response = await fetch(`${ELEVENLABS_API_BASE}/v2/voices`, {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw { status: response.status, message: error };
      }

      const data = await response.json() as {
        voices?: Array<{
          voice_id?: string;
          name?: string;
          category?: string;
          preview_url?: string;
          labels?: Record<string, string>;
        }>;
      };

      return {
        success: true,
        providerId: 'elevenlabs',
        voices: (data.voices || [])
          .filter((voice) => voice.voice_id && voice.name)
          .map((voice) => ({
            id: voice.voice_id!,
            name: voice.name!,
            category: voice.category,
            previewUrl: voice.preview_url,
            labels: voice.labels,
          })),
      };
    } catch (error: any) {
      console.error('ElevenLabs voice list error:', error);
      throw mapProviderError('elevenlabs', error, 'Failed to list ElevenLabs voices');
    }
  }
);
