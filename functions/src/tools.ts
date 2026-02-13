import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getDecryptedApiKey, encryptionKey } from './apiKeys';
import { executeWebSearch } from './web_search';
import {
  getDecryptedDataServiceKey,
  CONNECTOR_AUTH_CONFIG,
  VALID_CONNECTOR_IDS,
  fredApiKey,
  socrataAppToken,
  nasaApiKey,
  usCensusApiKey,
  blsRegistrationKey,
  fbiCrimeApiKey,
  stackExchangeApiKey,
  librariesIoApiKey,
} from './dataConnectors';

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

interface ConnectorInferenceRule {
  connectorId: string;
  matches: (url: URL) => boolean;
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

const MAX_FETCH_API_RESPONSE_BYTES = 750_000;
const SOCRATA_DOWNLOAD_BLOCK_MESSAGE = 'Blocked bulk download endpoint rows.json?accessType=DOWNLOAD because it is too large for interactive analysis. Query the dataset /resource/{dataset_id}.json endpoint with SoQL filters and a modest $limit (for example: 100-1000 rows), then paginate with $offset.';

const KNOWN_API_HOSTS = new Set([
  'api.weather.gov',
  'api.stlouisfed.org',
  'earthquake.usgs.gov',
  'clinicaltrials.gov',
  'api.fda.gov',
  'api.census.gov',
  'api.bls.gov',
  'api.nasa.gov',
  'api.usa.gov',
  'sdmx.oecd.org',
  'imf.org',
  'ec.europa.eu',
  'unstats.un.org',
  'registry.npmjs.org',
  'api.npmjs.org',
  'hacker-news.firebaseio.com',
  'pypi.org',
  'api.stackexchange.com',
  'libraries.io',
  'api.dictionaryapi.dev',
  'ghoapi.azureedge.net',
  'data.sec.gov',
  'query1.finance.yahoo.com',
  'api.openweathermap.org',
  'newsapi.org',
  'api.semanticscholar.org',
  'api.worldbank.org',
  'api.us.socrata.com',
  'eutils.ncbi.nlm.nih.gov',
  'overpass-api.de',
  'api.github.com',
]);

const CONNECTOR_INFERENCE_RULES: ConnectorInferenceRule[] = [
  { connectorId: 'fred', matches: (url) => normalizeHost(url.hostname) === 'api.stlouisfed.org' },
  { connectorId: 'us_census', matches: (url) => normalizeHost(url.hostname) === 'api.census.gov' },
  { connectorId: 'bls', matches: (url) => normalizeHost(url.hostname) === 'api.bls.gov' },
  { connectorId: 'nasa', matches: (url) => normalizeHost(url.hostname) === 'api.nasa.gov' },
  {
    connectorId: 'fbi_crime',
    matches: (url) => normalizeHost(url.hostname) === 'api.usa.gov' && url.pathname.includes('/crime/fbi/cde'),
  },
  { connectorId: 'stack_exchange', matches: (url) => normalizeHost(url.hostname) === 'api.stackexchange.com' },
  { connectorId: 'libraries_io', matches: (url) => normalizeHost(url.hostname).endsWith('libraries.io') },
  { connectorId: 'openweathermap', matches: (url) => normalizeHost(url.hostname) === 'api.openweathermap.org' },
  { connectorId: 'newsapi', matches: (url) => normalizeHost(url.hostname) === 'newsapi.org' },
  { connectorId: 'github', matches: (url) => normalizeHost(url.hostname) === 'api.github.com' },
  { connectorId: 'socrata', matches: (url) => isSocrataHost(url) },
];

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '');
}

function isSocrataHost(url: URL): boolean {
  const host = normalizeHost(url.hostname);
  if (host === 'api.us.socrata.com') return true;
  if (host === 'data.cms.gov') return true;
  if (host.endsWith('.socrata.com')) return true;
  return host.startsWith('data.') && (host.endsWith('.gov') || host.endsWith('.us'));
}

function isLikelyApiUrl(url: URL): boolean {
  const host = normalizeHost(url.hostname);
  if (KNOWN_API_HOSTS.has(host)) return true;
  if (isSocrataHost(url)) return true;
  if (host.startsWith('api.')) return true;

  const path = url.pathname.toLowerCase();
  if (path.endsWith('.json') || path.endsWith('.csv')) return true;
  if (path.includes('/api/') || path.includes('/resource/')) return true;

  return false;
}

