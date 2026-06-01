export type StreamingDisplayMode = 'instant' | 'smooth';
export type LegacyStreamingDisplayMode = 'natural' | 'slow';
export type StreamingDisplayModeInput = StreamingDisplayMode | LegacyStreamingDisplayMode;

export const normalizeStreamingDisplayMode = (
  mode?: StreamingDisplayModeInput | null
): StreamingDisplayMode => (mode === 'instant' ? 'instant' : 'smooth');

export const getNextStreamingDisplayMode = (
  mode?: StreamingDisplayModeInput | null
): StreamingDisplayMode => (
  normalizeStreamingDisplayMode(mode) === 'instant' ? 'smooth' : 'instant'
);

export const formatStreamingDisplayMode = (
  mode?: StreamingDisplayModeInput | null
): string => (
  normalizeStreamingDisplayMode(mode) === 'instant' ? 'Instant' : 'Smooth'
);
