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

  function mockAudioResponse(headers: Record<string, string> = {}): Response {
    return {
      ok: true,
      status: 200,
      arrayBuffer: jest.fn().mockResolvedValue(new Uint8Array([104, 105]).buffer),
      headers: {
        get: jest.fn((key: string) => headers[key.toLowerCase()] || null),
      },
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

  it('keeps the ElevenLabs authentication response visible on 401 failures', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({
      detail: {
        status: 'invalid_api_key',
        message: 'The API key is invalid or missing.',
      },
    }, 401));

    await expect(MediaGenerationService.generateElevenLabsAudio({
      apiKey: 'elevenlabs_invalid_key_123',
      operation: 'text_to_speech',
      prompt: 'Opening argument.',
      voiceId: 'voice-1',
    })).rejects.toThrow('ElevenLabs authentication failed: The API key is invalid or missing.');
  });

  it('defaults ElevenLabs TTS to Flash and records cost headers', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockAudioResponse({
      'content-type': 'audio/mpeg',
      'x-character-count': '19',
      'request-id': 'req_123',
    }));

    const audio = await MediaGenerationService.generateElevenLabsAudio({
      apiKey: 'elevenlabs_valid_key_123',
      operation: 'text_to_speech',
      prompt: 'Read this line',
      voiceId: 'voice-1',
    });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      text: 'Read this line',
      model_id: 'eleven_flash_v2_5',
    });
    expect(audio).toMatchObject({
      modelId: 'eleven_flash_v2_5',
      characterCost: 19,
      requestId: 'req_123',
      mimeType: 'audio/mpeg',
    });
  });

  it('looks up and parses ElevenLabs subscription credits', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({
      character_count: 1000,
      character_limit: 1200,
      max_credit_limit_extension: 0,
      can_extend_character_limit: true,
      next_character_count_reset_unix: 1704067200,
    }));

    const subscription = await MediaGenerationService.getElevenLabsSubscription('eleven-key');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.elevenlabs.io/v1/user/subscription',
      expect.objectContaining({
        method: 'GET',
        headers: { 'xi-api-key': 'eleven-key' },
      })
    );
    expect(subscription).toMatchObject({
      characterCount: 1000,
      characterLimit: 1200,
      remainingCredits: 200,
      overageAllowed: false,
      resetDateLabel: 'Jan 1, 2024',
    });
  });

  it('builds ElevenLabs voice search URLs with server-side filters and pagination', () => {
    const url = new URL(MediaGenerationService.buildElevenLabsVoiceSearchUrl({
      pageSize: 250,
      includeTotalCount: true,
      search: '  narrator  ',
      nextPageToken: 'next-1',
      sort: 'created_at_unix',
      sortDirection: 'desc',
      voiceType: 'non-community',
      category: 'professional',
      fineTuningState: 'fine_tuned',
      collectionId: 'collection-1',
      voiceIds: ['voice-1', 'voice-2'],
    }));

    expect(url.toString()).toContain('https://api.elevenlabs.io/v2/voices?');
    expect(url.searchParams.get('page_size')).toBe('100');
    expect(url.searchParams.get('include_total_count')).toBe('true');
    expect(url.searchParams.get('search')).toBe('narrator');
    expect(url.searchParams.get('next_page_token')).toBe('next-1');
    expect(url.searchParams.get('sort')).toBe('created_at_unix');
    expect(url.searchParams.get('sort_direction')).toBe('desc');
    expect(url.searchParams.get('voice_type')).toBe('non-community');
    expect(url.searchParams.get('category')).toBe('professional');
    expect(url.searchParams.get('fine_tuning_state')).toBe('fine_tuned');
    expect(url.searchParams.get('collection_id')).toBe('collection-1');
    expect(url.searchParams.getAll('voice_ids')).toEqual(['voice-1', 'voice-2']);
  });

  it('maps ElevenLabs voice metadata used by the debate voice browser', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(mockJsonResponse({
        voices: [
          {
            voice_id: 'voice-1',
            name: 'Studio Host',
            category: 'professional',
            description: 'Polished narration',
            preview_url: 'https://example.com/preview.mp3',
            labels: {
              accent: 'American',
              gender: 'female',
              use_case: 'news',
            },
            verified_languages: [
              {
                language: 'English',
                model_id: 'eleven_multilingual_v2',
                accent: 'American',
                locale: 'en-US',
                preview_url: 'https://example.com/en.mp3',
              },
            ],
            available_for_tiers: ['creator'],
            high_quality_base_model_ids: ['eleven_multilingual_v2'],
            fine_tuning: {
              state: {
                eleven_multilingual_v2: 'fine_tuned',
              },
            },
            collection_ids: ['collection-1'],
            permission_on_resource: 'admin',
            is_owner: true,
            is_bookmarked: true,
            is_legacy: false,
            is_mixed: false,
            favorited_at_unix: 1700000000,
            created_at_unix: 1690000000,
            recording_quality: 'studio',
            labelling_status: 'complete',
            recording_quality_reason: 'clean',
            safety_control: 'NONE',
            sharing: {
              status: 'enabled',
            },
          },
        ],
        has_more: true,
        total_count: 42,
        next_page_token: 'next-page',
      }))
      .mockResolvedValueOnce(mockJsonResponse([]));

    const options = await MediaGenerationService.listElevenLabsOptions('eleven-key', {
      voiceType: 'saved',
      category: 'professional',
      pageSize: 20,
      includeTotalCount: true,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('voice_type=saved'),
      expect.objectContaining({
        method: 'GET',
        headers: { 'xi-api-key': 'eleven-key' },
      })
    );
    expect(options.voiceHasMore).toBe(true);
    expect(options.voiceTotalCount).toBe(42);
    expect(options.voiceNextPageToken).toBe('next-page');
    expect(options.voices?.[0]).toMatchObject({
      id: 'voice-1',
      name: 'Studio Host',
      voice_id: 'voice-1',
      category: 'professional',
      description: 'Polished narration',
      previewUrl: 'https://example.com/preview.mp3',
      preview_url: 'https://example.com/preview.mp3',
      labels: {
        accent: 'American',
        gender: 'female',
        use_case: 'news',
      },
      verifiedLanguages: [
        expect.objectContaining({
          language: 'English',
          modelId: 'eleven_multilingual_v2',
          previewUrl: 'https://example.com/en.mp3',
        }),
      ],
      sourceVoiceType: 'saved',
      availableForTiers: ['creator'],
      highQualityBaseModelIds: ['eleven_multilingual_v2'],
      fineTuningStates: {
        eleven_multilingual_v2: 'fine_tuned',
      },
      collectionIds: ['collection-1'],
      permissionOnResource: 'admin',
      isOwner: true,
      isBookmarked: true,
      isLegacy: false,
      isMixed: false,
      favoritedAtUnix: 1700000000,
      createdAtUnix: 1690000000,
      recordingQuality: 'studio',
      labellingStatus: 'complete',
      recordingQualityReason: 'clean',
      safetyControl: 'NONE',
      sharingStatus: 'enabled',
    });
  });

  it('builds shared-voices URLs with server-side filters and page-based pagination', () => {
    const url = new URL(MediaGenerationService.buildElevenLabsSharedVoiceUrl({
      pageSize: 250,
      page: 2,
      search: '  storyteller  ',
      category: 'high_quality',
      gender: 'female',
      age: 'young',
      accent: 'british',
      language: 'en',
      locale: 'en-GB',
      featured: true,
      useCases: ['narrative_story', 'conversational'],
      descriptives: ['calm', 'warm'],
      sort: 'trending',
    }));

    expect(url.toString()).toContain('https://api.elevenlabs.io/v1/shared-voices?');
    expect(url.searchParams.get('page_size')).toBe('100');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('search')).toBe('storyteller');
    expect(url.searchParams.get('category')).toBe('high_quality');
    expect(url.searchParams.get('gender')).toBe('female');
    expect(url.searchParams.get('age')).toBe('young');
    expect(url.searchParams.get('accent')).toBe('british');
    expect(url.searchParams.get('language')).toBe('en');
    expect(url.searchParams.get('locale')).toBe('en-GB');
    expect(url.searchParams.get('featured')).toBe('true');
    expect(url.searchParams.get('sort')).toBe('trending');
    expect(url.searchParams.getAll('use_cases')).toEqual(['narrative_story', 'conversational']);
    expect(url.searchParams.getAll('descriptives')).toEqual(['calm', 'warm']);
  });

  it('defaults shared-voices pagination and omits empty filters', () => {
    const url = new URL(MediaGenerationService.buildElevenLabsSharedVoiceUrl());
    expect(url.searchParams.get('page_size')).toBe('30');
    expect(url.searchParams.get('page')).toBe('0');
    expect(url.searchParams.has('gender')).toBe(false);
    expect(url.searchParams.has('use_cases')).toBe(false);
    expect(url.searchParams.has('featured')).toBe(false);
  });

  it('maps community shared voices and encodes the next page token when more exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({
      voices: [
        {
          voice_id: 'shared-1',
          public_owner_id: 'owner-9',
          name: 'Community Star',
          category: 'high_quality',
          description: 'Warm storyteller',
          preview_url: 'https://example.com/shared.mp3',
          gender: 'female',
          age: 'young',
          accent: 'british',
          descriptive: 'calm',
          use_case: 'narrative_story',
          language: 'en',
          locale: 'en-GB',
          free_users_allowed: true,
          is_added_by_user: false,
          is_bookmarked: false,
          image_url: 'https://example.com/avatar.png',
          date_unix: 1690000000,
        },
      ],
      has_more: true,
      total_count: 480,
    }));

    const options = await MediaGenerationService.listElevenLabsSharedVoices('eleven-key', {
      page: 1,
      gender: 'female',
      accent: 'british',
      useCases: ['narrative_story'],
    });

    const [requestedUrl, requestOptions] = (global.fetch as jest.Mock).mock.calls[0];
    expect(requestedUrl).toContain('https://api.elevenlabs.io/v1/shared-voices?');
    expect(requestOptions).toMatchObject({ method: 'GET', headers: { 'xi-api-key': 'eleven-key' } });

    expect(options.voiceHasMore).toBe(true);
    expect(options.voiceTotalCount).toBe(480);
    // Page-based pagination encodes the *next* page into the reusable token field.
    expect(options.voiceNextPageToken).toBe('2');
    expect(options.voices?.[0]).toMatchObject({
      id: 'shared-1',
      name: 'Community Star',
      voice_id: 'shared-1',
      category: 'high_quality',
      description: 'Warm storyteller',
      previewUrl: 'https://example.com/shared.mp3',
      sourceVoiceType: 'community',
      isCommunity: true,
      publicOwnerId: 'owner-9',
      freeUsersAllowed: true,
      isAddedByUser: false,
      imageUrl: 'https://example.com/avatar.png',
      createdAtUnix: 1690000000,
      // gender/age/accent/descriptive/use_case are synthesized into the labels record
      // so the picker's chip/filter helpers work uniformly.
      labels: {
        gender: 'female',
        age: 'young',
        accent: 'british',
        descriptive: 'calm',
        use_case: 'narrative_story',
      },
    });
    expect(options.voices?.[0]?.verifiedLanguages?.[0]).toMatchObject({
      language: 'en',
      locale: 'en-GB',
      preview_url: 'https://example.com/shared.mp3',
    });
  });

  it('returns a null next page token when the shared library has no more results', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({
      voices: [{ voice_id: 'shared-1', public_owner_id: 'owner-9', name: 'Only Voice' }],
      has_more: false,
      total_count: 1,
    }));

    const options = await MediaGenerationService.listElevenLabsSharedVoices('eleven-key', { page: 0 });
    expect(options.voiceHasMore).toBe(false);
    expect(options.voiceNextPageToken).toBeNull();
  });

  it('adds a shared voice to the library and returns the new library voice id', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ voice_id: 'library-voice-77' }));

    const newVoiceId = await MediaGenerationService.addElevenLabsSharedVoice(
      'eleven-key',
      'owner 9/special',
      'shared-1',
      'Community Star'
    );

    expect(newVoiceId).toBe('library-voice-77');
    const [url, requestOptions] = (global.fetch as jest.Mock).mock.calls[0];
    // Path params must be URL-encoded.
    expect(url).toBe('https://api.elevenlabs.io/v1/voices/add/owner%209%2Fspecial/shared-1');
    expect(requestOptions).toMatchObject({
      method: 'POST',
      headers: { 'xi-api-key': 'eleven-key', 'Content-Type': 'application/json' },
    });
    expect(JSON.parse(requestOptions.body)).toEqual({ new_name: 'Community Star', bookmarked: true });
  });

  it('surfaces ElevenLabs errors when adding a shared voice fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({
      detail: { status: 'voice_limit_reached', message: 'You have reached your voice limit.' },
    }, 400));

    await expect(MediaGenerationService.addElevenLabsSharedVoice(
      'eleven-key',
      'owner-9',
      'shared-1',
      'Community Star'
    )).rejects.toThrow('You have reached your voice limit.');
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
