import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as crypto from 'crypto';

try { admin.app(); } catch { admin.initializeApp(); }

const symposiumWebApiKey = defineSecret('SYMPOSIUM_WEB_API_KEY');

type RateLimitScope = 'login' | 'reset';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutDurationsMs: number[];
  lockWhenLimitReached: boolean;
}

interface RateLimitStatus {
  isLocked: boolean;
  attemptsRemaining: number;
  lockoutEndsAtMs: number | null;
  lockoutDurationMs: number;
  message?: string;
}

interface AttemptRecord {
  attempts?: number;
  lockoutCount?: number;
  lastAttemptAt?: unknown;
  lockedUntil?: unknown;
}

interface IdentityToolkitSignInResponse {
  idToken?: string;
  mfaPendingCredential?: string;
}

const LOGIN_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockWhenLimitReached: true,
  lockoutDurationsMs: [
    60 * 1000,
    5 * 60 * 1000,
    15 * 60 * 1000,
    60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  ],
};

const RESET_LIMIT: RateLimitConfig = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,
  lockWhenLimitReached: false,
  lockoutDurationsMs: [
    5 * 60 * 1000,
    30 * 60 * 1000,
    60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  ],
};

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'Email is required');
  }

  const email = value.trim().toLowerCase();
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'A valid email is required');
  }

  return email;
}

function normalizePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096) {
    throw new HttpsError('invalid-argument', 'Password is required');
  }

  return value;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function timestampToMillis(value: unknown): number | null {
  if (!value) {
    return null;
  }

  const candidate = value as { toMillis?: () => number; toDate?: () => Date };
  if (typeof candidate.toMillis === 'function') {
    return candidate.toMillis();
  }

  if (typeof candidate.toDate === 'function') {
    return candidate.toDate().getTime();
  }

  return null;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getClientFingerprint(request: { rawRequest?: { headers?: Record<string, string | string[] | undefined>; ip?: string } }): string {
  const headers = request.rawRequest?.headers ?? {};
  const forwardedFor = firstHeader(headers['x-forwarded-for']);
  const forwardedIp = forwardedFor?.split(',')[0]?.trim();
  const ip = firstHeader(headers['fastly-client-ip'])
    || firstHeader(headers['x-appengine-user-ip'])
    || request.rawRequest?.ip
    || forwardedIp
    || 'unknown';

  return sha256(ip);
}

function getAttemptDoc(scope: RateLimitScope, email: string, clientFingerprint?: string) {
  const db = getFirestore();
  const scopeKey = scope === 'login'
    ? `${scope}:${email}:${clientFingerprint ?? 'unknown'}`
    : `${scope}:${email}`;
  const docId = `${scope}_${sha256(scopeKey)}`;

  return {
    ref: db.collection('loginAttempts').doc(docId),
    emailHash: sha256(email),
    clientHash: clientFingerprint ?? null,
  };
}

function statusFromRecord(
  record: AttemptRecord | undefined,
  config: RateLimitConfig,
  nowMs: number
): RateLimitStatus {
  if (!record) {
    return {
      isLocked: false,
      attemptsRemaining: config.maxAttempts,
      lockoutEndsAtMs: null,
      lockoutDurationMs: 0,
    };
  }

  const lockedUntilMs = timestampToMillis(record.lockedUntil);
  if (lockedUntilMs && lockedUntilMs > nowMs) {
    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockoutEndsAtMs: lockedUntilMs,
      lockoutDurationMs: lockedUntilMs - nowMs,
      message: 'Too many attempts. Please try again later.',
    };
  }

  const lastAttemptMs = timestampToMillis(record.lastAttemptAt);
  const windowExpired = !lastAttemptMs || nowMs - lastAttemptMs > config.windowMs;
  const activeAttempts = windowExpired ? 0 : Math.max(0, Number(record.attempts ?? 0));

  return {
    isLocked: false,
    attemptsRemaining: Math.max(0, config.maxAttempts - activeAttempts),
    lockoutEndsAtMs: null,
    lockoutDurationMs: 0,
  };
}

