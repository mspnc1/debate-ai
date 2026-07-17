import { DeepSeekAdapter } from '../deepseek/DeepSeekAdapter';
import { GrokAdapter } from '../grok/GrokAdapter';
import { MistralAdapter } from '../mistral/MistralAdapter';
import type { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import type { AIAdapterConfig, AdapterCapabilities } from '../../types/adapter.types';
import type { AIProvider, MessageAttachment } from '../../../../types';

const createFetchResponse = () => ({
  ok: true,
  json: async () => ({
    choices: [
      {
        message: { content: 'adapter response' },
      },
    ],
    model: 'returned-model',
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
  }),
}) as unknown as Response;

type AdapterEntry = {
  name: string;
  provider: AIProvider;
  AdapterCtor: new (config: AIAdapterConfig) => OpenAICompatibleAdapter;
  baseUrl: string;
  defaultModel: string;
  capabilities: AdapterCapabilities;
};

const ADAPTER_MATRIX: AdapterEntry[] = [
  {
    name: 'DeepSeek',
    provider: 'deepseek',
    AdapterCtor: DeepSeekAdapter,
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-flash',
    capabilities: {
      streaming: true,
      attachments: false,  // Chat API doesn't support vision
      supportsImages: false,
      supportsDocuments: false,
      functionCalling: true,
      systemPrompt: true,
      maxTokens: 64000,
      contextWindow: 1048576,
    },
  },
  {
    name: 'Grok',
    provider: 'grok',
    AdapterCtor: GrokAdapter,
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-4.3',
    capabilities: {
      streaming: true,
      attachments: true,  // Supports vision
      supportsImages: true,
      supportsDocuments: false,  // PDFs require separate Files API
      functionCalling: true,
      systemPrompt: true,
      maxTokens: 100000,
      contextWindow: 2000000,
    },
  },
  {
    name: 'Mistral',
    provider: 'mistral',
    AdapterCtor: MistralAdapter,
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-2512',
    capabilities: {
      streaming: true,
      attachments: true,  // Supports images only
      supportsImages: true,
      supportsDocuments: false,  // PDFs require separate OCR API
      functionCalling: true,
      systemPrompt: true,
      maxTokens: 32768,
      contextWindow: 262144,
    },
  },
];

const makeConfig = (provider: AIProvider, defaultModel: string, overrides: Partial<AIAdapterConfig> = {}): AIAdapterConfig => ({
  provider,
  apiKey: 'test-key',
  model: defaultModel,
  parameters: { temperature: 0.4, maxTokens: 2048 },
  ...overrides,
});

describe.each(ADAPTER_MATRIX)('$name adapter', ({
  AdapterCtor,
  baseUrl,
  defaultModel,
  provider,
  capabilities,
}) => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(createFetchResponse());
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('exposes provider capabilities', () => {
    const adapter = new AdapterCtor(makeConfig(provider, defaultModel));

    expect(adapter.getCapabilities()).toEqual(capabilities);
  });

  it('sends chat completion requests using provider configuration', async () => {
    const adapter = new AdapterCtor(makeConfig(provider, defaultModel));

    const result = await adapter.sendMessage('Draft a launch plan');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe(`${baseUrl}/chat/completions`);
    expect(requestInit?.method).toBe('POST');

    const headers = requestInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['Content-Type']).toBe('application/json');

    const body = JSON.parse((requestInit?.body as string) || '{}');
    expect(body.model).toBe(defaultModel);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a helpful AI assistant.' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Draft a launch plan' });

    expect(result).toEqual({
      response: 'adapter response',
      modelUsed: 'returned-model',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    });
  });

  it('preserves explicit zero temperature values', async () => {
    const adapter = new AdapterCtor(
      makeConfig(provider, defaultModel, {
        parameters: { temperature: 0, maxTokens: 128 },
      })
    );

    await adapter.sendMessage('Be deterministic');

    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse((requestInit?.body as string) || '{}');

    expect(body.temperature).toBe(0);
  });

  it('handles image attachments based on adapter capabilities', async () => {
    const adapter = new AdapterCtor(makeConfig(provider, defaultModel));

    const attachments: MessageAttachment[] = [
      {
        type: 'image',
        uri: 'file:///photo.png',
        base64: 'abc123',
        mimeType: 'image/png',
        fileName: 'photo.png',
      },
    ];

    await adapter.sendMessage('Describe the image', [], undefined, attachments);

    expect(fetchMock).toHaveBeenCalled();
    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse((requestInit?.body as string) || '{}');

    const userMessage = body.messages.find((msg: { role: string }) => msg.role === 'user');
    expect(userMessage).toBeDefined();

    if (capabilities.attachments && capabilities.supportsImages) {
      // Adapters that support images should embed them in the message
      expect(userMessage.content).toEqual([
        { type: 'text', text: 'Describe the image' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,abc123' } },
      ]);
    } else {
      // Adapters without image support should pass through as plain text
      expect(userMessage.content).toBe('Describe the image');
    }
  });
});

