import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

/**
 * Two-factor backup (recovery) codes.
 *
 * Firebase MFA (TOTP/SMS) has no native backup codes, so this is custom:
 * generate N single-use codes, store per-code salted scrypt hashes, and return
 * the plaintext once. Stored at users/{uid}/security/backupCodes — a
 * subcollection that deleteAccount already wipes, so no extra cleanup is needed.
 *
 * Verification at sign-in (verifyAndConsumeBackupCode) is provided for a future
 * MFA-resolver integration; it is not yet wired to a sign-in flow.
 */

const CODE_COUNT = 10;
const CODE_LENGTH = 8;
// Crockford-ish alphabet: no ambiguous I/L/O/0/1.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SALT_BYTES = 16;
const HASH_BYTES = 32;

interface StoredCode {
  salt: string; // hex
  hash: string; // hex (scrypt of normalized code)
  usedAt: Timestamp | null;
}

function backupCodesRef(uid: string) {
  return getFirestore().collection('users').doc(uid).collection('security').doc('backupCodes');
}

/** Strip formatting so "abcd-efgh" and "ABCDEFGH" hash identically. */
function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generatePlainCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

/** Display format, e.g. "ABCD-EFGH". */
function formatForDisplay(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function hashCode(normalized: string, salt: Buffer): Buffer {
  return crypto.scryptSync(normalized, salt, HASH_BYTES);
}

export const generateBackupCodes = onCall(async (request): Promise<{ codes: string[] }> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to generate backup codes');
  }

  const uid = request.auth.uid;
  const plainCodes: string[] = [];
  const stored: StoredCode[] = [];

  for (let i = 0; i < CODE_COUNT; i++) {
    const raw = generatePlainCode();
    const salt = crypto.randomBytes(SALT_BYTES);
    stored.push({
      salt: salt.toString('hex'),
      hash: hashCode(raw, salt).toString('hex'),
      usedAt: null,
    });
    plainCodes.push(formatForDisplay(raw));
  }

  try {
    // Overwrites any previous set — regenerating invalidates old codes.
    await backupCodesRef(uid).set({
      codes: stored,
      remaining: CODE_COUNT,
      generatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error generating backup codes:', error);
    throw new HttpsError('internal', 'Failed to generate backup codes');
  }

  return { codes: plainCodes };
});

export const getBackupCodesStatus = onCall(
  async (request): Promise<{ remaining: number; generatedAt: string | null }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    try {
      const doc = await backupCodesRef(request.auth.uid).get();
      if (!doc.exists) {
        return { remaining: 0, generatedAt: null };
      }
      const data = doc.data() as { codes?: StoredCode[]; generatedAt?: Timestamp } | undefined;
      const remaining = (data?.codes ?? []).filter((c) => !c.usedAt).length;
      const generatedAt = data?.generatedAt?.toDate?.()?.toISOString() ?? null;
      return { remaining, generatedAt };
    } catch (error) {
      console.error('Error reading backup codes status:', error);
      throw new HttpsError('internal', 'Failed to read backup codes status');
    }
  }
);

/**
 * Verify a backup code and consume it (single-use). Returns true on success.
 *
 * Provided for a future sign-in MFA-resolver integration — not yet wired to an
 * endpoint. Runs in a transaction so a code can't be consumed twice.
 */
export async function verifyAndConsumeBackupCode(uid: string, input: string): Promise<boolean> {
  const normalized = normalizeCode(input);
  if (!normalized) return false;

  const db = getFirestore();
  const ref = backupCodesRef(uid);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return false;

    const data = doc.data() as { codes?: StoredCode[] } | undefined;
    const codes = data?.codes ?? [];

    let matchedIndex = -1;
    for (let i = 0; i < codes.length; i++) {
      const entry = codes[i];
      if (entry.usedAt) continue;
      const candidate = hashCode(normalized, Buffer.from(entry.salt, 'hex'));
      const stored = Buffer.from(entry.hash, 'hex');
      if (candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) return false;

    codes[matchedIndex] = { ...codes[matchedIndex], usedAt: Timestamp.now() };
    const remaining = codes.filter((c) => !c.usedAt).length;
    tx.update(ref, { codes, remaining, updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
}
