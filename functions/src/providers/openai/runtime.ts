/**
 * OpenAI Provider Runtime
 *
 * Handles OpenAI and OpenAI-compatible APIs (Mistral, Together, DeepSeek, Grok).
 *
 * Transformations:
 * - Canonical messages → OpenAI format
 * - System prompt → first message with role: 'system'
 * - Tool results → messages with role: 'tool' and tool_call_id
 * - Tool calls → messages with tool_calls array
 * - OpenAI SSE events → Canonical events
 */

import type {
  CanonicalMessage,
  CanonicalToolCall,
  CanonicalSSEEvent,
  CanonicalToolDefinition,
  CanonicalToolChoice,
} from '../../types/canonical';
import type { ProviderRuntime, ProviderRequest, BuiltRequest, ProviderConfig } from '../types';
import {
  parseSSEStream,
  getBase64Data,
  completeToolCall,
  mapOpenAIFinishReason,
  type ToolCallInProgress,
} from '../base-runtime';

// ============================================================================
// OpenAI Message Types
// ============================================================================

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'file'; file: { filename: string; file_data: string } };

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | OpenAIContentPart[] | null;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

// ============================================================================
// Tool Transformers
// ============================================================================

function transformToolsForOpenAI(tools: CanonicalToolDefinition[]): {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: CanonicalToolDefinition['parameters'];
  };
}[] {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

function transformToolChoiceForOpenAI(
  choice: CanonicalToolChoice
): 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } } {
  if (choice === 'auto') return 'auto';
  if (choice === 'none') return 'none';
  if (choice === 'required') return 'required';
  if (typeof choice === 'object' && choice.name) {
    return { type: 'function', function: { name: choice.name } };
  }
  return 'auto';
}

// ============================================================================
// Provider Configurations
// ============================================================================

const OPENAI_COMPATIBLE_CONFIGS: Record<string, ProviderConfig> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
  grok: {
    baseUrl: 'https://api.x.ai/v1/chat/completions',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
  },
};

// ============================================================================
// OpenAI Runtime Implementation
// ============================================================================

export class OpenAIRuntime implements ProviderRuntime {
  readonly providerId: string;
  readonly supportsTools: boolean;
  private config: ProviderConfig;

  constructor(providerId: string = 'openai') {
    this.providerId = providerId;
    this.config = OPENAI_COMPATIBLE_CONFIGS[providerId] || OPENAI_COMPATIBLE_CONFIGS.openai;

    // Only OpenAI, Mistral fully support tools
    this.supportsTools = ['openai', 'mistral'].includes(providerId);
  }

