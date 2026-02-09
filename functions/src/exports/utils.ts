/**
 * Export Pipeline Utilities
 *
 * Shared crypto, serialization, and Firestore helpers.
 */
import * as crypto from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { PAYLOAD_SENTINEL } from './types';
import type { ArtifactDoc, ExportJobPhase } from './types';

const STORAGE_BUCKET = 'symposium-ai.firebasestorage.app';

/**
 * Get the project's Cloud Storage bucket.
 */
export function getExportBucket() {
  return getStorage().bucket(STORAGE_BUCKET);
}

/**
 * Compute SHA-256 hex digest of a Buffer or string (synchronous).
 */
export function sha256Hex(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Recursively sort object keys for deterministic serialization.
 * Arrays are preserved in order; only plain-object keys are sorted.
 */
function sortKeysDeep(val: unknown): unknown {
  if (val === null || val === undefined || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(sortKeysDeep);

  const obj = val as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeysDeep(obj[key]);
  }
  return sorted;
}

/**
 * Stable JSON serialization with recursively sorted keys.
 * Same algorithm as web repo's content-hash.ts for deterministic output.
 */
export function stableSerialize(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

/**
 * HMAC-SHA256 hex digest.
 */
export function hmacSign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Update an export job's phase and optional extra fields in Firestore.
 */
export async function updateJobPhase(
  jobId: string,
  phase: ExportJobPhase,
  extra?: Record<string, unknown>,
): Promise<void> {
  const db = getFirestore();
  await db
    .collection('exportJobs')
    .doc(jobId)
    .update({
      phase,
      updatedAt: new Date().toISOString(),
      ...extra,
    });
}

/**
 * Resolve an artifact's data, downloading from Storage if it was offloaded.
 * Backward compatible — returns inline data as-is if no payloadRefs.
 */
export async function resolveArtifactData(artifact: ArtifactDoc): Promise<string> {
  if (!artifact.payloadRefs?.data) {
    return artifact.data;
  }

  // Data was offloaded to Firebase Storage — download it
  const ref = artifact.payloadRefs.data;
  const bucket = getExportBucket();
  const [buffer] = await bucket.file(ref.path).download();
  const text = buffer.toString('utf-8');

  // Verify integrity
  const computedHash = sha256Hex(text);
  if (computedHash !== ref.sha256) {
    throw new Error(
      `PAYLOAD_INTEGRITY_MISMATCH: artifact ${artifact.id} data ` +
      `(expected ${ref.sha256}, got ${computedHash})`,
    );
  }

  return text;
}
