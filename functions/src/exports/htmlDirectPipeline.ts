/**
 * HTML Direct Pipeline
 *
 * Converts a standalone HTML artifact (or artifact_bundle) directly to PDF
 * via Puppeteer, without going through the Report Builder's block-based
 * rendering pipeline.
 *
 * Key differences from the report_spec pipeline:
 *   - No JS sanitization — charts/interactives need JS to render.
 *     Puppeteer's network isolation is the security boundary.
 *   - Uses waitUntil:'networkidle0' so JS-rendered content is fully painted.
 *   - Injects minimal print-optimized CSS for cleaner PDF output.
 *   - For artifact_bundle type, inlines all CSS/JS/images from manifest.
 */
import type { Page } from 'puppeteer-core';
import type { ArtifactDoc, HtmlDirectOptions } from './types';
import { sha256Hex } from './utils';
import { applyBrandingToHtml } from './artifactBranding';

// ============================================================================
// Bundle Inlining (server-side equivalent of InlineBundlerService)
// ============================================================================

interface BundleFile {
  content: string;
  mimeType: string;
  isBase64?: boolean;
}

interface BundleManifest {
  version: 1;
  entryPoint: string;
  files: Record<string, BundleFile>;
}

function getFileContent(manifest: BundleManifest, filename: string): string | null {
  const file = manifest.files[filename];
  return file ? file.content : null;
}

function toDataUri(manifest: BundleManifest, filename: string): string | null {
  const file = manifest.files[filename];
  if (!file) return null;

  if (file.isBase64) {
    return `data:${file.mimeType};base64,${file.content}`;
  }
  const encoded = Buffer.from(file.content).toString('base64');
  return `data:${file.mimeType};base64,${encoded}`;
}

