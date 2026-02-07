/**
 * Report Assembler
 *
 * Combines rendered blocks with the Handlebars report template
 * to produce the final HTML document for PDF generation.
 */
import Handlebars from 'handlebars';
import { marked } from 'marked';
import type {
  ReportSpecV1,
  ReportBlock,
  ReportTheme,
  RenderedBlock,
  ArtifactBlock,
  HeadingBlock,
  ParagraphBlock,
  TableBlock,
  SpacerBlock,
} from './types';
import * as fs from 'fs';
import * as path from 'path';

// DOMPurify requires a DOM — use server-side approach
// On Node.js, we sanitize via marked's built-in sanitizer and manual tag stripping
function sanitizeHtml(html: string): string {
  // Strip script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, '');
}

/**
 * Render a markdown string to sanitized HTML.
 */
function renderMarkdown(markdown: string): string {
  const raw = marked.parse(markdown, { async: false }) as string;
  return sanitizeHtml(raw);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Escape HTML entities in text content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render a heading block to HTML.
 */
function renderHeading(block: HeadingBlock): string {
  const tag = `h${block.level}`;
  return `<${tag}>${escapeHtml(block.text)}</${tag}>`;
}

/**
 * Render a paragraph block to HTML.
 */
function renderParagraph(block: ParagraphBlock): string {
  return `<div class="paragraph">${renderMarkdown(block.markdown)}</div>`;
}

/**
 * Render an artifact block with pre-rendered visual content.
 */
function renderArtifact(
  block: ArtifactBlock,
  renderedContent: string,
): string {
  let html = `<div class="artifact-block">${renderedContent}`;
  if (block.caption) {
    html += `<div class="artifact-caption">${escapeHtml(block.caption)}</div>`;
  }
  html += '</div>';
  return html;
}

/**
 * Render a table block to HTML.
 */
function renderTable(block: TableBlock): string {
  let html = '<table>';
  if (block.caption) {
    html += `<caption>${escapeHtml(block.caption)}</caption>`;
  }
  html += '<thead><tr>';
  for (const header of block.headers) {
    html += `<th>${escapeHtml(header)}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (const row of block.rows) {
    html += '<tr>';
    for (const cell of row) {
      html += `<td>${escapeHtml(cell)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

/**
 * Decode artifact data, which may be base64-encoded.
 */
function decodeArtifactData(data: string): string {
  // If it looks like raw JSON or CSV, use as-is
  const trimmed = data.trimStart();
  if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.includes(',')) {
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // Might be CSV or base64 — continue
    }
  }

  // Try base64 decode
  try {
    const decoded = Buffer.from(data, 'base64').toString('utf-8');
    // Verify it produced valid UTF-8 text (not binary garbage)
    if (/[\x00-\x08\x0E-\x1F]/.test(decoded.slice(0, 200))) {
      return data; // Binary content, use raw
    }
    return decoded;
  } catch {
    return data;
  }
}

/**
 * Parse CSV/TSV text into rows of records.
 */
function parseCsv(text: string): Array<Record<string, unknown>> | null {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  if (headers.length < 2) return null;

  const rows: Array<Record<string, unknown>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Detect base64-encoded image data and infer mime type.
 */
function detectBase64Image(
  data: string,
  mimeHint?: string,
): { mimeType: string; base64: string } | null {
  const trimmed = data.trim();

  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
    if (match) {
      return { mimeType: match[1], base64: match[2].replace(/\s+/g, '') };
    }
  }

  const base64 = trimmed.replace(/\s+/g, '');
  if (!base64 || /[^A-Za-z0-9+/=]/.test(base64)) return null;

  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
  if (bytes.length < 8) return null;

  const startsWith = (seq: number[]): boolean => seq.every((b, i) => bytes[i] === b);
  const ascii = (start: number, end: number): string =>
    bytes.slice(start, end).toString('ascii');

  let detected: string | null = null;
  if (startsWith([0x89, 0x50, 0x4e, 0x47])) {
    detected = 'image/png';
  } else if (startsWith([0xff, 0xd8, 0xff])) {
    detected = 'image/jpeg';
  } else if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') {
    detected = 'image/gif';
  } else if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    detected = 'image/webp';
  } else {
    const utf8 = bytes.toString('utf8', 0, Math.min(bytes.length, 512)).trimStart();
    if (utf8.startsWith('<svg')) {
      detected = 'image/svg+xml';
    }
  }

  if (!detected) {
    if (mimeHint && mimeHint.startsWith('image/')) {
      detected = mimeHint;
    } else {
      return null;
    }
  }

  return { mimeType: detected, base64 };
}

