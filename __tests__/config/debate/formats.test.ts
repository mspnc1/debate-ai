import {
  FORMATS,
  getPresetForFormat,
  getPresetIdForRounds,
  type PhaseId,
} from '@/config/debate/formats';

const VALID_PHASES = new Set<PhaseId>([
  'opening',
  'constructive',
  'cross_examination',
  'rebuttal',
  'final_rebuttal',
  'question',
  'closing',
  'synthesis',
]);

describe('debate format definitions', () => {
  it('defines populated presets with valid message roles and vote counts', () => {
    Object.values(FORMATS).forEach((format) => {
      expect(format.presets.length).toBeGreaterThan(0);

      format.presets.forEach((preset) => {
        expect(preset.messages.length).toBeGreaterThan(0);

        preset.messages.forEach((message) => {
          expect(message.label.length).toBeGreaterThan(0);
          expect(VALID_PHASES.has(message.phase)).toBe(true);
          expect(['aff', 'neg']).toContain(message.speaker);
          if (message.cxRole) {
            expect(['questioner', 'answerer']).toContain(message.cxRole);
            expect(message.phase).toBe('cross_examination');
          }
        });

        expect(preset.voteCount).toBe(
          preset.messages.filter((message) => message.voteAfter).length
        );
      });
    });
  });

  it('keeps Oxford short as opening, rebuttal, and closing exchanges', () => {
    const preset = getPresetForFormat('oxford', 'short');

    expect(preset.messages.map((message) => `${message.speaker}:${message.phase}:${message.label}`)).toEqual([
      'aff:opening:Opening Statement',
      'neg:opening:Opening Statement',
      'aff:rebuttal:Rebuttal',
      'neg:rebuttal:Rebuttal',
      'aff:closing:Closing Statement',
      'neg:closing:Closing Statement',
    ]);
  });

  it('keeps Lincoln-Douglas standard cross-examination roles explicit', () => {
    const preset = getPresetForFormat('lincoln_douglas', 'standard');

    expect(preset.messages.map((message) => ({
      label: message.label,
      phase: message.phase,
      speaker: message.speaker,
      cxRole: message.cxRole,
    }))).toEqual([
      { label: 'Affirmative Constructive (AC)', phase: 'constructive', speaker: 'aff', cxRole: undefined },
      { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
      { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer' },
      { label: 'Negative Constructive (NC)', phase: 'constructive', speaker: 'neg', cxRole: undefined },
      { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
      { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer' },
      { label: 'Affirmative Rebuttal (AR)', phase: 'rebuttal', speaker: 'aff', cxRole: undefined },
      { label: 'Negative Rebuttal (NR)', phase: 'final_rebuttal', speaker: 'neg', cxRole: undefined },
    ]);
  });

  it('keeps Policy standard cross-examination and rebuttal order', () => {
    const preset = getPresetForFormat('policy', 'standard');

    expect(preset.messages.map((message) => `${message.speaker}:${message.label}:${message.cxRole ?? 'speech'}`)).toEqual([
      'aff:1AC:speech',
      'neg:CX after 1AC:questioner',
      'aff:CX after 1AC:answerer',
      'neg:1NC:speech',
      'aff:CX after 1NC:questioner',
      'neg:CX after 1NC:answerer',
      'aff:2AC:speech',
      'neg:2NC:speech',
      'neg:1NR:speech',
      'aff:1AR:speech',
      'neg:2NR:speech',
      'aff:2AR:speech',
    ]);
  });

  it('maps legacy rounds to preset ids', () => {
    expect(getPresetIdForRounds(3)).toBe('short');
    expect(getPresetIdForRounds(5)).toBe('standard');
    expect(getPresetIdForRounds(7)).toBe('long');
    expect(getPresetIdForRounds(undefined)).toBe('short');
  });
});
