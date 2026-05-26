import * as SecureStore from 'expo-secure-store';

export const API_KEYS_STORAGE_KEY = 'my_ai_friends_api_keys';

export type StoredApiKeys = Record<string, string>;

function normalizeRunwayKeyPrefix(key: string): string {
  return key.startsWith('Key_') ? `key_${key.slice(4)}` : key;
}

export function normalizeStoredKey(providerId: string, key: string): string {
  const trimmed = key.trim();
  return providerId === 'runway' ? normalizeRunwayKeyPrefix(trimmed) : trimmed;
}

export function cleanKeyRecord(keys: StoredApiKeys): StoredApiKeys {
  const cleanedKeys: StoredApiKeys = {};
  Object.entries(keys).forEach(([providerId, key]) => {
    const normalizedKey = normalizeStoredKey(providerId, key);
    if (normalizedKey) {
      cleanedKeys[providerId] = normalizedKey;
    }
  });
  return cleanedKeys;
}

export async function readStoredApiKeys(): Promise<StoredApiKeys | null> {
  const jsonValue = await SecureStore.getItemAsync(API_KEYS_STORAGE_KEY);
  return jsonValue ? JSON.parse(jsonValue) as StoredApiKeys : null;
}

export async function writeStoredApiKeys(keys: StoredApiKeys): Promise<void> {
  await SecureStore.setItemAsync(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

export async function deleteStoredApiKeys(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEYS_STORAGE_KEY);
}

export async function readStoredApiKey(providerId: string): Promise<string | null> {
  const keys = await readStoredApiKeys();
  const rawKey = keys?.[providerId];
  return rawKey ? normalizeStoredKey(providerId, rawKey) : null;
}
