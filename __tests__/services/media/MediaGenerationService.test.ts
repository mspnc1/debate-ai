import MediaGenerationService from '@/services/media/MediaGenerationService';
import { bytesToBase64, parseDataUri } from '@/services/media/mediaFileCache';

describe('MediaGenerationService', () => {
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