function getSocrataBulkDownloadError(url: URL): string | null {
  const path = url.pathname.toLowerCase();
  const accessType = (url.searchParams.get('accessType') || url.searchParams.get('accesstype') || '').toLowerCase();

  if (path.endsWith('/rows.json') && accessType === 'download') {
    return SOCRATA_DOWNLOAD_BLOCK_MESSAGE;
  }

  return null;
}

function inferConnectorIdFromUrl(url: URL): string | undefined {
  for (const rule of CONNECTOR_INFERENCE_RULES) {
    if (rule.matches(url)) {
      return rule.connectorId;
    }
  }
  return undefined;
}

function hasExplicitConnectorAuth(
  connectorId: string,
  queryParams: Record<string, string>,
  requestHeaders: Record<string, string>,
): boolean {
  const authConfig = CONNECTOR_AUTH_CONFIG[connectorId];
  if (!authConfig || authConfig.authType === 'none') return false;

  if (authConfig.authType === 'query_param' && authConfig.authKeyName) {
    return queryParams[authConfig.authKeyName] !== undefined;
  }

  if (authConfig.authType === 'header' && authConfig.authKeyName) {
    return Object.keys(requestHeaders).some((headerName) => headerName.toLowerCase() === authConfig.authKeyName!.toLowerCase());
  }

  if (authConfig.authType === 'bearer') {
    return Object.keys(requestHeaders).some((headerName) => headerName.toLowerCase() === 'authorization');
  }

  return false;
}

function clampTimeoutMs(timeout: unknown): number {
  if (typeof timeout !== 'number' || Number.isNaN(timeout)) {
    return 30000;
  }
  return Math.min(Math.max(timeout, 1000), 55000);
}

function toSafeHeaderMap(headers: unknown): Record<string, string> {
  const safeHeaders: Record<string, string> = {};
  if (!headers || typeof headers !== 'object') return safeHeaders;

  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (typeof value === 'string') {
      safeHeaders[key] = value;
    }
  }

  return safeHeaders;
}

function toSafeQueryParamMap(queryParams: unknown): Record<string, string> {
  const safeParams: Record<string, string> = {};
  if (!queryParams || typeof queryParams !== 'object') return safeParams;

  for (const [key, value] of Object.entries(queryParams as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    safeParams[key] = String(value);
  }

  return safeParams;
}

function decodeChunks(chunks: Uint8Array[], totalBytes: number): string {
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

async function readResponseTextWithLimit(
  response: Response,
  maxBytes: number,
): Promise<{ text: string; bytesRead: number; exceeded: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) {
    const fallbackText = await response.text();
    const fallbackBytes = new TextEncoder().encode(fallbackText).length;
    return {
      text: fallbackText,
      bytesRead: fallbackBytes,
      exceeded: fallbackBytes > maxBytes,
    };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    const remaining = maxBytes - totalBytes;
    if (remaining <= 0) {
      await reader.cancel('Response exceeded configured byte limit');
      return {
        text: decodeChunks(chunks, totalBytes),
        bytesRead: totalBytes + value.byteLength,
        exceeded: true,
      };
    }

    if (value.byteLength > remaining) {
      chunks.push(value.subarray(0, remaining));
      totalBytes += remaining;
      await reader.cancel('Response exceeded configured byte limit');
      return {
        text: decodeChunks(chunks, totalBytes),
        bytesRead: totalBytes + (value.byteLength - remaining),
        exceeded: true,
      };
    }

    chunks.push(value);
    totalBytes += value.byteLength;
  }

  return {
    text: decodeChunks(chunks, totalBytes),
    bytesRead: totalBytes,
    exceeded: false,
  };
}

function inferApiResponseFormat(url: URL): 'json' | 'text' | 'csv' {
  const path = url.pathname.toLowerCase();
  const explicitFormat = (url.searchParams.get('format') || '').toLowerCase();

  if (path.endsWith('.csv') || explicitFormat === 'csv') return 'csv';
  if (path.endsWith('.json') || explicitFormat === 'json') return 'json';
  return 'json';
}

function tryParseUrl(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(normalized);
  } catch {
    return null;
  }
}