/**
 * Render a JSON document as a formatted code block.
 * For structured (non-tabular) JSON data in reports.
 */
export function renderJsonDocument(data: string): string {
  function renderRawJson(text: string): string {
    const truncated = text.length > 3000 ? text.slice(0, 3000) + '\n...' : text;
    return [
      '<div style="text-align:left;max-width:100%;">',
      '<pre style="margin:0;font-size:8pt;line-height:1.45;background:#f8f9fa;border:1px solid #e5e7eb;border-radius:4px;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-word;text-align:left">',
      `<code>${escapeHtml(truncated)}</code>`,
      '</pre>',
      '</div>',
    ].join('');
  }

  function renderStructuredJsonDocument(parsed: Record<string, unknown>): string | null {
    const rawBlocks = parsed.blocks;
    if (!Array.isArray(rawBlocks)) return null;

    const parts: string[] = ['<div style="text-align:left;max-width:100%;">'];
    const docTitle = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    if (docTitle) {
      parts.push(`<h3 style="margin-top:0;">${escapeHtml(docTitle)}</h3>`);
    }

    const displayBlocks = rawBlocks.slice(0, 50);
    for (const rawBlock of displayBlocks) {
      if (!isRecord(rawBlock)) continue;

      const kind = typeof rawBlock.kind === 'string' ? rawBlock.kind : '';
      switch (kind) {
        case 'heading': {
          const text = typeof rawBlock.text === 'string' ? rawBlock.text : '';
          const level = rawBlock.level === 1 || rawBlock.level === 2 || rawBlock.level === 3
            ? rawBlock.level
            : 3;
          const tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
          if (text) {
            parts.push(`<${tag}>${escapeHtml(text)}</${tag}>`);
          }
          break;
        }

        case 'paragraph': {
          const markdown = typeof rawBlock.markdown === 'string'
            ? rawBlock.markdown
            : typeof rawBlock.text === 'string'
              ? rawBlock.text
              : '';
          if (markdown) {
            parts.push(`<div class="paragraph">${renderMarkdown(markdown)}</div>`);
          }
          break;
        }

        case 'table': {
          const headers = Array.isArray(rawBlock.headers)
            ? rawBlock.headers.map((h) => String(h))
            : [];
          const rows = Array.isArray(rawBlock.rows)
            ? rawBlock.rows.map((row) =>
              Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : [],
            )
            : [];
          if (headers.length > 0 && rows.length > 0) {
            parts.push(renderTable({
              kind: 'table',
              headers,
              rows,
              caption: typeof rawBlock.caption === 'string' ? rawBlock.caption : undefined,
            }));
          }
          break;
        }

        case 'page_break':
          parts.push('<div class="page-break"></div>');
          break;

        case 'spacer': {
          const height = typeof rawBlock.height === 'number' && Number.isFinite(rawBlock.height)
            ? Math.max(1, rawBlock.height)
            : 12;
          parts.push(`<div style="height:${height}pt"></div>`);
          break;
        }

        case 'vega_lite_spec':
        case 'map_spec':
        case 'image':
        case 'artifact':
        case 'html': {
          parts.push(
            `<p style="margin:6pt 0;color:#6b7280;font-size:9pt;"><em>Embedded ${escapeHtml(kind)} block omitted in JSON document view.</em></p>`,
          );
          break;
        }

        default:
          // Unknown block kinds are skipped to keep output readable.
          break;
      }
    }

    if (rawBlocks.length > displayBlocks.length) {
      parts.push(
        `<p style="font-size:9pt;color:#6b7280;font-style:italic;">Showing ${displayBlocks.length} of ${rawBlocks.length} blocks.</p>`,
      );
    }

    parts.push('</div>');
    return parts.join('');
  }

  try {
    const decoded = decodeArtifactData(data);
    const parsed = JSON.parse(decoded);

    // Schema-aware rendering for report-like JSON documents.
    if (isRecord(parsed)) {
      const structured = renderStructuredJsonDocument(parsed);
      if (structured) {
        return structured;
      }
    }

    const pretty = JSON.stringify(parsed, null, 2);
    return renderRawJson(pretty);
  } catch {
    // If JSON parsing fails, show raw text
    const decoded = decodeArtifactData(data);
    return renderRawJson(decoded);
  }
}

/**
 * Render a dataset artifact as a preview table (max rows).
 */
