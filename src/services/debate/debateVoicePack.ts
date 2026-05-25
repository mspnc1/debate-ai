import * as FileSystem from 'expo-file-system/legacy';
import type { GeneratedMediaEntry } from '@/store/createSlice';
import { getMediaExtension } from '@/services/media/mediaFileCache';
import type { AI, Message, MessageAttachment } from '@/types';
import type { DebateVoicePackClip, DebateVoicePackCompiledAudio, DebateVoicePackManifest, DebateVoicePackParticipant } from '@/types/media';

export const DEBATE_VOICE_PACK_PAUSE_MS = 900;

const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
const normalizedBaseDirectory = baseDirectory.endsWith('/') ? baseDirectory : `${baseDirectory}/`;
const VOICE_PACK_ROOT_DIR = `${normalizedBaseDirectory}gallery-voice-packs/`;
const PODCAST_ROOT_DIR = `${normalizedBaseDirectory}gallery-podcasts/`;

export type DebateVoicePackCandidateStatus = 'ready' | 'generating' | 'failed' | 'missing';

export interface DebateVoicePackCandidate {
  id: string;
  message: Message;
  order: number;
  status: DebateVoicePackCandidateStatus;
  role: 'debater' | 'mc';
  speakerId?: string;
  speakerName: string;
  speechLabel?: string;
  voiceName?: string;
  textPreview: string;
  uri?: string;
  mimeType?: string;
  error?: string;
}

interface CreateDebateVoicePackGalleryEntryRequest {
  sessionId: string;
  topic: string;
  participants: AI[];
  candidates: DebateVoicePackCandidate[];
  selectedCandidateIds: string[];
  playlistKind?: 'debate_voice_pack' | 'debate_podcast_playlist';
  pauseMs?: number;
}

interface CreateDebateVoicePackGalleryEntryDependencies {
  now?: () => number;
  copyAsync?: typeof FileSystem.copyAsync;
}

interface BuildDebatePodcastCompilePlanRequest {
  sessionId: string;
  topic: string;
  participants: AI[];
  candidates: DebateVoicePackCandidate[];
  selectedCandidateIds: string[];
  pauseMs?: number;
}

interface BuildDebatePodcastCompilePlanDependencies {
  now?: () => number;
}

export interface DebatePodcastCompilePlan {
  id: string;
  manifest: DebateVoicePackManifest;
  selectedClipCount: number;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function ensureDirectory(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

function getAudioAttachment(message: Message): MessageAttachment | undefined {
  return message.attachments?.find((attachment) => attachment.type === 'audio' && Boolean(attachment.uri));
}

function getSpeakerId(message: Message): string | undefined {
  if (message.metadata?.debateInterstitial) {
    return 'podcast-mc';
  }
  return message.metadata?.providerId;
}

function getSpeakerName(message: Message): string {
  if (message.metadata?.debateInterstitial) {
    return 'Debate MC';
  }
  return message.sender.replace(/\s+\([^)]*\)$/, '');
}

function getTextPreview(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 120) return normalized;
  return `${normalized.slice(0, 117)}...`;
}

function getCandidateStatus(message: Message): DebateVoicePackCandidateStatus {
  const status = message.metadata?.debateAudio?.status;
  if (status === 'ready') return 'ready';
  if (status === 'generating') return 'generating';
  if (status === 'failed') return 'failed';
  return 'missing';
}

export function getDebateVoicePackCandidates(messages: Message[]): DebateVoicePackCandidate[] {
  return messages
    .filter((message) => Boolean(message.metadata?.debateSpeech || message.metadata?.debateInterstitial))
    .map((message, index) => {
      const attachment = getAudioAttachment(message);
      const audio = message.metadata?.debateAudio;
      const uri = attachment?.uri || (audio?.status === 'ready' ? audio.uri : undefined);
      const mimeType = attachment?.mimeType || audio?.mimeType;
      const interstitial = message.metadata?.debateInterstitial;

      return {
        id: message.id,
        message,
        order: index,
        status: getCandidateStatus(message),
        role: interstitial ? 'mc' : 'debater',
        speakerId: getSpeakerId(message),
        speakerName: getSpeakerName(message),
        speechLabel: interstitial?.label || message.metadata?.debateSpeech?.label,
        voiceName: audio?.voiceName,
        textPreview: getTextPreview(message.content),
        uri,
        mimeType,
        error: audio?.error,
      };
    });
}

function getParticipantSummary(participants: AI[]): DebateVoicePackParticipant[] {
  return participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
  }));
}

function getSelectedReadyCandidates(
  candidates: DebateVoicePackCandidate[],
  selectedCandidateIds: string[]
): DebateVoicePackCandidate[] {
  const selectedIds = new Set(selectedCandidateIds);
  return candidates
    .filter((candidate) => selectedIds.has(candidate.id) && candidate.status === 'ready')
    .sort((a, b) => a.order - b.order);
}

function getCandidateFileName(candidate: DebateVoicePackCandidate, index: number): string {
  const extension = getMediaExtension(candidate.mimeType || 'audio/mpeg', 'audio');
  return `${String(index + 1).padStart(3, '0')}_${sanitizePathSegment(candidate.message.id)}.${extension}`;
}

function mapCandidateToClip(
  candidate: DebateVoicePackCandidate,
  index: number,
  uri: string,
  pauseMs: number
): DebateVoicePackClip {
  return {
    id: `${candidate.message.id}_${index}`,
    messageId: candidate.message.id,
    order: index,
    speakerId: candidate.speakerId,
    speakerName: candidate.speakerName,
    role: candidate.role,
    speechLabel: candidate.speechLabel,
    voiceName: candidate.voiceName,
    textPreview: candidate.textPreview,
    uri,
    mimeType: candidate.mimeType || 'audio/mpeg',
    fileName: getCandidateFileName(candidate, index),
    pauseAfterMs: pauseMs,
  };
}

