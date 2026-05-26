import * as SecureStore from 'expo-secure-store';
import {
  API_KEYS_STORAGE_KEY,
  cleanKeyRecord,
  deleteStoredApiKeys,
  normalizeStoredKey,
  readStoredApiKey,
  readStoredApiKeys,
  writeStoredApiKeys,
} from '@/services/apiKeys/apiKeyStorageCore';

describe('apiKeyStorageCore', () => {
  const validRunwayKey = `key_${'a'.repeat(128)}`;
  const capitalizedRunwayKey = `Key_${'a'.repeat(128)}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads stored key records from the existing Expo SecureStore location', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ openai: ' sk-test ' })
    );

    await expect(readStoredApiKeys()).resolves.toEqual({ openai: ' sk-test ' });
    await expect(readStoredApiKey('openai')).resolves.toBe('sk-test');

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(API_KEYS_STORAGE_KEY);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(2);
  });

  it('normalizes Runway keys consistently without changing other provider ids', () => {
    expect(normalizeStoredKey('runway', ` ${capitalizedRunwayKey} `)).toBe(validRunwayKey);
    expect(normalizeStoredKey('openai', ' sk-test ')).toBe('sk-test');
    expect(cleanKeyRecord({ runway: capitalizedRunwayKey, openai: ' sk-test ' })).toEqual({
      runway: validRunwayKey,
      openai: 'sk-test',
    });
  });

  it('writes and deletes only through the existing Expo SecureStore key', async () => {
    await writeStoredApiKeys({ openai: 'sk-test' });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      API_KEYS_STORAGE_KEY,
      JSON.stringify({ openai: 'sk-test' })
    );

    await deleteStoredApiKeys();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(API_KEYS_STORAGE_KEY);
  });

  it('returns null when the requested provider key is missing', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ google: 'gemini-key' })
    );

    await expect(readStoredApiKey('openai')).resolves.toBeNull();
  });
});