function shouldRouteFetchUrlToApi(fetchUrl: string): boolean {
  const parsedUrl = tryParseUrl(fetchUrl);
  return parsedUrl ? isLikelyApiUrl(parsedUrl) : false;
}

function convertFetchUrlArgsToFetchApiArgs(args: FetchUrlArgs): FetchApiArgs {
  let normalizedUrl = args.url || '';
  if (normalizedUrl && !normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  let responseFormat: 'json' | 'text' | 'csv' = 'json';
  try {
    responseFormat = inferApiResponseFormat(new URL(normalizedUrl));
  } catch {
    responseFormat = 'json';
  }

  return {
    url: normalizedUrl,
    method: 'GET',
    response_format: responseFormat,
  };
}

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
  headers?: Record<string, unknown>;
  query_params?: Record<string, unknown>;
  body?: string | Record<string, unknown>;
  response_format?: 'json' | 'text' | 'csv';
  api_key_ref?: string;
  timeout?: number;
}

/**
 * Normalize FBI CDE month-year query params.
 * API expects MM-YYYY for from/to; accept YYYY as shorthand.
 */
function normalizeFbiDateParam(value: unknown, fallbackMonth: '01' | '12'): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}$/.test(trimmed)) {
    return `${fallbackMonth}-${trimmed}`;
  }

  const monthYearMatch = trimmed.match(/^(\d{1,2})-(\d{4})$/);
  if (monthYearMatch) {
    const month = monthYearMatch[1].padStart(2, '0');
    return `${month}-${monthYearMatch[2]}`;
  }

  return null;
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
    headers: customHeaders,
    query_params: rawQueryParams,
    body,
    response_format = 'json',
    api_key_ref,
    timeout,
  } = args;
  const clampedTimeout = clampTimeoutMs(timeout);

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

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      toolCallId: '',
      success: false,
      error: `Invalid URL: ${url}`,
      metadata: { executionTime: Date.now() - startTime },
    };
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

  const socrataDownloadError = getSocrataBulkDownloadError(parsedUrl);
  if (socrataDownloadError) {
    return {
      toolCallId: '',
      success: false,
      error: socrataDownloadError,
      metadata: { executionTime: Date.now() - startTime },
    };
  }

  const requestHeaders: Record<string, string> = {
    'User-Agent': 'SymposiumAI/1.0 (Analyze Tool)',
    'Accept': 'application/json, text/plain, */*',
    ...toSafeHeaderMap(customHeaders),
  };
  const queryParams = toSafeQueryParamMap(rawQueryParams);

  let connectorRef = api_key_ref;
  if (!connectorRef) {
    const inferred = inferConnectorIdFromUrl(parsedUrl);
    if (inferred && !hasExplicitConnectorAuth(inferred, queryParams, requestHeaders)) {
      connectorRef = inferred;
      console.log('[handleFetchApi] Inferred api_key_ref from URL', { url: parsedUrl.toString(), connectorRef });
    }
  }

  console.log('[handleFetchApi] Request:', { url: parsedUrl.toString(), method, api_key_ref: connectorRef, uid });

  // Resolve api_key_ref if provided
  if (connectorRef) {
    if (!VALID_CONNECTOR_IDS.includes(connectorRef)) {
      return {
        toolCallId: '',
        success: false,
        error: `Unknown data connector: ${connectorRef}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    const authConfig = CONNECTOR_AUTH_CONFIG[connectorRef];
    if (!authConfig) {
      return {
        toolCallId: '',
        success: false,
        error: `No auth configuration for connector: ${connectorRef}`,
        metadata: { executionTime: Date.now() - startTime },
      };
    }

    // Only resolve key if connector requires authentication
    if (authConfig.authType !== 'none' && authConfig.authKeyName) {
      // Try user's stored key first, then fall back to Symposium-managed key
      const rawApiKey = await getDecryptedDataServiceKey(uid, connectorRef, encryptionKeyValue)
        || authConfig.getManagedKey?.()
        || null;
      const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : '';
      if (!apiKey) {
        return {
          toolCallId: '',
          success: false,
          error: `API key not configured for ${connectorRef}. Add your key in Settings > Data Sources.`,
          metadata: { executionTime: Date.now() - startTime },
        };
      }

      // Inject auth based on connector type
      switch (authConfig.authType) {
        case 'query_param':
          queryParams[authConfig.authKeyName] = apiKey;
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

  // Connector-specific param normalization
  if (connectorRef === 'fbi_crime') {
    const normalizedFrom = normalizeFbiDateParam(queryParams.from, '01');
    const normalizedTo = normalizeFbiDateParam(queryParams.to, '12');
    if (normalizedFrom) queryParams.from = normalizedFrom;
    if (normalizedTo) queryParams.to = normalizedTo;
  }

  // Build URL with query params
  for (const [key, value] of Object.entries(queryParams)) {
    parsedUrl.searchParams.set(key, String(value));
  }
  url = parsedUrl.toString();

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

    const contentLengthHeader = parseInt(response.headers.get('content-length') || '', 10);
    if (Number.isFinite(contentLengthHeader) && contentLengthHeader > MAX_FETCH_API_RESPONSE_BYTES) {
      return {
        toolCallId: '',
        success: false,
        error: `Response too large (${contentLengthHeader} bytes). Reduce payload size with API-side filters/pagination (for example: $limit, per_page, page, date range).`,
        metadata: {
          executionTime: Date.now() - startTime,
          originalLength: contentLengthHeader,
          truncated: true,
        },
      };
    }

    const { text: rawBody, bytesRead, exceeded } = await readResponseTextWithLimit(response, MAX_FETCH_API_RESPONSE_BYTES);
    if (exceeded) {
      return {
        toolCallId: '',
        success: false,
        error: `Response exceeded ${MAX_FETCH_API_RESPONSE_BYTES} bytes (${bytesRead} bytes read). Narrow the query and paginate to keep each response small.`,
        metadata: {
          executionTime: Date.now() - startTime,
          originalLength: bytesRead,
          truncated: true,
        },
      };
    }

    // Parse response based on format
    let content = rawBody;
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const shouldTreatAsJson = response_format === 'json' || contentType.includes('application/json') || contentType.includes('+json');

    if (shouldTreatAsJson) {
      try {
        const data = JSON.parse(rawBody);
        content = JSON.stringify(data);
      } catch (jsonError: any) {
        return {
          toolCallId: '',
          success: false,
          error: `Failed to parse JSON response. ${jsonError?.message || 'Malformed JSON received from API.'}`,
          metadata: {
            executionTime: Date.now() - startTime,
            originalLength: contentLengthHeader || bytesRead,
          },
        };
      }
    }

    return {
      toolCallId: '',
      success: true,
      content,
      metadata: {
        executionTime: Date.now() - startTime,
        originalLength: contentLengthHeader || bytesRead,
      },
    };
  } catch (error: any) {
    console.error('[handleFetchApi] Error:', {
      url,
      errorName: error.name,
      errorMessage: error.message,
    });

    const errorMessage = error.name === 'AbortError'
      ? `Request timed out after ${Math.round(clampedTimeout / 1000)}s`
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
    timeoutSeconds: 120,
    memory: '2GiB',
    concurrency: 40,
    secrets: [
      encryptionKey,
      fredApiKey,
      socrataAppToken,
      nasaApiKey,
      usCensusApiKey,
      blsRegistrationKey,
      fbiCrimeApiKey,
      stackExchangeApiKey,
      librariesIoApiKey,
    ],
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
        case 'fetch_url': {
          const fetchUrlArgs = args as unknown as FetchUrlArgs;
          const rerouteToApi = typeof fetchUrlArgs.url === 'string' && shouldRouteFetchUrlToApi(fetchUrlArgs.url);

          if (rerouteToApi) {
            const keyValue = encryptionKey.value();
            if (!keyValue) {
              throw new Error('Encryption not configured');
            }

            const convertedArgs = convertFetchUrlArgsToFetchApiArgs(fetchUrlArgs);
            console.log('[executeTool] Routing fetch_url call to fetch_api for API endpoint', {
              originalUrl: fetchUrlArgs.url,
              responseFormat: convertedArgs.response_format,
            });
            result = await handleFetchApi(convertedArgs, request.auth!.uid, keyValue);
          } else {
            result = await handleFetchUrl(fetchUrlArgs);
          }

          break;
        }

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
