import {
  FORMATS,
  SELECTABLE_FORMATS,
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
  it('keeps Socratic loadable for legacy sessions but out of selectable formats', () => {
    expect(FORMATS.socratic).toBeDefined();
    expect(Object.keys(SELECTABLE_FORMATS)).toEqual(['oxford', 'lincoln_douglas', 'policy']);
  });

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
          if (message.audienceQuestionTarget) {
            expect(['aff', 'neg']).toContain(message.audienceQuestionTarget);
            expect(message.phase).toBe('question');
          }
        });

        if (preset.voteModel === 'audience_stance') {
          expect(preset.voteCount).toBe(2);
          expect(preset.initialVoteRequired).toBe(true);
          expect(preset.finalVoteRequired).toBe(true);
        } else {
          expect(preset.voteCount).toBe(
            preset.messages.filter((message) => message.voteAfter).length
          );
        }
      });
    });
  });

  it('keeps Oxford 1v1 as audience-voted opening, floor, and closing speeches', () => {
    const preset = getPresetForFormat('oxford', 'short');

    expect(preset.label).toBe('1v1');
    expect(preset.shortLabel).toBe('1v1');
    expect(preset.messages.map((message) => `${message.speaker}:${message.phase}:${message.label}`)).toEqual([
      'aff:opening:Affirmative Opening Statement',
      'neg:opening:Negative Opening Statement',
      'aff:rebuttal:Affirmative Floor Speech',
      'neg:rebuttal:Negative Floor Speech',
      'aff:closing:Affirmative Closing Speech',
      'neg:closing:Negative Closing Speech',
    ]);
    expect(preset.voteModel).toBe('audience_stance');
    expect(preset.teamMode).toBe('duel');
    expect(preset.teamSize).toBe(1);
    expect(preset.messages.some((message) => message.voteAfter)).toBe(false);
  });

  it('defines Oxford 2v2 and Q&A as 2v2 team formats', () => {
    const full = getPresetForFormat('oxford', 'standard');
    const qAndA = getPresetForFormat('oxford', 'long');

    expect(full.label).toBe('2v2');
    expect(qAndA.label).toBe('2v2 + Q&A');

    [full, qAndA].forEach((preset) => {
      expect(preset.voteModel).toBe('audience_stance');
      expect(preset.teamMode).toBe('team');
      expect(preset.teamSize).toBe(2);
      expect(preset.messages.map((message) => message.speakerSlot)).toContain(1);
      expect(preset.messages.some((message) => message.voteAfter)).toBe(false);
    });
  });

  it('adds Oxford audience Q&A turns after first arguments', () => {
    const preset = getPresetForFormat('oxford', 'long');

    expect(preset.audienceQuestionCheckpoint).toEqual({
      afterMessageIndex: 3,
      required: true,
    });
    expect(preset.messages.map((message) => ({
      label: message.label,
      phase: message.phase,
      speaker: message.speaker,
      speakerSlot: message.speakerSlot,
      audienceQuestionTarget: message.audienceQuestionTarget,
    }))).toEqual([
      { label: 'Affirmative Opening Statement', phase: 'opening', speaker: 'aff', speakerSlot: 0, audienceQuestionTarget: undefined },
      { label: 'Negative Opening Statement', phase: 'opening', speaker: 'neg', speakerSlot: 0, audienceQuestionTarget: undefined },
      { label: 'Affirmative First Argument', phase: 'rebuttal', speaker: 'aff', speakerSlot: 1, audienceQuestionTarget: undefined },
      { label: 'Negative First Argument', phase: 'rebuttal', speaker: 'neg', speakerSlot: 1, audienceQuestionTarget: undefined },
      { label: 'Affirmative Audience Question Response', phase: 'question', speaker: 'aff', speakerSlot: 0, audienceQuestionTarget: 'aff' },
      { label: 'Negative Audience Question Response', phase: 'question', speaker: 'neg', speakerSlot: 0, audienceQuestionTarget: 'neg' },
      { label: 'Affirmative Summary Speech', phase: 'closing', speaker: 'aff', speakerSlot: 1, audienceQuestionTarget: undefined },
      { label: 'Negative Summary Speech', phase: 'closing', speaker: 'neg', speakerSlot: 1, audienceQuestionTarget: undefined },
    ]);
  });

  it('keeps Lincoln-Douglas standard cross-examination roles explicit', () => {
    const preset = getPresetForFormat('lincoln_douglas', 'standard');

    expect(preset.description).toBe('Full value round with CX after each constructive');
    expect(preset.messages.filter((message) => message.voteAfter).map((message) => message.votingLabel)).toEqual([
      'AC value + CX',
      'NC/1NR value + CX',
      '1AR value clash',
      'NR/2NR weighing',
      '2AR ballot',
    ]);
    expect(preset.messages.map((message) => ({
      label: message.label,
      phase: message.phase,
      speaker: message.speaker,
      cxRole: message.cxRole,
    }))).toEqual([
      { label: 'Affirmative Constructive (AC)', phase: 'constructive', speaker: 'aff', cxRole: undefined },
      { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
      { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer' },
      { label: 'Negative Constructive / 1NR (NC/1NR)', phase: 'constructive', speaker: 'neg', cxRole: undefined },
      { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
      { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer' },
      { label: 'First Affirmative Rebuttal (1AR)', phase: 'rebuttal', speaker: 'aff', cxRole: undefined },
      { label: 'Negative Rebuttal / 2NR (NR/2NR)', phase: 'rebuttal', speaker: 'neg', cxRole: undefined },
      { label: 'Second Affirmative Rebuttal (2AR)', phase: 'final_rebuttal', speaker: 'aff', cxRole: undefined },
    ]);
  });

  it('keeps Policy standard cross-examination and rebuttal order', () => {
    const preset = getPresetForFormat('policy', 'standard');

    expect(preset.description).toBe('Full policy round with CX after each constructive');
    expect(preset.messages.filter((message) => message.voteAfter).map((message) => message.votingLabel)).toEqual([
      '1AC plan + CX',
      '1NC burden + CX',
      '2AC solvency + CX',
      '2NC impact + CX',
      '2AR ballot',
    ]);
    expect(preset.messages.map((message) => `${message.speaker}:${message.label}:${message.cxRole ?? 'speech'}`)).toEqual([
      'aff:1AC:speech',
      'neg:CX after 1AC:questioner',
      'aff:CX after 1AC:answerer',
      'neg:1NC:speech',
      'aff:CX after 1NC:questioner',
      'neg:CX after 1NC:answerer',
      'aff:2AC:speech',
      'neg:CX after 2AC:questioner',
      'aff:CX after 2AC:answerer',
      'neg:2NC:speech',
      'aff:CX after 2NC:questioner',
      'neg:CX after 2NC:answerer',
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
