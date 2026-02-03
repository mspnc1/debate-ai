import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getDecryptedApiKey, encryptionKey } from './apiKeys';
import { executeWebSearch } from './web_search';
import { getDecryptedDataServiceKey, CONNECTOR_AUTH_CONFIG, VALID_CONNECTOR_IDS, fredApiKey, socrataAppToken } from './dataConnectors';

// ============================================================================
// Types
// ============================================================================

/**
 * Tool definition in OpenAI-compatible format
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  category?: 'web' | 'data' | 'files' | 'compute';
}

/**
 * Tool call from AI response
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Result of tool execution
 */
export interface ToolResult {
  toolCallId: string;
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    executionTime?: number;
    truncated?: boolean;
    originalLength?: number;
    cached?: boolean;
  };
}

/**
 * Tool choice options
 */
export type ToolChoice = 'auto' | 'none' | 'required' | { name: string };

// ============================================================================
// Tool Transformers
// ============================================================================

/**
 * Transform tools for Claude API
 */
export function transformToolsForClaude(tools: ToolDefinition[]): {
  name: string;
  description: string;
  input_schema: ToolDefinition['parameters'];
}[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

/**
 * Transform tool choice for Claude API
 */
export function transformToolChoiceForClaude(
  choice: ToolChoice
): { type: 'auto' | 'any' | 'tool'; name?: string } {
  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'none') return { type: 'auto' }; // Claude doesn't have 'none', use auto
  if (choice === 'required') return { type: 'any' };
  if (typeof choice === 'object' && choice.name) {
    return { type: 'tool', name: choice.name };
  }
  return { type: 'auto' };
}

/**
 * Parse Claude tool_use blocks to standard ToolCall format
 */
export function parseClaudeToolCalls(content: {
  type: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}[]): ToolCall[] {
  return content
    .filter(block => block.type === 'tool_use')
    .map(block => ({
      id: block.id || `call_${Date.now()}`,
      type: 'function' as const,
      function: {
        name: block.name || '',
        arguments: JSON.stringify(block.input || {}),
      },
    }));
}

/**
 * Transform tools for OpenAI API (native format)
 */
export function transformToolsForOpenAI(tools: ToolDefinition[]): {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: ToolDefinition['parameters'];
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

/**
 * Transform tool choice for OpenAI API
 */
export function transformToolChoiceForOpenAI(
  choice: ToolChoice
): 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } } {
  if (choice === 'auto') return 'auto';
  if (choice === 'none') return 'none';
  if (choice === 'required') return 'required';
  if (typeof choice === 'object' && choice.name) {
    return { type: 'function', function: { name: choice.name } };
  }
  return 'auto';
}

/**
 * Parse OpenAI tool calls from response
 */
export function parseOpenAIToolCalls(message: {
  tool_calls?: {
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }[];
}): ToolCall[] {
  if (!message.tool_calls) return [];
  return message.tool_calls.map(tc => ({
    id: tc.id,
    type: 'function' as const,
    function: {
      name: tc.function.name,
      arguments: tc.function.arguments,
    },
  }));
}

/**
 * Transform tools for Gemini API
 */
export function transformToolsForGemini(tools: ToolDefinition[]): {
  functionDeclarations: {
    name: string;
    description: string;
    parameters: ToolDefinition['parameters'];
  }[];
}[] {
  return [{
    functionDeclarations: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  }];
}

/**
 * Parse Gemini function calls from response
 */
export function parseGeminiToolCalls(parts: {
  functionCall?: { name: string; args: Record<string, unknown> };
}[]): ToolCall[] {
  return parts
    .filter(part => part.functionCall)
    .map((part, index) => ({
      id: `call_${Date.now()}_${index}`,
      type: 'function' as const,
      function: {
        name: part.functionCall!.name,
        arguments: JSON.stringify(part.functionCall!.args || {}),
      },
    }));
}

/**
 * Transform tools for Mistral API (OpenAI-compatible format)
 */
export function transformToolsForMistral(tools: ToolDefinition[]) {
  return transformToolsForOpenAI(tools);
}

/**
 * Transform tools for Cohere API
 */
export function transformToolsForCohere(tools: ToolDefinition[]): {
  name: string;
  description: string;
  parameter_definitions: Record<string, {
    type: string;
    description?: string;
    required: boolean;
  }>;
}[] {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameter_definitions: Object.entries(tool.parameters.properties).reduce(
      (acc, [key, value]) => {
        acc[key] = {
          type: value.type,
          description: value.description,
          required: tool.parameters.required?.includes(key) ?? false,
        };
        return acc;
      },
      {} as Record<string, { type: string; description?: string; required: boolean }>
    ),
  }));
}