function inlineCssImports(css: string, manifest: BundleManifest, depth = 0): string {
  if (depth >= 3) return css;
  return css.replace(
    /@import\s+(?:url\s*\(\s*)?["']([^"']+)["'](?:\s*\))?\s*;/gi,
    (fullMatch, importPath) => {
      if (/^https?:/i.test(importPath)) return fullMatch;
      const normalized = importPath.replace(/^\.\//, '').split(/[?#]/)[0];
      const content = getFileContent(manifest, normalized);
      if (!content) return fullMatch;
      return `/* inlined: ${normalized} */\n${inlineCssImports(content, manifest, depth + 1)}\n`;
    }
  );
}

function inlineCssUrls(css: string, manifest: BundleManifest): string {
  return css.replace(
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    (fullMatch, urlPath) => {
      if (/^(https?:|data:|blob:)/i.test(urlPath)) return fullMatch;
      const normalized = urlPath.replace(/^\.\//, '').split(/[?#]/)[0];
      const dataUri = toDataUri(manifest, normalized);
      return dataUri ? `url("${dataUri}")` : fullMatch;
    }
  );
}

function processCSS(css: string, manifest: BundleManifest): string {
  let result = inlineCssImports(css, manifest);
  result = inlineCssUrls(result, manifest);
  return result;
}

/**
 * Inline all CSS, JS, and image dependencies from a bundle manifest.
 * Server-side equivalent of client's InlineBundlerService.inlineBundlePage().
 */
function inlineBundlePage(manifest: BundleManifest, htmlFilename: string): string {
  const htmlFile = manifest.files[htmlFilename];
  if (!htmlFile || htmlFile.mimeType !== 'text/html') return '';

  let html = htmlFile.content;

  // 1. Inline <link rel="stylesheet" href="...">
  html = html.replace(
    /<link\s+([^>]*?)rel\s*=\s*["']stylesheet["']([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)\/?>/gi,
    (fullMatch, _pre, _mid, href) => {
      if (/^https?:/i.test(href)) return fullMatch;
      const normalized = href.replace(/^\.\//, '').split(/[?#]/)[0];
      const content = getFileContent(manifest, normalized);
      if (!content) return fullMatch;
      return `<style>/* inlined: ${normalized} */\n${processCSS(content, manifest)}\n</style>`;
    }
  );
  // Reversed attribute order variant
  html = html.replace(
    /<link\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)rel\s*=\s*["']stylesheet["']([^>]*?)\/?>/gi,
    (fullMatch, _pre, href) => {
      if (/^https?:/i.test(href)) return fullMatch;
      const normalized = href.replace(/^\.\//, '').split(/[?#]/)[0];
      const content = getFileContent(manifest, normalized);
      if (!content) return fullMatch;
      return `<style>/* inlined: ${normalized} */\n${processCSS(content, manifest)}\n</style>`;
    }
  );

  // 2. Inline <script src="..."></script>
  html = html.replace(
    /<script\s+([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*?)>\s*<\/script>/gi,
    (fullMatch, _pre, src) => {
      if (/^https?:/i.test(src)) return fullMatch;
      const normalized = src.replace(/^\.\//, '').split(/[?#]/)[0];
      const content = getFileContent(manifest, normalized);
      if (!content) return fullMatch;
      return `<script>/* inlined: ${normalized} */\n${content}\n</script>`;
    }
  );

  // 3. Inline <img src="..."> with data URIs
  html = html.replace(
    /(<img\s+[^>]*?)src\s*=\s*["']([^"']+)["']/gi,
    (fullMatch, prefix, src) => {
      if (/^(https?:|data:|blob:)/i.test(src)) return fullMatch;
      const normalized = src.replace(/^\.\//, '').split(/[?#]/)[0];
      const dataUri = toDataUri(manifest, normalized);
      return dataUri ? `${prefix}src="${dataUri}"` : fullMatch;
    }
  );

  // 4. Inline CSS url() in <style> blocks
  html = html.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (_fullMatch, openTag, cssContent, closeTag) => {
      return `${openTag}${inlineCssUrls(cssContent, manifest)}${closeTag}`;
    }
  );

  // 5. Inline CSS url() in inline style="" attributes
  html = html.replace(
    /style\s*=\s*["']([^"']*url\([^)]+\)[^"']*)["']/gi,
    (_fullMatch, styleContent) => {
      return `style="${inlineCssUrls(styleContent, manifest)}"`;
    }
  );

  return html;
}

// ============================================================================
// Print-optimized CSS injection
// ============================================================================

const PRINT_CSS = `
<style data-html-pdf-export>
@media print {
  table, figure, img, svg, canvas {
    page-break-inside: avoid;
  }
  img, svg, canvas {
    max-width: 100% !important;
    height: auto !important;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>`;

/**
 * Inject print-optimized CSS before </head> (or at the start if no </head>).
 */
function injectPrintCSS(html: string): string {
  const headCloseIdx = html.indexOf('</head>');
  if (headCloseIdx !== -1) {
    return html.slice(0, headCloseIdx) + PRINT_CSS + html.slice(headCloseIdx);
  }
  // No </head> — inject at the very start
  return PRINT_CSS + html;
}

// ============================================================================
// Pipeline
// ============================================================================

export interface HtmlDirectResult {
  pdfBuffer: Buffer;
  sourceHash: string;
  artifactName: string;
}

/**
 * Run the HTML direct-to-PDF pipeline.
 *
 * @param artifact - The HTML or artifact_bundle artifact doc (with data resolved)
 * @param page - A Puppeteer page (caller manages lifecycle)
 * @param options - PDF generation options
 */
export async function runHtmlDirectPipeline(
  artifact: ArtifactDoc,
  page: Page,
  options?: HtmlDirectOptions,
): Promise<HtmlDirectResult> {
  let html: string;

  if (artifact.type === 'artifact_bundle') {
    // Parse bundle manifest and inline all dependencies
    const manifest: BundleManifest = JSON.parse(artifact.data);
    html = inlineBundlePage(manifest, manifest.entryPoint);
    if (!html) {
      throw new Error(`Bundle entry point '${manifest.entryPoint}' not found or not HTML`);
    }
  } else {
    // Plain HTML artifact — use data directly
    html = artifact.data;
  }

  const sourceHash = sha256Hex(artifact.data);

  // Apply app-owned visible branding after bundle inlining so the logo is
  // embedded in the HTML/PDF and raw source artifacts stay unchanged.
  html = applyBrandingToHtml(html, options?.branding);

  // Inject print-optimized CSS
  html = injectPrintCSS(html);

  // Render via Puppeteer — networkidle0 ensures JS-rendered content is painted
  await page.setContent(html, {
    waitUntil: 'networkidle0',
    timeout: 60_000,
  });
  await page.emulateMediaType('print');

  // Generate PDF
  const pageSize = options?.pageSize ?? 'A4';
  const margins = options?.margins ?? { top: 36, right: 36, bottom: 36, left: 36 };
  const ptToIn = (pt: number) => `${(pt / 72).toFixed(4)}in`;

  const pdfBuffer = Buffer.from(await page.pdf({
    format: pageSize === 'LETTER' ? 'Letter' : 'A4',
    landscape: options?.landscape ?? false,
    margin: {
      top: ptToIn(margins.top),
      right: ptToIn(margins.right),
      bottom: ptToIn(margins.bottom),
      left: ptToIn(margins.left),
    },
    printBackground: options?.printBackground !== false,
  }));

  return {
    pdfBuffer,
    sourceHash,
    artifactName: artifact.name,
  };
}
