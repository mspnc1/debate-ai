/**
 * Provenance Service
 *
 * Generates, signs, and stores provenance manifests for exported PDFs.
 * Provenance enables auditability: who created the report, from what
 * artifacts, using which renderers, with what warnings.
 */
import { getExportBucket } from './utils';
import type {
  ProvenanceManifest,
  ProvenanceInputArtifact,
  ProvenanceMapDetails,
} from './types';
import { stableSerialize, hmacSign } from './utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Load renderer versions from the Vega vendor manifest and browser version.
 */
function loadVendorVersions(): Record<string, string> {
  try {
    const manifestPath = path.resolve(
      __dirname,
      '..',
      '..',
      'static',
      'vendor',
      'vendor-manifest.json',
    );
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    // Extract version numbers from the sha256 hashes (we store hashes, not versions)
    // For actual version strings, read from the package.json dependencies
    const versions: Record<string, string> = {};

    // Try to read version from node_modules
    for (const [pkg, key] of [
      ['vega', 'vega'],
      ['vega-lite', 'vegaLite'],
      ['vega-embed', 'vegaEmbed'],
    ] as const) {
      try {
        const pkgJsonPath = path.resolve(
          __dirname,
          '..',
          '..',
          'node_modules',
          pkg,
          'package.json',
        );
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        versions[key] = pkgJson.version;
      } catch {
        // Use hash as fallback
        const fileName = `${pkg === 'vega-embed' ? 'vega-embed' : pkg}.min.js`;
        if (manifest[fileName]) {
          versions[key] = `sha256:${manifest[fileName].sha256.slice(0, 12)}`;
        }
      }
    }

    return versions;
  } catch {
    return {};
  }
}

/**
 * Generate a provenance manifest for an export.
 */
export function generateManifest(
  reportSpecId: string,
  reportSpecHash: string,
  inputArtifacts: ProvenanceInputArtifact[],
  puppeteerVersion: string,
  chromiumVersion: string,
  warnings: string[],
  mapDetails?: Record<string, ProvenanceMapDetails>,
): ProvenanceManifest {
  const vendorVersions = loadVendorVersions();

  return {
    reportSpecId,
    reportSpecHash,
    inputArtifacts,
    rendererVersions: {
      puppeteer: puppeteerVersion,
      chromium: chromiumVersion,
      vega: vendorVersions.vega,
      vegaLite: vendorVersions.vegaLite,
      vegaEmbed: vendorVersions.vegaEmbed,
    },
    mapDetails,
    warnings,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Sign a provenance manifest with HMAC-SHA256.
 * Returns both the JSON string and its signature.
 */
export function signManifest(
  manifest: ProvenanceManifest,
  hmacSecret: string,
): { json: string; signature: string } {
  const json = stableSerialize(manifest);
  const signature = hmacSign(json, hmacSecret);
  return { json, signature };
}

/**
 * Store provenance manifest and signature to Cloud Storage.
 */
export async function storeProvenance(
  pdfHash: string,
  json: string,
  signature: string,
): Promise<void> {
  const bucket = getExportBucket();

  const jsonPath = `exports/provenance/${pdfHash}.json`;
  const sigPath = `exports/provenance/${pdfHash}.sig`;

  await Promise.all([
    bucket.file(jsonPath).save(json, {
      contentType: 'application/json',
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    }),
    bucket.file(sigPath).save(signature, {
      contentType: 'text/plain',
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    }),
  ]);

  console.log(`[provenance] Stored at ${jsonPath} and ${sigPath}`);
}
