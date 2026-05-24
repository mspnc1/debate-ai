import type { AI, DebateInterstitialKind, Message, ModelParameters } from '@/types';
import type { AudienceDecisionResult, MessageSpec, PhaseId, PresetConfig } from '@/config/debate/formats';
import { AIService } from '@/services/aiAdapter';
import type { DebateSession } from './DebateOrchestrator';

const MC_SENDER = 'Debate MC';
const MC_PARAMETERS: Partial<ModelParameters> = {
  temperature: 0.45,
  maxTokens: 140,
};

const PHASE_LABELS: Record<PhaseId, string> = {
  opening: 'opening speeches',
  constructive: 'constructive cases',
  cross_examination: 'cross-examination',
  rebuttal: 'rebuttals',
  final_rebuttal: 'final rebuttals',
  question: 'questions',
  closing: 'closing speeches',
  synthesis: 'synthesis',
};

export interface CreateDebateInterstitialInput {
  aiService: AIService;
  session: DebateSession;
  kind: DebateInterstitialKind;
  completedMessageSpec?: MessageSpec;
  nextMessageSpec?: MessageSpec;
  votingLabel?: string;
  winnerName?: string;
  audienceResult?: AudienceDecisionResult;
  now?: () => number;
}

function getSideParticipants(participants: AI[], preset: PresetConfig, side: 'aff' | 'neg'): AI[] {
  const teamSize = preset.teamSize || 1;
  if (teamSize <= 1) {
    return side === 'aff' ? participants.slice(0, 1) : participants.slice(1, 2);
  }
  return participants.filter((_, index) => (side === 'aff' ? index % 2 === 0 : index % 2 === 1));
}

function namesFor(participants: AI[]): string {
  if (participants.length === 0) return 'the side';
  if (participants.length === 1) return participants[0].name;
  return `${participants.slice(0, -1).map((participant) => participant.name).join(', ')} and ${participants[participants.length - 1].name}`;
}

function labelForKind(kind: DebateInterstitialKind): string {
  switch (kind) {
    case 'intro':
      return 'MC Introduction';
    case 'phase_segue':
      return 'MC Segue';
    case 'vote_segue':
      return 'MC Voting Cue';
    case 'winner':
      return 'MC Winner Announcement';
  }
}

function cleanGeneratedScript(text: string): string {
  return text
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
}

export function buildDebateInterstitialTemplate(input: Omit<CreateDebateInterstitialInput, 'aiService' | 'now'>): string {
  const { session, kind, completedMessageSpec, nextMessageSpec, votingLabel, winnerName, audienceResult } = input;
  const proposition = namesFor(getSideParticipants(session.participants, session.preset, 'aff'));
  const opposition = namesFor(getSideParticipants(session.participants, session.preset, 'neg'));
  const nextPhase = nextMessageSpec ? PHASE_LABELS[nextMessageSpec.phase] : undefined;
  const completedPhase = completedMessageSpec ? PHASE_LABELS[completedMessageSpec.phase] : undefined;

  switch (kind) {
    case 'intro':
      return `Welcome to the debate. The motion is: ${session.topic}. Speaking for the motion: ${proposition}. Speaking against it: ${opposition}. We begin with the opening frame.`;
    case 'phase_segue':
      return `That concludes ${completedPhase || 'this phase'}. Next, the debate moves to ${nextPhase || 'the next phase'}, where the clash on the motion should sharpen.`;
    case 'vote_segue':
      return `We pause now for ${votingLabel || 'the next vote'}. Consider which side did more to advance its burden before the debate continues.`;
    case 'winner':
      if (audienceResult) {
        return `The audience decision is in: ${audienceResult.winningSideLabel}. ${audienceResult.summary}`;
      }
      return `The debate is complete. ${winnerName || 'The winning side'} carries the decision after the final scoring.`;
  }
}

function buildPrompt(input: Omit<CreateDebateInterstitialInput, 'aiService' | 'now'>): string {
  const template = buildDebateInterstitialTemplate(input);
  const { session, kind, completedMessageSpec, nextMessageSpec, votingLabel, winnerName, audienceResult } = input;
  const proposition = namesFor(getSideParticipants(session.participants, session.preset, 'aff'));
  const opposition = namesFor(getSideParticipants(session.participants, session.preset, 'neg'));

  return [
    'Write one concise podcast host interstitial for an AI debate.',
    'Style: polished, neutral, Intelligence Squared-like, no markdown, no stage directions, one paragraph, 1-3 sentences.',
    `Cue: ${kind}.`,
    `Motion: ${session.topic}`,
    `Format: ${session.format.name} / ${session.preset.shortLabel}.`,
    `For the motion: ${proposition}.`,
    `Against the motion: ${opposition}.`,
    completedMessageSpec ? `Completed speech: ${completedMessageSpec.label}.` : undefined,
    nextMessageSpec ? `Next speech: ${nextMessageSpec.label}.` : undefined,
    votingLabel ? `Voting cue: ${votingLabel}.` : undefined,
    winnerName ? `Winner: ${winnerName}.` : undefined,
    audienceResult ? `Audience result: ${audienceResult.winningSideLabel}; ${audienceResult.summary}` : undefined,
    `Fallback draft to improve: ${template}`,
  ].filter(Boolean).join('\n');
}

export async function createDebateInterstitialMessage(input: CreateDebateInterstitialInput): Promise<Message | null> {
  const podcast = input.session.voiceConfig?.podcast;
  if (!podcast?.enabled) return null;

  const now = input.now || Date.now;
  const template = buildDebateInterstitialTemplate(input);
  let content = template;
  let usedTemplateFallback = true;
  let generatedByModel: string | undefined;

  try {
    const result = await input.aiService.sendMessage(
      podcast.mc.provider,
      buildPrompt(input),
      [],
      undefined,
      undefined,
      MC_PARAMETERS,
      podcast.mc.model
    );
    const generated = cleanGeneratedScript(result.response);
    if (generated) {
      content = generated;
      usedTemplateFallback = false;
      generatedByModel = result.modelUsed || podcast.mc.model;
    }
  } catch {
    usedTemplateFallback = true;
  }

  return {
    id: `msg_${now()}_mc_${input.kind}`,
    sender: MC_SENDER,
    senderType: 'user',
    content,
    timestamp: now(),
    metadata: {
      debateInterstitial: {
        kind: input.kind,
        label: labelForKind(input.kind),
        generatedByProvider: podcast.mc.provider,
        generatedByModel,
        usedTemplateFallback,
      },
    },
  };
}
