import type { DebateFormatId, PhaseId } from '@/config/debate/formats';
import type { ModelParameters } from '@/types';

type CxRole = 'questioner' | 'answerer';

interface DebateSpeechLengthInput {
  formatId?: DebateFormatId;
  presetId?: string;
  phase: PhaseId;
  cxRole?: CxRole;
}

export interface DebateSpeechLengthGuidance {
  minWords: number;
  maxWords: number;
  maxTokens: number;
  directive: string;
}

const PRESET_MULTIPLIER: Record<string, number> = {
  short: 1,
  standard: 1.1,
  long: 1.2,
};

function applyPreset(maxWords: number, presetId?: string): number {
  const multiplier = PRESET_MULTIPLIER[presetId || 'short'] || 1;
  return Math.round(maxWords * multiplier);
}

function getBaseMaxWords({ formatId, phase, cxRole }: DebateSpeechLengthInput): number {
  if (phase === 'cross_examination') {
    return cxRole === 'answerer' ? 110 : 90;
  }

  if (formatId === 'socratic') {
    if (phase === 'opening' || phase === 'question') return 90;
    if (phase === 'synthesis' || phase === 'closing') return 110;
    return 120;
  }

  switch (phase) {
    case 'opening':
    case 'constructive':
      return 220;
    case 'rebuttal':
    case 'final_rebuttal':
      return 180;
    case 'closing':
      return 150;
    case 'question':
      return 80;
    case 'synthesis':
      return 110;
    default:
      return 180;
  }
}

function getMinWords(maxWords: number, phase: PhaseId): number {
  if (phase === 'cross_examination' || phase === 'question') {
    return Math.max(40, Math.round(maxWords * 0.55));
  }

  return Math.max(80, Math.round(maxWords * 0.7));
}

function getTokenCap(maxWords: number): number {
  return Math.max(320, Math.ceil(maxWords * 2.2));
}

export function getDebateSpeechLengthGuidance(input: DebateSpeechLengthInput): DebateSpeechLengthGuidance {
  const baseMaxWords = getBaseMaxWords(input);
  const shouldScale = input.phase !== 'cross_examination' && input.formatId !== 'socratic';
  const maxWords = shouldScale ? applyPreset(baseMaxWords, input.presetId) : baseMaxWords;
  const minWords = getMinWords(maxWords, input.phase);
  const maxTokens = getTokenCap(maxWords);
  const paragraphGuidance = input.phase === 'cross_examination' || input.phase === 'question'
    ? 'Use direct questions or answers, not a mini-essay.'
    : 'Use 2-4 short paragraphs, no headings or lists.';

  return {
    minWords,
    maxWords,
    maxTokens,
    directive: `Length: ${minWords}-${maxWords} words maximum. ${paragraphGuidance} Stop once the argument is made.`,
  };
}

export function applyDebateOutputTokenCap(
  parameters: Partial<ModelParameters> | undefined,
  maxTokens: number,
  expertEnabled?: boolean
): Partial<ModelParameters> | undefined {
  if (expertEnabled) {
    return parameters;
  }

  const currentMaxTokens = parameters?.maxTokens;
  return {
    ...(parameters || {}),
    maxTokens: currentMaxTokens ? Math.min(currentMaxTokens, maxTokens) : maxTokens,
  };
}
