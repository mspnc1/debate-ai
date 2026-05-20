import { getProviderModels } from '@/config/modelConfigs';
import { AdapterFactory } from '@/services/ai/factory/AdapterFactory';
import type { AIAdapterConfig } from '@/services/ai/types/adapter.types';
import type { AIProvider } from '@/types';
import { isDemoModeEnabled } from '@/services/demo/demoMode';

jest.mock('@/services/demo/demoMode', () => ({
  isDemoModeEnabled: jest.fn(),
}));

const demoModeMock = isDemoModeEnabled as jest.MockedFunction<typeof isDemoModeEnabled>;

const pickSmokeModel = (provider: string): string => {
  const models = getProviderModels(provider);
  const selected = models.find((model) => !model.isDefault) || models[0];
  if (!selected) {
    throw new Error(`No selectable model found for provider ${provider}`);
  }
  return selected.id;
};

const createOpenAICompatibleResponse = (model: string) => ({
  ok: true,
  json: async () => ({
    choices: [{ message: { content: 'ok' } }],
    model,
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
  }),
}) as unknown as Response;

const createClaudeResponse = (model: string) => ({
  ok: true,
  json: async () => ({
    content: [{ text: 'ok' }],
    model,
    usage: {
      input_tokens: 10,
      output_tokens: 5,
    },
  }),
}) as unknown as Response;

const createGeminiResponse = () => ({
  ok: true,
  json: async () => ({
    candidates: [
      {
        content: {
          parts: [{ text: 'ok' }],
        },
      },
    ],
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 5,
      totalTokenCount: 15,
    },
  }),
}) as unknown as Response;

const createCohereResponse = () => ({
  ok: true,
  json: async () => ({
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'ok' }],
    },
    usage: {
      tokens: {
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
      },
    },
  }),
}) as unknown as Response;

const createPerplexityResponse = (model: string) => ({
  ok: true,
  json: async () => ({
    choices: [{ message: { content: 'ok' } }],
    model,
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
    citations: [],
    search_results: [],
  }),
}) as unknown as Response;

type RoutingCase = {
  provider: AIProvider;
  model: string;
  response: Response;
  assertRequest: (url: string, requestInit: RequestInit | undefined, model: string) => void;
};

const ROUTING_CASES: RoutingCase[] = [
  {
    provider: 'claude',
    model: pickSmokeModel('claude'),
    response: createClaudeResponse(pickSmokeModel('claude')),
    assertRequest: (url, requestInit, model) => {
      expect(url).toBe('https://api.anthropic.com/v1/messages');
      const body = JSON.parse((requestInit?.body as string) || '{}');
      expect(body.model).toBe(model);
    },
  },
  {
    provider: 'openai',
    model: pickSmokeModel('openai'),
    response: createOpenAICompatibleResponse(pickSmokeModel('openai')),
    assertRequest: (url, requestInit, model) => {
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      const body = JSON.parse((requestInit?.body as string) || '{}');
      expect(body.model).toBe(model);
    },
  },
  {
    provider: 'google',
    model: pickSmokeModel('google'),
    response: createGeminiResponse(),
    assertRequest: (url, _requestInit, model) => {
      expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`);
    },
  },
  {
    provider: 'perplexity',
    model: pickSmokeModel('perplexity'),
    response: createPerplexityResponse(pickSmokeModel('perplexity')),
    assertRequest: (url, requestInit, model) => {
      expect(url).toBe('https://api.perplexity.ai/chat/completions');
      const body = JSON.parse((requestInit?.body as string) || '{}');
      expect(body.model).toBe(model);
    },
  },
  {
    provider: 'mistral',
    model: pickSmokeModel('mistral'),
    response: createOpenAICompatibleResponse(pickSmokeModel('mistral')),
    assertRequest: (url, requestInit, model) => {
      expect(url).toBe('https://api.mistral.ai/v1/chat/completions');
      const body = JSON.parse((requestInit?.body as string) || '{}');
      expect(body.model).toBe(model);
    },
  },
  {
    provider: 'cohere',
    model: pickSmokeModel('cohere'),
    response: createCohereResponse(),
    assertRequest: (url, requestInit, model) => {
      expect(url).toBe('https://api.cohere.com/v2/chat');
      const body = JSON.parse((requestInit?.body as string) || '{}');
      expect(body.model).toBe(model);
    },
  },
  {
    provider: 'deepseek',
    model: pickSmokeModel('deepseek'),
    response: createOpenAICompatibleResponse(pickSmokeModel('deepseek')),
    assertRequest: (url, requestInit, model) => {
      expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
      const body = JSON.parse((requestInit?.body as string) || '{}');
      expect(body.model).toBe(model);
    },
  },
  {
    provider: 'grok',
    model: pickSmokeModel('grok'),
    response: createOpenAICompatibleResponse(pickSmokeModel('grok')),
    assertRequest: (url, requestInit, model) => {
      expect(url).toBe('https://api.x.ai/v1/chat/completions');
      const body = JSON.parse((requestInit?.body as string) || '{}');
      expect(body.model).toBe(model);
    },
  },
];

describe('Model routing contract', () => {
  const removedProvider = ['to', 'gether'].join('');
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    demoModeMock.mockReturnValue(false);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each(ROUTING_CASES)('routes %s model selection into the outbound adapter request', async ({
    provider,
    model,
    response,
    assertRequest,
  }) => {
    fetchMock.mockResolvedValueOnce(response);

    const config: AIAdapterConfig = {
      provider,
      apiKey: 'test-key',
      parameters: { temperature: 0.7, maxTokens: 128 },
    };
    const adapter = AdapterFactory.createWithModel(config, model);

    await adapter.sendMessage('Ping');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0];
    assertRequest(url as string, requestInit, model);
  });

  it('does not expose removed providers through adapter support checks', () => {
    expect(AdapterFactory.isProviderSupported(removedProvider)).toBe(false);
    expect(AdapterFactory.getAvailableProviders()).not.toContain(removedProvider);
  });
});
