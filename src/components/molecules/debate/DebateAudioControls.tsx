import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/molecules/common/Typography';
import { useTheme } from '@/theme';

type PlaybackPhase = 'idle' | 'playing' | 'paused' | 'ended';

interface DebateAudioControlsProps {
  uri: string;
  voiceName?: string;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
}

function getPlaybackPhase(status: ReturnType<typeof useAudioPlayerStatus>): PlaybackPhase {
  if (status.didJustFinish) return 'ended';
  if (status.playing || status.playbackState === 'playing' || status.timeControlStatus === 'playing') return 'playing';
  if (status.currentTime > 0) return 'paused';
  return 'idle';
}

export const DebateAudioControls: React.FC<DebateAudioControlsProps> = ({ uri, voiceName }) => {
  const { theme, isDark } = useTheme();
  const player = useAudioPlayer(uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [phase, setPhase] = useState<PlaybackPhase>('idle');
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  useEffect(() => {
    if (!isSeeking) {
      setPhase(getPlaybackPhase(status));
    }
  }, [isSeeking, status]);

  const duration = Number.isFinite(status.duration) && status.duration > 0 ? status.duration : 0;
  const currentTime = isSeeking ? seekValue : Math.max(0, status.currentTime || 0);
  const canSeek = duration > 0;
  const accentColor = isDark ? theme.colors.primary[300] : theme.colors.primary[700];
  const trackColor = isDark ? theme.colors.border : theme.colors.primary[100];

  const playFromStart = useCallback(async () => {
    await player.seekTo(0, 0, 0).catch(() => undefined);
    setPhase('playing');
    requestAnimationFrame(() => {
      player.play();
    });
  }, [player]);

  const handlePlayPress = useCallback(() => {
    if (phase === 'playing') {
      player.pause();
      setPhase('paused');
      return;
    }

    if (phase === 'ended') {
      void playFromStart();
      return;
    }

    player.play();
    setPhase('playing');
  }, [phase, playFromStart, player]);

  const seekToTime = useCallback((value: number, shouldResume: boolean) => {
    if (!canSeek) return;
    const clamped = Math.max(0, Math.min(value, duration));
    const seek = player.seekTo(clamped, 0, 0);
    void seek.catch(() => undefined).finally(() => {
      if (shouldResume) {
        player.play();
        setPhase('playing');
      } else {
        setPhase(clamped > 0 ? 'paused' : 'idle');
      }
    });
  }, [canSeek, duration, player]);

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
    setSeekValue(currentTime);
    if (phase === 'playing') {
      player.pause();
    }
  }, [currentTime, phase, player]);

  const handleSeekChange = useCallback((value: number) => {
    setSeekValue(value);
  }, []);

  const handleSeekComplete = useCallback((value: number) => {
    const shouldResume = phase === 'playing';
    setIsSeeking(false);
    seekToTime(value, shouldResume);
  }, [phase, seekToTime]);

  const buttonIcon = useMemo(() => {
    if (phase === 'playing') return 'pause';
    if (phase === 'ended') return 'refresh';
    return 'play';
  }, [phase]);

  const label = phase === 'playing'
    ? 'Playing'
    : phase === 'ended'
      ? 'Replay'
      : phase === 'paused'
        ? 'Paused'
        : 'Ready';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.colors.overlays.medium : theme.colors.surface }]}>
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: theme.colors.primary[500] }]}
        onPress={handlePlayPress}
        accessibilityRole="button"
        accessibilityLabel={phase === 'playing' ? 'Pause debate audio' : phase === 'ended' ? 'Replay debate audio' : 'Play debate audio'}
        testID="debate-audio-play"
      >
        <Ionicons name={buttonIcon} size={20} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.body}>
        <Typography variant="caption" weight="semibold" style={{ color: theme.colors.text.primary }}>
          {voiceName ? `${label} · ${voiceName}` : label}
        </Typography>
        <View style={styles.progressRow}>
          <Typography variant="caption" color="secondary" style={styles.timeText}>
            {formatTime(currentTime)}
          </Typography>
          <Slider
            style={styles.slider}
            value={currentTime}
            minimumValue={0}
            maximumValue={duration || 1}
            disabled={!canSeek}
            onSlidingStart={handleSeekStart}
            onValueChange={handleSeekChange}
            onSlidingComplete={handleSeekComplete}
            minimumTrackTintColor={theme.colors.primary[500]}
            maximumTrackTintColor={trackColor}
            thumbTintColor={accentColor}
            accessibilityLabel="Debate audio position"
          />
          <Typography variant="caption" color="secondary" style={styles.timeText}>
            {formatTime(duration)}
          </Typography>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  slider: {
    flex: 1,
    height: 28,
  },
  timeText: {
    width: 40,
    textAlign: 'center',
  },
});
