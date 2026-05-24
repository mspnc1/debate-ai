// Debate format specifications - message-sequence architecture.
// Each format defines explicit speeches, speaker roles, and voting model.

export type DebateFormatId = 'oxford' | 'lincoln_douglas' | 'policy' | 'socratic';
export type SelectableDebateFormatId = Exclude<DebateFormatId, 'socratic'>;
export type DebateSideId = 'aff' | 'neg';
export type DebateVoteModel = 'checkpoint' | 'audience_stance';
export type DebateTeamMode = 'duel' | 'team';
export type AudienceStance = 'for' | 'against' | 'undecided';
export type AudienceVoteStage = 'initial' | 'final';

export interface AudienceDecisionResult {
  initialStance: AudienceStance;
  finalStance: Exclude<AudienceStance, 'undecided'>;
  winningSide: DebateSideId;
  winningSideLabel: string;
  resultVerb: 'persuaded' | 'held' | 'flipped';
  summary: string;
  winningParticipantIds: string[];
}

export type PhaseId =
  | 'opening'
  | 'constructive'
  | 'cross_examination'
  | 'rebuttal'
  | 'final_rebuttal'
  | 'question'
  | 'closing'
  | 'synthesis';

export interface MessageSpec {
  label: string;
  phase: PhaseId;
  speaker: DebateSideId;
  speakerSlot?: number;
  cxRole?: 'questioner' | 'answerer';
  voteAfter?: boolean;
  votingLabel?: string;
}

export interface PresetConfig {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  messages: MessageSpec[];
  voteCount: number;
  voteModel?: DebateVoteModel;
  teamMode?: DebateTeamMode;
  teamSize?: number;
  initialVoteRequired?: boolean;
  finalVoteRequired?: boolean;
}

export interface FormatSpec {
  id: DebateFormatId;
  name: string;
  description: string;
  stepLabel: 'Rounds' | 'Speeches' | 'Exchanges';
  presets: PresetConfig[];
  guidance: Partial<Record<PhaseId, string>>;
}

const oxfordGuidance: Partial<Record<PhaseId, string>> = {
  opening: 'Opening speech: frame the motion and establish your side clearly for the audience.',
  rebuttal: 'Floor debate: answer the other side directly and develop the clash on the motion.',
  closing: 'Closing speech: summarize the decisive reasons for the audience to vote with your side; no new claims.',
};