// ============================================================================
// Tool Handlers
// ============================================================================

interface FetchUrlArgs {
  url: string;
  selector?: string;
  includeMetadata?: boolean;
  includeLinks?: boolean;
  maxLinks?: number;
  maxLength?: number;
}

interface ExtractedLink {
  text: string;
  url: string;
}

// URL validation - block private IPs and internal networks
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '10.',
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
  '192.168.',
  'metadata.google.internal',
  '169.254.',
];

function isBlockedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block non-http(s) protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return true;
    }

    // Check against blocked hosts
    for (const blocked of BLOCKED_HOSTS) {
      if (hostname === blocked || hostname.startsWith(blocked)) {
        return true;
      }
    }

    return false;
  } catch {
    return true; // Invalid URL = blocked
  }
}

/**
 * Fetch URL and extract readable content
 */
/**
 * Extract links from HTML content
 */
function extractLinks(html: string, baseUrl: string, maxLinks: number = 20): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  // Navigation/utility link text to skip
  const skipTexts = new Set([
    'home', 'menu', 'search', 'login', 'sign in', 'subscribe', 'newsletter',
    'more', 'read more', 'continue', 'next', 'previous', 'back', 'share',
    'facebook', 'twitter', 'linkedin', 'instagram', 'email', 'print',
    'comments', 'reply', 'like', 'save', 'bookmark', 'follow',
  ]);

  // Match anchor tags with href - more comprehensive regex
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null && links.length < maxLinks * 3) {
    let href = match[1];
    let text = match[2]
      .replace(/<[^>]+>/g, ' ') // Remove nested tags
      .replace(/\s+/g, ' ')
      .trim();

    // Skip empty text or very short text (but allow if it looks like a title)
    if (!text || text.length < 5) continue;

    // Skip common non-article links
    const lowerText = text.toLowerCase();
    if (skipTexts.has(lowerText)) continue;
    if (
      lowerText.startsWith('skip to') ||
      lowerText.includes('cookie') ||
      lowerText.includes('privacy policy') ||
      lowerText.includes('terms of') ||
      lowerText.includes('advertisement') ||
      lowerText.includes('sponsored')
    ) continue;

    // Skip anchor links, javascript, and mailto
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;

    // Resolve relative URLs
    try {
      const resolvedUrl = new URL(href, baseUrl).toString();

      // Skip if already seen
      if (seen.has(resolvedUrl)) continue;
      seen.add(resolvedUrl);

      // Skip external domains for article discovery (keep same domain and subdomains)
      const baseHost = new URL(baseUrl).hostname.replace(/^www\./, '');
      const linkHost = new URL(resolvedUrl).hostname.replace(/^www\./, '');
      if (!linkHost.endsWith(baseHost) && !baseHost.endsWith(linkHost)) continue;

      // Skip common non-article paths
      const path = new URL(resolvedUrl).pathname.toLowerCase();
      if (
        path === '/' ||
        path.match(/^\/(tag|tags|category|categories|author|authors|page|pages|search|login|signin|signup|register|account|cart|checkout|contact|about|help|faq|support|terms|privacy|policy|subscribe|newsletter|rss|feed|sitemap|archive|archives)\/?$/i)
      ) continue;

      // Skip image/video/audio files
      if (path.match(/\.(jpg|jpeg|png|gif|svg|webp|mp4|mp3|wav|pdf)$/i)) continue;

      // Score the link to prioritize likely articles
      let score = 0;

      // Longer text is more likely to be article title
      if (text.length > 30) score += 2;
      if (text.length > 60) score += 2;

      // Path patterns that suggest articles
      if (path.match(/\/\d{4}\/\d{2}\//)) score += 3; // Date in URL like /2024/01/
      if (path.match(/\/news\//i)) score += 2;
      if (path.match(/\/story\//i)) score += 2;
      if (path.match(/\/article\//i)) score += 2;
      if (path.split('/').filter(s => s.length > 0).length >= 2) score += 1;

      // Text patterns that suggest article titles (contains action verbs, names, etc)
      if (text.match(/\b(says?|announces?|reveals?|reports?|launches?|introduces?|confirms?)\b/i)) score += 2;
      if (text.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/)) score += 1; // Contains proper nouns

      links.push({
        text: text.slice(0, 150), // Allow slightly longer text for better context
        url: resolvedUrl,
        score,
      } as ExtractedLink & { score: number });
    } catch {
      // Invalid URL, skip
    }
  }

  // Sort by score (descending), then by text length
  return (links as (ExtractedLink & { score?: number })[])
    .sort((a, b) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.text.length - a.text.length;
    })
    .slice(0, maxLinks)
    .map(({ text, url }) => ({ text, url })); // Remove score from output
}

async function handleFetchUrl(args: FetchUrlArgs): Promise<ToolResult> {
  let { url } = args;
  const { selector, includeMetadata = true, includeLinks = true, maxLinks = 15, maxLength = 50000 } = args;
  const startTime = Date.now();

  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  console.log('[handleFetchUrl] Fetching URL:', url);

  // Validate URL
  if (isBlockedUrl(url)) {
    return {
      toolCallId: '', // Will be set by caller
      success: false,
      error: 'URL is not allowed (internal or invalid)',
      metadata: { executionTime: Date.now() - startTime },
    };
  }

  try {
    // Fetch the page with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SymposiumAI/1.0 (Tool Fetch)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        toolCallId: '',
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const html = await response.text();

    // Simple content extraction (server-side, no JSDOM dependency)
    // For production, add jsdom and @mozilla/readability
    let content: string;
    let metadata: Record<string, string> = {};

    if (selector) {
      // With selector, do basic regex extraction
      const regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)</${selector}>`, 'i');
      const match = html.match(regex);
      content = match ? stripHtmlTags(match[1]) : 'No content found for selector';
    } else {
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch && includeMetadata) {
        metadata.title = titleMatch[1].trim();
      }

      // Extract meta description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      if (descMatch && includeMetadata) {
        metadata.description = descMatch[1].trim();
      }

      // Extract main content using multiple strategies
      let bodyContent = '';

      // Strategy 1: Look for article tags (may be multiple)
      const articleMatches = html.match(/<article[^>]*>([\s\S]*?)<\/article>/gi);
      if (articleMatches && articleMatches.length > 0) {
        // Combine all articles, prioritizing longer ones (likely main content)
        bodyContent = articleMatches
          .sort((a, b) => b.length - a.length)
          .slice(0, 5) // Take top 5 longest articles
          .join('\n\n');
      }

      // Strategy 2: Look for main content containers
      if (!bodyContent || bodyContent.length < 500) {
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        if (mainMatch && mainMatch[1].length > bodyContent.length) {
          bodyContent = mainMatch[1];
        }
      }

      // Strategy 3: Look for common content class patterns
      if (!bodyContent || bodyContent.length < 500) {
        const contentPatterns = [
          /<div[^>]*class="[^"]*(?:story-body|article-body|post-content|entry-content|article-content|main-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
          /<div[^>]*role="main"[^>]*>([\s\S]*?)<\/div>/gi,
          /<section[^>]*class="[^"]*(?:content|story|article)[^"]*"[^>]*>([\s\S]*?)<\/section>/gi,
        ];

        for (const pattern of contentPatterns) {
          const matches = html.match(pattern);
          if (matches) {
            const combined = matches.join('\n\n');
            if (combined.length > bodyContent.length) {
              bodyContent = combined;
            }
          }
        }
      }

      // Strategy 4: Extract all headlines and their surrounding content
      if (!bodyContent || bodyContent.length < 500) {
        // Get all h1-h3 headings with their parent containers
        const headingContent: string[] = [];
        const headingRegex = /<(h[1-3])[^>]*>([^<]+)<\/\1>/gi;
        let headingMatch;
        while ((headingMatch = headingRegex.exec(html)) !== null) {
          const headingText = headingMatch[2].trim();
          if (headingText.length > 10 && headingText.length < 200) {
            headingContent.push(`## ${headingText}`);
          }
        }

        // Also get paragraphs
        const paragraphRegex = /<p[^>]*>([^<]{50,})<\/p>/gi;
        let pMatch;
        while ((pMatch = paragraphRegex.exec(html)) !== null) {
          const pText = stripHtmlTags(pMatch[1]).trim();
          if (pText.length > 50) {
            headingContent.push(pText);
          }
        }

        if (headingContent.length > 0 && headingContent.join('\n\n').length > bodyContent.length) {
          bodyContent = headingContent.join('\n\n');
        }
      }

      // Strategy 5: Fall back to body
      if (!bodyContent || bodyContent.length < 200) {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          bodyContent = bodyMatch[1];
        } else {
          bodyContent = html;
        }
      }

      // Remove scripts, styles, nav, header, footer, aside, and ads
      content = stripHtmlTags(
        bodyContent
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
          .replace(/<div[^>]*class="[^"]*(?:ad|advertisement|promo|sidebar|related)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
      );
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // Truncate if needed
    const originalLength = content.length;
    const truncated = content.length > maxLength;
    if (truncated) {
      content = content.slice(0, maxLength) + '...';
    }

    // Extract links from the page if requested
    let links: ExtractedLink[] = [];
    if (includeLinks) {
      // Extract from body content
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        links = extractLinks(bodyMatch[1], url, maxLinks);
      }
    }

    // Build result with metadata
    let result = '';
    if (includeMetadata && Object.keys(metadata).length > 0) {
      if (metadata.title) result += `Title: ${metadata.title}\n`;
      if (metadata.description) result += `Description: ${metadata.description}\n`;
      result += '\n---\n\n';
    }
    result += content;

    // Add links section if links were found
    if (includeLinks && links.length > 0) {
      result += '\n\n---\n\n**Links found on page:**\n';
      for (const link of links) {
        result += `- ${link.text}: ${link.url}\n`;
      }
    }

    return {
      toolCallId: '',
      success: true,
      content: result,
      metadata: {
        executionTime: Date.now() - startTime,
        truncated,
        originalLength,
      },
    };
  } catch (error: any) {
    console.error('[handleFetchUrl] Error fetching URL:', {
      url,
      errorName: error.name,
      errorMessage: error.message,
      errorCause: error.cause,
      errorStack: error.stack?.slice(0, 500),
    });

    const errorMessage = error.name === 'AbortError'
      ? 'Request timed out'
      : error.message || 'Failed to fetch URL';

    return {
      toolCallId: '',
      success: false,
      error: `Failed to fetch URL: ${errorMessage}`,
      metadata: { executionTime: Date.now() - startTime },
    };
  }
}

