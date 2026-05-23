// Use mocks from jest.setup.ts and override as needed
import {
  getAuth,
  signInWithEmailAndPassword as mockSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as mockCreateUserWithEmailAndPassword,
  signOut as mockSignOut,
  onAuthStateChanged as mockOnAuthStateChanged,
  signInWithCredential as mockSignInWithCredential,
  getIdToken as mockFirebaseGetIdToken,
  updateProfile as mockUpdateProfile,
  GoogleAuthProvider,
  AppleAuthProvider,
} from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from '@react-native-firebase/firestore';

const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Create typed mock references
const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockAuthState = { currentUser: null as { uid: string } | null };

// Set up mockGetAuth to return mockAuthState
mockGetAuth.mockReturnValue(mockAuthState as never);

const mockAuthModule = {
  getAuth: mockGetAuth,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword as jest.MockedFunction<typeof mockSignInWithEmailAndPassword>,
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword as jest.MockedFunction<typeof mockCreateUserWithEmailAndPassword>,
  signOut: mockSignOut as jest.MockedFunction<typeof mockSignOut>,
  onAuthStateChanged: mockOnAuthStateChanged as jest.MockedFunction<typeof mockOnAuthStateChanged>,
  signInWithCredential: mockSignInWithCredential as jest.MockedFunction<typeof mockSignInWithCredential>,
  getIdToken: mockFirebaseGetIdToken as jest.MockedFunction<typeof mockFirebaseGetIdToken>,
  updateProfile: mockUpdateProfile as jest.MockedFunction<typeof mockUpdateProfile>,
  GoogleAuthProvider,
  AppleAuthProvider,
};

const mockFunctionsModule = {
  getFunctions: getFunctions as jest.MockedFunction<typeof getFunctions>,
  httpsCallable: httpsCallable as jest.MockedFunction<typeof httpsCallable>,
};

const mockCallables: Record<string, jest.Mock> = {
  verifyEmailPasswordSignIn: jest.fn(),
  clearLoginAttempts: jest.fn(),
  requestPasswordResetEmail: jest.fn(),
};

const mockFirestoreModule = {
  getFirestore: getFirestore as jest.MockedFunction<typeof getFirestore>,
  collection: collection as jest.MockedFunction<typeof collection>,
  doc: doc as jest.MockedFunction<typeof doc>,
  getDoc: getDoc as jest.MockedFunction<typeof getDoc>,
  setDoc: setDoc as jest.MockedFunction<typeof setDoc>,
  onSnapshot: onSnapshot as jest.MockedFunction<typeof onSnapshot>,
  serverTimestamp: serverTimestamp as jest.MockedFunction<typeof serverTimestamp>,
};

// Setup collection and doc to return objects that can be chained
(mockFirestoreModule.collection as jest.MockedFunction<typeof collection>).mockImplementation(
  (db, name) => ({ db, name } as never)
);
(mockFirestoreModule.doc as jest.MockedFunction<typeof doc>).mockImplementation(
  (col, id) => ({ col, id } as never)
);

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: {
    EMAIL: 'email',
    FULL_NAME: 'full_name',
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({})),
    getTokens: jest.fn(async () => ({ idToken: 'token' })),
    getCurrentUser: jest.fn(async () => ({ user: { email: 'user@example.com', name: 'User Name', photo: 'photo.png' } })),
  },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  actual.Platform.OS = 'ios';
  return actual;
});

const originalEnv = { ...process.env };

// Import mocked modules
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Cast to mocked types
const mockAppleAuthModule = AppleAuthentication as jest.Mocked<typeof AppleAuthentication>;
const mockGoogleSignin = GoogleSignin as jest.Mocked<typeof GoogleSignin>;

import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  getIdToken,
  onAuthStateChanged,
  checkPremiumAccess,
  configureGoogleSignIn,
  signInWithApple,
  signInWithGoogle,
  sendPasswordResetEmail,
} from '@/services/firebase/auth';

import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

const mockCryptoModule = Crypto as jest.Mocked<typeof Crypto>;

