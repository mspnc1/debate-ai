import reducer, {
  stageComposerAttachments,
  clearComposerAttachments,
} from '../composerAttachmentsSlice';
import type { MessageAttachment } from '../../types';

const image: MessageAttachment = {
  type: 'image',
  uri: 'file://a.png',
  mimeType: 'image/png',
  base64: 'abc',
  fileName: 'a.png',
};

const doc: MessageAttachment = {
  type: 'document',
  uri: 'file://notes.pdf',
  mimeType: 'application/pdf',
  base64: 'def',
  fileName: 'notes.pdf',
};

describe('composerAttachmentsSlice', () => {
  const initial = () => reducer(undefined, { type: '@@INIT' });

  it('starts empty for both modes', () => {
    expect(initial()).toEqual({ chat: [], compare: [] });
  });

  it('stages per mode with overwrite semantics', () => {
    let state = reducer(initial(), stageComposerAttachments({ mode: 'chat', attachments: [image, doc] }));
    expect(state.chat).toEqual([image, doc]);
    expect(state.compare).toEqual([]);

    // A later attachment-less send overwrites — stale files can never leak.
    state = reducer(state, stageComposerAttachments({ mode: 'chat', attachments: [] }));
    expect(state.chat).toEqual([]);
  });

  it('keeps modes independent and clears one-shot', () => {
    let state = reducer(initial(), stageComposerAttachments({ mode: 'compare', attachments: [image] }));
    state = reducer(state, stageComposerAttachments({ mode: 'chat', attachments: [doc] }));

    state = reducer(state, clearComposerAttachments({ mode: 'compare' }));
    expect(state.compare).toEqual([]);
    expect(state.chat).toEqual([doc]);
  });
});
