export type QuickStartTemplateId =
  | 'direct_answer'
  | 'brainstorm'
  | 'explain'
  | 'plan'
  | 'draft'
  | 'troubleshoot';

export interface QuickStartTemplate {
  id: QuickStartTemplateId;
  title: string;
  subtitle: string;
  icon: string;
  buildAIPrompt: (userPrompt: string) => string;
}

export const DEFAULT_QUICK_START_TEMPLATE_ID: QuickStartTemplateId = 'direct_answer';

export const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    id: 'direct_answer',
    title: 'Direct Answer',
    subtitle: 'Clear, useful response',
    icon: 'chatbubble-ellipses-outline',
    buildAIPrompt: (userPrompt) =>
      `The user started this chat with: "${userPrompt}"\n\nRespond directly and helpfully in Chat mode. Give the answer first, then add only the context, caveats, or next steps that make the response more useful.`,
  },
  {
    id: 'brainstorm',
    title: 'Brainstorm',
    subtitle: 'Options and fresh angles',
    icon: 'bulb-outline',
    buildAIPrompt: (userPrompt) =>
      `The user started this chat with: "${userPrompt}"\n\nRespond in Chat mode by brainstorming a useful range of ideas. Group related ideas, call out the most promising options, and end with a few practical next steps.`,
  },
  {
    id: 'explain',
    title: 'Explain',
    subtitle: 'Teach with examples',
    icon: 'school-outline',
    buildAIPrompt: (userPrompt) =>
      `The user started this chat with: "${userPrompt}"\n\nRespond in Chat mode by explaining the topic clearly. Start with the core idea, use examples, define terms when needed, and include common misconceptions or follow-up questions if helpful.`,
  },
  {
    id: 'plan',
    title: 'Plan',
    subtitle: 'Steps and priorities',
    icon: 'list-outline',
    buildAIPrompt: (userPrompt) =>
      `The user started this chat with: "${userPrompt}"\n\nRespond in Chat mode with an actionable plan. Break the work into steps, identify priorities, call out dependencies or risks, and make the first next action clear.`,
  },
  {
    id: 'draft',
    title: 'Draft',
    subtitle: 'Write or rewrite text',
    icon: 'create-outline',
    buildAIPrompt: (userPrompt) =>
      `The user started this chat with: "${userPrompt}"\n\nRespond in Chat mode by drafting useful text. Match the user's likely audience and tone, keep the output easy to revise, and briefly note any assumptions that affect the draft.`,
  },
  {
    id: 'troubleshoot',
    title: 'Troubleshoot',
    subtitle: 'Diagnose and fix',
    icon: 'construct-outline',
    buildAIPrompt: (userPrompt) =>
      `The user started this chat with: "${userPrompt}"\n\nRespond in Chat mode by diagnosing the issue. Ask for missing critical details only if needed, otherwise give likely causes, checks to run, and fixes in a practical order.`,
  },
];
