/**
 * Vega Render Service
 *
 * Renders Vega and Vega-Lite specs to SVG (preferred) or PNG
 * using Puppeteer and vendored Vega libraries.
 */
import type { Page } from 'puppeteer-core';
import * as path from 'path';

function getVendorDir(): string {
  // functions/static/vendor/ — two levels up from lib/exports/
  return path.resolve(__dirname, '..', '..', 'static', 'vendor');
}

/**
 * Ensure the page is loaded with the Vega renderer.
 * Navigates to a data URL that loads the vendored Vega stack.
 */
async function ensureRendererLoaded(page: Page): Promise<void> {
  const vendorDir = getVendorDir();

  // Build a minimal HTML page that loads the vendored scripts from file://
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body>
<div id="vis"></div>
<script src="file://${vendorDir}/vega.min.js"></script>
<script src="file://${vendorDir}/vega-lite.min.js"></script>
<script src="file://${vendorDir}/vega-embed.min.js"></script>
<script>
window.__renderVega = async function(spec, opts) {
  var format = (opts && opts.format) || 'svg';
  var container = document.getElementById('vis');
  container.innerHTML = '';
  if (opts && opts.width) spec.width = opts.width;
  if (opts && opts.height) spec.height = opts.height;
  var embedOpts = { actions: false, renderer: format === 'png' ? 'canvas' : 'svg' };
  var result = await vegaEmbed(container, spec, embedOpts);
  var view = result.view;
  if (format === 'svg') {
    var svg = await view.toSVG();
    return { svg: svg };
  } else {
    var canvas = await view.toCanvas();
    var dataUrl = canvas.toDataURL('image/png');
    return { pngDataUrl: dataUrl };
  }
};
window.__rendererReady = true;
</script>
</body></html>`;

  await page.setContent(html, { waitUntil: 'load' });

  // Wait for renderer to be ready
  await page.waitForFunction('window.__rendererReady === true', {
    timeout: 15_000,
  });
}

/**
 * Render a Vega/Vega-Lite spec to SVG.
 * Falls back to PNG if SVG rendering fails.
 */
export async function renderVegaToSvg(
  spec: object,
  page: Page,
  timeout = 20_000,
): Promise<string> {
  await ensureRendererLoaded(page);

  try {
    const result = await page.evaluate(
      async (s: object) => {
        const fn = (window as unknown as Record<string, (spec: object, opts: object) => Promise<{ svg?: string; pngDataUrl?: string }>>).__renderVega;
        return fn(s, { format: 'svg' });
      },
      spec,
    );

    if (result.svg) {
      return result.svg;
    }
    throw new Error('SVG rendering returned empty result');
  } catch (err) {
    console.warn('[vegaRenderer] SVG failed, falling back to PNG:', err);
    return renderVegaToPngFallback(spec, page, timeout);
  }
}

/**
 * Render a Vega/Vega-Lite spec to PNG data URL.
 */
export async function renderVegaToPng(
  spec: object,
  page: Page,
  timeout = 20_000,
): Promise<string> {
  await ensureRendererLoaded(page);

  const result = await page.evaluate(
    async (s: object) => {
      const fn = (window as unknown as Record<string, (spec: object, opts: object) => Promise<{ svg?: string; pngDataUrl?: string }>>).__renderVega;
      return fn(s, { format: 'png' });
    },
    spec,
  );

  if (result.pngDataUrl) {
    return result.pngDataUrl;
  }
  throw new Error('PNG rendering returned empty result');
}

/**
 * Internal PNG fallback when SVG fails.
 * Returns an <img> tag with the PNG data URL.
 */
async function renderVegaToPngFallback(
  spec: object,
  page: Page,
  timeout: number,
): Promise<string> {
  const dataUrl = await renderVegaToPng(spec, page, timeout);
  return `<img src="${dataUrl}" alt="Vega visualization" style="max-width:100%">`;
}
