import { Message, MessageAttachment } from '../../../../types';
import { getDefaultModel, resolveModelAlias } from '../../../../config/providers/modelRegistry';
import { OpenAICompatibleAdapter } from '../../base/OpenAICompatibleAdapter';
import {
  ProviderConfig,
  ResumptionContext,
  SendMessageResponse,
} from '../../types/adapter.types';
import {
  buildResponsesInput,
  extractInlineNumberedCitations,
  extractResponsesCitations,
  extractTextFromResponsesOutput,
  type ChatStyleMessage,
} from '../../utils/responsesApi';
import { normalizeFinishReason } from '../../utils/normalizeFinishReason';

export class GrokAdapter extends OpenAICompatibleAdapter {
  protected getProviderConfig(): ProviderConfig {
    return {
      baseUrl: 'https://api.x.ai/v1',
      defaultModel: getDefaultModel('grok'),
      headers: (apiKey: string) => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }),
      capabilities: {
        streaming: true,
        attachments: true,  // Supports vision models
        supportsImages: true,  // Vision supported via current Grok chat models
        supportsDocuments: false,  // PDFs require separate Files API
        functionCalling: true,
        systemPrompt: true,
        maxTokens: 100000,
        contextWindow: 2000000,
      },
    };
  }

  // xAI retired the Live Search API (search_parameters on chat/completions,
  // HTTP 410 since Jan 2026). Web search now runs through the xAI Responses
  // API with the web_search agent tool.
  private async sendWebSearchMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    modelOverride?: string
  ): Promise<SendMessageResponse> {
    const config = this.getProviderConfig();
    const resolvedModel = modelOverride ||
                         resolveModelAlias(this.config.model || getDefaultModel(this.config.provider));

    const userContent = await Promise.resolve(this.formatUserMessage(message, attachments));
    const history = this.formatHistory(conversationHistory, resumptionContext)
      .filter((entry): entry is ChatStyleMessage => entry.role === 'user' || entry.role === 'assistant');
    const input = buildResponsesInput([
      ...history,
      { role: 'user', content: userContent as ChatStyleMessage['content'] },
    ]);

    const requestBody: Record<string, unknown> = {
      model: resolvedModel,
      input,
      tools: [{ type: 'web_search' }],
      stream: false,
    };

    const instructions = this.getSystemPrompt();
    if (instructions) {
      requestBody.instructions = instructions;
    }

    const sampling = this.resolveSamplingParameters(resolvedModel);
    if (sampling.temperature !== undefined) {
      requestBody.temperature = sampling.temperature;
    }
    if (this.config.parameters?.maxTokens) {
      requestBody.max_output_tokens = this.config.parameters.maxTokens;
    }

    const response = await fetch(`${config.baseUrl}/responses`, {
      method: 'POST',
      headers: config.headers(this.config.apiKey),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      await this.handleApiError(response, 'Grok');
    }

    const data = await response.json();
    // Grok inlines citations as [n](url); collapse those to bare [n] refs so
    // the renderer links them as chips instead of leaving raw URLs in the text.
    const inline = extractInlineNumberedCitations(extractTextFromResponsesOutput(data));
    const responseText = inline.text;
    const citations = inline.citations.length > 0
      ? inline.citations
      : extractResponsesCitations(data, responseText);
    const usage = (data as { usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } }).usage;
    const status = (data as { status?: string }).status;
    const incompleteReason = (data as { incomplete_details?: { reason?: string } }).incomplete_details?.reason;

    return {
      response: responseText,
      modelUsed: typeof data.model === 'string' ? data.model : resolvedModel,
      finishReason: status === 'incomplete'
        ? (normalizeFinishReason(incompleteReason) ?? 'length')
        : 'stop',
      usage: usage ? {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.total_tokens,
      } : undefined,
      metadata: citations.length > 0 ? { citations } : undefined,
    };
  }

  async sendMessage(
    message: string,
    conversationHistory: Message[] = [],
    resumptionContext?: ResumptionContext,
    attachments?: MessageAttachment[],
    modelOverride?: string
  ): Promise<SendMessageResponse> {
    if (this.config.webSearchEnabled) {
      return this.sendWebSearchMessage(message, conversationHistory, resumptionContext, attachments, modelOverride);
    }
    return super.sendMessage(message, conversationHistory, resumptionContext, attachments, modelOverride);
  }

  async *streamMessage(
    message: string,
    conversationHistory: Message[] = [],
    attachments?: MessageAttachment[],
    resumptionContext?: ResumptionContext,
    modelOverride?: string,
    abortSignal?: AbortSignal,
    onEvent?: (event: unknown) => void
  ): AsyncGenerator<string, void, unknown> {
    if (this.config.webSearchEnabled) {
      // Simulated streaming: xAI Responses SSE is not implemented; fetch the
      // full answer and chunk-slice it, the same pattern the ChatGPT and
      // Gemini web-search paths use.
      if (abortSignal?.aborted) return;

      const response = await this.sendWebSearchMessage(
        message,
        conversationHistory,
        resumptionContext,
        attachments,
        modelOverride
      );
      const content = typeof response === 'string' ? response : response.response;
      const citations = typeof response === 'object' ? response.metadata?.citations : undefined;
      const chunkSize = 64;

      for (let i = 0; i < content.length; i += chunkSize) {
        if (abortSignal?.aborted) return;
        yield content.slice(i, i + chunkSize);
      }

      if (citations && citations.length > 0 && onEvent) {
        onEvent({ type: 'citations', citations });
      }

      return;
    }

    yield* super.streamMessage(
      message,
      conversationHistory,
      attachments,
      resumptionContext,
      modelOverride,
      abortSignal,
      onEvent
    );
  }
}
