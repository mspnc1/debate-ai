# Firebase App Check — Setup & Rollout

Project: `symposium-ai` (#248794683640)

## Current state

| Piece | Status |
| --- | --- |
| iOS attestation provider (App Attest + DeviceCheck) | ✅ Registered in console |
| Android attestation provider (Play Integrity) | ✅ Registered in console |
| Web attestation provider (reCAPTCHA v3) | ❌ Web app not registered |
| Mobile client init (`initializeAppCheck`) | ✅ Added — `src/services/firebase/appCheck.ts` |
| Web client init (`initializeAppCheck`) | ✅ Added, gated on env var — `src/lib/firebase/index.ts` (web repo) |
| Firestore / Auth enforcement | 🟡 **Monitoring** (0% verified) |
| Storage / Functions enforcement | 🔓 **Unenforced** |

Before this change the providers were registered but **no client sent tokens**, so
the console showed **0% verified / 100% unverified** and nothing could be safely
enforced. The client init added here is what makes requests *verifiable*. It does
**not** change enforcement, so it cannot break the apps.

## Activation checklist

### Mobile (this repo)
1. `@react-native-firebase/app-check@23.8.6` is in `package.json`; run `npm install`.
2. Rebuild the native app (EAS prebuilds automatically): `npx expo prebuild --clean` then a dev build. The `@react-native-firebase/app-check` config plugin (added to `app.json`) patches the iOS AppDelegate.
3. **Simulators/emulators can't attest** — the app uses the `debug` provider under `__DEV__`. On first run the native console prints an App Check debug token; register it under **Firebase console → App Check → Apps → (app) → Manage debug tokens**. You can pin a fixed token with `EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN`.
4. Run on a **real device** (TestFlight / internal track) to exercise real App Attest / Play Integrity.

### Web (symposium-ai-web repo)
1. Register the **Web App** in **Firebase console → App Check** with **reCAPTCHA v3** — this generates a reCAPTCHA v3 site key.
2. Set `NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY` (until set, the web init is a no-op and the site is unaffected).
3. For local dev, set `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` and register it under Manage debug tokens.

## Enforcement rollout (do NOT skip the wait)

App Check is a **staged** rollout. Enforcing before real traffic is verified will
lock out every user — including everyone still on an app version that predates the
client init above.

1. Ship the client init to production (mobile + web). Leave everything in **Monitoring**.
2. Watch **Firebase console → App Check → APIs**. Wait until **verified requests** for
   Firestore/Auth climb to a high, stable percentage (accounting for the slow tail of
   users updating to the new build — typically weeks).
3. Only then switch **Cloud Firestore** and **Storage** to **Enforced**.
4. For **Cloud Functions** there is no console toggle — enforcement is code-side. Add
   `enforceAppCheck: true` to the sensitive callables (`executeTool`, `proxyAIRequest`,
   `proxyImageGeneration`, `proxyMediaGeneration`, the email/report endpoints) and the
   streaming HTTP functions must verify the App Check header manually. Do this only
   after step 2, and note old app versions without tokens will be rejected — so gate it
   on the same verified-traffic signal.

Until step 3/4, App Check is registered and observing but not blocking anything.
