/**
 * Vendor Vega libraries for offline Playwright rendering.
 *
 * Copies minified Vega, Vega-Lite, and Vega-Embed bundles into
 * functions/static/vendor/ and generates a SHA-256 manifest.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const vendorDir = join(root, 'static', 'vendor');

mkdirSync(vendorDir, { recursive: true });

const files = [
  { src: 'vega/build/vega.min.js', dest: 'vega.min.js' },
  { src: 'vega-lite/build/vega-lite.min.js', dest: 'vega-lite.min.js' },
  { src: 'vega-embed/build/vega-embed.min.js', dest: 'vega-embed.min.js' },
];

const manifest = {};

for (const { src, dest } of files) {
  const srcPath = join(root, 'node_modules', src);
  const destPath = join(vendorDir, dest);
  copyFileSync(srcPath, destPath);

  const content = readFileSync(destPath);
  const hash = createHash('sha256').update(content).digest('hex');
  manifest[dest] = { sha256: hash, size: content.length };
}

writeFileSync(
  join(vendorDir, 'vendor-manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);

console.log('[vendor-vega] Vendored files:');
for (const [file, info] of Object.entries(manifest)) {
  console.log(`  ${file}: ${info.sha256.slice(0, 12)}... (${info.size} bytes)`);
}
