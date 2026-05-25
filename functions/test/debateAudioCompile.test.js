const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
  buildConcatFilter,
  DEFAULT_DEBATE_AUDIO_PAUSE_MS,
  normalizeCompileClips,
} = require('../lib/debateAudioCompile');

describe('debate audio compile helpers', () => {
  it('normalizes audio clip metadata for compile jobs', () => {
    const clips = normalizeCompileClips([
      {
        id: 'clip:1',
        fileName: '001 opening.mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: 1024,
        pauseAfterMs: 900,
      },
    ]);

    assert.deepEqual(clips, [
      {
        id: 'clip_1',
        fileName: '001_opening_mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: 1024,
        pauseAfterMs: 900,
      },
    ]);
  });

  it('defaults missing pauses to the debate handoff gap', () => {
    const clips = normalizeCompileClips([
      {
        id: 'clip:1',
        fileName: '001 opening.mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: 1024,
      },
    ]);

    assert.equal(clips[0].pauseAfterMs, DEFAULT_DEBATE_AUDIO_PAUSE_MS);
    assert.equal(DEFAULT_DEBATE_AUDIO_PAUSE_MS, 1500);
  });

  it('builds a concat filter for mixed clip and silence inputs', () => {
    assert.equal(
      buildConcatFilter(3),
      '[0:a]aresample=44100,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0];' +
        '[1:a]aresample=44100,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a1];' +
        '[2:a]aresample=44100,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a2];' +
        '[a0][a1][a2]concat=n=3:v=0:a=1[out]'
    );
  });
});