const oxfordShort: PresetConfig = {
  id: 'short',
  label: 'Classic',
  shortLabel: 'Classic Oxford',
  description: '1v1 · audience vote',
  voteCount: 2,
  voteModel: 'audience_stance',
  teamMode: 'duel',
  teamSize: 1,
  initialVoteRequired: true,
  finalVoteRequired: true,
  messages: [
    { label: 'Proposition Opening Speech', phase: 'opening', speaker: 'aff', speakerSlot: 0 },
    { label: 'Opposition Opening Speech', phase: 'opening', speaker: 'neg', speakerSlot: 0 },
    { label: 'Proposition Floor Speech', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Opposition Floor Speech', phase: 'rebuttal', speaker: 'neg' },
    { label: 'Proposition Closing Speech', phase: 'closing', speaker: 'aff', speakerSlot: 0 },
    { label: 'Opposition Closing Speech', phase: 'closing', speaker: 'neg', speakerSlot: 0 },
  ],
};

const oxfordStandard: PresetConfig = {
  id: 'standard',
  label: 'Full',
  shortLabel: 'Full Oxford',
  description: '2v2 teams · audience vote',
  voteCount: 2,
  voteModel: 'audience_stance',
  teamMode: 'team',
  teamSize: 2,
  initialVoteRequired: true,
  finalVoteRequired: true,
  messages: [
    { label: 'First Proposition Speech', phase: 'opening', speaker: 'aff', speakerSlot: 0 },
    { label: 'First Opposition Speech', phase: 'opening', speaker: 'neg', speakerSlot: 0 },
    { label: 'Second Proposition Speech', phase: 'rebuttal', speaker: 'aff', speakerSlot: 1 },
    { label: 'Second Opposition Speech', phase: 'rebuttal', speaker: 'neg', speakerSlot: 1 },
    { label: 'Proposition Summary Speech', phase: 'closing', speaker: 'aff', speakerSlot: 0 },
    { label: 'Opposition Summary Speech', phase: 'closing', speaker: 'neg', speakerSlot: 0 },
  ],
};

const oxfordLong: PresetConfig = {
  id: 'long',
  label: 'Extended',
  shortLabel: 'Extended Oxford',
  description: '2v2 teams · longer floor',
  voteCount: 2,
  voteModel: 'audience_stance',
  teamMode: 'team',
  teamSize: 2,
  initialVoteRequired: true,
  finalVoteRequired: true,
  messages: [
    { label: 'First Proposition Speech', phase: 'opening', speaker: 'aff', speakerSlot: 0 },
    { label: 'First Opposition Speech', phase: 'opening', speaker: 'neg', speakerSlot: 0 },
    { label: 'Second Proposition Speech', phase: 'rebuttal', speaker: 'aff', speakerSlot: 1 },
    { label: 'Second Opposition Speech', phase: 'rebuttal', speaker: 'neg', speakerSlot: 1 },
    { label: 'Proposition Floor Speech', phase: 'rebuttal', speaker: 'aff', speakerSlot: 0 },
    { label: 'Opposition Floor Speech', phase: 'rebuttal', speaker: 'neg', speakerSlot: 0 },
    { label: 'Proposition Summary Speech', phase: 'closing', speaker: 'aff', speakerSlot: 1 },
    { label: 'Opposition Summary Speech', phase: 'closing', speaker: 'neg', speakerSlot: 1 },
  ],
};

export const OXFORD_FORMAT: FormatSpec = {
  id: 'oxford',
  name: 'Oxford',
  description: 'Oxford-style motion debate with opening speeches, floor debate, and closing speeches',
  stepLabel: 'Speeches',
  presets: [oxfordShort, oxfordStandard, oxfordLong],
  guidance: oxfordGuidance,
};

const lincolnDouglasGuidance: Partial<Record<PhaseId, string>> = {
  constructive: 'Constructive: define key terms, state values and criteria, then build the case.',
  cross_examination: 'Cross-examination: ask or answer pointed questions; keep it tight.',
  rebuttal: 'Rebuttal: answer specific claims and weigh values explicitly.',
  final_rebuttal: 'Final rebuttal: crystallize the value clash and explain why your criterion should decide.',
  closing: 'Closing: reinforce strongest point; no new claims; concise.',
};

const lincolnDouglasShort: PresetConfig = {
  id: 'short',
  label: 'Short LD',
  shortLabel: 'Short LD',
  description: '~5 min',
  voteCount: 4,
  messages: [
    { label: 'Affirmative Constructive (AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'Negative Constructive / 1NR (NC/1NR)', phase: 'constructive', speaker: 'neg', voteAfter: true, votingLabel: 'Constructives' },
    { label: 'First Affirmative Rebuttal (1AR)', phase: 'rebuttal', speaker: 'aff', voteAfter: true, votingLabel: '1AR' },
    { label: 'Negative Rebuttal / 2NR (NR/2NR)', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'NR/2NR' },
    { label: 'Second Affirmative Rebuttal (2AR)', phase: 'final_rebuttal', speaker: 'aff', voteAfter: true, votingLabel: '2AR' },
  ],
};

const lincolnDouglasStandard: PresetConfig = {
  id: 'standard',
  label: 'Standard LD',
  shortLabel: 'Full LD',
  description: '~10 min',
  voteCount: 5,
  messages: [
    { label: 'Affirmative Constructive (AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer', voteAfter: true, votingLabel: 'AC + CX' },
    { label: 'Negative Constructive / 1NR (NC/1NR)', phase: 'constructive', speaker: 'neg' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: 'NC/1NR + CX' },
    { label: 'First Affirmative Rebuttal (1AR)', phase: 'rebuttal', speaker: 'aff', voteAfter: true, votingLabel: '1AR' },
    { label: 'Negative Rebuttal / 2NR (NR/2NR)', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'NR/2NR' },
    { label: 'Second Affirmative Rebuttal (2AR)', phase: 'final_rebuttal', speaker: 'aff', voteAfter: true, votingLabel: '2AR' },
  ],
};

const lincolnDouglasLong: PresetConfig = {
  id: 'long',
  label: 'Extended LD',
  shortLabel: 'Full LD',
  description: '~15 min',
  voteCount: 5,
  messages: [
    { label: 'Affirmative Constructive (AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer', voteAfter: true, votingLabel: 'AC + CX' },
    { label: 'Negative Constructive / 1NR (NC/1NR)', phase: 'constructive', speaker: 'neg' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: 'NC/1NR + CX' },
    { label: 'First Affirmative Rebuttal (1AR)', phase: 'rebuttal', speaker: 'aff', voteAfter: true, votingLabel: '1AR' },
    { label: 'Negative Rebuttal / 2NR (NR/2NR)', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'NR/2NR' },
    { label: 'Second Affirmative Rebuttal (2AR)', phase: 'final_rebuttal', speaker: 'aff', voteAfter: true, votingLabel: '2AR' },
  ],
};

export const LINCOLN_DOUGLAS_FORMAT: FormatSpec = {
  id: 'lincoln_douglas',
  name: 'Lincoln-Douglas',
  description: 'Philosophical debate focusing on ethics, values, and moral principles',
  stepLabel: 'Speeches',
  presets: [lincolnDouglasShort, lincolnDouglasStandard, lincolnDouglasLong],
  guidance: lincolnDouglasGuidance,
};

const policyGuidance: Partial<Record<PhaseId, string>> = {
  constructive: 'Constructive: present plan or counterplan with 1-2 key pieces of support.',
  cross_examination: 'Cross-examination: ask or answer pointed questions; keep it tight.',
  rebuttal: 'Rebuttal: answer specific lines, compare impacts, and cite selectively.',
  closing: 'Closing: weigh impacts and propose a clear decision rule; concise.',
};

const policyShort: PresetConfig = {
  id: 'short',
  label: 'Short Policy',
  shortLabel: '8 Speeches',
  description: '~5 min',
  voteCount: 3,
  messages: [
    { label: 'First Affirmative Constructive (1AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'First Negative Constructive (1NC)', phase: 'constructive', speaker: 'neg', voteAfter: true, votingLabel: '1NC' },
    { label: 'Second Affirmative Constructive (2AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'Second Negative Constructive (2NC)', phase: 'constructive', speaker: 'neg', voteAfter: true, votingLabel: '2NC' },
    { label: 'First Negative Rebuttal (1NR)', phase: 'rebuttal', speaker: 'neg' },
    { label: 'First Affirmative Rebuttal (1AR)', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Second Negative Rebuttal (2NR)', phase: 'rebuttal', speaker: 'neg' },
    { label: 'Second Affirmative Rebuttal (2AR)', phase: 'closing', speaker: 'aff', voteAfter: true, votingLabel: '2AR' },
  ],
};

const policyStandard: PresetConfig = {
  id: 'standard',
  label: 'Standard Policy',
  shortLabel: '8 Speeches + CX',
  description: '~10 min',
  voteCount: 5,
  messages: [
    { label: '1AC', phase: 'constructive', speaker: 'aff' },
    { label: 'CX after 1AC', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'CX after 1AC', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer', voteAfter: true, votingLabel: '1AC + CX' },
    { label: '1NC', phase: 'constructive', speaker: 'neg' },
    { label: 'CX after 1NC', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'CX after 1NC', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: '1NC + CX' },
    { label: '2AC', phase: 'constructive', speaker: 'aff' },
    { label: 'CX after 2AC', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'CX after 2AC', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer', voteAfter: true, votingLabel: '2AC + CX' },
    { label: '2NC', phase: 'constructive', speaker: 'neg' },
    { label: 'CX after 2NC', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'CX after 2NC', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: '2NC + CX' },
    { label: '1NR', phase: 'rebuttal', speaker: 'neg' },
    { label: '1AR', phase: 'rebuttal', speaker: 'aff' },
    { label: '2NR', phase: 'rebuttal', speaker: 'neg' },
    { label: '2AR', phase: 'closing', speaker: 'aff', voteAfter: true, votingLabel: '2AR' },
  ],
};

const policyLong: PresetConfig = {
  id: 'long',
  label: 'Extended Policy',
  shortLabel: '8 Speeches + CX',
  description: '~15 min',
  voteCount: 5,
  messages: [
    { label: '1AC', phase: 'constructive', speaker: 'aff' },
    { label: 'CX after 1AC', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'CX after 1AC', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer', voteAfter: true, votingLabel: '1AC + CX' },
    { label: '1NC', phase: 'constructive', speaker: 'neg' },
    { label: 'CX after 1NC', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'CX after 1NC', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: '1NC + CX' },
    { label: '2AC', phase: 'constructive', speaker: 'aff' },
    { label: 'CX after 2AC', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'CX after 2AC', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer', voteAfter: true, votingLabel: '2AC + CX' },
    { label: '2NC', phase: 'constructive', speaker: 'neg' },
    { label: 'CX after 2NC', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'CX after 2NC', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: '2NC + CX' },
    { label: '1NR', phase: 'rebuttal', speaker: 'neg' },
    { label: '1AR', phase: 'rebuttal', speaker: 'aff' },
    { label: '2NR', phase: 'rebuttal', speaker: 'neg' },
    { label: '2AR', phase: 'closing', speaker: 'aff', voteAfter: true, votingLabel: '2AR' },
  ],
};

export const POLICY_FORMAT: FormatSpec = {
  id: 'policy',
  name: 'Policy',
  description: 'Data-driven debate with evidence, research, and practical solutions',
  stepLabel: 'Speeches',
  presets: [policyShort, policyStandard, policyLong],
  guidance: policyGuidance,
};

const socraticGuidance: Partial<Record<PhaseId, string>> = {
  opening: 'Opening: frame the key assumption or definition in question.',
  question: 'Question: ask or answer one focused question that advances the inquiry.',
  rebuttal: 'Probe assumptions with concise follow-ups or answers; avoid grandstanding.',
  synthesis: 'Synthesis: identify the clearest insight or unresolved tension.',
  closing: 'Closing: one clear insight or synthesis; very concise.',
};

const socraticShort: PresetConfig = {
  id: 'short',
  label: 'Short Socratic',
  shortLabel: '3 Exchanges',
  description: '~5 min',
  voteCount: 3,
  messages: [
    { label: 'Opening Question', phase: 'opening', speaker: 'aff' },
    { label: 'Opening Response', phase: 'opening', speaker: 'neg', voteAfter: true, votingLabel: 'Initial Framing' },
    { label: 'Focused Question', phase: 'question', speaker: 'aff' },
    { label: 'Focused Answer', phase: 'question', speaker: 'neg', voteAfter: true, votingLabel: 'Focused Inquiry' },
    { label: 'Synthesis', phase: 'synthesis', speaker: 'aff' },
    { label: 'Synthesis', phase: 'synthesis', speaker: 'neg', voteAfter: true, votingLabel: 'Synthesis' },
  ],
};

const socraticStandard: PresetConfig = {
  id: 'standard',
  label: 'Standard Socratic',
  shortLabel: '4 Exchanges',
  description: '~10 min',
  voteCount: 4,
  messages: [
    { label: 'Opening Question', phase: 'opening', speaker: 'aff' },
    { label: 'Opening Response', phase: 'opening', speaker: 'neg', voteAfter: true, votingLabel: 'Initial Framing' },
    { label: 'Clarifying Question', phase: 'question', speaker: 'aff' },
    { label: 'Clarifying Answer', phase: 'question', speaker: 'neg', voteAfter: true, votingLabel: 'Clarification' },
    { label: 'Assumption Probe', phase: 'rebuttal', speaker: 'neg' },
    { label: 'Assumption Response', phase: 'rebuttal', speaker: 'aff', voteAfter: true, votingLabel: 'Assumption Testing' },
    { label: 'Synthesis', phase: 'synthesis', speaker: 'aff' },
    { label: 'Synthesis', phase: 'synthesis', speaker: 'neg', voteAfter: true, votingLabel: 'Synthesis' },
  ],
};

const socraticLong: PresetConfig = {
  id: 'long',
  label: 'Extended Socratic',
  shortLabel: '5 Exchanges',
  description: '~15 min',
  voteCount: 5,
  messages: [
    { label: 'Opening Question', phase: 'opening', speaker: 'aff' },
    { label: 'Opening Response', phase: 'opening', speaker: 'neg', voteAfter: true, votingLabel: 'Initial Framing' },
    { label: 'Clarifying Question', phase: 'question', speaker: 'aff' },
    { label: 'Clarifying Answer', phase: 'question', speaker: 'neg', voteAfter: true, votingLabel: 'Clarification' },
    { label: 'Counter-Question', phase: 'question', speaker: 'neg' },
    { label: 'Counter-Answer', phase: 'question', speaker: 'aff', voteAfter: true, votingLabel: 'Counter-Questioning' },
    { label: 'Assumption Probe', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Assumption Response', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Assumption Testing' },
    { label: 'Synthesis', phase: 'synthesis', speaker: 'aff' },
    { label: 'Synthesis', phase: 'synthesis', speaker: 'neg', voteAfter: true, votingLabel: 'Synthesis' },
  ],
};

export const SOCRATIC_FORMAT: FormatSpec = {
  id: 'socratic',
  name: 'Socratic',
  description: 'Inquiry-based dialogue that explores ideas through thoughtful questions',
  stepLabel: 'Exchanges',
  presets: [socraticShort, socraticStandard, socraticLong],
  guidance: socraticGuidance,
};

export const FORMATS: Record<DebateFormatId, FormatSpec> = {
  oxford: OXFORD_FORMAT,
  lincoln_douglas: LINCOLN_DOUGLAS_FORMAT,
  policy: POLICY_FORMAT,
  socratic: SOCRATIC_FORMAT,
};

export const SELECTABLE_FORMATS: Record<SelectableDebateFormatId, FormatSpec> = {
  oxford: OXFORD_FORMAT,
  lincoln_douglas: LINCOLN_DOUGLAS_FORMAT,
  policy: POLICY_FORMAT,
};

export function getFormat(id: DebateFormatId): FormatSpec {
  return FORMATS[id] || OXFORD_FORMAT;
}

export function getPresetForFormat(formatId: DebateFormatId, presetId: string): PresetConfig {
  const format = getFormat(formatId);
  return format.presets.find((preset) => preset.id === presetId) || format.presets[0];
}

export function getPresetIdForRounds(rounds?: number): string {
  if (rounds === 5) return 'standard';
  if (rounds === 7) return 'long';
  return 'short';
}
