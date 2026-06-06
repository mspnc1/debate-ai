import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MediaProviderVoiceLanguageOption, MediaProviderVoiceOption } from '@/types/media';

const STORAGE_KEY = '@debateai/debate_voice_favorites/elevenlabs';
const MAX_FAVORITE_VOICES = 100;

// A favorite is the user's curated, locally-stored pick list. It can mix premade
// voices and community voices the user has added to their ElevenLabs account, so we
// persist enough of each voice to render and use it for TTS without another API call.
export interface DebateFavoriteVoice {
  voiceId: string;
  voiceName: string;
  alternateVoiceIds?: string[];
  category?: string | null;
  description?: string | null;
  labels?: Record<string, string>;
  verifiedLanguages?: MediaProviderVoiceLanguageOption[];
  previewUrl?: string | null;
  sourceVoiceType?: string | null;
  addedAt: number;
}

function normalizeLabels(labels?: Record<string, string>): Record<string, string> | undefined {
  if (!labels) return undefined;
  const entries = Object.entries(labels)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
    .map(([key, value]) => [key, value.trim()] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function normalizeAlternateVoiceIds(value: unknown, canonicalVoiceId: string): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = Array.from(new Set(value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .filter((item) => item !== canonicalVoiceId)));
  return ids.length > 0 ? ids : undefined;
}

function normalizeFavorite(input: unknown): DebateFavoriteVoice | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  if (typeof record.voiceId !== 'string' || !record.voiceId.trim()) return null;
  if (typeof record.voiceName !== 'string' || !record.voiceName.trim()) return null;

  return {
    voiceId: record.voiceId,
    voiceName: record.voiceName,
    alternateVoiceIds: normalizeAlternateVoiceIds(record.alternateVoiceIds, record.voiceId),
    category: typeof record.category === 'string' ? record.category : null,
    description: typeof record.description === 'string' ? record.description : null,
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
    sourceVoiceType: typeof record.sourceVoiceType === 'string' ? record.sourceVoiceType : null,
    addedAt: typeof record.addedAt === 'number' ? record.addedAt : 0,
  };
}

function toFavorite(voice: MediaProviderVoiceOption, alternateVoiceIds: string[] = []): DebateFavoriteVoice {
  return {
    voiceId: voice.id,
    voiceName: voice.name,
    alternateVoiceIds: normalizeAlternateVoiceIds(alternateVoiceIds, voice.id),
    category: voice.category,
    description: voice.description,
    labels: normalizeLabels(voice.labels),
    verifiedLanguages: voice.verifiedLanguages || voice.verified_languages,
    previewUrl: voice.previewUrl || voice.preview_url || null,
    sourceVoiceType: voice.sourceVoiceType || null,
    addedAt: Date.now(),
  };
}

function toVoiceOption(favorite: DebateFavoriteVoice): MediaProviderVoiceOption {
  return {
    id: favorite.voiceId,
    name: favorite.voiceName,
    voice_id: favorite.voiceId,
    category: favorite.category,
    description: favorite.description,
    labels: favorite.labels,
    verifiedLanguages: favorite.verifiedLanguages,
    verified_languages: favorite.verifiedLanguages,
    previewUrl: favorite.previewUrl || null,
    preview_url: favorite.previewUrl || null,
    sourceVoiceType: (favorite.sourceVoiceType as MediaProviderVoiceOption['sourceVoiceType']) || undefined,
    isBookmarked: true,
    is_bookmarked: true,
  };
}

async function readFavorites(): Promise<DebateFavoriteVoice[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeFavorite)
      .filter((favorite): favorite is DebateFavoriteVoice => Boolean(favorite))
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, MAX_FAVORITE_VOICES);
  } catch {
    return [];
  }
}

export class DebateVoiceFavoriteService {
  static async list(): Promise<MediaProviderVoiceOption[]> {
    return (await readFavorites()).map(toVoiceOption);
  }

  static async listIds(): Promise<string[]> {
    return (await readFavorites()).flatMap((favorite) => [
      favorite.voiceId,
      ...(favorite.alternateVoiceIds || []),
    ]);
  }

  static async add(voice: MediaProviderVoiceOption, alternateVoiceIds: string[] = []): Promise<void> {
    const current = await readFavorites();
    const incomingAlternateIds = normalizeAlternateVoiceIds(alternateVoiceIds, voice.id) || [];
    if (current.some((favorite) => (
      favorite.voiceId === voice.id
      || favorite.alternateVoiceIds?.includes(voice.id)
      || incomingAlternateIds.includes(favorite.voiceId)
      || incomingAlternateIds.some((id) => favorite.alternateVoiceIds?.includes(id))
    ))) return;
    const next = [toFavorite(voice, incomingAlternateIds), ...current].slice(0, MAX_FAVORITE_VOICES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  static async remove(voiceId: string): Promise<void> {
    const current = await readFavorites();
    const next = current.filter((favorite) => (
      favorite.voiceId !== voiceId && !favorite.alternateVoiceIds?.includes(voiceId)
    ));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

export default DebateVoiceFavoriteService;
