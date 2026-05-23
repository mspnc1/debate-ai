import { DebatePromptBuilder } from '@/services/debate/DebatePromptBuilder';
import { DEBATE_CONSTANTS } from '@/config/debateConstants';
import type { AI, Message } from '@/types';
import {
  LINCOLN_DOUGLAS_FORMAT,
  OXFORD_FORMAT,
  POLICY_FORMAT,
  SOCRATIC_FORMAT,
} from '@/config/debate/formats';

describe('DebatePromptBuilder', () => {
  const builder = new DebatePromptBuilder();
  const claude: AI = { id: 'claude', provider: 'claude', name: 'Claude', model: 'claude-3' };
  const gpt: AI = { id: 'gpt4', provider: 'openai', name: 'GPT-4o', model: 'gpt-4o' };

  it('creates phase-aware prompts with stance guidance', () => {
    const prompt = builder.buildTurnPrompt({
      topic: 'AI should assist in education.',
      phase: 'rebuttal',
      previousMessage: 'The opponent argued that AI removes teachers.',
      isFinalRound: false,
      guidance: 'Stay factual and cite evidence.',
      civilityLevel: 4,
      format: OXFORD_FORMAT,
      personalityId: 'george',
    });

    expect(prompt).toContain('Turn: Rebuttal');
    expect(prompt).toContain('Directly refute');
    expect(prompt).toContain('AI should assist in education.');
    expect(prompt).toContain('Use PG-13 observational satire');
    expect(prompt).toContain('mild profanity is allowed sparingly');
    expect(prompt).not.toContain('PG humor');
    expect(prompt).toContain('Tone: neutral and professional');
    expect(prompt).toContain(DEBATE_CONSTANTS.PROMPT_MARKERS.PREVIOUS_SPEAKER);
  });

  it('adds Lincoln-Douglas value and criterion constraints', () => {
    const prompt = builder.buildTurnPrompt({
      topic: 'Civil disobedience is morally justified.',
      phase: 'constructive',
      format: LINCOLN_DOUGLAS_FORMAT,
    });

    expect(prompt).toContain('central value and criterion');
    expect(prompt).toContain('Do not drift into a policy plan');
  });

  it('adds Policy cross-examination and weighing constraints', () => {
    const cxPrompt = builder.buildTurnPrompt({
      topic: 'The city should adopt congestion pricing.',
      phase: 'cross_examination',
      cxRole: 'questioner',
      format: POLICY_FORMAT,
    });
    const rebuttalPrompt = builder.buildTurnPrompt({
      topic: 'The city should adopt congestion pricing.',
      phase: 'rebuttal',
      previousMessage: 'The plan creates enforcement costs.',
      format: POLICY_FORMAT,
    });

    expect(cxPrompt).toContain('clarify plan text');
    expect(cxPrompt).toContain('impact chain');
    expect(rebuttalPrompt).toContain('compare impacts');
    expect(rebuttalPrompt).toContain('decision rule');
  });

  it('keeps Socratic turns question-led and assumption-focused', () => {
    const prompt = builder.buildTurnPrompt({
      topic: 'Technology makes us less free.',
      phase: 'question',
      format: SOCRATIC_FORMAT,
    });

    expect(prompt).toContain('question-led');
    expect(prompt).toContain('surface assumptions');
  });

  it('extracts previous opponent message while skipping current speaker', () => {
    const messages: Message[] = [
      {
        id: '1',
        sender: 'Claude',
        senderType: 'ai',
        content: 'Opening statement.',
        timestamp: 1,
      },
      {
        id: '2',
        sender: 'GPT-4o',
        senderType: 'ai',
        content: 'Rebuttal point.',
        timestamp: 2,
      },
    ];

    expect(builder.extractPreviousMessage(messages, claude)).toBe('Rebuttal point.');
    expect(builder.extractPreviousMessage(messages, gpt)).toBe('Opening statement.');
  });

  it('ensures debate mode marker is present and validates prompt content', () => {
    const rawPrompt = 'Continue debating the motion.';
    const withMarker = builder.addDebateModeMarker(rawPrompt);
    expect(withMarker.startsWith(DEBATE_CONSTANTS.PROMPT_MARKERS.DEBATE_MODE)).toBe(true);

    const validation = builder.validatePrompt(withMarker);
    expect(validation.valid).toBe(true);

    const invalid = builder.validatePrompt('');
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toContain('Prompt cannot be empty');
  });
});