describe('GrokAdapter web search (xAI Responses API)', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;

  const createResponsesPayload = (overrides: Record<string, unknown> = {}) => ({
    ok: true,
    json: async () => ({
      model: 'grok-4.5',
      status: 'completed',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'Fresh answer',
              annotations: [
                { type: 'url_citation', url: 'https://example.com/x', title: 'Source X' },
              ],
            },
          ],
        },
      ],
      usage: { input_tokens: 9, output_tokens: 4, total_tokens: 13 },
      ...overrides,
    }),
  }) as unknown as Response;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(createResponsesPayload());
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const makeSearchConfig = (): AIAdapterConfig => ({
    provider: 'grok',
    apiKey: 'test-key',
    model: 'grok-4.5',
    parameters: { temperature: 0.4, maxTokens: 2048 },
    webSearchEnabled: true,
  });

  it('posts to /responses with the web_search tool and typed input', async () => {
    const adapter = new GrokAdapter(makeSearchConfig());

    const result = await adapter.sendMessage('What is happening today?');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.x.ai/v1/responses');
    const body = JSON.parse((requestInit?.body as string) || '{}');
    expect(body.tools).toEqual([{ type: 'web_search' }]);
    expect(body.stream).toBe(false);
    expect(typeof body.instructions).toBe('string');
    expect(body.input[body.input.length - 1]).toEqual({
      role: 'user',
      content: [{ type: 'input_text', text: 'What is happening today?' }],
    });
    expect(result).toEqual(expect.objectContaining({
      response: 'Fresh answer',
      metadata: {
        citations: [{ index: 1, url: 'https://example.com/x', title: 'Source X' }],
      },
    }));
  });

  it('falls back to top-level xAI citations when no url_citation annotations exist', async () => {
    fetchMock.mockResolvedValueOnce(createResponsesPayload({
      output: [
        { type: 'message', content: [{ type: 'output_text', text: 'Plain answer' }] },
      ],
      citations: ['https://example.com/one', 'https://example.com/two'],
    }));
    const adapter = new GrokAdapter(makeSearchConfig());

    const result = await adapter.sendMessage('Search this');

    expect(result).toEqual(expect.objectContaining({
      response: 'Plain answer',
      metadata: {
        citations: [
          { index: 1, url: 'https://example.com/one' },
          { index: 2, url: 'https://example.com/two' },
        ],
      },
    }));
  });

  it('simulates streaming with a citations event and never opens chat/completions', async () => {
    const adapter = new GrokAdapter(makeSearchConfig());
    const onEvent = jest.fn();

    const chunks: string[] = [];
    for await (const chunk of adapter.streamMessage('Latest news', [], undefined, undefined, undefined, undefined, onEvent)) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Fresh answer');
    expect(onEvent).toHaveBeenCalledWith({
      type: 'citations',
      citations: [{ index: 1, url: 'https://example.com/x', title: 'Source X' }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.x.ai/v1/responses');
  });

  it('keeps the plain chat path on chat/completions when web search is disabled', async () => {
    fetchMock.mockResolvedValueOnce(createFetchResponse());
    const adapter = new GrokAdapter({ ...makeSearchConfig(), webSearchEnabled: false });

    await adapter.sendMessage('Just chat');

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.x.ai/v1/chat/completions');
  });
});
