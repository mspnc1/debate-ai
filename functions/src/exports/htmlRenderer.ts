/**
 * HTML Renderer Service
 *
 * Renders HTML artifacts as PNG screenshots for html_snapshot render intent.
 * Strips all JavaScript and dangerous content; produces a static visual capture.
 *
 * Sanitization removes:
 *   - <script> tags (inline and external)
 *   - Inline event handlers (onclick, onload, onerror, etc.)
 *   - javascript: URLs
 *   - <iframe> elements
 *   - <form> elements
 *   - <object>, <embed>, <applet> elements
 *   - <link rel="preload"> (potential side-channel)
 *   - <meta http-equiv="refresh"> (redirect)
 *   - <base> tags (URL hijacking)
 */
import type { Page } from 'puppeteer-core';

/**
 * Sanitize HTML for safe rendering. Removes all executable content.
 * This is a defense-in-depth layer — Puppeteer's network blocking
 * is the primary security boundary.
 */
export function sanitizeHtmlForSnapshot(html: string): string {
  return html
    // Remove <script> tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove <iframe> tags and contents
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove self-closing iframes
    .replace(/<iframe\b[^>]*\/?\s*>/gi, '')
    // Remove <form> tags and contents
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    // Remove <object>, <embed>, <applet> tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*\/?\s*>/gi, '')
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
    // Remove <base> tags (URL hijacking)
    .replace(/<base\b[^>]*\/?\s*>/gi, '')
    // Remove <link rel="preload"> (potential side-channel)
    .replace(/<link[^>]*rel\s*=\s*["']?preload["']?[^>]*>/gi, '')
    // Remove <meta http-equiv="refresh"> (redirect)
    .replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '')
    // Remove inline event handlers (on*)
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: URLs in href, src, action, etc.
    .replace(/(href|src|action|data|formaction|poster|background)\s*=\s*["']?\s*javascript\s*:[^"'>\s]*/gi, '$1=""')
    // Remove data: URLs in src (potential for script execution via data:text/html)
    .replace(/src\s*=\s*["']?\s*data\s*:\s*text\/html[^"'>\s]*/gi, 'src=""');
}

/**
 * Render HTML content as a PNG screenshot.
 * Returns a data URL string.
 */
export async function renderHtmlToPng(
  htmlContent: string,
  page: Page,
  timeout = 20_000,
): Promise<string> {
  const sanitized = sanitizeHtmlForSnapshot(htmlContent);

  await page.setContent(sanitized, {
    waitUntil: 'load',
    timeout,
  });

  // Wait a brief moment for CSS to settle
  await new Promise(resolve => setTimeout(resolve, 500));

  // Take a screenshot of the visible content
  const screenshotBuffer = await page.screenshot({
    type: 'png',
    fullPage: true,
  });

  // screenshotBuffer is Uint8Array in Puppeteer
  const base64 = Buffer.from(screenshotBuffer).toString('base64');
  return `data:image/png;base64,${base64}`;
}
