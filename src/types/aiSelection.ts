import { ModelParameters } from './index';

/**
 * Composer draft selection for the input-bar-first entry flow (Chat/Compare).
 * Mirrors the web app's AISelectionConfig so both clients share one vocabulary.
 *
 * This is cross-session state: persisted to AsyncStorage and re-validated at
 * read time, because providers can lose API keys and models can be retired
 * between app launches. Session-scoped personality/model maps in the chat
 * slice remain the runtime contract; configs translate at send time.
 */
export interface AISelectionConfig {
  providerId: string;
  modelId: string;
  personalityId: string;
  parameters?: ModelParameters;
}

export type AISelectionMode = 'chat' | 'compare';
