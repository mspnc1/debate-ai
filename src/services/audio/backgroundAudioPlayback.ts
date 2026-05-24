import { setAudioModeAsync } from 'expo-audio';
import type { AudioMetadata } from 'expo-audio';

type LockScreenOptions = {
  showSeekForward?: boolean;
  showSeekBackward?: boolean;
};

export interface BackgroundAudioPlayer {
  play: () => void;
  pause: () => void;
  setActiveForLockScreen?: (
    active: boolean,
    metadata?: AudioMetadata,
    options?: LockScreenOptions
  ) => void;
  updateLockScreenMetadata?: (metadata: AudioMetadata) => void;
  clearLockScreenControls?: () => void;
}

export interface BackgroundAudioMetadata {
  title?: string;
  artist?: string;
  albumTitle?: string;
  artworkUrl?: string;
}

const LOCK_SCREEN_OPTIONS: LockScreenOptions = {
  showSeekBackward: true,
  showSeekForward: true,
};

let audioModePromise: Promise<void> | null = null;
let audioModeConfigured = false;
let activePlayer: BackgroundAudioPlayer | null = null;

function warn(message: string, error?: unknown): void {
  console.warn(`[BackgroundAudioPlayback] ${message}`, error);
}

function cleanText(value?: string): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function buildMetadata(metadata: BackgroundAudioMetadata): AudioMetadata {
  return {
    title: cleanText(metadata.title) || 'Symposium AI Audio',
    artist: cleanText(metadata.artist),
    albumTitle: cleanText(metadata.albumTitle) || 'Symposium AI',
    artworkUrl: cleanText(metadata.artworkUrl),
  };
}

export function configureBackgroundAudioPlayback(): Promise<void> {
  if (audioModeConfigured) {
    return Promise.resolve();
  }

  if (!audioModePromise) {
    audioModePromise = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).then(() => {
      audioModeConfigured = true;
    }).catch((error) => {
      audioModePromise = null;
      warn('Failed to configure background audio mode.', error);
    });
  }

  return audioModePromise;
}

function clearLockScreenControls(player: BackgroundAudioPlayer): void {
  try {
    player.clearLockScreenControls?.();
  } catch (error) {
    warn('Failed to clear lock screen controls.', error);
  }
}

export function activateBackgroundAudioPlayer(
  player: BackgroundAudioPlayer,
  metadata: BackgroundAudioMetadata
): void {
  if (activePlayer && activePlayer !== player) {
    try {
      activePlayer.pause();
    } catch (error) {
      warn('Failed to pause previous background audio player.', error);
    }
    clearLockScreenControls(activePlayer);
  }

  activePlayer = player;

  try {
    player.setActiveForLockScreen?.(true, buildMetadata(metadata), LOCK_SCREEN_OPTIONS);
  } catch (error) {
    warn('Failed to activate lock screen controls.', error);
  }
}

export async function playWithBackgroundAudio(
  player: BackgroundAudioPlayer,
  metadata: BackgroundAudioMetadata
): Promise<void> {
  await configureBackgroundAudioPlayback();
  activateBackgroundAudioPlayer(player, metadata);
  player.play();
}

export function pauseBackgroundAudioPlayer(
  player: BackgroundAudioPlayer,
  options: { clearControls?: boolean } = {}
): void {
  player.pause();

  if (options.clearControls && activePlayer === player) {
    clearLockScreenControls(player);
    activePlayer = null;
  }
}

export function clearBackgroundAudioPlayer(player: BackgroundAudioPlayer): void {
  if (activePlayer !== player) {
    return;
  }

  clearLockScreenControls(player);
  activePlayer = null;
}

export function forgetBackgroundAudioPlayer(player: BackgroundAudioPlayer): void {
  if (activePlayer === player) {
    activePlayer = null;
  }
}

export function resetBackgroundAudioPlaybackForTesting(): void {
  audioModePromise = null;
  audioModeConfigured = false;
  activePlayer = null;
}
