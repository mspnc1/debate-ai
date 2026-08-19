#!/usr/bin/env node
/**
 * Release preflight: refuses to proceed unless app.json's marketing version is
 * strictly greater than (1) the version live on the App Store and (2) every
 * FINISHED production build in EAS history.
 *
 * Exists because EAS remote versioning (`appVersionSource: "remote"` +
 * `autoIncrement`) manages ONLY buildNumber/versionCode. The marketing version
 * in app.json is manual, and forgetting to bump it has repeatedly produced
 * store-rejected iOS builds and Play drafts re-labelled with the live version.
 * Run via `npm run release:build` / `npm run release:submit` — never invoke
 * `eas build --profile production` or `eas submit` directly.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const appJson = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url)));
const version = appJson.expo.version;
const bundleId = appJson.expo.ios.bundleIdentifier;

const cmp = (a, b) => {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
};

const failures = [];

// 1. Live App Store version (public iTunes lookup, no auth, may lag a release
//    by a few hours — the EAS-history check below covers that gap).
try {
  const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${bundleId}&_=${Date.now()}`);
  const data = await res.json();
  const live = data.results?.[0]?.version;
  if (live) {
    if (cmp(version, live) <= 0) {
      failures.push(`app.json version ${version} is not greater than the live App Store version ${live}`);
    } else {
      console.log(`ok: App Store live version is ${live}, building ${version}`);
    }
  } else {
    console.log('warn: App Store lookup returned no results; relying on EAS history check');
  }
} catch (e) {
  console.log(`warn: App Store lookup failed (${e.message}); relying on EAS history check`);
}

// 2. EAS production build history — catches same-version rebuilds even before
//    a store release exists or when the iTunes index lags.
try {
  const out = execFileSync(
    'npx',
    ['eas-cli', 'build:list', '--json', '--non-interactive', '--limit', '30'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  const builds = JSON.parse(out);
  const prior = builds
    .filter((b) => b.status === 'FINISHED' && (b.buildProfile === 'production' || b.channel === 'production'))
    .map((b) => b.appVersion)
    .filter(Boolean);
  const maxPrior = prior.sort(cmp).at(-1);
  if (maxPrior && cmp(version, maxPrior) <= 0) {
    failures.push(
      `app.json version ${version} is not greater than the newest FINISHED production build (${maxPrior}) in EAS history`
    );
  } else if (maxPrior) {
    console.log(`ok: newest EAS production build is ${maxPrior}, building ${version}`);
  } else {
    console.log('warn: no prior production builds found in EAS history');
  }
} catch (e) {
  console.log(`warn: EAS history check failed (${e.message})`);
}

if (failures.length) {
  console.error('\nRELEASE PREFLIGHT FAILED');
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    '\nBump "version" in app.json (EAS remote versioning only auto-increments buildNumber/versionCode,' +
      '\nNEVER the marketing version), consider whether "runtimeVersion" must change too (any native' +
      '\nchange requires it), run `npx expo prebuild --no-install`, commit, then retry.'
  );
  process.exit(1);
}
console.log(`\nPreflight passed for version ${version}`);