async function copyCandidateToVoicePack(
  candidate: DebateVoicePackCandidate,
  index: number,
  targetDirectory: string,
  pauseMs: number,
  copyAsync: typeof FileSystem.copyAsync
): Promise<DebateVoicePackClip> {
  if (!candidate.uri || !candidate.mimeType) {
    throw new Error(`Voice clip for ${candidate.speakerName} is unavailable.`);
  }

  const fileName = getCandidateFileName(candidate, index);
  const targetUri = `${targetDirectory}${fileName}`;

  await copyAsync({ from: candidate.uri, to: targetUri });

  return mapCandidateToClip(candidate, index, targetUri, pauseMs);
}

export function buildDebatePodcastCompilePlan(
  request: BuildDebatePodcastCompilePlanRequest,
  dependencies: BuildDebatePodcastCompilePlanDependencies = {}
): DebatePodcastCompilePlan {
  const now = dependencies.now || Date.now;
  const createdAt = now();
  const id = `debate_podcast_${sanitizePathSegment(request.sessionId)}_${createdAt}`;
  const pauseMs = request.pauseMs ?? DEBATE_VOICE_PACK_PAUSE_MS;
  const selectedCandidates = getSelectedReadyCandidates(request.candidates, request.selectedCandidateIds);

  if (selectedCandidates.length === 0) {
    throw new Error('Select at least one ready voice clip before generating a podcast file.');
  }

  const missingClip = selectedCandidates.find((candidate) => !candidate.uri || !candidate.mimeType);
  if (missingClip) {
    throw new Error(`Voice clip for ${missingClip.speakerName} is unavailable.`);
  }

  const topic = request.topic.trim() || 'AI Debate';
  const directoryUri = `${PODCAST_ROOT_DIR}${id}/`;
  const clips = selectedCandidates.map((candidate, index) => (
    mapCandidateToClip(candidate, index, candidate.uri || '', pauseMs)
  ));

  return {
    id,
    selectedClipCount: clips.length,
    manifest: {
      kind: 'debate_podcast_playlist',
      version: 1,
      sessionId: request.sessionId,
      topic,
      participants: getParticipantSummary(request.participants),
      clips,
      pauseMs,
      directoryUri,
      createdAt,
    },
  };
}

export function createDebatePodcastGalleryEntry(
  plan: DebatePodcastCompilePlan,
  compiledAudio: DebateVoicePackCompiledAudio
): GeneratedMediaEntry {
  return {
    id: plan.id,
    mediaType: 'audio',
    providerId: 'elevenlabs',
    modelId: 'debate_podcast',
    operation: 'debate_podcast_playlist',
    prompt: `Debate podcast: ${plan.manifest.topic}`,
    uri: compiledAudio.uri,
    remoteUrl: compiledAudio.remoteUrl,
    mimeType: compiledAudio.mimeType,
    status: 'succeeded',
    createdAt: compiledAudio.createdAt,
    expiresAt: compiledAudio.expiresAt,
  };
}

export async function createDebateVoicePackGalleryEntry(
  request: CreateDebateVoicePackGalleryEntryRequest,
  dependencies: CreateDebateVoicePackGalleryEntryDependencies = {}
): Promise<GeneratedMediaEntry> {
  const now = dependencies.now || Date.now;
  const copyAsync = dependencies.copyAsync || FileSystem.copyAsync;
  const createdAt = now();
  const playlistKind = request.playlistKind || 'debate_voice_pack';
  const isPodcastPlaylist = playlistKind === 'debate_podcast_playlist';
  const idPrefix = isPodcastPlaylist ? 'debate_podcast' : 'debate_voice_pack';
  const id = `${idPrefix}_${sanitizePathSegment(request.sessionId)}_${createdAt}`;
  const pauseMs = request.pauseMs ?? DEBATE_VOICE_PACK_PAUSE_MS;
  const selectedCandidates = getSelectedReadyCandidates(request.candidates, request.selectedCandidateIds);

  if (selectedCandidates.length === 0) {
    throw new Error('Select at least one ready voice clip before saving a voice pack.');
  }

  const directoryUri = `${VOICE_PACK_ROOT_DIR}${id}/`;
  await ensureDirectory(directoryUri);
  const clips = await Promise.all(
    selectedCandidates.map((candidate, index) => (
      copyCandidateToVoicePack(candidate, index, directoryUri, pauseMs, copyAsync)
    ))
  );

  const topic = request.topic.trim() || 'AI Debate';
  const prompt = `${isPodcastPlaylist ? 'Podcast playlist' : 'Voice pack'}: ${topic}`;

  return {
    id,
    mediaType: 'audio',
    providerId: 'elevenlabs',
    modelId: isPodcastPlaylist ? 'debate_podcast_playlist' : 'debate_voice_pack',
    operation: isPodcastPlaylist ? 'debate_podcast_playlist' : 'debate_voice_pack',
    prompt,
    uri: clips[0].uri,
    mimeType: clips[0].mimeType,
    status: 'succeeded',
    createdAt,
    voicePack: {
      kind: playlistKind,
      version: 1,
      sessionId: request.sessionId,
      topic,
      participants: getParticipantSummary(request.participants),
      clips,
      pauseMs,
      directoryUri,
      createdAt,
    },
  };
}
