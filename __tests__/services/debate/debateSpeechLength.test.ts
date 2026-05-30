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

  it('applies a generous safety ceiling but preserves expert mode parameters', () => {
    expect(applyDebateOutputTokenCap(undefined, 6144, false)).toEqual({ maxTokens: 6144 });
    expect(applyDebateOutputTokenCap({ temperature: 0.8, maxTokens: 1200 }, 6144, false)).toEqual({
      temperature: 0.8,
      maxTokens: 6144,
    });
    expect(applyDebateOutputTokenCap({ temperature: 0.2, maxTokens: 1200 }, 6144, true)).toEqual({
      temperature: 0.2,
      maxTokens: 1200,
    });
  });

  it('uses tighter token caps for voiced debates without changing text-only debates', () => {
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
    expect(voiced.maxTokens).toBe(550);
  });
});
