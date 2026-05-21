import * as SecureStore from 'expo-secure-store';
import { APIKeyService } from '@/services/APIKeyService';

describe('APIKeyService', () => {
  const service = APIKeyService.getInstance();
  const validRunwayKey = `key_${'a'.repeat(128)}`;
  const capitalizedRunwayKey = `Key_${'a'.repeat(128)}`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds or updates provider keys while preserving existing entries', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ openai: 'openai-key' })
    );
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    await service.saveKey('claude', 'claude-key');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'my_ai_friends_api_keys',
      JSON.stringify({ openai: 'openai-key', claude: 'claude-key' })
    );
  });

  it('trims provider keys before saving and reading them', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ openai: ' openai-key ' })
    );
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    await service.saveKey('runway', ' runway-key-with-whitespace ');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'my_ai_friends_api_keys',
      JSON.stringify({ openai: 'openai-key', runway: 'runway-key-with-whitespace' })
    );

    await expect(service.getKey('openai')).resolves.toBe('openai-key');
  });

  it('normalizes Runway keys to the lowercase API prefix before saving and reading them', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ runway: capitalizedRunwayKey })
    );
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    await service.saveKey('runway', capitalizedRunwayKey);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'my_ai_friends_api_keys',
      JSON.stringify({ runway: validRunwayKey })
    );
    await expect(service.getKey('runway')).resolves.toBe(validRunwayKey);
  });


  it('removes provider key when saved value is empty', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ openai: 'openai-key', claude: 'claude-key' })
    );
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    await service.saveKey('claude', '');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'my_ai_friends_api_keys',
      JSON.stringify({ openai: 'openai-key' })
    );
  });

  it('validates key format', () => {
    expect(service.validateKeyFormat('openai', '')).toEqual({
      isValid: false,
      message: 'API key cannot be empty',
    });

    const valid = service.validateKeyFormat('openai', 'sk-live-123456789012345678901234567890ab');
    expect(valid.isValid).toBe(true);

    expect(service.validateKeyFormat('runway', validRunwayKey)).toEqual({
      isValid: true,
      message: 'Key format appears valid',
    });
    expect(service.validateKeyFormat('runway', capitalizedRunwayKey)).toEqual({
      isValid: true,
      message: 'Key format appears valid',
    });
    expect(service.validateKeyFormat('runway', 'rw_abcdefghijklmnopqrstuvwxyz123456')).toEqual({
      isValid: false,
      message: 'Runway API keys should start with "key_" or "Key_" followed by 128 lowercase hex characters',
    });
  });
});
