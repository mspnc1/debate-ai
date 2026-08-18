/**
 * Render HTML Snapshots — Callable Function
 *
 * Snapshot-only server rendering for the web client's PDF/PPTX/DOCX report
 * exporters: given the session's embedded-component artifact ids, render each
 * interactive HTML document in headless Chromium — JavaScript EXECUTING (maps
 * and charts must draw themselves), network restricted to the tile/CDN
 * allowlist — and return PNG data URLs.
 *
 * This deliberately does NOT touch the dormant runExportJob PDF assembler:
 * the web client owns report assembly; this function only turns HTML into
 * pixels. Unlike htmlRenderer's sanitized snapshot (JS stripped), interactive
 * components are useless without their scripts, so here the sandbox is the
 * network allowlist + headless isolation, not script removal.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type { Browser } from 'puppeteer-core';
import {
  launchBrowser,
  createPage,
  setupNetworkBlocking,
  closeBrowser,
} from './browserService';
import { getOrRenderVisual } from './renderCache';
import { resolveArtifactData, sha256Hex } from './utils';
import type { ArtifactDoc } from './types';

/** Response stays comfortably under the callable payload limit. */
const MAX_COMPONENTS = 8;
/** Per-component render budget (network settle included). */
const RENDER_TIMEOUT_MS = 20_000;
/** Map tiles keep arriving after the network goes quiet — let them paint. */
const SETTLE_MS = 1_800;
const VIEWPORT_WIDTH = 1200;
const DEFAULT_VIEWPORT_HEIGHT = 680;
const MIN_VIEWPORT_HEIGHT = 320;
const MAX_VIEWPORT_HEIGHT = 2_000;
/** Bump to invalidate cached renders when the render recipe changes. */
const RENDERER_VERSION = 'html-snapshot-v1';

const ALLOWED_TYPES = new Set(['html', 'document_html']);

/**
 * Remove Subresource Integrity attributes — LLM-authored artifacts frequently
 * carry hallucinated SRI hashes that make the browser BLOCK the CDN asset
 * (leaflet.css etc.), scattering map tiles. Mirrors the web client's strip.
 */
function stripSubresourceIntegrity(html: string): string {
  if (!html.includes('integrity')) return html;
  return html.replace(/\s+integrity\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/gi, '');
}

/** document_html artifacts store base64; html artifacts store the raw string. */
function decodeArtifactHtml(artifact: ArtifactDoc, data: string): string {
  if (artifact.type !== 'document_html') return data;
  try {
    return Buffer.from(data, 'base64').toString('utf-8');
  } catch {
    return data;
  }
}

function clampHeight(value: unknown): number {
  const height = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_VIEWPORT_HEIGHT;
  return Math.min(Math.max(Math.round(height), MIN_VIEWPORT_HEIGHT), MAX_VIEWPORT_HEIGHT);
}

/**
 * Render one HTML document to a PNG data URL. The screenshot is clipped to the
 * viewport (matching how the app presents the component in its iframe) at
 * 2x scale for print quality.
 */
async function renderInteractiveHtmlToPng(
  browser: Browser,
  html: string,
  viewportHeight: number,
): Promise<string> {
  const page = await createPage(browser);
  try {
    await page.setViewport({ width: VIEWPORT_WIDTH, height: viewportHeight, deviceScaleFactor: 2 });
    await setupNetworkBlocking(page);
    try {
      // setContent no longer accepts networkidle waits (puppeteer >=24.43
      // narrowed SetContentWaitForOptions); 'load' + waitForNetworkIdle with
      // concurrency 2 reproduces the old networkidle2 semantics.
      await page.setContent(stripSubresourceIntegrity(html), {
        waitUntil: 'load',
        timeout: RENDER_TIMEOUT_MS,
      });
      await page.waitForNetworkIdle({ idleTime: 500, concurrency: 2, timeout: RENDER_TIMEOUT_MS });
    } catch (err) {
      // A trickling tile server can hold the network open past the budget —
      // screenshot whatever has painted rather than failing the block.
      console.warn('[renderHtmlSnapshots] setContent did not settle, capturing anyway:',
        err instanceof Error ? err.message : String(err));
    }
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    return `data:image/png;base64,${Buffer.from(screenshot).toString('base64')}`;
  } finally {
    try {
      await page.close();
    } catch {
      // Browser teardown handles stragglers.
    }
  }
}

interface SnapshotRequestItem {
  artifactId: string;
  /** Intended display height (the embedded_html block's height hint). */
  height?: number;
}

export const renderHtmlSnapshots = onCall(
  { timeoutSeconds: 300, memory: '2GiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }
    const uid = request.auth.uid;
    const { sessionId, components } = request.data ?? {};

    if (!sessionId || typeof sessionId !== 'string') {
      throw new HttpsError('invalid-argument', 'Missing sessionId');
    }
    if (!Array.isArray(components) || components.length === 0) {
      throw new HttpsError('invalid-argument', 'Missing components');
    }
    if (components.length > MAX_COMPONENTS) {
      throw new HttpsError('invalid-argument', `At most ${MAX_COMPONENTS} components per request`);
    }
    const items: SnapshotRequestItem[] = components.map((raw: unknown) => {
      const item = raw as Record<string, unknown>;
      if (!item || typeof item.artifactId !== 'string' || !item.artifactId) {
        throw new HttpsError('invalid-argument', 'Each component needs an artifactId');
      }
      return { artifactId: item.artifactId, height: clampHeight(item.height) };
    });

    const db = getFirestore();
    const artifactsBase = db
      .collection('users')
      .doc(uid)
      .collection('conversations')
      .doc(sessionId)
      .collection('artifacts');

    const snapshots: Record<string, { dataUrl?: string; error?: string }> = {};
    let browser: Browser | null = null;

    try {
      for (const item of items) {
        try {
          const doc = await artifactsBase.doc(item.artifactId).get();
          if (!doc.exists) {
            snapshots[item.artifactId] = { error: 'not_found' };
            continue;
          }
          const artifact = doc.data() as ArtifactDoc;
          if (!ALLOWED_TYPES.has(artifact.type)) {
            snapshots[item.artifactId] = { error: `unsupported_type:${artifact.type}` };
            continue;
          }
          const raw = await resolveArtifactData(artifact);
          const html = decodeArtifactHtml(artifact, raw);
          if (!html.trim()) {
            snapshots[item.artifactId] = { error: 'empty' };
            continue;
          }

          const dataUrl = await getOrRenderVisual({
            sourceArtifactHash: sha256Hex(html),
            rendererVersions: RENDERER_VERSION,
            width: VIEWPORT_WIDTH,
            format: 'png',
            themeTokens: `h${item.height}`,
            renderFn: async () => {
              if (!browser) browser = await launchBrowser();
              return renderInteractiveHtmlToPng(browser, html, item.height ?? DEFAULT_VIEWPORT_HEIGHT);
            },
          });
          snapshots[item.artifactId] = { dataUrl };
        } catch (err) {
          console.error(`[renderHtmlSnapshots] ${item.artifactId} failed:`, err);
          snapshots[item.artifactId] = { error: 'render_failed' };
        }
      }
    } finally {
      await closeBrowser(browser);
    }

    return { snapshots };
  },
);
