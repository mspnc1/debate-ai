import type { MessageSpec } from '@/config/debate/formats';

export const getDebateSideLabel = (speaker: MessageSpec['speaker']): string =>
  speaker === 'aff' ? 'Affirmative' : 'Negative';

export const getDebateCxRoleLabel = (role: MessageSpec['cxRole']): string | undefined => {
  if (role === 'questioner') return 'asks';
  if (role === 'answerer') return 'answers';
  return undefined;
};

export const getDebateSpeakerRoleLabel = (message: Pick<MessageSpec, 'speaker' | 'cxRole'>): string => {
  const sideLabel = getDebateSideLabel(message.speaker);
  const roleLabel = getDebateCxRoleLabel(message.cxRole);
  return roleLabel ? `${sideLabel} · ${roleLabel}` : sideLabel;
};
