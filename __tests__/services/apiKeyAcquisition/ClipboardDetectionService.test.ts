import { ClipboardDetectionService } from '@/services/apiKeyAcquisition/ClipboardDetectionService';

describe('ClipboardDetectionService', () => {
  const validRunwayKey = `key_${'a'.repeat(128)}`;
  const capitalizedRunwayKey = `Key_${'a'.repeat(128)}`;

  it('validates Runway keys with the documented strict format', () => {
    expect(ClipboardDetectionService.validateAsApiKey(validRunwayKey, 'runway')).toEqual({
      isValid: true,
      confidence: 'high',
      message: 'Key matches expected format',
    });
    expect(ClipboardDetectionService.validateAsApiKey(capitalizedRunwayKey, 'runway')).toEqual({
      isValid: true,
      confidence: 'high',
      message: 'Key matches expected format',
    });
  });

  it('rejects Runway-looking clipboard values that are not lowercase hex tokens', () => {
    expect(ClipboardDetectionService.validateAsApiKey(`key_${'g'.repeat(128)}`, 'runway')).toEqual({
      isValid: false,
      confidence: 'low',
      message: 'Runway API keys should start with "key_" or "Key_" followed by 128 lowercase hex characters',
    });
  });

  it('detects valid Runway keys by prefix', () => {
    expect(ClipboardDetectionService.detectProvider(validRunwayKey)).toBe('runway');
    expect(ClipboardDetectionService.detectProvider(capitalizedRunwayKey)).toBe('runway');
  });
});
