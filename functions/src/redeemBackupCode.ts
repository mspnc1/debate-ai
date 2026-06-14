import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { verifyAndConsumeBackupCode } from './backupCodes';

try { admin.app(); } catch { admin.initializeApp(); }

// Reuses the same Web API key used by authRateLimiting for password verification.
const symposiumWebApiKey = defineSecret('SYMPOSIUM_WEB_API_KEY');
// Google OAuth 2.0 Web client ID (the audience of Google sign-in id_tokens).
const googleOAuthClientId = defineSecret('GOOGLE_OAUTH_CLIENT_ID');
// Apple Services ID (audience of Apple id_tokens), e.g. com.braveheartinnovations.debateai.signin
const appleServiceId = defineSecret('APPLE_SERVICE_ID');

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/**
 * Confirm the password is correct without completing sign-in. A 200 from
 * accounts:signInWithPassword means valid (whether or not it returns an idToken
 * vs an mfaPendingCredential); any error means the password is wrong.
 */
async function uidFromPassword(email: string, password: string): Promise<string> {
  const apiKey = symposiumWebApiKey.value();
  if (!apiKey) throw new HttpsError('internal', 'Auth API key is not configured');

  try {
    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      { email, password, returnSecureToken: true },
      { timeout: 10000 }
    );
  } catch {
    throw new HttpsError('permission-denied', 'Invalid email or password');
  }

  const user = await admin.auth().getUserByEmail(email).catch(() => null);
  if (!user) throw new HttpsError('not-found', 'No account found for this email');
  return user.uid;
}

async function uidFromGoogle(idToken: string): Promise<string> {
  const clientId = googleOAuthClientId.value();
  if (!clientId) throw new HttpsError('internal', 'Google client ID is not configured');

  let sub: string | undefined;
  let email: string | undefined;
  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    sub = payload?.sub;
    email = payload?.email ?? undefined;
  } catch {
    throw new HttpsError('permission-denied', 'Invalid Google credential');
  }
  if (!sub) throw new HttpsError('permission-denied', 'Invalid Google credential');
  return resolveUid('google.com', sub, email);
}

async function uidFromApple(idToken: string): Promise<string> {
  const serviceId = appleServiceId.value();
  if (!serviceId) throw new HttpsError('internal', 'Apple service ID is not configured');

  let sub: string | undefined;
  let email: string | undefined;
  try {
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: serviceId,
    });
    sub = typeof payload.sub === 'string' ? payload.sub : undefined;
    email = typeof payload.email === 'string' ? payload.email : undefined;
  } catch {
    throw new HttpsError('permission-denied', 'Invalid Apple credential');
  }
  if (!sub) throw new HttpsError('permission-denied', 'Invalid Apple credential');
  return resolveUid('apple.com', sub, email);
}

async function resolveUid(providerId: string, providerUid: string, email?: string): Promise<string> {
  const byProvider = await admin.auth().getUserByProviderUid(providerId, providerUid).catch(() => null);
  if (byProvider) return byProvider.uid;

  if (email) {
    const byEmail = await admin.auth().getUserByEmail(email).catch(() => null);
    if (byEmail) return byEmail.uid;
  }
  throw new HttpsError('not-found', 'No account found for this credential');
}

interface RedeemRequest {
  method?: 'password' | 'google' | 'apple';
  code?: string;
  email?: string;
  password?: string;
  idToken?: string;
}

/**
 * redeemBackupCode (unauthenticated — the user can't complete 2FA).
 *
 * Verifies the first factor, consumes a one-time backup code, and returns a
 * Firebase custom token. The client signs in with signInWithCustomToken, which
 * legitimately bypasses the second factor for this single sign-in.
 */
export const redeemBackupCode = onCall(
  { secrets: [symposiumWebApiKey, googleOAuthClientId, appleServiceId] },
  async (request): Promise<{ token: string }> => {
    const { method, code, email, password, idToken } = (request.data ?? {}) as RedeemRequest;

    if (!code || typeof code !== 'string') {
      throw new HttpsError('invalid-argument', 'A backup code is required');
    }

    let uid: string;
    if (method === 'password') {
      if (!email || !password) {
        throw new HttpsError('invalid-argument', 'Email and password are required');
      }
      uid = await uidFromPassword(email, password);
    } else if (method === 'google') {
      if (!idToken) throw new HttpsError('invalid-argument', 'Google credential is required');
      uid = await uidFromGoogle(idToken);
    } else if (method === 'apple') {
      if (!idToken) throw new HttpsError('invalid-argument', 'Apple credential is required');
      uid = await uidFromApple(idToken);
    } else {
      throw new HttpsError('invalid-argument', 'Unsupported sign-in method');
    }

    const consumed = await verifyAndConsumeBackupCode(uid, code);
    if (!consumed) {
      throw new HttpsError('permission-denied', 'Invalid or already-used backup code');
    }

    const token = await admin.auth().createCustomToken(uid);
    return { token };
  }
);
