# Dependency Upgrade Plan
## Remaining Dependabot Work — Symposium AI

*Last Updated: 2026-07-19*

This document captures the plan for the **parked** Dependabot PRs after the July 2026
security remediation. It exists so the analysis context isn't lost: each item below has
already been triaged (usage located, breaking changes assessed, risk rated). None of the
parked items is security-driven — **there are 0 open Dependabot security alerts.** Sequence
by risk/value, not urgency.

---

## Already Done (for context)

- ✅ **websocket-driver → 0.7.5** (#119) — pinned via `overrides` in root + `functions/`.
  Closed 4 alerts (2 critical, 2 medium). Patched functions **already live** (auto-deployed).
- ✅ **Tier 1 merged** (#98, #100, #101, #114, #118, #108) — dev-tooling minors, a functions
  patch, and CI-action bumps. All rebased + green before merge.
- ✅ **marked 17→18** (#105) — verified safe (`parse(md, {async:false})` still returns a
  string; only cosmetic v18 change is trailing-blank-line trimming). Merged.

---

## Key Ground Rules (why these are handled carefully)

1. **Functions deps auto-deploy to production on merge.** The `deploy-functions` workflow
   deploys on any push to `master` touching `functions/**`. So a functions dependency PR is a
   **production deploy** — it must pass `npm run check:functions` (build + lint + test) on a
   rebased branch **and** have its affected flow manually exercised before merge.
2. **`functions/` is CommonJS on Node 22.** ESM-only packages load via Node 22's `require(ESM)`
   (proven: `marked@17` is ESM-only and runs in prod). New ESM-only majors are *probably* fine
   but not free — verify, don't assume.
3. **No security urgency.** Everything below is "stay current." Prioritize by blast radius.
4. **Mobile group upgrades are a release-timing decision** (see Tier 4). Keep them out of a
   release candidate that's mid-submission.
5. **Stale PRs need `@dependabot rebase` first** — they branched from a pre-fix `master`, so
   they carry a stale (now-fixed) `dependency-scan` failure until rebased.

---

## Tier 2 — Backend majors (deliberate, separately tested)

Do these in a **focused backend session**, one at a time, each: rebase → `check:functions`
green → manually exercise the flow → merge (which deploys). Low urgency.

| PR | Bump | Where used | Risk | Notes / migration |
|----|------|-----------|------|-------------------|
| #104 | jose 5.9.3 → 6.x | `appleAuthCallback.ts` (`SignJWT`, `importPKCS8` — Sign-in-with-Apple client secret), `redeemBackupCode.ts` (`createRemoteJWKSet`, `jwtVerify`) | **Med — auth-critical** | v6 is **ESM-only** (v5 was dual) and switches jose's crypto backend to **Web Crypto**. APIs used are stable across the major. Verify `require(ESM)` loads under the functions build; then exercise **both** Sign-in-with-Apple and backup-code redemption. Only `appleAuthCallback` has a test; add a manual check for `redeemBackupCode`. |
| #102 | @apple/app-store-server-library 2.0.0 → 3.1.0 | `notifications/appStore.ts` (`SignedDataVerifier` 5-arg ctor, `Environment`, `ResponseBodyV2DecodedPayload`, `JWSTransactionDecodedPayload`, `OfferType`) | **High — revenue-critical, no test** | CommonJS (no module issue). Verifies **App Store Server Notifications V2** (subscription renew/cancel/refund). A silent break desyncs premium entitlements. **No test coverage on `appStore.ts`.** Check the v3 migration notes for constructor/enum changes, then validate against a **real or sample signed notification** before merge. Consider adding a regression test as part of this work. |

## Tier 3 — Rebase-first, then review

| PR | Bump | Status | Notes |
|----|------|--------|-------|
| #103 | dompurify + @types/dompurify (functions) | `CONFLICTING` | Needs `@dependabot rebase` to clear the merge conflict. Then **grep the usage sites** (HTML sanitization path) and confirm the API/`sanitize()` options are unchanged before merge. Backend deploy — same `check:functions` + flow-exercise gate. |

## Tier 4 — Big / disruptive (schedule as their own cycles)

| PR | Bump | Status | Plan |
|----|------|--------|------|
| #99 | jest + @types/jest (major) | `quality-check` fails | Dev-only (no prod/runtime risk) but **breaks the whole test suite**: `this._moduleMocker.clearMocksOnScope is not a function` — a jest-runtime/config incompatibility. Needs a jest config / `babel-jest` / preset migration pass. Its own task; unblocks nothing urgent but keeps CI modern. |
| #92 | expo group (24 updates) | `quality-check` fails | Effectively an **Expo SDK upgrade**. Mobile → changes native code. Requires the SDK upgrade playbook + **full device QA**. **Do AFTER the current UI-focused App Store submission ships** — do not destabilize the release candidate. |
| #97 | react-native group (18 updates) | `CONFLICTING` + `quality-check` fails | RN version bump. Mobile, native. Rebase, then treat like #92 — full device QA, **post-release**. Pairs naturally with the Expo upgrade (same QA cycle). |

---

## Recommended Sequencing

1. **Post-release backend session** (low urgency, no app build involved):
   - #103 dompurify (rebase → usage check → merge)
   - #104 jose (verify ESM load + exercise both auth flows → merge)
   - #102 apple library (v3 migration review + sample-notification test → merge)
   - Each is an independent production deploy; do them one at a time and watch `deploy-functions`.
2. **Tooling task:** #99 jest major — config migration to restore the test suite on the new jest.
3. **Next mobile major cycle (after this submission ships):** #92 Expo SDK, then #97 React Native,
   in one shared QA pass on device.

---

## Per-Merge Checklist (functions deps)

- [ ] `@dependabot rebase` the PR onto current `master`
- [ ] Fresh CI green, incl. `dependency-scan` and `quality-check`/`check:functions`
- [ ] Manually exercise the affected flow (auth / IAP notification / report render / sanitize)
- [ ] Merge (squash) → confirm the `deploy-functions` run succeeds
- [ ] Confirm 0 open security alerts unchanged
