const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildTokenUsageMutation,
  buildImageGenerationMutation,
  buildMediaGenerationMutation,
  monthlyCountersAfterRollover,
  normalizeSessionType,
} = require('../lib/usageTracking');

const DATE = '2026-06-12';
const MONTH = '2026-06';

function tokenRecord(overrides = {}) {
  return {
    messageId: 'm1',
    sessionId: 's1',
    providerId: 'claude',
    modelId: 'claude-sonnet-4-6',
    inputTokens: 600,
    outputTokens: 400,
    totalTokens: 1000,
    sessionType: 'chat',
    timestamp: Date.now(),
    ...overrides,
  };
}

test('normalizeSessionType accepts known modes and falls back to chat', () => {
  assert.equal(normalizeSessionType('debate'), 'debate');
  assert.equal(normalizeSessionType('analyze'), 'analyze');
  assert.equal(normalizeSessionType('comparison'), 'comparison');
  assert.equal(normalizeSessionType('not-a-mode'), 'chat');
  assert.equal(normalizeSessionType(undefined), 'chat');
});

test('monthlyCountersAfterRollover carries counters within the same month', () => {
  const counters = monthlyCountersAfterRollover(
    { currentMonth: MONTH, currentMonthTokens: 10, currentMonthRequests: 2, currentMonthImages: 3, currentMonthMedia: 4 },
    MONTH
  );
  assert.equal(counters.isNewMonth, false);
  assert.deepEqual(
    [counters.currentMonthTokens, counters.currentMonthRequests, counters.currentMonthImages, counters.currentMonthMedia],
    [10, 2, 3, 4]
  );
});

test('monthlyCountersAfterRollover resets every counter on a new month', () => {
  const counters = monthlyCountersAfterRollover(
    { currentMonth: '2026-05', currentMonthTokens: 10, currentMonthRequests: 2, currentMonthImages: 3, currentMonthMedia: 4 },
    MONTH
  );
  assert.equal(counters.isNewMonth, true);
  assert.deepEqual(
    [counters.currentMonthTokens, counters.currentMonthRequests, counters.currentMonthImages, counters.currentMonthMedia],
    [0, 0, 0, 0]
  );
});

test('token usage increments daily provider, model, mode, and totals', () => {
  const { daily } = buildTokenUsageMutation(
    {
      date: DATE,
      providers: { claude: { totalInputTokens: 100, totalOutputTokens: 50, totalTokens: 150, requestCount: 1 } },
      byModel: { 'claude-sonnet-4-6': { inputTokens: 100, outputTokens: 50, requests: 1 } },
      byMode: { chat: { tokens: 150, requests: 1 } },
      totalTokens: 150,
      totalRequests: 1,
    },
    null,
    tokenRecord(),
    DATE,
    MONTH
  );

  assert.deepEqual(daily.providers.claude, {
    totalInputTokens: 700,
    totalOutputTokens: 450,
    totalTokens: 1150,
    requestCount: 2,
  });
  assert.deepEqual(daily.byModel['claude-sonnet-4-6'], { inputTokens: 700, outputTokens: 450, requests: 2 });
  assert.deepEqual(daily.byMode.chat, { tokens: 1150, requests: 2 });
  assert.equal(daily.totalTokens, 1150);
  assert.equal(daily.totalRequests, 2);
});

test('token usage records byMode per session type in daily and summary docs', () => {
  const { daily, summary } = buildTokenUsageMutation(
    {},
    null,
    tokenRecord({ sessionType: 'debate' }),
    DATE,
    MONTH
  );

  assert.deepEqual(daily.byMode, { debate: { tokens: 1000, requests: 1 } });
  assert.deepEqual(summary.byMode, { debate: { tokens: 1000, requests: 1 } });
});

test('token usage clamps unknown session types to chat', () => {
  const { summary } = buildTokenUsageMutation({}, null, tokenRecord({ sessionType: 'weird' }), DATE, MONTH);
  assert.deepEqual(Object.keys(summary.byMode), ['chat']);
});

test('token usage preserves image stats on the same daily provider', () => {
  // Regression: the old write replaced the provider object, erasing images
  const images = { totalImages: 2, byDimensions: { '1024x1024': 2 }, byQuality: { hd: 2 } };
  const { daily } = buildTokenUsageMutation(
    { providers: { claude: { images, totalTokens: 0 } } },
    null,
    tokenRecord(),
    DATE,
    MONTH
  );

  assert.deepEqual(daily.providers.claude.images, images);
  assert.equal(daily.providers.claude.totalTokens, 1000);
});

test('token usage preserves media counters and unknown fields in the summary', () => {
  // Regression: the old write rebuilt the summary without media fields
  const { summary } = buildTokenUsageMutation(
    {},
    {
      currentMonth: MONTH,
      currentMonthTokens: 5,
      currentMonthRequests: 1,
      currentMonthImages: 7,
      currentMonthMedia: 3,
      totalTokensAllTime: 5,
      totalRequestsAllTime: 1,
      totalImagesAllTime: 7,
      totalMediaAllTime: 3,
      byProvider: {},
      byModel: {},
      someFutureField: 'kept',
    },
    tokenRecord(),
    DATE,
    MONTH
  );

  assert.equal(summary.totalMediaAllTime, 3);
  assert.equal(summary.currentMonthMedia, 3);
  assert.equal(summary.currentMonthImages, 7);
  assert.equal(summary.someFutureField, 'kept');
  assert.equal(summary.currentMonthTokens, 1005);
  assert.equal(summary.currentMonthRequests, 2);
});