const resetMocks = () => {
  jest.clearAllMocks();
  // Reset env vars individually instead of replacing process.env
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('EXPO_PUBLIC_')) {
      delete process.env[key];
    }
  });
  Object.keys(originalEnv).forEach(key => {
    if (key.startsWith('EXPO_PUBLIC_') && originalEnv[key]) {
      process.env[key] = originalEnv[key];
    }
  });
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client';
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client';
  mockAuthState.currentUser = null;
  mockGoogleSignin.configure.mockImplementation(() => {});
  mockGoogleSignin.hasPlayServices.mockImplementation(async () => true);
  mockGoogleSignin.signIn.mockImplementation(async () => ({}));
  mockGoogleSignin.getTokens.mockImplementation(async () => ({ idToken: 'token' }));
  mockGoogleSignin.getCurrentUser.mockImplementation(async () => ({
    user: { email: 'user@example.com', name: 'User Name', photo: 'photo.png' },
  }));
  mockAppleAuthModule.isAvailableAsync.mockImplementation(async () => true);
  mockCryptoModule.getRandomBytes.mockImplementation((byteCount: number) => (
    Uint8Array.from({ length: byteCount }, (_, index) => index % 256)
  ));
  mockCryptoModule.digestStringAsync.mockResolvedValue('hashed-nonce');
  mockAppleAuthModule.signInAsync.mockReset();
  mockAppleAuthModule.signInAsync.mockImplementation(async (options?: { state?: string }) => ({
    identityToken: 'token',
    email: 'apple@example.com',
    fullName: { givenName: 'Apple', familyName: 'User' },
    state: options?.state,
  }));
  mockFirestoreModule.onSnapshot.mockImplementation(() => jest.fn());
  mockFunctionsModule.getFunctions.mockReturnValue({} as never);
  mockFunctionsModule.httpsCallable.mockImplementation((_functions, name) => {
    const callable = mockCallables[String(name)];
    if (!callable) {
      throw new Error(`Unexpected callable: ${String(name)}`);
    }
    return callable as never;
  });
  mockCallables.verifyEmailPasswordSignIn.mockResolvedValue({ data: { credentialAllowed: true } });
  mockCallables.clearLoginAttempts.mockResolvedValue({ data: { success: true } });
  mockCallables.requestPasswordResetEmail.mockResolvedValue({ data: { emailSent: true } });
};

const setUser = (uid: string | null) => {
  mockAuthState.currentUser = uid ? { uid } : null;
};

const setDocData = (data?: Partial<Record<string, unknown>>) => {
  mockFirestoreModule.getDoc.mockResolvedValue({
    exists: () => (data !== undefined),
    data: () => data,
  });
};