async function getRateLimitStatus(
  scope: RateLimitScope,
  email: string,
  config: RateLimitConfig,
  clientFingerprint?: string
): Promise<RateLimitStatus> {
  const { ref } = getAttemptDoc(scope, email, clientFingerprint);
  const snapshot = await ref.get();

  return statusFromRecord(
    snapshot.exists ? snapshot.data() as AttemptRecord : undefined,
    config,
    Date.now()
  );
}

async function recordRateLimitedAttempt(
  scope: RateLimitScope,
  email: string,
  config: RateLimitConfig,
  clientFingerprint?: string
): Promise<RateLimitStatus> {
  const db = getFirestore();
  const { ref, emailHash, clientHash } = getAttemptDoc(scope, email, clientFingerprint);

  return db.runTransaction(async (transaction) => {
    const nowMs = Date.now();
    const snapshot = await transaction.get(ref);
    const record = snapshot.exists ? snapshot.data() as AttemptRecord : undefined;
    const currentStatus = statusFromRecord(record, config, nowMs);

    if (currentStatus.isLocked) {
      return currentStatus;
    }

    const lastAttemptMs = timestampToMillis(record?.lastAttemptAt);
    const windowExpired = !lastAttemptMs || nowMs - lastAttemptMs > config.windowMs;
    const previousAttempts = windowExpired ? 0 : Math.max(0, Number(record?.attempts ?? 0));
    const attempts = previousAttempts + 1;
    const previousLockoutCount = Math.max(0, Number(record?.lockoutCount ?? 0));

    const shouldLock = config.lockWhenLimitReached
      ? attempts >= config.maxAttempts
      : attempts > config.maxAttempts;

    if (shouldLock) {
      const lockoutCount = previousLockoutCount + 1;
      const lockoutDurationMs = config.lockoutDurationsMs[
        Math.min(lockoutCount - 1, config.lockoutDurationsMs.length - 1)
      ];
      const lockedUntilMs = nowMs + lockoutDurationMs;

      transaction.set(ref, {
        scope,
        emailHash,
        clientHash,
        attempts,
        lockoutCount,
        lastAttemptAt: Timestamp.fromMillis(nowMs),
        lockedUntil: Timestamp.fromMillis(lockedUntilMs),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return {
        isLocked: true,
        attemptsRemaining: 0,
        lockoutEndsAtMs: lockedUntilMs,
        lockoutDurationMs,
        message: 'Too many attempts. Please try again later.',
      };
    }

    transaction.set(ref, {
      scope,
      emailHash,
      clientHash,
      attempts,
      lockoutCount: previousLockoutCount,
      lastAttemptAt: Timestamp.fromMillis(nowMs),
      lockedUntil: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return {
      isLocked: false,
      attemptsRemaining: Math.max(0, config.maxAttempts - attempts),
      lockoutEndsAtMs: null,
      lockoutDurationMs: 0,
    };
  });
}

function identityToolkitApiKey(): string {
  const apiKey = symposiumWebApiKey.value();
  if (!apiKey) {
    throw new HttpsError('internal', 'Firebase Auth API key is not configured');
  }

  return apiKey;
}

function identityToolkitErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined;
  }

  const data = error.response?.data as { error?: { message?: string } } | undefined;
  return data?.error?.message;
}

function isInvalidPasswordAttempt(code: string | undefined): boolean {
  return code === 'INVALID_PASSWORD'
    || code === 'EMAIL_NOT_FOUND'
    || code === 'INVALID_LOGIN_CREDENTIALS'
    || code === 'INVALID_EMAIL';
}

async function verifyPasswordWithIdentityToolkit(email: string, password: string): Promise<'valid' | 'mfa-required' | 'invalid' | 'disabled' | 'throttled'> {
  try {
    const response = await axios.post<IdentityToolkitSignInResponse>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${identityToolkitApiKey()}`,
      {
        email,
        password,
        returnSecureToken: true,
      },
      {
        timeout: 10000,
      }
    );

    if (response.data.mfaPendingCredential) {
      return 'mfa-required';
    }

    return response.data.idToken ? 'valid' : 'invalid';
  } catch (error) {
    const code = identityToolkitErrorCode(error);
    if (isInvalidPasswordAttempt(code)) {
      return 'invalid';
    }

    if (code === 'USER_DISABLED') {
      return 'disabled';
    }

    if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
      return 'throttled';
    }

    if (code === 'MFA_REQUIRED') {
      return 'mfa-required';
    }

    console.error('Identity Toolkit sign-in check failed', { code });
    throw new HttpsError('internal', 'Unable to verify sign-in attempt');
  }
}

async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${identityToolkitApiKey()}`,
      {
        requestType: 'PASSWORD_RESET',
        email,
      },
      {
        timeout: 10000,
      }
    );
  } catch (error) {
    const code = identityToolkitErrorCode(error);

    if (code === 'EMAIL_NOT_FOUND' || code === 'INVALID_EMAIL') {
      return;
    }

    console.error('Identity Toolkit password reset failed', { code });
    throw new HttpsError('internal', 'Unable to send password reset email');
  }
}

export const checkLoginRateLimit = onCall(async (request): Promise<RateLimitStatus> => {
  const email = normalizeEmail(request.data?.email);
  const clientFingerprint = getClientFingerprint(request);

  return getRateLimitStatus('login', email, LOGIN_LIMIT, clientFingerprint);
});

export const verifyEmailPasswordSignIn = onCall(
  { secrets: [symposiumWebApiKey] },
  async (request): Promise<RateLimitStatus & { credentialAllowed: boolean; errorMessage?: string }> => {
    const email = normalizeEmail(request.data?.email);
    const password = normalizePassword(request.data?.password);
    const clientFingerprint = getClientFingerprint(request);
    const preAuthStatus = await getRateLimitStatus('login', email, LOGIN_LIMIT, clientFingerprint);

    if (preAuthStatus.isLocked) {
      return {
        ...preAuthStatus,
        credentialAllowed: false,
      };
    }

    const credentialStatus = await verifyPasswordWithIdentityToolkit(email, password);

    if (credentialStatus === 'valid' || credentialStatus === 'mfa-required') {
      return {
        ...preAuthStatus,
        credentialAllowed: true,
      };
    }

    if (credentialStatus === 'disabled') {
      return {
        ...preAuthStatus,
        credentialAllowed: false,
        errorMessage: 'This account has been disabled.',
      };
    }

    if (credentialStatus === 'throttled') {
      return {
        ...preAuthStatus,
        credentialAllowed: false,
        errorMessage: 'Too many attempts. Please try again later.',
      };
    }

    const failedStatus = await recordRateLimitedAttempt('login', email, LOGIN_LIMIT, clientFingerprint);
    return {
      ...failedStatus,
      credentialAllowed: false,
      errorMessage: failedStatus.message ?? 'Invalid email or password.',
    };
  }
);

export const clearLoginAttempts = onCall(async (request): Promise<{ success: true }> => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated to clear login attempts');
  }

  const email = normalizeEmail(request.data?.email);
  const authenticatedEmail = typeof request.auth.token.email === 'string'
    ? request.auth.token.email.trim().toLowerCase()
    : '';

  if (email !== authenticatedEmail) {
    throw new HttpsError('permission-denied', 'Cannot clear attempts for another account');
  }

  const clientFingerprint = getClientFingerprint(request);
  const { ref } = getAttemptDoc('login', email, clientFingerprint);
  await ref.delete();

  return { success: true };
});

export const checkPasswordResetRateLimit = onCall(async (request): Promise<RateLimitStatus> => {
  const email = normalizeEmail(request.data?.email);

  return getRateLimitStatus('reset', email, RESET_LIMIT);
});

export const requestPasswordResetEmail = onCall(
  { secrets: [symposiumWebApiKey] },
  async (request): Promise<RateLimitStatus & { emailSent: boolean }> => {
    const email = normalizeEmail(request.data?.email);
    const resetStatus = await recordRateLimitedAttempt('reset', email, RESET_LIMIT);

    if (resetStatus.isLocked) {
      return {
        ...resetStatus,
        emailSent: false,
      };
    }

    await sendPasswordResetEmail(email);

    return {
      ...resetStatus,
      emailSent: true,
    };
  }
);
