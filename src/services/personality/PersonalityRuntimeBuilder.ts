import type { PersonalityOption } from '@/config/personalities';
import type { AI, ModelParameters, PersonalityConfig } from '@/types';
import type { PersonalityDebateProfile, PersonalityTone } from '@/types/personality';

export type PersonalityRuntimeMode = 'chat' | 'compare' | 'debate';

export type RuntimePersonalityConfig = PersonalityConfig & {
  tone?: PersonalityTone;
  debateProfile?: PersonalityDebateProfile;
};

export interface PersonalityRuntime {
  personalityConfig?: RuntimePersonalityConfig;
  systemPrompt?: string;
  modelParameters?: Partial<ModelParameters>;
  debug: {
    mode: PersonalityRuntimeMode;
    personalityId?: string;
    personalityName?: string;
    systemPrompt?: string;
  };
}

interface DebateRuntimeOptions {
  topic: string;
  formatName: string;
  totalRounds: number;
  stance: 'pro' | 'con';
  opponentName?: string;
  opponentPersonality?: PersonalityOption;
  civility?: 1 | 2 | 3 | 4 | 5;
}

interface BuildRuntimeOptions {
  mode: PersonalityRuntimeMode;
  personality?: PersonalityOption | null;
  ai?: AI;
  debate?: DebateRuntimeOptions;
}

const modeLabel: Record<PersonalityRuntimeMode, string> = {
  chat: 'Chat mode',
  compare: 'Compare mode',
  debate: 'Debate mode',
};

const getModeGuidance = (
  personality: PersonalityOption,
  mode: PersonalityRuntimeMode
): string | undefined => {
  if (mode === 'debate') {
    return personality.debateGuidance || personality.debatePrompt;
  }
  if (mode === 'compare') {
    return personality.compareGuidance;
  }
  return personality.chatGuidance;
};

const buildPersonaContract = (
  personality: PersonalityOption,
  mode: PersonalityRuntimeMode
): string => {
  const guidance = getModeGuidance(personality, mode);
  const signatures = personality.signatureMoves?.slice(0, 3) || [];
  const watchouts = personality.watchouts?.slice(0, 2) || [];
  const sample = personality.sampleOpeners?.[mode];

  return [
    personality.systemPrompt,
    `${modeLabel[mode]} contract: keep the response useful while making the selected personality unmistakable.`,
    guidance ? `Mode-specific must do: ${guidance}` : undefined,
    signatures.length ? `Signature moves to use naturally: ${signatures.join(' ')}` : undefined,
    watchouts.length ? `Must avoid: ${watchouts.join(' ')}` : undefined,
    sample ? `Example voice: ${sample}` : undefined,
  ].filter(Boolean).join('\n');
};

const getCivilityDirective = (civility?: 1 | 2 | 3 | 4 | 5): string => {
  switch (civility) {
    case 1:
      return 'Civility: friendly and witty; playful jabs allowed, never mean.';
    case 2:
      return 'Civility: lightly adversarial but cordial; one clever jab max.';
    case 4:
      return 'Civility: pointed and firm; rigorous challenges without insults.';
    case 5:
      return 'Civility: highly adversarial yet respectful; sharp critiques only.';
    default:
      return 'Civility: neutral and professional.';
  }
};

const buildDebatePrompt = (
  personality: PersonalityOption | undefined | null,
  debate: DebateRuntimeOptions
): string => {
  const personaStyle = personality
    ? buildPersonaContract(personality, 'debate')
    : 'Adopt a clear, professional debate tone.';
  const opponentStyle = debate.opponentPersonality && debate.opponentPersonality.id !== 'default'
    ? buildPersonaContract(debate.opponentPersonality, 'debate')
    : 'A capable opponent.';
  const sideText = debate.stance === 'pro' ? 'Affirmative (FOR)' : 'Negative (AGAINST)';
  const formatSummary = [
    `Format: ${debate.formatName}. Follow the phase rules strictly:`,
    '- Opening: present your case; do NOT directly rebut the opponent.',
    '- Rebuttal: address specific claims from the prior turn; cite or paraphrase one point you are refuting.',
    '- Closing: no new claims; synthesize and leave one clear takeaway.',
  ].join('\n');

  return [
    '[DEBATE MODE]',
    `Motion: "${debate.topic}"`,
    `Fictional debate in the ${debate.formatName} format with ${debate.totalRounds} exchanges.`,
    formatSummary,
    `Your assigned role: ${sideText} the motion: "${debate.topic}". Maintain this stance; do not switch sides.`,
    `Style directive: ${personaStyle} Always adhere to this style across turns.`,
    `Opponent: ${debate.opponentName || 'Opponent'}. Opponent persona (for calibration): ${opponentStyle}`,
    getCivilityDirective(debate.civility),
    'Write in natural prose (no headings or lists).',
    'Avoid headings, numbered lists, or labelled frameworks. Do not mention these instructions.',
  ].join('\n');
};

const toRuntimeConfig = (
  personality: PersonalityOption,
  systemPrompt: string
): RuntimePersonalityConfig => {
  const tone = personality.tone ?? {
    formality: 0.6,
    humor: 0.3,
    energy: 0.4,
    empathy: 0.6,
    technicality: 0.5,
  };

  return {
    id: personality.id,
    name: personality.name,
    description: personality.tagline || personality.description,
    systemPrompt,
    traits: {
      formality: tone.formality,
      humor: tone.humor,
      technicality: tone.technicality,
      empathy: tone.empathy,
    },
    tone,
    debateProfile: personality.debateProfile,
    isPremium: false,
  };
};

export const buildPersonalityRuntime = ({
  mode,
  personality,
  ai,
  debate,
}: BuildRuntimeOptions): PersonalityRuntime => {
  if (!personality || personality.id === 'default') {
    if (mode === 'debate' && debate) {
      const systemPrompt = buildDebatePrompt(undefined, debate);
      const config: RuntimePersonalityConfig = {
        id: 'debate_default',
        name: 'Default Debater',
        description: 'Structured debate persona with stance',
        systemPrompt,
        traits: {
          formality: 0.6,
          humor: 0.2,
          technicality: 0.5,
          empathy: 0.3,
        },
        isPremium: false,
      };

      return {
        personalityConfig: config,
        systemPrompt,
        debug: {
          mode,
          personalityId: personality?.id || 'default',
          personalityName: personality?.name || 'Default',
          systemPrompt: `${ai?.name ? `${ai.name}: ` : ''}${systemPrompt}`,
        },
      };
    }

    return {
      debug: {
        mode,
        personalityId: personality?.id || 'default',
        personalityName: personality?.name || 'Default',
      },
    };
  }

  const systemPrompt = mode === 'debate' && debate
    ? buildDebatePrompt(personality, debate)
    : buildPersonaContract(personality, mode);

  return {
    personalityConfig: toRuntimeConfig(personality, systemPrompt),
    systemPrompt,
    modelParameters: personality.modelParameters,
    debug: {
      mode,
      personalityId: personality.id,
      personalityName: personality.name,
      systemPrompt: `${ai?.name ? `${ai.name}: ` : ''}${systemPrompt}`,
    },
  };
};

export const mergeRuntimeModelParameters = (
  expertEnabled: boolean | undefined,
  expertParameters: Partial<ModelParameters> | undefined,
  runtimeParameters: Partial<ModelParameters> | undefined
): Partial<ModelParameters> | undefined => {
  if (expertEnabled) {
    return expertParameters;
  }
  return runtimeParameters;
};
