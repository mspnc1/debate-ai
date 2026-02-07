/**
 * Browser Service — Puppeteer + @sparticuz/chromium
 *
 * Launches headless Chromium via @sparticuz/chromium (serverless-optimized)
 * with deterministic settings and network isolation for reproducible PDF rendering.
 *
 * Hardened:
 *   - Emulator-aware executable path resolution
 *   - UTC timezone emulation per page
 *   - en-US locale via Accept-Language header
 *   - Protocol-based network blocking (data:, blob:, about:, file: allowed)
 *   - Page error capture for debugging
 */
import type { Browser, Page } from 'puppeteer-core';

// Warnings collected during network interception
const networkWarnings: string[] = [];

/**
 * Launch a headless Chromium browser using @sparticuz/chromium.
 *
 * In the emulator, uses Puppeteer's bundled Chrome.
 * In deployed Cloud Functions, uses @sparticuz/chromium's serverless binary.
 */
export async function launchBrowser(): Promise<Browser> {
  const chromium = await import('@sparticuz/chromium');
  const puppeteer = await import('puppeteer-core');

  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

  let executablePath: string;
  if (isEmulator) {
    // In emulator, try to use locally-installed puppeteer's bundled Chrome
    try {
      // Dynamic require to avoid compile-time dependency on 'puppeteer'
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const localPuppeteer = require('puppeteer');
      executablePath = localPuppeteer.executablePath();
    } catch {
      // Fall back to @sparticuz/chromium even in emulator
      executablePath = await chromium.default.executablePath();
    }
  } else {
    executablePath = await chromium.default.executablePath();
  }

  const browser = await puppeteer.default.launch({
    executablePath,
    headless: chromium.default.headless,
    args: [
      ...chromium.default.args,
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-zygote',
      '--lang=en-US',
    ],
  });

  return browser;
}

/**
 * Create a new page with deterministic viewport, timezone, and locale.
 *
 * Puppeteer's `createIncognitoBrowserContext()` does NOT accept locale/timezoneId
 * options (unlike Playwright), so timezone and locale are set per-page.
 */
export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  await page.emulateTimezone('UTC');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US' });
  return page;
}

/**
 * Set up network blocking on a page.
 *
 * Uses protocol-based checks: allows data:, blob:, about:, file: schemes.
 * Blocks all other requests (http:, https:, ws:, etc.).
 *
 * IMPORTANT: Call before any setContent/navigation on the page.
 */
export async function setupNetworkBlocking(page: Page): Promise<void> {
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    const url = request.url();

    // Extract protocol — URL constructor handles most schemes
    let protocol: string;
    try {
      protocol = new URL(url).protocol;
    } catch {
      // Malformed URL — block it
      const warning = `Blocked malformed request: ${request.method()} ${url} [${request.resourceType()}]`;
      console.warn(`[browserService] ${warning}`);
      networkWarnings.push(warning);
      request.abort('blockedbyclient');
      return;
    }

    // Allow safe local protocols
    if (
      protocol === 'data:' ||
      protocol === 'blob:' ||
      protocol === 'about:' ||
      protocol === 'file:'
    ) {
      request.continue();
      return;
    }

    // Block everything else (http:, https:, ws:, wss:, ftp:, etc.)
    const warning = `Blocked external request: ${request.method()} ${url} [${request.resourceType()}]`;
    console.warn(`[browserService] ${warning}`);
    networkWarnings.push(warning);
    request.abort('blockedbyclient');
  });

  // Capture page-level JS errors for debugging
  page.on('pageerror', (err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[browserService] Page error: ${message}`);
  });
}

/**
 * Get and clear collected network warnings.
 */
export function drainNetworkWarnings(): string[] {
  const warnings = [...networkWarnings];
  networkWarnings.length = 0;
  return warnings;
}

/**
 * Close the browser safely.
 */
export async function closeBrowser(browser: Browser | null): Promise<void> {
  if (browser) {
    try {
      await browser.close();
    } catch (err) {
      console.error('[browserService] Error closing browser:', err);
    }
  }
}

/**
 * Get Chromium version info from the browser.
 */
export async function getBrowserVersion(browser: Browser): Promise<string> {
  return browser.version();
}