export function renderDatasetPreview(
  data: string,
  maxRows = 20,
  mimeType?: string,
): string {
  try {
    const imagePayload = detectBase64Image(data, mimeType);
    if (imagePayload) {
      return `<img src="data:${imagePayload.mimeType};base64,${imagePayload.base64}" alt="Artifact image" style="max-width:100%;height:auto">`;
    }

    const decoded = decodeArtifactData(data);
    let rows: Array<Record<string, unknown>> | null = null;

    // Try JSON first
    try {
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) {
        // Array of records
        rows = parsed.filter(
          (item: unknown): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null,
        );
      } else if (typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as Record<string, unknown>;

        // Check common nested array patterns for tabular data
        const arrayKey = ['values', 'data', 'rows', 'results', 'records', 'items'].find(
          k => Array.isArray(obj[k]) && (obj[k] as unknown[]).length > 0
            && typeof (obj[k] as unknown[])[0] === 'object',
        );
        if (arrayKey) {
          rows = (obj[arrayKey] as unknown[]).filter(
            (item: unknown): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null,
          );
        } else {
          // Non-tabular JSON — fall back to json_document renderer
          return renderJsonDocument(data);
        }
      }
    } catch {
      // Not JSON — try CSV/TSV
    }

    // Try CSV/TSV
    if (!rows) {
      rows = parseCsv(decoded);
    }

    if (!rows || rows.length === 0) {
      // Not tabular — try rendering as JSON document
      return renderJsonDocument(data);
    }

    const headers = Object.keys(rows[0]);
    const displayRows = rows.slice(0, maxRows);

    let html = '<table><thead><tr>';
    for (const h of headers) {
      html += `<th>${escapeHtml(String(h))}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (const row of displayRows) {
      html += '<tr>';
      for (const h of headers) {
        const val = row[h];
        const display = val == null ? ''
          : typeof val === 'object' ? JSON.stringify(val)
          : String(val);
        html += `<td>${escapeHtml(display)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';

    if (rows.length > maxRows) {
      html += `<p style="font-size:9pt;color:#6b7280;font-style:italic">Showing ${maxRows} of ${rows.length} rows</p>`;
    }

    return html;
  } catch {
    return '<p><em>Unable to parse dataset for preview</em></p>';
  }
}

/**
 * Assemble the complete report HTML from a report spec and rendered blocks.
 *
 * @param reportSpec - The validated report specification
 * @param blockRenderings - Map of "pageIdx:blockIdx" → rendered HTML/SVG content.
 *   Keyed by position so the same artifact can appear in multiple blocks with
 *   different render intents or options.
 * @param theme - Report theme (from the spec)
 */
export function assembleReportHtml(
  reportSpec: ReportSpecV1,
  blockRenderings: Map<string, string>,
  theme: ReportTheme,
): string {
  // Load and compile the Handlebars template
  const templatePath = path.resolve(__dirname, 'templates', 'report.html');
  const templateSrc = fs.readFileSync(templatePath, 'utf-8');

  // Register helpers
  Handlebars.registerHelper('joinAuthors', (authors: string[]) => {
    return authors.join(' • ');
  });

  const template = Handlebars.compile(templateSrc);

  // Render abstract markdown
  const abstractHtml = reportSpec.abstract
    ? renderMarkdown(reportSpec.abstract)
    : '';

  // Render all pages with their blocks
  const pages = reportSpec.pages.map((page, pageIdx) => {
    const blocks = page.blocks.map((block: ReportBlock, blockIdx: number) => {
      switch (block.kind) {
        case 'heading':
          return renderHeading(block);

        case 'paragraph':
          return renderParagraph(block);

        case 'artifact': {
          const content = blockRenderings.get(`${pageIdx}:${blockIdx}`) || '<p><em>Artifact not rendered</em></p>';
          return renderArtifact(block, content);
        }

        case 'table':
          return renderTable(block);

        case 'page_break':
          return '<div class="page-break"></div>';

        case 'spacer':
          return `<div style="height: ${block.height}pt"></div>`;

        default:
          return '';
      }
    });

    return { blocks };
  });

  // Determine if we should show a title page
  const showTitlePage = !!(reportSpec.title || reportSpec.authors.length > 0 || reportSpec.abstract);

  return template({
    title: reportSpec.title,
    authors: reportSpec.authors,
    abstractHtml,
    showTitlePage,
    pages,
    pageSize: theme.pageSize,
    margins: theme.margins,
    fonts: theme.fonts,
    colors: theme.colors,
  });
}
