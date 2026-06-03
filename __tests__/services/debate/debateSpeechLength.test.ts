import {
  applyDebateOutputTokenCap,
  getDebateSpeechLengthGuidance,
} from '@/services/debate/debateSpeechLength';

describe('debateSpeechLength', () => {
  it('uses qualitative Oxford opening guidance with a generous safety token ceiling', () => {
    const classicOpening = getDebateSpeechLengthGuidance({
      formatId: 'oxford',
      presetId: 'short',
      phase: 'opening',
    });
    const extendedOpening = getDebateSpeechLengthGuidance({
      formatId: 'oxford',
      presetId: 'long',
      phase: 'opening',
    });

    expect(classicOpening.directive).toContain('compact opening');
    expect(classicOpening.directive).toContain('2-3 short paragraphs');
    expect(classicOpening.directive).not.toContain('words maximum');
    expect(extendedOpening.directive).toBe(classicOpening.directive);
    expect(classicOpening.maxTokens).toBe(6144);
  });

  it('uses qualitative guidance for cross-examination turns', () => {
    const questioner = getDebateSpeechLengthGuidance({
      formatId: 'lincoln_douglas',
      phase: 'cross_examination',
      cxRole: 'questioner',
    });
    const answerer = getDebateSpeechLengthGuidance({
      formatId: 'lincoln_douglas',
      phase: 'cross_examination',
      cxRole: 'answerer',
    });

    expect(questioner.directive).toContain('Ask a few direct questions');
    expect(answerer.directive).toContain('Answer directly and briefly');
    expect(answerer.directive).toContain('mini-essay');
    expect(questioner.directive).not.toContain('words');
  });

  it('applies the safety ceiling as a floor that a low expert/personality cap cannot lower', () => {
    // No caller params -> the floor.
    expect(applyDebateOutputTokenCap(undefined, 6144)).toEqual({ maxTokens: 6144 });
    // A lower caller maxTokens is raised to the floor; other params pass through untouched.
    expect(applyDebateOutputTokenCap({ temperature: 0.8, maxTokens: 1200 }, 6144)).toEqual({
      temperature: 0.8,
      maxTokens: 6144,
    });
    // A higher caller maxTokens (e.g. expert raising the ceiling) is preserved.
    expect(applyDebateOutputTokenCap({ temperature: 0.2, maxTokens: 9000 }, 6144)).toEqual({
      temperature: 0.2,
      maxTokens: 9000,
    });
  });

  it('uses a generous voice safety ceiling without changing text-only debates', () => {
    const textOnly = getDebateSpeechLengthGuidance({
      formatId: 'oxford',
      presetId: 'short',
      phase: 'opening',
    });
    const voiced = getDebateSpeechLengthGuidance({
      formatId: 'oxford',
      presetId: 'short',
      phase: 'opening',
      voiceMode: true,
    });

    expect(textOnly.maxTokens).toBe(6144);
    expect(voiced.maxWords).toBe(textOnly.maxWords);
    // Voice is a generous runaway safety net (well above the TTS budget), not a length control.
    expect(voiced.maxTokens).toBe(1536);
  });
});
