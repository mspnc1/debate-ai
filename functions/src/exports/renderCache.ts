/**
 * Render Cache Service
 *
 * Content-addressed caching for rendered visuals (SVG/PNG).
 * Avoids re-rendering identical artifacts across repeated exports.
 *
 * Cache key = sha256(CACHE_VERSION + sourceArtifactSha + rendererVersions + width + format + themeTokens)
 * Storage path: exports/renders/{renderHash}.{ext}
 */
import { getExportBucket } from './utils';
import { sha256Hex } from './utils';

const CACHE_VERSION = 'v1';

export interface RenderCacheStats {
  hits: number;
  misses: number;
}

const stats: RenderCacheStats = { hits: 0, misses: 0 };

/**
 * Compute the cache key for a render operation.
 */
export function computeRenderCacheKey(params: {
  sourceArtifactHash: string;
  rendererVersions: string;
  width?: number;
  format: 'svg' | 'png';
  themeTokens?: string;
}): string {
  const input = [
    CACHE_VERSION,
    params.sourceArtifactHash,
    params.rendererVersions,
    String(params.width ?? 'default'),
    params.format,
    params.themeTokens ?? '',
  ].join('|');

  return sha256Hex(input);
}

/**
 * Try to get a cached render from Cloud Storage.
 * Returns the cached content (SVG string or PNG data URL), or null if not cached.
 */
export async function getCachedRender(
  cacheKey: string,
  format: 'svg' | 'png',
): Promise<string | null> {
  const bucket = getExportBucket();
  const ext = format === 'svg' ? 'svg' : 'png';
  const filePath = `exports/renders/${cacheKey}.${ext}`;
  const file = bucket.file(filePath);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      stats.misses++;
      return null;
    }

    const [contents] = await file.download();
    stats.hits++;

    if (format === 'svg') {
      return contents.toString('utf-8');
    } else {
      const base64 = contents.toString('base64');
      return `data:image/png;base64,${base64}`;
    }
  } catch {
    stats.misses++;
    return null;
  }
}

/**
 * Store a render result in the cache.
 */
export async function storeCachedRender(
  cacheKey: string,
  format: 'svg' | 'png',
  content: string,
): Promise<void> {
  const bucket = getExportBucket();
  const ext = format === 'svg' ? 'svg' : 'png';
  const filePath = `exports/renders/${cacheKey}.${ext}`;

  let data: Buffer;
  let contentType: string;

  if (format === 'svg') {
    data = Buffer.from(content, 'utf-8');
    contentType = 'image/svg+xml';
  } else {
    // content is a data URL — strip the prefix and decode
    const base64 = content.replace(/^data:image\/png;base64,/, '');
    data = Buffer.from(base64, 'base64');
    contentType = 'image/png';
  }

  await bucket.file(filePath).save(data, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
}

/**
 * High-level: get a cached render or execute the render function and cache the result.
 */
export async function getOrRenderVisual(params: {
  sourceArtifactHash: string;
  rendererVersions: string;
  width?: number;
  format: 'svg' | 'png';
  themeTokens?: string;
  renderFn: () => Promise<string>;
}): Promise<string> {
  const cacheKey = computeRenderCacheKey(params);

  // Check cache
  const cached = await getCachedRender(cacheKey, params.format);
  if (cached !== null) {
    console.log(`[renderCache] HIT: ${cacheKey.slice(0, 12)}...`);
    return cached;
  }

  // Render
  console.log(`[renderCache] MISS: ${cacheKey.slice(0, 12)}... rendering...`);
  const result = await params.renderFn();

  // Store in cache (non-blocking — don't fail the pipeline if caching fails)
  storeCachedRender(cacheKey, params.format, result).catch(err => {
    console.warn(`[renderCache] Failed to store cache for ${cacheKey.slice(0, 12)}:`, err);
  });

  return result;
}

/**
 * Get cache hit/miss statistics for the current job.
 */
export function getCacheStats(): RenderCacheStats {
  return { ...stats };
}

/**
 * Reset cache stats (call at start of each job).
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
}