  /**
   * Build OpenAI API request from canonical format
   */
  buildRequest(request: ProviderRequest, apiKey: string): BuiltRequest {
    const openaiMessages = this.transformMessages(request);

    const body: Record<string, unknown> = {
      model: request.model,
      messages: openaiMessages,
      temperature: request.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
    };

    // Handle max_tokens - OpenAI uses max_completion_tokens
    if (request.maxTokens !== undefined) {
      if (this.providerId === 'openai') {
        body.max_completion_tokens = request.maxTokens;
      } else {
        body.max_tokens = request.maxTokens;
      }
    }

    // Add tools if provided and supported
    if (this.supportsTools && request.tools && request.tools.length > 0) {
      body.tools = transformToolsForOpenAI(request.tools);
      if (request.toolChoice) {
        body.tool_choice = transformToolChoiceForOpenAI(request.toolChoice);
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      [this.config.authHeader]: `${this.config.authPrefix || ''}${apiKey}`,
    };

    return {
      url: this.config.baseUrl,
      headers,
      body,
    };
  }

  /**
   * Parse OpenAI SSE stream into canonical events
   */
  async *streamParse(
    responseStream: ReadableStream<Uint8Array>,
    traceId: string
  ): AsyncGenerator<CanonicalSSEEvent, void, unknown> {
    const toolCallsInProgress = new Map<number, ToolCallInProgress>();
    const completedToolCalls: CanonicalToolCall[] = [];
    let inputTokens = 0;
    let outputTokens = 0;
    let finishReason = 'stop';

    for await (const data of parseSSEStream(responseStream)) {
      try {
        const event = JSON.parse(data);
        const choice = event.choices?.[0];

        // Text delta
        const deltaContent = choice?.delta?.content;
        if (deltaContent) {
          yield {
            type: 'text_delta',
            delta: deltaContent,
          };
        }

        // Tool calls
        const toolCalls = choice?.delta?.tool_calls;
        if (toolCalls && Array.isArray(toolCalls)) {
          for (const tc of toolCalls) {
            const index = tc.index ?? 0;

            if (tc.id) {
              // New tool call starting
              toolCallsInProgress.set(index, {
                id: tc.id,
                name: tc.function?.name || '',
                arguments: tc.function?.arguments || '',
              });

              if (tc.function?.name) {
                yield {
                  type: 'tool_call_start',
                  index,
                  id: tc.id,
                  name: tc.function.name,
                };
              }
            } else if (tc.function?.arguments) {
              // Streaming arguments
              const existing = toolCallsInProgress.get(index);
              if (existing) {
                existing.arguments += tc.function.arguments;

                yield {
                  type: 'tool_call_delta',
                  index,
                  id: existing.id,
                  arguments_delta: tc.function.arguments,
                };
              }
            }
          }
        }

        // Check finish reason
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;

          // Complete any in-progress tool calls
          for (const [index, tc] of toolCallsInProgress) {
            const completed = completeToolCall(tc);
            completedToolCalls.push(completed);

            yield {
              type: 'tool_call_complete',
              index,
              tool_call: completed,
            };
          }
          toolCallsInProgress.clear();
        }

        // Extract usage from final message
        if (event.usage) {
          inputTokens = event.usage.prompt_tokens || inputTokens;
          outputTokens = event.usage.completion_tokens || outputTokens;
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Emit message complete event
    yield {
      type: 'message_complete',
      finish_reason: mapOpenAIFinishReason(finishReason),
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      tool_calls: completedToolCalls.length > 0 ? completedToolCalls : undefined,
    };
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Transform canonical messages to OpenAI format
   */
  private transformMessages(request: ProviderRequest): OpenAIMessage[] {
    const openaiMessages: OpenAIMessage[] = [];
    const attachments = request.attachments;

    // Add system prompt as first message
    const systemPrompt = request.systemPrompt ||
      request.messages.find(m => m.role === 'system')?.content;

    if (systemPrompt) {
      openaiMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Process messages
    const messages = request.messages.filter(m => m.role !== 'system');

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLastUserMessage = msg.role === 'user' && i === messages.length - 1;

      // Handle tool result messages
      if (msg.role === 'tool' && msg.tool_call_id) {
        openaiMessages.push({
          role: 'tool',
          content: msg.content || '',
          tool_call_id: msg.tool_call_id,
        });
        continue;
      }

      // Handle assistant messages with tool calls
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        openaiMessages.push({
          role: 'assistant',
          content: msg.content,
          tool_calls: msg.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        });
        continue;
      }

      // Handle user message with attachments (for vision models)
      if (isLastUserMessage && attachments && attachments.length > 0) {
        const contentParts: OpenAIContentPart[] = [];
        const imageAttachments = attachments.filter(att => att.type === 'image');
        const documentAttachments = attachments.filter(att => att.type === 'document');

        for (const att of imageAttachments) {
          const base64 = getBase64Data(att);
          if (!base64) continue;

          contentParts.push({
            type: 'image_url',
            image_url: {
              url: `data:${att.mimeType || 'image/jpeg'};base64,${base64}`,
            },
          });
        }

        // Only OpenAI supports document attachments
        if (this.providerId === 'openai') {
          for (const att of documentAttachments) {
            const base64 = getBase64Data(att);
            if (!base64) continue;

            contentParts.push({
              type: 'file',
              file: {
                filename: att.fileName || 'document.pdf',
                file_data: `data:${att.mimeType || 'application/pdf'};base64,${base64}`,
              },
            });
          }
        }

        contentParts.push({ type: 'text', text: msg.content || '' });

        if (contentParts.length > 1) {
          openaiMessages.push({
            role: 'user',
            content: contentParts,
          });
          continue;
        }
      }

      // Regular user or assistant message
      if (msg.role === 'user' || msg.role === 'assistant') {
        openaiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return openaiMessages;
  }
}

// Factory function for provider-specific instances
const runtimeInstances = new Map<string, OpenAIRuntime>();

export function getOpenAIRuntime(providerId: string = 'openai'): OpenAIRuntime {
  if (!runtimeInstances.has(providerId)) {
    runtimeInstances.set(providerId, new OpenAIRuntime(providerId));
  }
  return runtimeInstances.get(providerId)!;
}
