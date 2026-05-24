import {
  applyDebateOutputTokenCap,
  getDebateSpeechLengthGuidance,
} from '@/services/debate/debateSpeechLength';

describe('debateSpeechLength', () => {
  it('keeps Oxford opening speeches under mobile-friendly word budgets', () => {
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

    expect(classicOpening.maxWords).toBe(220);
    expect(extendedOpening.maxWords).toBe(264);
    expect(classicOpening.directive).toContain('words maximum');
    expect(classicOpening.maxTokens).toBeLessThan(600);
  });

  it('uses tighter caps for cross-examination turns', () => {
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

    expect(questioner.maxWords).toBe(90);
    expect(answerer.maxWords).toBe(110);
    expect(questioner.directive).toContain('not a mini-essay');
  });

  it('caps default debate output tokens but preserves expert mode parameters', () => {
    expect(applyDebateOutputTokenCap(undefined, 480, false)).toEqual({ maxTokens: 480 });
    expect(applyDebateOutputTokenCap({ temperature: 0.8, maxTokens: 1200 }, 480, false)).toEqual({
      temperature: 0.8,
      maxTokens: 480,
    });
    expect(applyDebateOutputTokenCap({ temperature: 0.2, maxTokens: 1200 }, 480, true)).toEqual({
      temperature: 0.2,
      maxTokens: 1200,
    });
  });
});
