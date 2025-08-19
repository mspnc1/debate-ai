/**
 * Response Processor Utility
 * Processes AI responses to extract rich content and metadata
 * Handles provider-specific formatting while maintaining a universal interface
 */

import { Citation } from '../types';

export interface ProcessedResponse {
  content: string;
  citations?: Citation[];
  providerMetadata?: Record<string, unknown>;
}

/**
 * Process Perplexity responses to extract citations
 * Perplexity includes [1], [2] in text and provides citation URLs separately
 */
export function processPerplexityResponse(
  content: string,
  rawCitations?: string[],
  searchResults?: Array<{ url: string; title?: string; snippet?: string }>
): ProcessedResponse {
  const citations: Citation[] = [];
  
  // Extract citations from either format Perplexity uses
  const sources = rawCitations || searchResults?.map(r => r.url) || [];
  
  if (sources.length > 0) {
    // Check if content already has Sources section
    const hasSourcesSection = content.includes('\nSources:');
    
    if (!hasSourcesSection) {
      // Build citations array
      sources.forEach((url, index) => {
        const searchResult = searchResults?.[index];
        citations.push({
          index: index + 1,
          url: typeof url === 'string' ? url : (url as Record<string, unknown>).url as string,
          title: searchResult?.title,
          snippet: searchResult?.snippet,
        });
      });
    } else {
      // Parse sources from the content
      const sourcesMatch = content.match(/\[(\d+)\]\s+(.+)/g);
      if (sourcesMatch) {
        sourcesMatch.forEach(match => {
          const [, indexStr, url] = match.match(/\[(\d+)\]\s+(.+)/) || [];
          if (indexStr && url) {
            citations.push({
              index: parseInt(indexStr),
              url: url.trim(),
            });
          }
        });
      }
    }
  }
  
  return {
    content,
    citations: citations.length > 0 ? citations : undefined,
  };
}

/**
 * Process Claude responses
 * Claude uses standard markdown, no special processing needed
 */
export function processClaudeResponse(content: string): ProcessedResponse {
  return { content };
}

/**
 * Process ChatGPT/OpenAI responses
 * Uses standard markdown, no special processing needed
 */
export function processChatGPTResponse(content: string): ProcessedResponse {
  return { content };
}

/**
 * Process Gemini responses
 * Uses standard markdown, no special processing needed
 */
export function processGeminiResponse(content: string): ProcessedResponse {
  return { content };
}

/**
 * Generic processor for other providers
 * Pass through content as-is, assuming markdown format
 */
export function processGenericResponse(content: string): ProcessedResponse {
  return { content };
}

/**
 * Main processor that routes to provider-specific handlers
 */
export function processAIResponse(
  provider: string,
  content: string,
  additionalData?: Record<string, unknown>
): ProcessedResponse {
  switch (provider.toLowerCase()) {
    case 'perplexity':
      return processPerplexityResponse(
        content,
        additionalData?.citations as string[] | undefined,
        additionalData?.search_results as Array<{ url: string; title?: string; snippet?: string }> | undefined
      );
    
    case 'claude':
      return processClaudeResponse(content);
    
    case 'openai':
    case 'chatgpt':
      return processChatGPTResponse(content);
    
    case 'google':
    case 'gemini':
      return processGeminiResponse(content);
    
    default:
      return processGenericResponse(content);
  }
}