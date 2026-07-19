import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck } from '@react-native-firebase/app-check';

let appCheckInitialized = false;

/**
 * Initialize Firebase App Check so the app attaches attestation tokens to its
 * Firebase requests (Firestore, Auth, Functions, Storage).
 *
 * Attestation providers are already registered in the Firebase console:
 *   iOS     → App Attest (with DeviceCheck fallback)
 *   Android → Play Integrity
 *
 * SAFETY: App Check enforcement is currently OFF (Firestore/Auth = Monitoring,
 * Storage/Functions = Unenforced). Initializing here only makes requests
 * *verifiable* — it cannot break the app. Do NOT switch any product to
 * "Enforced", and do NOT add `enforceAppCheck` to callable functions, until the
 * console shows a healthy verified-request percentage across the app versions
 * actually in the field (older builds without this code send no token). See
 * docs/APP_CHECK.md for the rollout checklist.
 *
 * DEV: App Attest / Play Integrity do not work on simulators/emulators, so we
 * use the 'debug' provider under __DEV__. On first run the native console prints
 * a debug token — register it under Firebase console → App Check → Apps →
 * (app) → Manage debug tokens. A fixed token can be pinned via
 * EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN.
 */
export const initializeFirebaseAppCheck = async (): Promise<void> => {
  if (appCheckInitialized) return;

  try {
    const debugToken = __DEV__
      ? process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN || undefined
      : undefined;

    // The modular API accepts a plain provider-config object (no class needed).
    await initializeAppCheck(getApp(), {
      provider: {
        providerOptions: {
          apple: {
            provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
            debugToken,
          },
          android: {
            provider: __DEV__ ? 'debug' : 'playIntegrity',
            debugToken,
          },
        },
      },
      isTokenAutoRefreshEnabled: true,
    });

    appCheckInitialized = true;
    if (__DEV__) {
      console.warn('Firebase App Check initialized (debug provider in dev)');
    }
  } catch (error) {
    // App Check must never block startup. While enforcement is off, a failure
    // here only means requests go out unverified — exactly as before this code.
    console.error('Firebase App Check initialization failed (continuing):', error);
  }
};
