/**
 * Debate Prompt Builder Service
 * Handles construction of prompts for different phases of debate
 */

import { AI, Message, PersonalityTone, PersonalityDebateProfile } from '../../types';
import { DEBATE_CONSTANTS } from '../../config/debateConstants';
import type { FormatSpec, PhaseId } from '../../config/debate/formats';
import { generateStyleNudge } from '@/lib/personality';

export interface PromptContext {
  topic: string;
  ai: AI;
  personalityId?: string;
  isFirstMessage: boolean;
  isLastRound: boolean;
  previousMessage?: string;
  roundNumber: number;
  messageCount: number;
}

type CxRole = 'questioner' | 'answerer';

const getFormatPhaseConstraint = (
  formatId: FormatSpec['id'] | undefined,
  phase: PhaseId,
  cxRole?: CxRole
): string => {
  switch (formatId) {
    case 'lincoln_douglas':
      if (phase === 'constructive') {
        return 'Lincoln-Douglas structure: define the central value and criterion, then organize contentions under that standard. Do not drift into a policy plan.';
      }
      if (phase === 'cross_examination') {
        return cxRole === 'questioner'
          ? 'Lincoln-Douglas CX: test definitions, the value criterion, and whether contentions actually link back to that standard.'
          : 'Lincoln-Douglas CX: answer directly, defend your value and criterion, and do not introduce a new constructive case.';
      }
      if (phase === 'rebuttal' || phase === 'final_rebuttal' || phase === 'closing') {
        return 'Lincoln-Douglas weighing: compare the value clash and criterion directly; explain why your standard decides the round.';
      }
      return '';
    case 'policy':
      if (phase === 'constructive') {
        return 'Policy structure: identify the plan, counterplan, or status quo burden; explain solvency, harms or advantages, and impact links.';
      }
      if (phase === 'cross_examination') {
        return cxRole === 'questioner'
          ? 'Policy CX: clarify plan text, solvency mechanism, burden, and the impact chain.'
          : 'Policy CX: answer concessions directly, defend the plan, counterplan, or burden, and do not evade.';
      }
      if (phase === 'rebuttal' || phase === 'final_rebuttal' || phase === 'closing') {
        return 'Policy weighing: compare impacts, collapse to the winning issues, and state the decision rule.';
      }
      return '';
    case 'oxford':
      if (phase === 'opening') {
        return 'Oxford opening speech: frame the motion and burden clearly. Build your case without rebutting yet.';
      }
      if (phase === 'rebuttal' || phase === 'final_rebuttal') {
        return 'Oxford floor debate: answer prior claims, test the clash, and rebuild your side of the motion.';
      }
      if (phase === 'closing') {
        return 'Oxford closing speech: crystallize the voters and do not introduce new claims.';
      }
      return '';
    case 'socratic':
      if (phase === 'opening' || phase === 'question') {
        return 'Socratic inquiry: stay question-led, surface assumptions, and avoid grandstanding.';
      }
      if (phase === 'rebuttal') {
        return 'Socratic follow-up: probe tensions in the prior answer and keep the exchange inquiry-led.';
      }
      if (phase === 'synthesis' || phase === 'closing') {
        return 'Socratic synthesis: name the clearest insight, remaining assumption, or unresolved tension.';
      }
      return '';
    default:
      return '';
  }
};

