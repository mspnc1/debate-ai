import { setAudioModeAsync } from 'expo-audio';
import {
  activateBackgroundAudioPlayer,
  clearBackgroundAudioPlayer,
  pauseBackgroundAudioPlayer,
  playWithBackgroundAudio,
  resetBackgroundAudioPlaybackForTesting,
  type BackgroundAudioPlayer,
} from '@/services/audio/backgroundAudioPlayback';

const mockedSetAudioModeAsync = setAudioModeAsync as jest.Mock;

function createPlayer(): BackgroundAudioPlayer & {
  play: jest.Mock;
  pause: jest.Mock;
  setActiveForLockScreen: jest.Mock;
  clearLockScreenControls: jest.Mock;
} {
  return {
    play: jest.fn(),
    pause: jest.fn(),
    setActiveForLockScreen: jest.fn(),
    clearLockScreenControls: jest.fn(),
  };
}

describe('backgroundAudioPlayback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBackgroundAudioPlaybackForTesting();
  });

  it('configures background audio mode before playback', async () => {
    const player = createPlayer();

    await playWithBackgroundAudio(player, {
      title: 'Opening statement',
      artist: 'Voice One',
      albumTitle: 'Debate',
    });

    expect(mockedSetAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }));
    expect(player.setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        title: 'Opening statement',
        artist: 'Voice One',
        albumTitle: 'Debate',
      }),
      expect.objectContaining({
        showSeekBackward: true,
        showSeekForward: true,
      })
    );
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('reuses the configured audio mode', async () => {
    const player = createPlayer();

    await playWithBackgroundAudio(player, { title: 'One' });
    await playWithBackgroundAudio(player, { title: 'Two' });

    expect(mockedSetAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('pauses and clears the previous active player when another starts', () => {
    const first = createPlayer();
    const second = createPlayer();

    activateBackgroundAudioPlayer(first, { title: 'First' });
    activateBackgroundAudioPlayer(second, { title: 'Second' });

    expect(first.pause).toHaveBeenCalledTimes(1);
    expect(first.clearLockScreenControls).toHaveBeenCalledTimes(1);
    expect(second.setActiveForLockScreen).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ title: 'Second' }),
      expect.any(Object)
    );
  });

  it('clears controls for explicit pauses and ended playback', () => {
    const player = createPlayer();

    activateBackgroundAudioPlayer(player, { title: 'Clip' });
    pauseBackgroundAudioPlayer(player, { clearControls: true });
    clearBackgroundAudioPlayer(player);

    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.clearLockScreenControls).toHaveBeenCalledTimes(1);
  });
});