describe('firebase auth service', () => {
  beforeEach(resetMocks);

  afterAll(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('handles email sign-in success and specific errors', async () => {
    const user = { uid: 'user' };
    mockAuthModule.signInWithEmailAndPassword.mockResolvedValue({ user });
    await expect(signInWithEmail('user@example.com', 'pw')).resolves.toBe(user);
    expect(mockCallables.verifyEmailPasswordSignIn).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'pw',
    });
    expect(mockCallables.clearLoginAttempts).toHaveBeenCalledWith({ email: 'user@example.com' });

    mockAuthModule.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/user-not-found' });
    await expect(signInWithEmail('missing@example.com', 'pw')).rejects.toThrow('No account found');

    mockAuthModule.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/wrong-password' });
    await expect(signInWithEmail('user@example.com', 'bad')).rejects.toThrow('Invalid email or password');
  });

  it('blocks direct email sign-in when the auth callable rejects credentials', async () => {
    mockCallables.verifyEmailPasswordSignIn.mockResolvedValueOnce({
      data: {
        credentialAllowed: false,
        errorMessage: 'Too many attempts. Please try again later.',
      },
    });

    await expect(signInWithEmail('user@example.com', 'bad')).rejects.toThrow('Too many attempts');
    expect(mockAuthModule.signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('creates user on signup and writes Firestore doc', async () => {
    const user = { uid: 'new', email: 'new@example.com' };
    mockAuthModule.createUserWithEmailAndPassword.mockResolvedValue({ user });
    mockFirestoreModule.setDoc.mockResolvedValue(undefined);
    await expect(signUpWithEmail('new@example.com', 'secretpw')).resolves.toBe(user);
    expect(mockFirestoreModule.setDoc).toHaveBeenCalled();
    const [, userDoc] = mockFirestoreModule.setDoc.mock.calls[0];
    expect(userDoc).toEqual(expect.objectContaining({
      email: 'new@example.com',
      preferences: {},
    }));
    expect(userDoc).not.toHaveProperty('membershipStatus');
    expect(userDoc).not.toHaveProperty('isPremium');

    mockAuthModule.createUserWithEmailAndPassword.mockRejectedValue({ code: 'auth/email-already-in-use' });
    await expect(signUpWithEmail('new@example.com', 'secretpw')).rejects.toThrow('Email is already in use');
  });

  it('signs out and forwards errors', async () => {
    mockAuthModule.signOut.mockResolvedValue(undefined);
    await expect(signOut()).resolves.toBeUndefined();
    mockAuthModule.signOut.mockRejectedValue(new Error('fail'));
    await expect(signOut()).rejects.toThrow('fail');
  });

  it('returns current user and ID tokens', async () => {
    setUser('user');
    expect(getCurrentUser()).toEqual({ uid: 'user' });

    mockAuthModule.getIdToken.mockResolvedValue('token');
    await expect(getIdToken()).resolves.toBe('token');

    setUser(null);
    await expect(getIdToken()).resolves.toBeNull();

    setUser('user');
    mockAuthModule.getIdToken.mockRejectedValue(new Error('boom'));
    await expect(getIdToken()).resolves.toBeNull();
  });

  it('proxies auth state change listener', () => {
    const unsub = jest.fn();
    mockAuthModule.onAuthStateChanged.mockReturnValue(unsub);
    const callback = jest.fn();
    const result = onAuthStateChanged(callback);
    expect(mockAuthModule.onAuthStateChanged).toHaveBeenCalledWith(mockAuthState, callback);
    expect(result).toBe(unsub);
  });

  it('checks premium access via Firestore', async () => {
    setUser('user');
    setDocData(undefined);
    await expect(checkPremiumAccess()).resolves.toBe(false);

    setDocData({ isPremium: true });
    await expect(checkPremiumAccess()).resolves.toBe(true);

    mockFirestoreModule.getDoc.mockRejectedValueOnce(new Error('firestore error'));
    await expect(checkPremiumAccess()).resolves.toBe(false);
  });

  it('configures Google Sign-In using env vars', () => {
    configureGoogleSignIn();
    expect(mockGoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'web-client',
      offlineAccess: true,
      iosClientId: 'ios-client',
    });

    Platform.OS = 'android';
    configureGoogleSignIn();
    expect(mockGoogleSignin.configure).toHaveBeenLastCalledWith({
      webClientId: 'web-client',
      offlineAccess: true,
    });
    Platform.OS = 'ios';
  });

  it('configures Google Sign-In with checked-in client ID fallbacks when OTA env vars are missing', () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

    configureGoogleSignIn();
    expect(mockGoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: '248794683640-45l77l2un600prqlqnqslv54fqhnpclq.apps.googleusercontent.com',
      offlineAccess: true,
      iosClientId: '248794683640-7su8cmoma5rvtg1hbmtsohmbec4qrc4p.apps.googleusercontent.com',
    });

    Platform.OS = 'android';
    configureGoogleSignIn();
    expect(mockGoogleSignin.configure).toHaveBeenLastCalledWith({
      webClientId: '248794683640-45l77l2un600prqlqnqslv54fqhnpclq.apps.googleusercontent.com',
      offlineAccess: true,
    });
    Platform.OS = 'ios';
  });

  it('signs in with Apple successfully on iOS', async () => {
    Platform.OS = 'ios';
    setUser(null);
    setDocData({ displayName: 'Existing', createdAt: { toDate: () => new Date() }, membershipStatus: 'free' });
    mockAppleAuthModule.signInAsync.mockImplementation(async (options?: { state?: string }) => ({
      identityToken: 'token',
      email: 'apple@example.com',
      fullName: { givenName: 'Apple', familyName: 'User' },
      state: options?.state,
    }));
    mockAuthModule.signInWithCredential.mockResolvedValue({ user: { uid: 'appleUser', displayName: null } });

    const result = await signInWithApple();
    expect(mockAppleAuthModule.signInAsync).toHaveBeenCalledWith(expect.objectContaining({
      nonce: 'hashed-nonce',
      state: expect.any(String),
    }));
    expect(mockAuthModule.AppleAuthProvider.credential).toHaveBeenCalledWith(
      'token',
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
    );
    expect(mockAuthModule.signInWithCredential).toHaveBeenCalled();
    expect(result.user.uid).toBe('appleUser');
    // The implementation uses existing Firestore doc displayName if available
    expect(result.profile.displayName).toBe('Existing');
  });

  it('throws when Apple Sign-In unavailable or cancelled', async () => {
    Platform.OS = 'ios';
    mockAppleAuthModule.isAvailableAsync.mockResolvedValue(false);
    await expect(signInWithApple()).rejects.toThrow();

    // Test user cancellation
    mockAppleAuthModule.isAvailableAsync.mockResolvedValue(true);
    mockAppleAuthModule.signInAsync.mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' });
    await expect(signInWithApple()).rejects.toThrow('User cancelled');
  });

  it('signs in with Google and builds profile', async () => {
    Platform.OS = 'android';
    setUser(null);
    setDocData(undefined);
    mockAuthModule.signInWithCredential.mockResolvedValue({ user: { uid: 'googleUser', email: null, displayName: null, photoURL: null } });
    mockFirestoreModule.setDoc.mockResolvedValue(undefined);

    const result = await signInWithGoogle();
    expect(mockGoogleSignin.configure).toHaveBeenCalled();
    expect(mockAuthModule.signInWithCredential).toHaveBeenCalled();
    expect(result.profile.displayName).toBe('User Name');
  });

  it('handles Google Sign-In configuration errors', async () => {
    mockGoogleSignin.configure.mockImplementation(() => {
      throw { code: 'DEVELOPER_ERROR' };
    });
    await expect(signInWithGoogle()).rejects.toThrow('google sign-in failed');
    mockGoogleSignin.configure.mockImplementation(() => {});
  });

  describe('sendPasswordResetEmail', () => {
    it('sends password reset email through the rate-limited callable', async () => {
      await expect(sendPasswordResetEmail('user@example.com')).resolves.toBeUndefined();
      expect(mockCallables.requestPasswordResetEmail).toHaveBeenCalledWith({ email: 'user@example.com' });
    });

    it('surfaces password reset rate-limit failures', async () => {
      mockCallables.requestPasswordResetEmail.mockResolvedValueOnce({
        data: {
          emailSent: false,
          message: 'Too many reset requests. Please try again later.',
        },
      });

      await expect(sendPasswordResetEmail('user@example.com')).rejects.toThrow('Too many reset requests');
    });
  });
});
