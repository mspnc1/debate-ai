import type {
  CreateMediaOperation,
  CreateMediaType,
  MediaProviderId,
} from '@/types/media';
import type { AIProvider as APIProviderConfig } from './aiProviders';

export interface MediaModelInfo {
  id: string;
  label: string;
  description: string;
  mediaType: CreateMediaType;
  operations: CreateMediaOperation[];
  defaultDurationSeconds?: number;
  durationsByOperation?: Partial<Record<CreateMediaOperation, readonly number[]>>;
  aspectRatiosByOperation?: Partial<Record<CreateMediaOperation, readonly string[]>>;
  promptRequiredByOperation?: Partial<Record<CreateMediaOperation, boolean>>;
  maxInputCharacters?: number;
  isDeprecated?: boolean;
}

export interface MediaOperationInfo {
  id: CreateMediaOperation;
  label: string;
  description: string;
}

export interface MediaProviderInfo {
  id: MediaProviderId;
  name: string;
  company: string;
  color: string;
  gradient: [string, string];
  apiKeyPlaceholder: string;
  docsUrl: string;
  getKeyUrl: string;
  dashboardUrl: string;
  description: string;
  features: string[];
  mediaTypes: CreateMediaType[];
  operations: MediaOperationInfo[];
  models: MediaModelInfo[];
}

export const RUNWAY_DEFAULT_VIDEO_MODEL = 'gen4.5';
export const RUNWAY_DEFAULT_ASPECT_RATIO = '1280:720';
export const RUNWAY_DEFAULT_DURATION_SECONDS = 5;

export const ELEVENLABS_DEFAULT_TTS_MODEL = 'eleven_multilingual_v2';
export const ELEVENLABS_DEFAULT_SFX_MODEL = 'eleven_text_to_sound_v2';
export const ELEVENLABS_DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';
export const ELEVENLABS_DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
export const ELEVENLABS_DEFAULT_TTS_PROMPT_LIMIT = 10000;
export const ELEVENLABS_DEFAULT_SOUND_PROMPT_LIMIT = 3000;

export const RUNWAY_VIDEO_POLL_INTERVAL_MS = 5_000;
export const RUNWAY_VIDEO_LONG_WAIT_MS = 10 * 60 * 1000;
export const RUNWAY_VIDEO_MAX_POLL_MS = 30 * 60 * 1000;

export const RUNWAY_VIDEO_DURATIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export const RUNWAY_ASPECT_RATIOS = [
  { id: '1280:720', label: 'Landscape', description: '1280 x 720' },
  { id: '720:1280', label: 'Portrait', description: '720 x 1280' },
  { id: '1920:1080', label: 'Landscape 1080p', description: '1920 x 1080' },
  { id: '1080:1920', label: 'Portrait 1080p', description: '1080 x 1920' },
  { id: '1104:832', label: 'Landscape 4:3', description: '1104 x 832' },
  { id: '832:1104', label: 'Portrait 3:4', description: '832 x 1104' },
  { id: '960:960', label: 'Square', description: '960 x 960' },
  { id: '1584:672', label: 'Ultrawide', description: '1584 x 672' },
  { id: '1280:768', label: 'Landscape', description: '1280 x 768' },
  { id: '768:1280', label: 'Portrait', description: '768 x 1280' },
] as const;

const RUNWAY_STANDARD_VIDEO_RATIOS = ['1280:720', '720:1280'] as const;
const RUNWAY_EXTENDED_VIDEO_RATIOS = [
  '1280:720',
  '720:1280',
  '1104:832',
  '960:960',
  '832:1104',
  '1584:672',
] as const;
const RUNWAY_VEO_VIDEO_RATIOS = ['1280:720', '720:1280', '1080:1920', '1920:1080'] as const;
const RUNWAY_GEN3A_VIDEO_RATIOS = ['1280:768', '768:1280'] as const;
const RUNWAY_GEN4_DURATIONS = RUNWAY_VIDEO_DURATIONS;
const RUNWAY_VEO31_DURATIONS = [4, 6, 8] as const;
const RUNWAY_VEO3_DURATIONS = [8] as const;
const RUNWAY_GEN3A_DURATIONS = [5, 10] as const;

export const ELEVENLABS_OUTPUT_FORMATS = [
  { id: 'mp3_22050_32', label: 'MP3 22.05 kHz 32 kbps' },
  { id: 'mp3_24000_48', label: 'MP3 24 kHz 48 kbps' },
  { id: 'mp3_44100_64', label: 'MP3 44.1 kHz 64 kbps' },
  { id: 'mp3_44100_128', label: 'MP3 128 kbps' },
  { id: 'mp3_44100_192', label: 'MP3 192 kbps' },
  { id: 'opus_48000_64', label: 'Opus 48 kHz 64 kbps' },
  { id: 'opus_48000_128', label: 'Opus 48 kHz 128 kbps' },
  { id: 'wav_44100', label: 'WAV 44.1 kHz' },
] as const;

