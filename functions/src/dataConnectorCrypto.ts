/**
 * Shared encryption utilities for data connector keys.
 *
 * Re-exports the encryption key secret and provides encrypt/decrypt
 * functions that mirror apiKeys.ts but operate on the dataServiceKeys collection.
 */

import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

// Same encryption key secret used by apiKeys.ts
export const encryptionKey = defineSecret('ENCRYPTION_KEY');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function getEncryptionKeyBuffer(keyValue: string): Buffer {
  return crypto.scryptSync(keyValue, 'symposium-salt', 32);
}

export function encrypt(text: string, keyValue: string): { encrypted: string; iv: string; tag: string } {
  const key = getEncryptionKeyBuffer(keyValue);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

function decrypt(encrypted: string, iv: string, tag: string, keyValue: string): string {
  const key = getEncryptionKeyBuffer(keyValue);
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Get a decrypted data service API key from Firestore.
 * Reads from users/{uid}/dataServiceKeys/{connectorId}.
 */
export async function getDecryptedDataServiceKey(
  uid: string,
  connectorId: string,
  keyValue: string
): Promise<string | null> {
  const db = getFirestore();

  try {
    const doc = await db
      .collection('users')
      .doc(uid)
      .collection('dataServiceKeys')
      .doc(connectorId)
      .get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data?.encrypted || !data?.iv || !data?.tag) {
      return null;
    }

    return decrypt(data.encrypted, data.iv, data.tag, keyValue);
  } catch (error) {
    console.error(`Error decrypting data service key for ${connectorId}:`, error);
    return null;
  }
}