test('token usage month rollover resets all counters before applying the record', () => {
  const { summary } = buildTokenUsageMutation(
    {},
    {
      currentMonth: '2026-05',
      currentMonthTokens: 999,
      currentMonthRequests: 99,
      currentMonthImages: 9,
      currentMonthMedia: 9,
      totalTokensAllTime: 999,
      totalRequestsAllTime: 99,
      totalImagesAllTime: 9,
      byProvider: {},
      byModel: {},
    },
    tokenRecord(),
    DATE,
    MONTH
  );

  assert.equal(summary.currentMonth, MONTH);
  assert.equal(summary.currentMonthTokens, 1000);
  assert.equal(summary.currentMonthRequests, 1);
  assert.equal(summary.currentMonthImages, 0);
  assert.equal(summary.currentMonthMedia, 0);
  assert.equal(summary.totalTokensAllTime, 1999);
});

test('image generation preserves token fields in the daily doc', () => {
  // Regression: the old write replaced the daily doc, erasing the day's
  // byModel, byMode, totalTokens, and totalRequests
  const { daily } = buildImageGenerationMutation(
    {
      date: DATE,
      providers: { openai: { totalTokens: 500, requestCount: 2 } },
      byModel: { 'gpt-5.5': { inputTokens: 300, outputTokens: 200, requests: 2 } },
      byMode: { chat: { tokens: 500, requests: 2 } },
      totalTokens: 500,
      totalRequests: 2,
    },
    null,
    { providerId: 'openai', modelId: 'dall-e-3', imageCount: 1, dimensions: '1024x1024', quality: 'hd', timestamp: Date.now() },
    DATE,
    MONTH
  );

  assert.equal(daily.totalTokens, 500);
  assert.equal(daily.totalRequests, 2);
  assert.deepEqual(daily.byModel['gpt-5.5'], { inputTokens: 300, outputTokens: 200, requests: 2 });
  assert.deepEqual(daily.byMode.chat, { tokens: 500, requests: 2 });
  assert.equal(daily.totalImages, 1);
  assert.equal(daily.providers.openai.totalTokens, 500);
  assert.deepEqual(daily.providers.openai.images, {
    totalImages: 1,
    byDimensions: { '1024x1024': 1 },
    byQuality: { hd: 1 },
  });
});

test('image generation preserves media counters in the summary', () => {
  const { summary } = buildImageGenerationMutation(
    {},
    {
      currentMonth: MONTH,
      currentMonthTokens: 5,
      currentMonthRequests: 1,
      currentMonthImages: 2,
      currentMonthMedia: 3,
      totalTokensAllTime: 5,
      totalRequestsAllTime: 1,
      totalImagesAllTime: 2,
      totalMediaAllTime: 3,
      byProvider: {},
      byModel: {},
    },
    { providerId: 'openai', modelId: 'dall-e-3', imageCount: 2, dimensions: '512x512', timestamp: Date.now() },
    DATE,
    MONTH
  );

  assert.equal(summary.totalImagesAllTime, 4);
  assert.equal(summary.currentMonthImages, 4);
  assert.equal(summary.totalMediaAllTime, 3);
  assert.equal(summary.currentMonthMedia, 3);
  assert.equal(summary.currentMonthTokens, 5);
});

test('media generation preserves token and image fields', () => {
  const { daily, summary } = buildMediaGenerationMutation(
    {
      totalTokens: 100,
      totalImages: 5,
      byModel: { 'claude-sonnet-4-6': { inputTokens: 60, outputTokens: 40, requests: 1 } },
    },
    {
      currentMonth: MONTH,
      currentMonthTokens: 100,
      currentMonthRequests: 1,
      currentMonthImages: 5,
      currentMonthMedia: 0,
      totalTokensAllTime: 100,
      totalRequestsAllTime: 1,
      totalImagesAllTime: 5,
      byProvider: {},
      byModel: {},
    },
    { providerId: 'elevenlabs', modelId: 'eleven-v3', mediaType: 'audio', operation: 'tts', timestamp: Date.now() },
    DATE,
    MONTH
  );

  assert.equal(daily.totalTokens, 100);
  assert.equal(daily.totalImages, 5);
  assert.equal(daily.totalMedia, 1);
  assert.deepEqual(daily.providers.elevenlabs.media, {
    totalGenerations: 1,
    byMediaType: { audio: 1 },
    byOperation: { tts: 1 },
  });
  assert.equal(summary.currentMonthTokens, 100);
  assert.equal(summary.currentMonthImages, 5);
  assert.equal(summary.currentMonthMedia, 1);
  assert.equal(summary.totalMediaAllTime, 1);
});
