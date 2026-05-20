import {
  ELEVENLABS_DEFAULT_SFX_MODEL,
  ELEVENLABS_DEFAULT_TTS_MODEL,
  MEDIA_PROVIDERS,
  RUNWAY_DEFAULT_VIDEO_MODEL,
  getMediaModels,
  getRunwayAspectRatios,
  getRunwayVideoDurations,
  isRunwayPromptRequired,
} from '@/config/mediaProviders';

describe('mediaProviders', () => {
  it('keeps Runway and ElevenLabs as media providers', () => {
    expect(MEDIA_PROVIDERS.map((provider) => provider.id)).toEqual(['runway', 'elevenlabs']);
  });

  it('returns operation-specific Runway options', () => {
    expect(getMediaModels('runway', 'text_to_video').map((model) => model.id)).toContain(RUNWAY_DEFAULT_VIDEO_MODEL);
    expect(getRunwayVideoDurations(RUNWAY_DEFAULT_VIDEO_MODEL, 'text_to_video')).toContain(5);
    expect(getRunwayAspectRatios(RUNWAY_DEFAULT_VIDEO_MODEL, 'image_to_video').map((ratio) => ratio.id)).toContain('960:960');
    expect(isRunwayPromptRequired('gen4_turbo', 'image_to_video')).toBe(false);
  });

  it('separates ElevenLabs voiceover and sound models', () => {
    expect(getMediaModels('elevenlabs', 'text_to_speech').map((model) => model.id)).toContain(ELEVENLABS_DEFAULT_TTS_MODEL);
    expect(getMediaModels('elevenlabs', 'sound_effect').map((model) => model.id)).toContain(ELEVENLABS_DEFAULT_SFX_MODEL);
  });
});
