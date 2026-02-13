/**
 * Web Search — Brave Search API integration
 *
 * Core search logic used by the executeTool callable (tools.ts).
 *
 * BYOK (Bring Your Own Key):
 * - Users provide their own Brave Search API key via Settings
 * - Keys are stored encrypted in Firestore
 * - Get a free API key at https://brave.com/search/api/ (2000 queries/month)
 */

import { HttpsError } from 'firebase-functions/v2/https';
import { getDecryptedApiKey } from './apiKeys';

// ============================================================================
// Types
// ============================================================================

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
}

interface WebSearchResponse {
  results: SearchResult[];
  query: string;
  totalResults?: number;
}

interface WebSearchRequest {
  query: string;
  num_results?: number;
}

// Brave Search API response types
interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  // Other fields we don't need
}

interface BraveSearchResponse {
  web?: {
    results: BraveWebResult[];
    totalResults?: number;
  };
  query?: {
    original: string;
  };
}

// ============================================================================
// Core Search Logic (reusable)
// ============================================================================

/**
 * Execute a web search via Brave Search API.
 * Called from the executeTool callable in tools.ts.
 */
export async function executeWebSearch(
  userId: string,
  args: WebSearchRequest,
  encryptionKeyValue: string
): Promise<WebSearchResponse> {
  const { query, num_results } = args;

  // Validate input
  if (!query || typeof query !== 'string') {
    throw new HttpsError('invalid-argument', 'Query is required and must be a string');
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    throw new HttpsError('invalid-argument', 'Query cannot be empty');
  }

  if (trimmedQuery.length > 500) {
    throw new HttpsError('invalid-argument', 'Query exceeds maximum length of 500 characters');
  }

  // Validate and clamp num_results (1-10, default 5)
  const count = typeof num_results === 'number'
    ? Math.min(Math.max(1, Math.floor(num_results)), 10)
    : 5;

  // Get user's Brave API key (BYOK)
  const apiKey = await getDecryptedApiKey(userId, 'brave', encryptionKeyValue);
  if (!apiKey) {
    throw new HttpsError(
      'failed-precondition',
      'Brave Search API key not configured. Add your API key in Settings to enable web search.'
    );
  }

  // Call Brave Search API
  console.log('[web_search] Searching:', { query: trimmedQuery, count, userId });

  const searchUrl = new URL('https://api.search.brave.com/res/v1/web/search');
  searchUrl.searchParams.set('q', trimmedQuery);
  searchUrl.searchParams.set('count', count.toString());

  const response = await fetch(searchUrl.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    console.error('[web_search] API error:', {
      status: response.status,
      statusText: response.statusText,
    });

    if (response.status === 429) {
      throw new HttpsError(
        'resource-exhausted',
        'Search rate limit reached. Please try again later.'
      );
    } else if (response.status === 401 || response.status === 403) {
      throw new HttpsError(
        'internal',
        'Search API authentication failed. Please contact support.'
      );
    } else {
      throw new HttpsError(
        'internal',
        `Search request failed with status ${response.status}`
      );
    }
  }

  const data: BraveSearchResponse = await response.json();

  const results: SearchResult[] = (data.web?.results || []).map((r) => {
    let domain: string;
    try {
      domain = new URL(r.url).hostname;
    } catch {
      domain = 'unknown';
    }

    return {
      title: r.title || 'Untitled',
      url: r.url,
      snippet: r.description || '',
      domain,
    };
  });

  console.log('[web_search] Success:', {
    query: trimmedQuery,
    resultCount: results.length,
    totalResults: data.web?.totalResults,
  });

  return {
    results,
    query: trimmedQuery,
    totalResults: data.web?.totalResults,
  };
}