export class DebatePromptBuilder {
  // Build a minimal per-turn prompt (no persona reinjection)
  buildTurnPrompt(params: {
    topic: string;
    phase: PhaseId;
    previousMessage?: string;
    isFinalRound?: boolean;
    guidance?: string; // from FormatSpec
    civilityLevel?: 1 | 2 | 3 | 4 | 5;
    format?: FormatSpec;
    personalityId?: string;
    messageLabel?: string;
    cxRole?: 'questioner' | 'answerer';
    // Optional customized personality data for style nudges
    customizedTone?: Partial<PersonalityTone>;
    customizedDebateProfile?: Partial<PersonalityDebateProfile>;
  }): string {
    const { topic, phase, previousMessage, isFinalRound, guidance, civilityLevel, format, personalityId, messageLabel, cxRole, customizedTone, customizedDebateProfile } = params;
    const base = guidance || '';
    const prev = previousMessage ? `${DEBATE_CONSTANTS.PROMPT_MARKERS.PREVIOUS_SPEAKER}"${previousMessage}"` : '';
    const isSocratic = format?.id === 'socratic';
    // Do not enforce numeric word bounds; keep guidance general to avoid truncation
    const tone = civilityLevel
      ? `Tone: ${civilityLevel <= 2 ? 'friendly wit' : civilityLevel >= 5 ? 'sharp but respectful' : 'neutral and professional'}. Avoid insults or stereotyping.`
      : '';
    // Generate a compact per-turn style nudge from customized personality data.
    let styleNudge = '';
    if (customizedTone || customizedDebateProfile) {
      styleNudge = generateStyleNudge(customizedTone, customizedDebateProfile);
    } else if (personalityId === 'george') {
      styleNudge = 'Use PG-13 observational satire: expose contradictions with sarcasm; mild profanity is allowed sparingly, never slurs or personal attacks.';
    }
    const prevGuarded = phase === 'opening' || phase === 'constructive' ? '' : prev;
    // Human-friendly phase labels (format-aware for Socratic)
    const defaultLabelMap: Record<PhaseId, string> = {
      opening: isSocratic ? 'Opening Questions' : 'Opening Statement',
      constructive: 'Constructive Speech',
      rebuttal: isSocratic ? 'Focused Follow-up' : 'Rebuttal',
      final_rebuttal: 'Final Rebuttal',
      closing: isSocratic ? 'Synthesis' : 'Closing Argument',
      cross_examination: cxRole === 'questioner' ? 'Cross-Examination (Questions)' : 'Cross-Examination (Answers)',
      question: 'Question',
      synthesis: 'Synthesis',
    } as const;
    const phaseLabel = messageLabel || defaultLabelMap[phase] || 'Turn';
    // One-line hints per phase (format-aware) with explicit do/don't boundaries
    const hintMap: Record<PhaseId, string> = {
      opening: isSocratic
        ? 'Pose 1–3 clarifying questions to frame terms and assumptions.'
        : 'Present your case. Do NOT mention or address the opponent or their claims in this turn.',
      constructive: 'Present your constructive case with supporting evidence. You may introduce new arguments.',
      rebuttal: isSocratic
        ? 'Probe assumptions with concise, pointed follow-ups or answers.'
        : 'Directly refute 1–2 specific claims from the prior turn with focused evidence.',
      final_rebuttal: 'Reinforce your strongest points. No new arguments.',
      closing: isSocratic
        ? 'Offer a crisp synthesis; no new claims.'
        : 'Synthesize and leave one clear takeaway; no new claims.',
      cross_examination: cxRole === 'questioner'
        ? 'Ask pointed questions to expose weaknesses in the opponent\'s case.'
        : 'Answer directly and defend your position. Be concise.',
      question: 'Pose one focused question that moves the argument.',
      synthesis: 'Identify the strongest insight or unresolved tension; be concise.',
    } as const;
    const phaseHint = hintMap[phase];
    const formatConstraint = getFormatPhaseConstraint(format?.id, phase, cxRole);

    // Final-round cue (duplicated here for emphasis)
    const finalCue = isFinalRound && phase === 'closing' ? 'Closing: reinforce your strongest point; no new claims; concise.' : '';

    return [
      `Turn: ${phaseLabel}`,
      phaseHint,
      formatConstraint,
      prevGuarded,
      base,
      `Respond about "${topic}". Maintain your assigned stance strictly; do not switch sides.`,
      styleNudge,
      tone,
      finalCue,
      // Prose guidance remains in the system prompt to avoid duplication
    ].filter(Boolean).join('\n');
  }
  
  /**
   * Extract previous message content from debate messages
   */
  extractPreviousMessage(messages: Message[], currentAI: AI): string | undefined {
    // Find the most recent AI message that's not from the current AI
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.senderType === 'ai' && !message.sender.startsWith(currentAI.name)) {
        return message.content;
      }
    }
    return undefined;
  }
  
  /**
   * Build context-aware prompt based on debate state
   */
  // legacy method retained for compatibility in a few spots; keep minimal
  buildContinuationPrompt(topic: string): string {
    return `Continue the debate about "${topic}". Avoid headings or lists.`;
  }
  
  /**
   * Add debate mode marker to any prompt
   */
  addDebateModeMarker(prompt: string): string {
    if (!prompt.includes(DEBATE_CONSTANTS.PROMPT_MARKERS.DEBATE_MODE)) {
      return `${DEBATE_CONSTANTS.PROMPT_MARKERS.DEBATE_MODE}\n\n${prompt}`;
    }
    return prompt;
  }
  
  /**
   * Validate prompt length and content
   */
  validatePrompt(prompt: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!prompt || prompt.trim().length === 0) {
      errors.push('Prompt cannot be empty');
    }
    
    if (prompt.length > 4000) {
      errors.push('Prompt is too long (max 4000 characters)');
    }
    
    if (!prompt.includes(DEBATE_CONSTANTS.PROMPT_MARKERS.DEBATE_MODE)) {
      errors.push('Prompt should include debate mode marker');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
