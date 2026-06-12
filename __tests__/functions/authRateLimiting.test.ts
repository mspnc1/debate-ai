const mockOnCall = jest.fn((optionsOrHandler: unknown, maybeHandler?: unknown) => (
  typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler
));

const mockAxiosPost = jest.fn();
const mockAxiosIsAxiosError = jest.fn((error: unknown) => (
  !!error && typeof error === 'object' && 'response' in error
));

const mockDocGet = jest.fn();
const mockDocDelete = jest.fn();
const mockDocRef = {
  get: mockDocGet,
  delete: mockDocDelete,
};
const mockDoc = jest.fn(() => mockDocRef);
const mockCollection = jest.fn(() => ({ doc: mockDoc }));
const mockTransactionGet = jest.fn();
const mockTransactionSet = jest.fn();
const mockTransaction = {
  get: mockTransactionGet,
  set: mockTransactionSet,
};
const mockRunTransaction = jest.fn(async (handler: (transaction: typeof mockTransaction) => Promise<unknown>) => (
  handler(mockTransaction)
));
const mockGetFirestore = jest.fn(() => ({
  collection: mockCollection,
  runTransaction: mockRunTransaction,
}));
const mockServerTimestamp = jest.fn(() => 'serverTimestamp');
const mockFieldDelete = jest.fn(() => 'fieldDelete');
const mockTimestampFromMillis = jest.fn((ms: number) => ({
  toMillis: () => ms,
  toDate: () => new Date(ms),
}));

jest.mock('firebase-functions/v2/https', () => ({
  onCall: mockOnCall,
  HttpsError: class HttpsError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'HttpsError';
    }
  },
}), { virtual: true });

jest.mock('firebase-admin', () => ({
  __esModule: true,
  initializeApp: jest.fn(),
  app: jest.fn(() => ({})),
}), { virtual: true });

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: mockGetFirestore,
  FieldValue: {
    serverTimestamp: mockServerTimestamp,
    delete: mockFieldDelete,
  },
  Timestamp: {
    fromMillis: mockTimestampFromMillis,
  },
}), { virtual: true });

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: mockAxiosPost,
    isAxiosError: mockAxiosIsAxiosError,
  },
}));

const {
  checkLoginRateLimit,
  verifyEmailPasswordSignIn,
  clearLoginAttempts,
  checkPasswordResetRateLimit,
  requestPasswordResetEmail,
} = require('../../functions/src/authRateLimiting') as typeof import('../../functions/src/authRateLimiting');
const registeredSecretOptions = mockOnCall.mock.calls
  .map(([optionsOrHandler]) => optionsOrHandler)
  .filter((optionsOrHandler) => (
    !!optionsOrHandler
    && typeof optionsOrHandler === 'object'
    && 'secrets' in optionsOrHandler
  ));

type CallableRequest = {
  data?: Record<string, unknown>;
  auth?: { uid: string; token: { email?: string } };
  rawRequest?: {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
  };
};

function request(data: Record<string, unknown>, auth?: CallableRequest['auth']): CallableRequest {
  return {
    data,
    auth,
    rawRequest: {
      headers: {
        'fastly-client-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.20, 198.51.100.21',
      },
      ip: '192.0.2.30',
    },
  };
}

function snapshot(data?: Record<string, unknown>) {
  return {
    exists: Boolean(data),
    data: () => data,
  };
}

function identityToolkitError(message: string) {
  return {
    response: {
      data: {
        error: { message },
      },
    },
  };
}

