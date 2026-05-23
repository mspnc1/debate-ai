// Debate format specifications - message-sequence architecture.
// Each format defines explicit speeches, speaker roles, and vote checkpoints.

export type DebateFormatId = 'oxford' | 'lincoln_douglas' | 'policy' | 'socratic';

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
  speaker: 'aff' | 'neg';
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
  opening: 'Opening: state your case clearly. No headings or lists.',
  rebuttal: 'Rebuttal: answer specific claims; maintain stance; no meta.',
  final_rebuttal: 'Final rebuttal: reinforce strongest points. No new arguments.',
  closing: 'Closing: reinforce strongest point; no new claims; concise.',
};

const oxfordShort: PresetConfig = {
  id: 'short',
  label: 'Short',
  shortLabel: '3 Rounds',
  description: '~5 min',
  voteCount: 3,
  messages: [
    { label: 'Opening Statement', phase: 'opening', speaker: 'aff' },
    { label: 'Opening Statement', phase: 'opening', speaker: 'neg', voteAfter: true, votingLabel: 'Opening Statements' },
    { label: 'Rebuttal', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Rebuttal', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Rebuttals' },
    { label: 'Closing Statement', phase: 'closing', speaker: 'aff' },
    { label: 'Closing Statement', phase: 'closing', speaker: 'neg', voteAfter: true, votingLabel: 'Closing Statements' },
  ],
};

const oxfordStandard: PresetConfig = {
  id: 'standard',
  label: 'Standard',
  shortLabel: '5 Rounds',
  description: '~10 min',
  voteCount: 5,
  messages: [
    { label: 'Opening Statement', phase: 'opening', speaker: 'aff' },
    { label: 'Opening Statement', phase: 'opening', speaker: 'neg', voteAfter: true, votingLabel: 'Opening Statements' },
    { label: 'First Rebuttal', phase: 'rebuttal', speaker: 'aff' },
    { label: 'First Rebuttal', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'First Rebuttals' },
    { label: 'Second Rebuttal', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Second Rebuttal', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Second Rebuttals' },
    { label: 'Third Rebuttal', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Third Rebuttal', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Third Rebuttals' },
    { label: 'Closing Statement', phase: 'closing', speaker: 'aff' },
    { label: 'Closing Statement', phase: 'closing', speaker: 'neg', voteAfter: true, votingLabel: 'Closing Statements' },
  ],
};

const oxfordLong: PresetConfig = {
  id: 'long',
  label: 'Extended',
  shortLabel: '7 Rounds',
  description: '~15 min',
  voteCount: 7,
  messages: [
    { label: 'Opening Statement', phase: 'opening', speaker: 'aff' },
    { label: 'Opening Statement', phase: 'opening', speaker: 'neg', voteAfter: true, votingLabel: 'Opening Statements' },
    { label: 'First Rebuttal', phase: 'rebuttal', speaker: 'aff' },
    { label: 'First Rebuttal', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'First Rebuttals' },
    { label: 'Second Rebuttal', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Second Rebuttal', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Second Rebuttals' },
    { label: 'Third Rebuttal', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Third Rebuttal', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Third Rebuttals' },
    { label: 'Fourth Rebuttal', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Fourth Rebuttal', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Fourth Rebuttals' },
    { label: 'Final Rebuttal', phase: 'final_rebuttal', speaker: 'aff' },
    { label: 'Final Rebuttal', phase: 'final_rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Final Rebuttals' },
    { label: 'Closing Statement', phase: 'closing', speaker: 'aff' },
    { label: 'Closing Statement', phase: 'closing', speaker: 'neg', voteAfter: true, votingLabel: 'Closing Statements' },
  ],
};

