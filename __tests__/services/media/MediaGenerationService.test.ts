import MediaGenerationService from '@/services/media/MediaGenerationService';
import { bytesToBase64, parseDataUri } from '@/services/media/mediaFileCache';

describe('MediaGenerationService', () => {
  const originalFetch = global.fetch;
  const validRunwayKey = `key_${'a'.repeat(128)}`;
  const capitalizedRunwayKey = `Key_${'a'.repeat(128)}`;

  function mockJsonResponse(body: unknown, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(JSON.stringify(body)),
      headers: { get: jest.fn() },
    } as unknown as Response;
  }

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('builds a Runway image-to-video request without proxy fields', () => {
    expect(MediaGenerationService.buildRunwayBody({
      apiKey: 'local-runway-key',
      operation: 'image_to_video',
      prompt: 'Animate this image',
      modelId: 'gen4.5',
      sourceImage: 'data:image/jpeg;base64,abc',
      durationSeconds: 5,
      aspectRatio: '1280:720',
    })).toEqual({
      model: 'gen4.5',
      promptText: 'Animate this image',
      promptImage: 'data:image/jpeg;base64,abc',
      duration: 5,
      ratio: '1280:720',
    });
  });

  it('routes text video through the same Runway endpoint as the web proxy', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ id: 'task-1', status: 'PENDING' }));

    await MediaGenerationService.startRunwayVideo({
      apiKey: ` ${validRunwayKey} `,
      operation: 'text_to_video',
      prompt: 'A mountain sunrise',
      modelId: 'gen4.5',
      durationSeconds: 5,
      aspectRatio: '1280:720',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.dev.runwayml.com/v1/text_to_video',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${validRunwayKey}`,
        }),
      })
    );
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      model: 'gen4.5',
      promptText: 'A mountain sunrise',
      ratio: '1280:720',
      duration: 5,
    });
  });

  it('normalizes Runway keys with the capitalized prefix returned by the developer portal', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ id: 'task-1', status: 'PENDING' }));

    await MediaGenerationService.startRunwayVideo({
      apiKey: capitalizedRunwayKey,
      operation: 'text_to_video',
      prompt: 'A mountain sunrise',
      modelId: 'gen4.5',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.dev.runwayml.com/v1/text_to_video',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${validRunwayKey}`,
        }),
      })
    );
  });

  it('keeps the native text-to-video endpoint for models that use it', () => {
    expect(MediaGenerationService.getRunwayVideoEndpoint({
      apiKey: 'local-runway-key',
      operation: 'text_to_video',
      prompt: 'A mountain sunrise',
      modelId: 'gen4.5',
    })).toBe('text_to_video');
  });

  it('does not report a Runway 403 access failure as an invalid API key', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({
      error: { message: 'Model gen4.5 is not available for this account.' },
    }, 403));

    await expect(MediaGenerationService.startRunwayVideo({
      apiKey: validRunwayKey,
      operation: 'text_to_video',
      prompt: 'A mountain sunrise',
      modelId: 'gen4.5',
    })).rejects.toThrow('Runway access denied: Model gen4.5 is not available for this account.');
  });

  it('reports Runway 401 failures with the stored-key fingerprint and provider response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({
      error: { message: 'Unauthorized' },
    }, 401));

    await expect(MediaGenerationService.startRunwayVideo({
      apiKey: validRunwayKey,
      operation: 'text_to_video',
      prompt: 'A mountain sunrise',
      modelId: 'gen4.5',
    })).rejects.toThrow('Runway API request failed with HTTP 401. Mobile stored key is key_...aaaa (132 chars). Provider response: Unauthorized');
  });

  it('reports ElevenLabs text-to-speech permission failures without calling the key invalid', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({
      detail: {
        status: 'insufficient_permissions',
        message: 'API key is missing text_to_speech permission',
      },
    }, 403));

    await expect(MediaGenerationService.generateElevenLabsAudio({
      apiKey: 'elevenlabs_valid_key_123',
      operation: 'text_to_speech',
      prompt: 'Opening argument.',
      voiceId: 'voice-1',
    })).rejects.toThrow('ElevenLabs API key is missing text-to-speech permission: API key is missing text_to_speech permission');
  });

  it('rejects malformed Runway keys before sending a generation request', async () => {
    await expect(MediaGenerationService.startRunwayVideo({
      apiKey: 'bad-runway-key',
      operation: 'text_to_video',
      prompt: 'A mountain sunrise',
      modelId: 'gen4.5',
    })).rejects.toThrow('Runway API key format is invalid.');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maps provider statuses into Create media statuses', () => {
    expect(MediaGenerationService.mapRunwayStatus('processing')).toBe('running');
    expect(MediaGenerationService.mapRunwayStatus('completed')).toBe('succeeded');
    expect(MediaGenerationService.mapRunwayStatus('cancelled')).toBe('canceled');
    expect(MediaGenerationService.mapRunwayStatus('unknown')).toBe('queued');
  });

  it('serializes binary audio payloads without relying on Node Buffer', () => {
    const base64 = bytesToBase64(new Uint8Array([104, 101, 108, 108, 111]));
    expect(base64).toBe('aGVsbG8=');
    expect(parseDataUri(`data:audio/mpeg;base64,${base64}`)).toEqual({
      mimeType: 'audio/mpeg',
      base64,
    });
  });
});