describe('auth rate limiting callables', () => {
  let dateNowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SYMPOSIUM_WEB_API_KEY = 'test-web-api-key';
    mockDocGet.mockResolvedValue(snapshot());
    mockDocDelete.mockResolvedValue(undefined);
    mockTransactionGet.mockResolvedValue(snapshot());
    mockRunTransaction.mockImplementation(async (handler) => handler(mockTransaction));
    mockAxiosPost.mockResolvedValue({ data: { idToken: 'id-token' } });
    mockAxiosIsAxiosError.mockImplementation((error: unknown) => (
      !!error && typeof error === 'object' && 'response' in error
    ));
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
    delete process.env.SYMPOSIUM_WEB_API_KEY;
  });

  it('binds the Identity Toolkit callables to the non-reserved web API key secret', () => {
    expect(registeredSecretOptions).toHaveLength(2);
    expect(registeredSecretOptions.map((optionsOrHandler) => (
      (optionsOrHandler as { secrets: Array<{ name: string }> }).secrets.map((secret) => secret.name)
    ))).toEqual([
      ['SYMPOSIUM_WEB_API_KEY'],
      ['SYMPOSIUM_WEB_API_KEY'],
    ]);
  });

  it('checks login rate limits from hashed server-owned Firestore docs', async () => {
    const result = await (checkLoginRateLimit as (req: CallableRequest) => Promise<unknown>)(
      request({ email: ' Test.User@Example.COM ' })
    ) as { isLocked: boolean; attemptsRemaining: number };

    expect(result).toMatchObject({
      isLocked: false,
      attemptsRemaining: 5,
    });
    expect(mockCollection).toHaveBeenCalledWith('loginAttempts');
    expect(mockDoc).toHaveBeenCalledWith(expect.stringMatching(/^login_[a-f0-9]{64}$/));
    expect(mockDoc.mock.calls[0][0]).not.toContain('test.user@example.com');
  });

  it('allows verified credentials without writing failed-attempt state', async () => {
    const result = await (verifyEmailPasswordSignIn as (req: CallableRequest) => Promise<unknown>)(
      request({ email: ' Test@Example.COM ', password: 'correct-password' })
    ) as { credentialAllowed: boolean; attemptsRemaining: number };

    expect(result).toMatchObject({
      credentialAllowed: true,
      attemptsRemaining: 5,
    });
    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test-web-api-key',
      {
        email: 'test@example.com',
        password: 'correct-password',
        returnSecureToken: true,
      },
      { timeout: 10000 }
    );
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('treats MFA-required password responses as verified credentials', async () => {
    mockAxiosPost.mockRejectedValueOnce(identityToolkitError('MFA_REQUIRED'));

    const result = await (verifyEmailPasswordSignIn as (req: CallableRequest) => Promise<unknown>)(
      request({ email: 'mfa@example.com', password: 'correct-password' })
    ) as { credentialAllowed: boolean };

    expect(result.credentialAllowed).toBe(true);
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('records invalid password attempts transactionally', async () => {
    mockAxiosPost.mockRejectedValueOnce(identityToolkitError('INVALID_PASSWORD'));

    const result = await (verifyEmailPasswordSignIn as (req: CallableRequest) => Promise<unknown>)(
      request({ email: 'failed@example.com', password: 'wrong-password' })
    ) as { credentialAllowed: boolean; isLocked: boolean; attemptsRemaining: number; errorMessage: string };

    expect(result).toMatchObject({
      credentialAllowed: false,
      isLocked: false,
      attemptsRemaining: 4,
      errorMessage: 'Invalid email or password.',
    });
    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockTransactionSet).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({
        scope: 'login',
        attempts: 1,
        lockoutCount: 0,
        lockedUntil: 'fieldDelete',
      }),
      { merge: true }
    );
    const [, storedData] = mockTransactionSet.mock.calls[0];
    expect(storedData.emailHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedData.clientHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedData.emailHash).not.toBe('failed@example.com');
  });

  it('locks on the fifth failed password attempt', async () => {
    const recentAttempt = mockTimestampFromMillis(1_699_999_990_000);
    const existingRecord = {
      attempts: 4,
      lockoutCount: 0,
      lastAttemptAt: recentAttempt,
      lockedUntil: null,
    };
    mockDocGet.mockResolvedValueOnce(snapshot(existingRecord));
    mockTransactionGet.mockResolvedValueOnce(snapshot(existingRecord));
    mockAxiosPost.mockRejectedValueOnce(identityToolkitError('INVALID_LOGIN_CREDENTIALS'));

    const result = await (verifyEmailPasswordSignIn as (req: CallableRequest) => Promise<unknown>)(
      request({ email: 'lock@example.com', password: 'wrong-password' })
    ) as { credentialAllowed: boolean; isLocked: boolean; lockoutDurationMs: number };

    expect(result).toMatchObject({
      credentialAllowed: false,
      isLocked: true,
      lockoutDurationMs: 60_000,
    });
    expect(mockTransactionSet).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({
        attempts: 5,
        lockoutCount: 1,
        lockedUntil: expect.objectContaining({
          toMillis: expect.any(Function),
        }),
      }),
      { merge: true }
    );
  });

  it('requires matching authenticated email before clearing login attempts', async () => {
    await expect(
      (clearLoginAttempts as (req: CallableRequest) => Promise<unknown>)(
        request(
          { email: 'victim@example.com' },
          { uid: 'user-1', token: { email: 'attacker@example.com' } }
        )
      )
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(mockDocDelete).not.toHaveBeenCalled();

    await expect(
      (clearLoginAttempts as (req: CallableRequest) => Promise<unknown>)(
        request(
          { email: ' User@Example.COM ' },
          { uid: 'user-1', token: { email: 'user@example.com' } }
        )
      )
    ).resolves.toEqual({ success: true });
    expect(mockDocDelete).toHaveBeenCalledTimes(1);
  });

  it('checks password reset limits using the reset scope', async () => {
    const recentAttempt = mockTimestampFromMillis(1_699_999_990_000);
    mockDocGet.mockResolvedValueOnce(snapshot({
      attempts: 2,
      lockoutCount: 0,
      lastAttemptAt: recentAttempt,
      lockedUntil: null,
    }));

    const result = await (checkPasswordResetRateLimit as (req: CallableRequest) => Promise<unknown>)(
      request({ email: 'reset@example.com' })
    ) as { isLocked: boolean; attemptsRemaining: number };

    expect(result).toMatchObject({
      isLocked: false,
      attemptsRemaining: 1,
    });
    expect(mockDoc).toHaveBeenCalledWith(expect.stringMatching(/^reset_[a-f0-9]{64}$/));
  });

  it('records reset attempts and sends reset email through Identity Toolkit', async () => {
    const result = await (requestPasswordResetEmail as (req: CallableRequest) => Promise<unknown>)(
      request({ email: ' Reset@Example.COM ' })
    ) as { isLocked: boolean; attemptsRemaining: number; emailSent: boolean };

    expect(result).toMatchObject({
      isLocked: false,
      attemptsRemaining: 2,
      emailSent: true,
    });
    expect(mockTransactionSet).toHaveBeenCalledWith(
      mockDocRef,
      expect.objectContaining({
        scope: 'reset',
        attempts: 1,
      }),
      { merge: true }
    );
    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=test-web-api-key',
      {
        requestType: 'PASSWORD_RESET',
        email: 'reset@example.com',
      },
      { timeout: 10000 }
    );
  });

  it('does not reveal missing accounts during password reset', async () => {
    mockAxiosPost.mockRejectedValueOnce(identityToolkitError('EMAIL_NOT_FOUND'));

    await expect(
      (requestPasswordResetEmail as (req: CallableRequest) => Promise<unknown>)(
        request({ email: 'missing@example.com' })
      )
    ).resolves.toMatchObject({
      isLocked: false,
      emailSent: true,
    });
  });

  it('allows three reset requests and locks the fourth', async () => {
    const recentAttempt = mockTimestampFromMillis(1_699_999_990_000);
    const existingRecord = {
      attempts: 3,
      lockoutCount: 0,
      lastAttemptAt: recentAttempt,
      lockedUntil: null,
    };
    mockTransactionGet.mockResolvedValueOnce(snapshot(existingRecord));

    const result = await (requestPasswordResetEmail as (req: CallableRequest) => Promise<unknown>)(
      request({ email: 'too-many-resets@example.com' })
    ) as { isLocked: boolean; lockoutDurationMs: number; emailSent: boolean };

    expect(result).toMatchObject({
      isLocked: true,
      lockoutDurationMs: 5 * 60 * 1000,
      emailSent: false,
    });
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  // Firestore rules assertions (loginAttempts lockdown, server-owned
  // entitlements) live in __tests__/security/firestoreRules.test.ts,
  // which is kept in sync with the consolidated ruleset.
});