export const MEDIA_PROVIDERS: MediaProviderInfo[] = [
  {
    id: 'runway',
    name: 'Runway',
    company: 'Runway',
    color: '#0F766E',
    gradient: ['#0F766E', '#14B8A6'],
    apiKeyPlaceholder: 'Runway API key',
    docsUrl: 'https://docs.dev.runwayml.com/',
    getKeyUrl: 'https://dev.runwayml.com/',
    dashboardUrl: 'https://dev.runwayml.com/',
    description: 'Generate short videos with your Runway credits. Keys stay on this device.',
    features: ['Text to video', 'Image to video', 'Local key storage'],
    mediaTypes: ['video'],
    operations: [
      { id: 'text_to_video', label: 'Text to video', description: 'Generate a short video from a prompt.' },
      { id: 'image_to_video', label: 'Image to video', description: 'Animate a source image.' },
    ],
    models: [
      {
        id: RUNWAY_DEFAULT_VIDEO_MODEL,
        label: 'Gen-4.5',
        description: 'Runway flagship text and image to video model.',
        mediaType: 'video',
        operations: ['text_to_video', 'image_to_video'],
        defaultDurationSeconds: RUNWAY_DEFAULT_DURATION_SECONDS,
        durationsByOperation: {
          text_to_video: RUNWAY_GEN4_DURATIONS,
          image_to_video: RUNWAY_GEN4_DURATIONS,
        },
        aspectRatiosByOperation: {
          text_to_video: RUNWAY_STANDARD_VIDEO_RATIOS,
          image_to_video: RUNWAY_EXTENDED_VIDEO_RATIOS,
        },
        promptRequiredByOperation: {
          text_to_video: true,
          image_to_video: true,
        },
      },
      {
        id: 'gen4_turbo',
        label: 'Gen-4 Turbo',
        description: 'Fast Runway image to video model.',
        mediaType: 'video',
        operations: ['image_to_video'],
        defaultDurationSeconds: RUNWAY_DEFAULT_DURATION_SECONDS,
        durationsByOperation: { image_to_video: RUNWAY_GEN4_DURATIONS },
        aspectRatiosByOperation: { image_to_video: RUNWAY_EXTENDED_VIDEO_RATIOS },
        promptRequiredByOperation: { image_to_video: false },
      },
      {
        id: 'veo3.1',
        label: 'Veo 3.1',
        description: 'Google Veo 3.1 text and image to video model.',
        mediaType: 'video',
        operations: ['text_to_video', 'image_to_video'],
        defaultDurationSeconds: 8,
        durationsByOperation: {
          text_to_video: RUNWAY_VEO31_DURATIONS,
          image_to_video: RUNWAY_VEO31_DURATIONS,
        },
        aspectRatiosByOperation: {
          text_to_video: RUNWAY_VEO_VIDEO_RATIOS,
          image_to_video: RUNWAY_VEO_VIDEO_RATIOS,
        },
        promptRequiredByOperation: {
          text_to_video: true,
          image_to_video: false,
        },
      },
      {
        id: 'veo3.1_fast',
        label: 'Veo 3.1 Fast',
        description: 'Lower-latency Veo 3.1 text and image to video model.',
        mediaType: 'video',
        operations: ['text_to_video', 'image_to_video'],
        defaultDurationSeconds: 8,
        durationsByOperation: {
          text_to_video: RUNWAY_VEO31_DURATIONS,
          image_to_video: RUNWAY_VEO31_DURATIONS,
        },
        aspectRatiosByOperation: {
          text_to_video: RUNWAY_VEO_VIDEO_RATIOS,
          image_to_video: RUNWAY_VEO_VIDEO_RATIOS,
        },
        promptRequiredByOperation: {
          text_to_video: true,
          image_to_video: false,
        },
      },
      {
        id: 'veo3',
        label: 'Veo 3',
        description: 'Google Veo 3 text and image to video model.',
        mediaType: 'video',
        operations: ['text_to_video', 'image_to_video'],
        defaultDurationSeconds: 8,
        durationsByOperation: {
          text_to_video: RUNWAY_VEO3_DURATIONS,
          image_to_video: RUNWAY_VEO3_DURATIONS,
        },
        aspectRatiosByOperation: {
          text_to_video: RUNWAY_VEO_VIDEO_RATIOS,
          image_to_video: RUNWAY_VEO_VIDEO_RATIOS,
        },
        promptRequiredByOperation: {
          text_to_video: true,
          image_to_video: false,
        },
      },
      {
        id: 'gen3a_turbo',
        label: 'Gen-3 Alpha Turbo',
        description: 'Legacy Runway image to video model.',
        mediaType: 'video',
        operations: ['image_to_video'],
        defaultDurationSeconds: 10,
        durationsByOperation: { image_to_video: RUNWAY_GEN3A_DURATIONS },
        aspectRatiosByOperation: { image_to_video: RUNWAY_GEN3A_VIDEO_RATIOS },
        promptRequiredByOperation: { image_to_video: true },
      },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    company: 'ElevenLabs',
    color: '#6D28D9',
    gradient: ['#6D28D9', '#DB2777'],
    apiKeyPlaceholder: 'ElevenLabs API key',
    docsUrl: 'https://elevenlabs.io/docs/api-reference',
    getKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    dashboardUrl: 'https://elevenlabs.io/app',
    description: 'Generate voiceover and sound effects. Keys stay on this device.',
    features: ['Text to speech', 'Sound effects', 'Voice picker'],
    mediaTypes: ['audio'],
    operations: [
      { id: 'text_to_speech', label: 'Voiceover', description: 'Generate spoken audio from text.' },
      { id: 'sound_effect', label: 'Sound effect', description: 'Generate short sound effects from a prompt.' },
    ],
    models: [
      {
        id: 'eleven_v3',
        label: 'Eleven v3',
        description: 'Expressive TTS model for performance-driven voiceover.',
        mediaType: 'audio',
        operations: ['text_to_speech'],
        maxInputCharacters: 5000,
      },
      {
        id: ELEVENLABS_DEFAULT_TTS_MODEL,
        label: 'Multilingual v2',
        description: 'Default high-quality TTS model for long-form voiceover.',
        mediaType: 'audio',
        operations: ['text_to_speech'],
        maxInputCharacters: ELEVENLABS_DEFAULT_TTS_PROMPT_LIMIT,
      },
      {
        id: 'eleven_flash_v2_5',
        label: 'Flash v2.5',
        description: 'Low-latency multilingual TTS model.',
        mediaType: 'audio',
        operations: ['text_to_speech'],
        maxInputCharacters: 40000,
      },
      {
        id: ELEVENLABS_DEFAULT_SFX_MODEL,
        label: 'Text to Sound v2',
        description: 'Default sound effects model.',
        mediaType: 'audio',
        operations: ['sound_effect'],
        maxInputCharacters: ELEVENLABS_DEFAULT_SOUND_PROMPT_LIMIT,
      },
    ],
  },
];

export const MEDIA_API_PROVIDERS: APIProviderConfig[] = MEDIA_PROVIDERS.map((provider) => ({
  id: provider.id,
  name: provider.name,
  company: provider.company,
  color: provider.color,
  gradient: provider.gradient,
  apiKeyPrefix: '',
  apiKeyPlaceholder: provider.apiKeyPlaceholder,
  docsUrl: provider.docsUrl,
  getKeyUrl: provider.getKeyUrl,
  description: provider.description,
  features: provider.features,
  enabled: true,
  guidance: {
    difficulty: 'medium',
    estimatedTime: '~2 min',
    steps: [
      {
        urlPattern: provider.dashboardUrl,
        title: `Open ${provider.name}`,
        instruction: `Sign in to ${provider.name} and open your API key settings.`,
      },
      {
        urlPattern: provider.getKeyUrl,
        title: 'Create API key',
        instruction: 'Create a key and copy it immediately.',
      },
      {
        urlPattern: provider.getKeyUrl,
        title: 'Paste into Symposium',
        instruction: 'Return to Symposium and paste the key. It will stay on this device.',
      },
    ],
    tips: [
      'Media generation uses your provider credits directly.',
      'Symposium does not upload mobile media keys to its servers.',
    ],
  },
}));

export function getMediaProviderById(id: string): MediaProviderInfo | undefined {
  return MEDIA_PROVIDERS.find((provider) => provider.id === id);
}

export function getMediaModels(providerId: MediaProviderId, operation?: CreateMediaOperation): MediaModelInfo[] {
  const provider = getMediaProviderById(providerId);
  if (!provider) return [];
  if (!operation) return provider.models;
  return provider.models.filter((model) => model.operations.includes(operation));
}

export function getMediaModelById(providerId: MediaProviderId, modelId: string): MediaModelInfo | undefined {
  return getMediaProviderById(providerId)?.models.find((model) => model.id === modelId);
}

export function getRunwayVideoDurations(modelId: string, operation: CreateMediaOperation): readonly number[] {
  const model = getMediaModelById('runway', modelId);
  return model?.durationsByOperation?.[operation] || RUNWAY_VIDEO_DURATIONS;
}

export function getRunwayAspectRatios(modelId: string, operation: CreateMediaOperation): typeof RUNWAY_ASPECT_RATIOS[number][] {
  const model = getMediaModelById('runway', modelId);
  const ratioIds = model?.aspectRatiosByOperation?.[operation] || RUNWAY_STANDARD_VIDEO_RATIOS;
  return RUNWAY_ASPECT_RATIOS.filter((ratio) => ratioIds.includes(ratio.id));
}

export function isRunwayPromptRequired(modelId: string, operation: CreateMediaOperation): boolean {
  const model = getMediaModelById('runway', modelId);
  return model?.promptRequiredByOperation?.[operation] ?? true;
}
