# Purchase Testing Runbook

This runbook separates two things that kept getting mixed together:

- Firebase entitlement state: `users/{uid}`, `trialHistory/{uid}`, and `purchase_errors`.
- Google Play ownership state: the subscription or purchase token owned by the Google account that Play Billing chooses on the device.

Resetting Firebase does not reset Google Play ownership. If the Play Store account still owns an unexpired subscription, purchase attempts can restore or block before `validatePurchase` is called.

## Tools

Use these from the repo root:

```bash
npm run purchase:test:inspect -- --uid FIREBASE_UID
npm run purchase:test:repair-trial -- --uid FIREBASE_UID --confirm FIREBASE_UID
npm run purchase:test:reset-entitlement -- --uid FIREBASE_UID --confirm FIREBASE_UID
npm run purchase:test:reset-trial -- --uid FIREBASE_UID --confirm FIREBASE_UID --confirm-delete-trial-history
npm run purchase:test:capture-android -- --clear
```

Pass `--email tester@example.com` when testing trial reuse after deleting and recreating Firebase users. The backend tracks prior trials by UID and by email hash; without an email, the script can only inspect or delete the UID ledger.

## Test Scenarios

### Fresh Trial

Use this only for license-test accounts.

```bash
npm run purchase:test:reset-trial -- --uid FIREBASE_UID --email TESTER_EMAIL --confirm FIREBASE_UID --confirm-delete-trial-history
```

Expected state:

- `users/{uid}.membershipStatus` is `demo`.
- `users/{uid}.hasUsedTrial` is `false`.
- matching `trialHistory` docs are deleted.
- app can show the free-trial offer.

Store-side setup:

- Use a Google Play license tester account.
- In Play Billing Lab, enable trial or introductory-offer testing for the same billing account before launching the purchase flow.
- Google says Play Billing Lab trial-offer testing lets a license tester reuse free trial or intro offers without creating more accounts: <https://developer.android.com/google/play/billing/test#trial-offers>

### Trial-Used Paid Purchase

This is the regression-sensitive path for users whose trial already ended or was cancelled.

```bash
npm run purchase:test:reset-entitlement -- --uid FIREBASE_UID --email TESTER_EMAIL --confirm FIREBASE_UID
```

Expected state:

- `users/{uid}.membershipStatus` is `demo`.
- `hasUsedTrial` remains `true` if any matching `trialHistory` exists.
- app should not show "Start free trial".
- monthly and annual subscription purchase should launch the paid base plan/offer path, not another free trial.

### Active Or Unexpired Store Subscription

If Play Store still has an unexpired subscription for the same account/SKU, do not expect a clean new purchase. Test restore instead.

Expected behavior:

- restore should sync the existing entitlement if the app account matches the store purchase owner;
- restore should block cross-account transfer when the purchase belongs to another Firebase account;
- a purchase attempt may fail before the backend callable if Play Billing returns ownership or account errors.

Google Play documents that cancelled subscriptions can remain active until the end of their paid/trial period, and free trials remain active until the trial end if cancelled mid-trial: <https://developer.android.com/google/play/billing/subscriptions#promote>

## Evidence Capture

Before a purchase attempt that might fail:

```bash
npm run purchase:test:capture-android -- --clear
```

The script clears logcat, waits for you to reproduce the issue, then writes evidence under `.purchase-test-runs/<timestamp>/`.

Start with these files:

- `package-summary.txt`: installed build, installer, and update times.
- `billing-logcat.txt`: Play Billing, Store, Firestore, OTA, and relevant auth/network errors.
- `app-logcat.txt`: app-process logs.
- `validatePurchase.log`: Firebase callable logs.
- `handlePlayStoreNotification.log`: RTDN handler logs.

Interpretation:

- If billing logs show the purchase modal returned an error and `validatePurchase.log` has no new invocation, the failure is pre-backend.
- If `validatePurchase` logs an `invalid-argument` or Google API error, the app reached the backend and the token/product pair needs inspection.
- If Firestore or Play API network errors appear in device logs, repeat after confirming device connectivity and Play Store account state.

## Pre-Submission Matrix

Run this matrix before a Play submission or purchase-flow OTA:

| Scenario | Firebase setup | Store setup | Expected |
| --- | --- | --- | --- |
| Monthly fresh trial | `reset-trial` | Play Billing Lab trial enabled | `trial`, `hasUsedTrial=true`, no charge yet |
| Annual fresh trial | `reset-trial` | Play Billing Lab trial enabled | `trial`, `hasUsedTrial=true`, no charge yet |
| Monthly paid after trial | `reset-entitlement` with trial history | no active same-SKU ownership | paid purchase, no trial copy |
| Annual paid after trial | `reset-entitlement` with trial history | no active same-SKU ownership | paid purchase, no trial copy |
| Lifetime | `reset-entitlement` | no active lifetime ownership | `premium`, `isLifetime=true` |
| Restore same account | leave active store purchase | same app/Firebase owner | restores entitlement |
| Restore different account | leave active store purchase | different Firebase owner | blocks transfer |
| Cancel during trial | active trial then cancel in Play | wait for accelerated expiry | access until trial end, no premium after expiry without paid renewal |

Google recommends license testers and Play Billing Lab for development billing scenarios, and warns that the billing account on devices with multiple Google accounts depends on which account downloaded the app: <https://developer.android.com/google/play/billing/test#license-testers>
