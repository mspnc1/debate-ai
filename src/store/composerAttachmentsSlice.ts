import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { MessageAttachment } from '../types';
import type { AISelectionMode } from '../types/aiSelection';

/**
 * Attachments staged by an entry composer (Home chat / CompareSetup) for the
 * session screen's first auto-sent message.
 *
 * Deliberately NOT persisted and NEVER passed through navigation params:
 * route params are JSON-stringified into AsyncStorage by the navigation
 * state persister, and these carry base64 payloads. Every entry send stages
 * exactly what it carries — including an empty list — so a lineup abandoned
 * before the session mounts can never leak into a later send. The session
 * screen takes the staged list once (read + clear) when it fires the first
 * message.
 */
export interface ComposerAttachmentsState {
  chat: MessageAttachment[];
  compare: MessageAttachment[];
}

const initialState: ComposerAttachmentsState = {
  chat: [],
  compare: [],
};

const composerAttachmentsSlice = createSlice({
  name: 'composerAttachments',
  initialState,
  reducers: {
    stageComposerAttachments: (
      state,
      action: PayloadAction<{ mode: AISelectionMode; attachments: MessageAttachment[] }>
    ) => {
      state[action.payload.mode] = action.payload.attachments;
    },
    clearComposerAttachments: (state, action: PayloadAction<{ mode: AISelectionMode }>) => {
      state[action.payload.mode] = [];
    },
  },
});

export const { stageComposerAttachments, clearComposerAttachments } =
  composerAttachmentsSlice.actions;

export default composerAttachmentsSlice.reducer;