/**
 * Strip HTML tags from content
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ');
}

// ============================================================================
// fetch_api Handler
// ============================================================================

interface FetchApiArgs {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: string | Record<string, unknown>;
  response_format?: 'json' | 'text' | 'csv';
  api_key_ref?: string;
  timeout?: number;
}

async function handleFetchApi(
  args: FetchApiArgs,
  uid: string,
  encryptionKeyValue: string
): Promise<ToolResult> {
  const startTime = Date.now();
  let { url } = args;
  const {
    method = 'GET',
    headers: customHeaders = {},
    query_params = {},
    body,
    response_format = 'json',
    api_key_ref,
    timeout = 30000,
  } = args;

  // Validate URL
  if (!url || typeof url !== 'string') {
    return {
      toolCallId: '',
      success: false,
      error: 'URL is required',
      metadata: { executionTime: Date.now() - startTime },
    };
  }

  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Block private/internal URLs
  if (isBlockedUrl(url)) {
    return {
      toolCallId: '',
      success: false,
      error: 'URL is not allowed (internal or invalid)',
      metadata: { executionTime: Date.now() - startTime },
    };
  }

  console.log('[handleFetchApi] Request:', { url, method, api_key_ref, uid });

  // Build request headers
  const requestHeaders: Record<string, string> = {
    'User-Agent': 'SymposiumAI/1.0 (Analyze Tool)',
    'Accept': 'application/json, text/plain, */*',
    ...customHeaders,
  };

  // Resolve api_key_ref if provided
  if (api_key_ref) {
    if (!VALID_CONNECTOR_IDS.includes(api_key_ref)) {
      return {
        toolCallId: '',
        success: false,
        error: `Unknown data connector: ${api_key_ref}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    const authConfig = CONNECTOR_AUTH_CONFIG[api_key_ref];
    if (!authConfig) {
      return {
        toolCallId: '',
        success: false,
        error: `No auth configuration for connector: ${api_key_ref}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // Only resolve key if connector requires authentication
    if (authConfig.authType !== 'none' && authConfig.authKeyName) {
      // Try user's stored key first, then fall back to Symposium-managed key
      const apiKey = await getDecryptedDataServiceKey(uid, api_key_ref, encryptionKeyValue)
        || authConfig.getManagedKey?.()
        || null;
      if (!apiKey) {
        return {
          toolCallId: '',
          success: false,
          error: `API key not configured for ${api_key_ref}. Add your key in Settings > Data Sources.`,
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      // Inject auth based on connector type
      switch (authConfig.authType) {
        case 'query_param':
          query_params[authConfig.authKeyName] = apiKey;
          break;
        case 'header':
          requestHeaders[authConfig.authKeyName] = apiKey;
          break;
        case 'bearer':
          requestHeaders['Authorization'] = `Bearer ${apiKey}`;
          break;
      }
    }
  }

  // Build URL with query params
  try {
    const urlObj = new URL(url);
    for (const [key, value] of Object.entries(query_params)) {
      urlObj.searchParams.set(key, String(value));
    }
    url = urlObj.toString();
  } catch {
    return {
      toolCallId: '',
      success: false,
      error: `Invalid URL: ${url}`,
      metadata: { executionTime: Date.now() - startTime },
    };
  }

  // Build request options
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body for POST/PUT
  if (body && (method === 'POST' || method === 'PUT')) {
    if (typeof body === 'object') {
      fetchOptions.body = JSON.stringify(body);
      requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
    } else {
      fetchOptions.body = body;
    }
  }

  // Execute request with timeout
  try {
    const controller = new AbortController();
    const clampedTimeout = Math.min(Math.max(timeout, 1000), 55000);
    const timeoutId = setTimeout(() => controller.abort(), clampedTimeout);
    fetchOptions.signal = controller.signal;

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const truncatedBody = errorBody.slice(0, 500);

      // Provide helpful error messages for common status codes
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      if (response.status === 401 || response.status === 403) {
        errorMessage += '. API key may be invalid or expired. Check your key in Settings > Data Sources.';
      } else if (response.status === 429) {
        errorMessage += '. Rate limited - try again later.';
      }
      if (truncatedBody) {
        errorMessage += `\n${truncatedBody}`;
      }

      return {
        toolCallId: '',
        success: false,
        error: errorMessage,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // Parse response based on format
    let content: string;
    const originalLength = parseInt(response.headers.get('content-length') || '0', 10);

    if (response_format === 'json') {
      try {
        const data = await response.json();
        content = JSON.stringify(data, null, 2);
      } catch {
        // Fall back to text if JSON parse fails
        content = await response.text();
      }
    } else {
      content = await response.text();
    }

    return {
      toolCallId: '',
      success: true,
      content,
      metadata: {
        executionTime: Date.now() - startTime,
        originalLength: originalLength || content.length,
      },
    };
  } catch (error: any) {
    console.error('[handleFetchApi] Error:', {
      url,
      errorName: error.name,
      errorMessage: error.message,
    });

    const errorMessage = error.name === 'AbortError'
      ? `Request timed out after ${Math.round(timeout / 1000)}s`
      : error.message || 'Failed to fetch API';

    return {
      toolCallId: '',
      success: false,
      error: `fetch_api failed: ${errorMessage}`,
      metadata: { executionTime: Date.now() - startTime },
    };
  }
}

// ============================================================================
// Execute Tool Function
// ============================================================================

interface ExecuteToolRequest {
  toolName: string;
  toolCallId: string;
  arguments: Record<string, unknown>;
}

/**
 * Firebase callable function to execute tools
 * Tools are executed server-side for security (API keys, network access)
 */
export const executeTool = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    secrets: [encryptionKey, fredApiKey, socrataAppToken],
  },
  async (request): Promise<ToolResult> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to execute tools');
    }

    const { toolName, toolCallId, arguments: args } = request.data as ExecuteToolRequest;

    if (!toolName) {
      throw new HttpsError('invalid-argument', 'Tool name is required');
    }

    try {
      let result: ToolResult;

      switch (toolName) {
        case 'fetch_url':
          result = await handleFetchUrl(args as unknown as FetchUrlArgs);
          break;

        case 'fetch_api': {
          const keyValue = encryptionKey.value();
          if (!keyValue) {
            throw new Error('Encryption not configured');
          }
          result = await handleFetchApi(
            args as unknown as FetchApiArgs,
            request.auth!.uid,
            keyValue
          );
          break;
        }

        case 'web_search': {
          const keyValue = encryptionKey.value();
          if (!keyValue) {
            throw new Error('Encryption not configured');
          }
          const searchResponse = await executeWebSearch(
            request.auth!.uid,
            args as { query: string; num_results?: number },
            keyValue
          );
          result = {
            toolCallId,
            success: true,
            content: JSON.stringify(searchResponse),
          };
          break;
        }

        default:
          result = {
            toolCallId,
            success: false,
            error: `Unknown tool: ${toolName}`,
          };
      }

      // Set the tool call ID
      result.toolCallId = toolCallId;
      return result;

    } catch (error: any) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        toolCallId,
        success: false,
        error: error.message || 'Tool execution failed',
      };
    }
  }
);
