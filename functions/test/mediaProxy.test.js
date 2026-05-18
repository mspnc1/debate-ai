const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { buildRunwayVideoTaskRequest, mapRunwayStatus } = require('../lib/mediaProxy');

describe('buildRunwayVideoTaskRequest', () => {
  it('uses the text-to-video endpoint without promptImage for text-only Runway generations', () => {
    const request = buildRunwayVideoTaskRequest(
      {
        providerId: 'runway',
        mediaType: 'video',
        operation: 'text_to_video',
        modelId: 'gen4.5',
        prompt: 'unused',
        durationSeconds: 5,
        aspectRatio: '1280:720',
      },
      'A quiet mountain lake at sunrise'
    );

    assert.equal(request.endpoint, 'text_to_video');
    assert.deepEqual(request.body, {
      model: 'gen4.5',
      promptText: 'A quiet mountain lake at sunrise',
      ratio: '1280:720',
      duration: 5,
    });
    assert.equal(Object.hasOwn(request.body, 'promptImage'), false);
  });

  it('uses the image-to-video endpoint with promptImage when a source image is provided', () => {
    const request = buildRunwayVideoTaskRequest(
      {
        providerId: 'runway',
        mediaType: 'video',
        operation: 'image_to_video',
        modelId: 'gen4.5',
        prompt: 'unused',
        sourceImage: 'data:image/png;base64,abc123',
        durationSeconds: 5,
        aspectRatio: '720:1280',
      },
      'Slow camera push in'
    );

    assert.equal(request.endpoint, 'image_to_video');
    assert.deepEqual(request.body, {
      model: 'gen4.5',
      promptText: 'Slow camera push in',
      ratio: '720:1280',
      duration: 5,
      promptImage: 'data:image/png;base64,abc123',
    });
  });
});

describe('mapRunwayStatus', () => {
  it('maps current Runway terminal statuses', () => {
    assert.equal(mapRunwayStatus('SUCCEEDED'), 'succeeded');
    assert.equal(mapRunwayStatus('FAILED'), 'failed');
    assert.equal(mapRunwayStatus('CANCELED'), 'canceled');
    assert.equal(mapRunwayStatus('CANCELLED'), 'canceled');
  });

  it('keeps throttled and pending tasks in the queued phase', () => {
    assert.equal(mapRunwayStatus('PENDING'), 'queued');
    assert.equal(mapRunwayStatus('THROTTLED'), 'queued');
    assert.equal(mapRunwayStatus('QUEUED'), 'queued');
  });

  it('maps active processing states to running', () => {
    assert.equal(mapRunwayStatus('RUNNING'), 'running');
    assert.equal(mapRunwayStatus('PROCESSING'), 'running');
  });
});
