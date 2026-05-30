import type { DebateFormatId, PhaseId } from '@/config/debate/formats';
import type { ModelParameters } from '@/types';

type CxRole = 'questioner' | 'answerer';

interface DebateSpeechLengthInput {
  formatId?: DebateFormatId;
  presetId?: string;
  phase: PhaseId;
  cxRole?: CxRole;
  voiceMode?: boolean;
}

export interface DebateSpeechLengthGuidance {
  minWords: number;
  maxWords: number;
  maxTokens: number;
  directive: string;
}

const DEBATE_OUTPUT_SAFETY_TOKENS = 6144;
const DEBATE_VOICE_OUTPUT_MIN_TOKENS = 256;

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

function getTokenCap(maxWords: number, voiceMode?: boolean): number {
  if (voiceMode) {
    return Math.max(DEBATE_VOICE_OUTPUT_MIN_TOKENS, Math.ceil(maxWords * 2.5));
  }
  return Math.max(DEBATE_OUTPUT_SAFETY_TOKENS, Math.ceil(maxWords * 2.2));
}

function getQualitativeLengthDirective(input: DebateSpeechLengthInput): string {
  if (input.phase === 'cross_examination') {
    return input.cxRole === 'questioner'
      ? 'Length guidance: Ask a few direct questions, not a speech. Keep the exchange moving and stop once the key commitment is tested.'
      : 'Length guidance: Answer directly and briefly. Defend the point at issue without turning the exchange into a mini-essay.';
  }

  if (input.phase === 'question') {
    return 'Length guidance: Give one focused answer to the audience question. Answer directly, tie it back to your side, and stop.';
  }

  if (input.formatId === 'socratic') {
    if (input.phase === 'opening' || input.phase === 'synthesis' || input.phase === 'closing') {
      return 'Length guidance: Keep it concise and inquiry-led. Surface the central assumption or takeaway in natural prose, then stop.';
    }
    return 'Length guidance: Keep the follow-up brief and precise. Probe one important tension rather than covering every possible angle.';
  }

  switch (input.phase) {
    case 'opening':
    case 'constructive':
      return 'Length guidance: Keep this as a compact opening. Make the core case in 2-3 short paragraphs, with no headings or lists, then stop.';
    case 'rebuttal':
    case 'final_rebuttal':
      return 'Length guidance: Keep this rebuttal brief and targeted. Answer one or two decisive claims, rebuild your side, and stop.';
    case 'closing':
      return 'Length guidance: Keep this closing concise. Crystallize the strongest reason to vote for your side, avoid new claims, and stop.';
    case 'synthesis':
      return 'Length guidance: Keep this synthesis concise. Name the clearest insight or unresolved tension, then stop.';
    default:
      return 'Length guidance: Keep the response brief, focused, and in natural prose. Stop once the point is made.';
  }
}

export function getDebateSpeechLengthGuidance(input: DebateSpeechLengthInput): DebateSpeechLengthGuidance {
  const baseMaxWords = getBaseMaxWords(input);
  const shouldScale = input.phase !== 'cross_examination' && input.formatId !== 'socratic';
  const maxWords = shouldScale ? applyPreset(baseMaxWords, input.presetId) : baseMaxWords;
  const minWords = getMinWords(maxWords, input.phase);
  const maxTokens = getTokenCap(maxWords, input.voiceMode);

  return {
    minWords,
    maxWords,
    maxTokens,
    directive: getQualitativeLengthDirective(input),
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

  return {
    ...(parameters || {}),
    maxTokens,
  };
}