export const OXFORD_FORMAT: FormatSpec = {
  id: 'oxford',
  name: 'Oxford',
  description: 'Classic formal debate with structured arguments and clear positions',
  stepLabel: 'Rounds',
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
  shortLabel: '4 Speeches',
  description: '~5 min',
  voteCount: 3,
  messages: [
    { label: 'Affirmative Constructive (AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'Negative Constructive (NC)', phase: 'constructive', speaker: 'neg', voteAfter: true, votingLabel: 'Constructives' },
    { label: 'Affirmative Rebuttal (AR)', phase: 'rebuttal', speaker: 'aff', voteAfter: true, votingLabel: 'Affirmative Rebuttal' },
    { label: 'Negative Rebuttal (NR)', phase: 'final_rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Final Rebuttal' },
  ],
};

const lincolnDouglasStandard: PresetConfig = {
  id: 'standard',
  label: 'Standard LD',
  shortLabel: '6 Speeches',
  description: '~10 min',
  voteCount: 3,
  messages: [
    { label: 'Affirmative Constructive (AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer' },
    { label: 'Negative Constructive (NC)', phase: 'constructive', speaker: 'neg', voteAfter: true, votingLabel: 'Constructives' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: 'Cross-Examination' },
    { label: 'Affirmative Rebuttal (AR)', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Negative Rebuttal (NR)', phase: 'final_rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Rebuttals' },
  ],
};

const lincolnDouglasLong: PresetConfig = {
  id: 'long',
  label: 'Extended LD',
  shortLabel: '7 Speeches',
  description: '~15 min',
  voteCount: 3,
  messages: [
    { label: 'Affirmative Constructive (AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer' },
    { label: 'Negative Constructive (NC)', phase: 'constructive', speaker: 'neg' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'Cross-Examination (CX)', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: 'Constructives' },
    { label: 'Affirmative Rebuttal (AR)', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Negative Rebuttal (NR)', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Rebuttals' },
    { label: 'Second Affirmative Rebuttal (2AR)', phase: 'final_rebuttal', speaker: 'aff', voteAfter: true, votingLabel: 'Final Rebuttal' },
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
  shortLabel: '6 Speeches',
  description: '~5 min',
  voteCount: 3,
  messages: [
    { label: 'First Affirmative Constructive (1AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'First Negative Constructive (1NC)', phase: 'constructive', speaker: 'neg', voteAfter: true, votingLabel: 'First Constructives' },
    { label: 'Second Affirmative Constructive (2AC)', phase: 'constructive', speaker: 'aff' },
    { label: 'Second Negative Constructive (2NC)', phase: 'constructive', speaker: 'neg', voteAfter: true, votingLabel: 'Second Constructives' },
    { label: 'First Affirmative Rebuttal (1AR)', phase: 'rebuttal', speaker: 'aff' },
    { label: 'Second Negative Rebuttal (2NR)', phase: 'rebuttal', speaker: 'neg', voteAfter: true, votingLabel: 'Rebuttals' },
  ],
};

const policyStandard: PresetConfig = {
  id: 'standard',
  label: 'Standard Policy',
  shortLabel: '8 Speeches + CX',
  description: '~10 min',
  voteCount: 3,
  messages: [
    { label: '1AC', phase: 'constructive', speaker: 'aff' },
    { label: 'CX after 1AC', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'CX after 1AC', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer' },
    { label: '1NC', phase: 'constructive', speaker: 'neg' },
    { label: 'CX after 1NC', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'CX after 1NC', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: 'First Constructives' },
    { label: '2AC', phase: 'constructive', speaker: 'aff' },
    { label: '2NC', phase: 'constructive', speaker: 'neg', voteAfter: true, votingLabel: 'Second Constructives' },
    { label: '1NR', phase: 'rebuttal', speaker: 'neg' },
    { label: '1AR', phase: 'rebuttal', speaker: 'aff' },
    { label: '2NR', phase: 'rebuttal', speaker: 'neg' },
    { label: '2AR', phase: 'closing', speaker: 'aff', voteAfter: true, votingLabel: 'Rebuttals' },
  ],
};

const policyLong: PresetConfig = {
  id: 'long',
  label: 'Extended Policy',
  shortLabel: '12 Speeches',
  description: '~15 min',
  voteCount: 3,
  messages: [
    { label: '1AC', phase: 'constructive', speaker: 'aff' },
    { label: 'CX after 1AC', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'CX after 1AC', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer' },
    { label: '1NC', phase: 'constructive', speaker: 'neg' },
    { label: 'CX after 1NC', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'CX after 1NC', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: 'First Constructives' },
    { label: '2AC', phase: 'constructive', speaker: 'aff' },
    { label: 'CX after 2AC', phase: 'cross_examination', speaker: 'neg', cxRole: 'questioner' },
    { label: 'CX after 2AC', phase: 'cross_examination', speaker: 'aff', cxRole: 'answerer' },
    { label: '2NC', phase: 'constructive', speaker: 'neg' },
    { label: 'CX after 2NC', phase: 'cross_examination', speaker: 'aff', cxRole: 'questioner' },
    { label: 'CX after 2NC', phase: 'cross_examination', speaker: 'neg', cxRole: 'answerer', voteAfter: true, votingLabel: 'Second Constructives' },
    { label: '1NR', phase: 'rebuttal', speaker: 'neg' },
    { label: '1AR', phase: 'rebuttal', speaker: 'aff' },
    { label: '2NR', phase: 'rebuttal', speaker: 'neg' },
    { label: '2AR', phase: 'closing', speaker: 'aff', voteAfter: true, votingLabel: 'Rebuttals' },
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
