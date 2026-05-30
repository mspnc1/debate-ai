import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MediaProviderVoiceLanguageOption, MediaProviderVoiceOption } from '@/types/media';

const STORAGE_KEY = '@debateai/debate_voice_recents/elevenlabs';
const MAX_RECENT_VOICES = 12;

export interface DebateRecentVoiceSelection {
  voiceId: string;
  voiceName: string;
  category?: string | null;
  labels?: Record<string, string>;
  verifiedLanguages?: MediaProviderVoiceLanguageOption[];
  previewUrl?: string | null;
  lastUsedAt: number;
  useCount: number;
}

function normalizeLabels(labels?: Record<string, string>): Record<string, string> | undefined {
  if (!labels) return undefined;
  const entries = Object.entries(labels)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
    .map(([key, value]) => [key, value.trim()] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeRecentVoice(input: unknown): DebateRecentVoiceSelection | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (typeof record.voiceId !== 'string' || !record.voiceId.trim()) return null;
  if (typeof record.voiceName !== 'string' || !record.voiceName.trim()) return null;

  return {
    voiceId: record.voiceId,
    voiceName: record.voiceName,
    category: typeof record.category === 'string' ? record.category : null,
    labels: normalizeLabels(record.labels as Record<string, string> | undefined),
    verifiedLanguages: Array.isArray(record.verifiedLanguages)
      ? record.verifiedLanguages.filter((language): language is MediaProviderVoiceLanguageOption => (
          Boolean(language)
          && typeof language === 'object'
          && !Array.isArray(language)
          && typeof (language as MediaProviderVoiceLanguageOption).language === 'string'
        ))
      : undefined,
    previewUrl: typeof record.previewUrl === 'string' ? record.previewUrl : null,
    lastUsedAt: typeof record.lastUsedAt === 'number' ? record.lastUsedAt : 0,
    useCount: typeof record.useCount === 'number' && record.useCount > 0 ? record.useCount : 1,
  };
}

function toRecentVoice(
  voice: MediaProviderVoiceOption,
  previous?: DebateRecentVoiceSelection
): DebateRecentVoiceSelection {
  return {
    voiceId: voice.id,
    voiceName: voice.name,
    category: voice.category,
    labels: normalizeLabels(voice.labels),
    verifiedLanguages: voice.verifiedLanguages || voice.verified_languages,
    previewUrl: voice.previewUrl || voice.preview_url || null,
    lastUsedAt: Date.now(),
    useCount: (previous?.useCount || 0) + 1,
  };
}

export class DebateVoiceRecentService {
  static async list(): Promise<DebateRecentVoiceSelection[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(normalizeRecentVoice)
        .filter((voice): voice is DebateRecentVoiceSelection => Boolean(voice))
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        .slice(0, MAX_RECENT_VOICES);
    } catch {
      return [];
    }
  }

  static async record(voice: MediaProviderVoiceOption): Promise<void> {
    const current = await DebateVoiceRecentService.list();
    const previous = current.find((recent) => recent.voiceId === voice.id);
    const next = [
      toRecentVoice(voice, previous),
      ...current.filter((recent) => recent.voiceId !== voice.id),
    ].slice(0, MAX_RECENT_VOICES);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  static toVoiceOption(recent: DebateRecentVoiceSelection): MediaProviderVoiceOption {
    return {
      id: recent.voiceId,
      name: recent.voiceName,
      voice_id: recent.voiceId,
      category: recent.category,
      labels: recent.labels,
      verifiedLanguages: recent.verifiedLanguages,
      verified_languages: recent.verifiedLanguages,
      previewUrl: recent.previewUrl || null,
      preview_url: recent.previewUrl || null,
    };
  }
}

export default DebateVoiceRecentService;
