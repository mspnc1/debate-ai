/**
 * CreateSelectionPersistenceService - Persist the Studio composer selection
 * (image pills + per-tab output options) to AsyncStorage so returning users
 * find their lineup pre-seeded.
 *
 * Stored raw, non-destructively: image pills whose provider currently lacks an
 * API key are hidden at read time (useCreateComposerSelection), not deleted,
 * so re-adding a key restores the pill. Attachments are session-scoped file
 * URIs and are never persisted.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CreateAudioOptions,
  CreateImageOptions,
  CreateSelectionConfig,
  CreateVideoOptions,
} from '../../types/createSelection';
import type { PersistedCreateSelection } from '../../store/createSelectionSlice';

const STORAGE_KEY = '@create_selection_v1';

const sanitizeConfigList = (value: unknown): CreateSelectionConfig[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is CreateSelectionConfig => {
    if (!entry || typeof entry !== 'object') return false;
    const candidate = entry as Record<string, unknown>;
    return (
      typeof candidate.providerId === 'string' &&
      candidate.providerId.length > 0 &&
      typeof candidate.modelId === 'string'
    );
  });
};

const sanitizeOptions = <T extends object>(value: unknown): Partial<T> | undefined =>
  value && typeof value === 'object' ? (value as Partial<T>) : undefined;

export class CreateSelectionPersistenceService {
  static async load(): Promise<PersistedCreateSelection | null> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (!json) return null;
      const data = JSON.parse(json) as Record<string, unknown>;
      return {
        image: sanitizeConfigList(data.image),
        imageOptions: sanitizeOptions<CreateImageOptions>(data.imageOptions),
        videoOptions: sanitizeOptions<CreateVideoOptions>(data.videoOptions),
        audioOptions: sanitizeOptions<CreateAudioOptions>(data.audioOptions),
      };
    } catch (error) {
      console.warn('Failed to load persisted Create selection:', error);
      return null;
    }
  }

  static async save(selection: PersistedCreateSelection): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch (error) {
      console.warn('Failed to persist Create selection:', error);
    }
  }
}

export default CreateSelectionPersistenceService;
