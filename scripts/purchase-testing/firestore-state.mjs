#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_PROJECT = 'symposium-ai';
const FIREBASE_CONFIG_PATH = path.join(homedir(), '.config', 'configstore', 'firebase-tools.json');
const NODE_BIN_PATH = '/Users/michaelspencer/.nvm/versions/node/v22.17.0/bin';
const ROOT_COLLECTIONS_URL = (project) =>
  `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;

const RESET_FIELDS_BASE = {
  membershipStatus: 'demo',
  isPremium: false,
  subscriptionExpiryDate: null,
  trialStartDate: null,
  trialEndDate: null,
  autoRenewing: false,
  isLifetime: false,
  subscriptionSource: null,
  subscriptionId: null,
  productId: null,
  androidPurchaseToken: null,
  lastReceiptData: null,
  appAccountToken: null,
  lastValidated: null,
};

const usage = `
Purchase testing Firestore helper

Usage:
  node scripts/purchase-testing/firestore-state.mjs inspect --uid UID [--email EMAIL] [--project symposium-ai]
  node scripts/purchase-testing/firestore-state.mjs repair-trial-flag --uid UID [--email EMAIL] --confirm UID
  node scripts/purchase-testing/firestore-state.mjs reset-entitlement --uid UID [--email EMAIL] --confirm UID
  node scripts/purchase-testing/firestore-state.mjs reset-trial-eligibility --uid UID [--email EMAIL] --confirm UID --confirm-delete-trial-history

Commands:
  inspect
    Prints user entitlement fields, trialHistory state, effective trial usage,
    and recent purchase_errors for this Firebase uid.

  repair-trial-flag
    If trialHistory says the test user has used a trial, sets users/{uid}.hasUsedTrial=true.
    It does not change membershipStatus or entitlement fields.

  reset-entitlement
    Resets the user entitlement to demo while preserving trial-history semantics.
    If trialHistory exists, hasUsedTrial stays true. It does not delete trialHistory.

  reset-trial-eligibility
    Test-only reset. Deletes trialHistory for this uid, and email-hash matches if --email
    or users/{uid}.email is available, then resets users/{uid} to demo/hasUsedTrial=false.
    This bypasses the production anti-abuse ledger and must not be used for real users.

Auth:
  Uses FIREBASE_TOKEN if set. Otherwise it uses the local Firebase CLI login token
  from ${FIREBASE_CONFIG_PATH}. If the access token is expired, the script asks
  Firebase CLI to refresh it.
`.trim();

function parseArgs(argv) {
  const args = {
    command: null,
    uid: null,
    email: null,
    project: DEFAULT_PROJECT,
    confirm: null,
    confirmDeleteTrialHistory: false,
    json: false,
  };

  const rest = [...argv];
  args.command = rest.shift() ?? null;

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--help' || arg === '-h') {
      args.command = 'help';
    } else if (arg === '--uid') {
      args.uid = rest[++i] ?? null;
    } else if (arg === '--email') {
      args.email = rest[++i] ?? null;
    } else if (arg === '--project') {
      args.project = rest[++i] ?? DEFAULT_PROJECT;
    } else if (arg === '--confirm') {
      args.confirm = rest[++i] ?? null;
    } else if (arg === '--confirm-delete-trial-history') {
      args.confirmDeleteTrialHistory = true;
    } else if (arg === '--json') {
      args.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function requireUid(args) {
  if (!args.uid) {
    throw new Error('Missing --uid UID');
  }
}

function requireConfirm(args) {
  requireUid(args);
  if (args.confirm !== args.uid) {
    throw new Error(`Refusing to write. Re-run with --confirm ${args.uid}`);
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashEmail(email) {
  return sha256(email.toLowerCase().trim());
}

function readFirebaseToolsToken() {
  if (process.env.FIREBASE_TOKEN) {
    return {
      accessToken: process.env.FIREBASE_TOKEN,
      expiresAt: Number.MAX_SAFE_INTEGER,
      source: 'FIREBASE_TOKEN',
    };
  }

  if (!existsSync(FIREBASE_CONFIG_PATH)) {
    return null;
  }

  const config = JSON.parse(readFileSync(FIREBASE_CONFIG_PATH, 'utf8'));
  const token = config.tokens?.access_token ?? config.access_token ?? null;
  const expiresAt = config.tokens?.expires_at ?? config.expires_at ?? 0;
  if (!token) {
    return null;
  }

  return {
    accessToken: token,
    expiresAt: Number(expiresAt) || 0,
    source: FIREBASE_CONFIG_PATH,
    account: config.user?.email ?? config.userEmail ?? null,
  };
}

function refreshFirebaseToken(project) {
  const env = {
    ...process.env,
    PATH: `${NODE_BIN_PATH}:${process.env.PATH ?? ''}`,
  };
  const result = spawnSync('firebase', ['projects:list', '--json', '--project', project], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(
      [
        'Firebase CLI token refresh failed.',
        stderr ? `stderr: ${stderr}` : null,
        stdout ? `stdout: ${stdout}` : null,
        'Run: firebase login --reauth',
      ].filter(Boolean).join('\n')
    );
  }
}

function getAccessToken(project) {
  let token = readFirebaseToolsToken();
  const expiresSoon = token && token.expiresAt !== Number.MAX_SAFE_INTEGER && token.expiresAt < Date.now() + 60_000;

  if (!token || expiresSoon) {
    refreshFirebaseToken(project);
    token = readFirebaseToolsToken();
  }

  if (!token?.accessToken) {
    throw new Error(`No Firebase CLI access token found. Run: firebase login --reauth`);
  }

  return token;
}

function firestoreValueToJson(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('bytesValue' in value) return '<bytes>';
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(firestoreValueToJson);
  }
  if ('mapValue' in value) {
    const fields = value.mapValue.fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([key, child]) => [key, firestoreValueToJson(child)]));
  }
  return value;
}

function firestoreDocToJson(doc) {
  if (!doc) return null;
  const fields = doc.fields ?? {};
  return {
    name: doc.name,
    createTime: doc.createTime,
    updateTime: doc.updateTime,
    fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, firestoreValueToJson(value)])),
  };
}

function jsonToFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(jsonToFirestoreValue) } };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, child]) => [key, jsonToFirestoreValue(child)])),
      },
    };
  }
  return { stringValue: String(value) };
}

function jsonToFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, jsonToFirestoreValue(value)]));
}

class FirestoreRest {
  constructor(project) {
    this.project = project;
    this.root = ROOT_COLLECTIONS_URL(project);
    this.tokenInfo = getAccessToken(project);
  }

  async request(method, url, body, options = {}) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.tokenInfo.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401 && !options.didRefresh) {
      refreshFirebaseToken(this.project);
      this.tokenInfo = getAccessToken(this.project);
      return this.request(method, url, body, { ...options, didRefresh: true });
    }

    if (response.status === 404 && options.allowNotFound) {
      return null;
    }

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = parsed?.error?.message ?? text ?? `${method} ${url} failed`;
      throw new Error(`${method} ${url} failed with ${response.status}: ${message}`);
    }

    return parsed;
  }

  docUrl(collectionId, documentId) {
    return `${this.root}/${collectionId}/${encodeURIComponent(documentId)}`;
  }

  async getDoc(collectionId, documentId) {
    const doc = await this.request('GET', this.docUrl(collectionId, documentId), null, { allowNotFound: true });
    return firestoreDocToJson(doc);
  }

  async patchDoc(collectionId, documentId, fields) {
    const url = new URL(this.docUrl(collectionId, documentId));
    for (const fieldPath of Object.keys(fields)) {
      url.searchParams.append('updateMask.fieldPaths', fieldPath);
    }
    const doc = await this.request('PATCH', url.toString(), { fields: jsonToFirestoreFields(fields) });
    return firestoreDocToJson(doc);
  }

  async deleteDoc(collectionId, documentId) {
    await this.request('DELETE', this.docUrl(collectionId, documentId), null, { allowNotFound: true });
  }

  async runQuery(query) {
    const rows = await this.request('POST', `${this.root}:runQuery`, query);
    return (rows ?? []).map((row) => firestoreDocToJson(row.document)).filter(Boolean);
  }
}

function compactDoc(doc) {
  return doc ? doc.fields : null;
}

function pickUserFields(userDoc) {
  const fields = compactDoc(userDoc) ?? {};
  return {
    email: fields.email ?? fields.emailAddress ?? null,
    membershipStatus: fields.membershipStatus ?? null,
    isPremium: fields.isPremium ?? null,
    hasUsedTrial: fields.hasUsedTrial ?? null,
    trialStartDate: fields.trialStartDate ?? null,
    trialEndDate: fields.trialEndDate ?? null,
    subscriptionExpiryDate: fields.subscriptionExpiryDate ?? null,
    productId: fields.productId ?? null,
    subscriptionSource: fields.subscriptionSource ?? null,
    autoRenewing: fields.autoRenewing ?? null,
    isLifetime: fields.isLifetime ?? null,
    lastValidated: fields.lastValidated ?? null,
  };
}

async function findTrialHistoryByEmail(db, email) {
  if (!email) return [];
  return db.runQuery({
    structuredQuery: {
      from: [{ collectionId: 'trialHistory' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'emailHash' },
          op: 'EQUAL',
          value: { stringValue: hashEmail(email) },
        },
      },
      limit: 20,
    },
  });
}

async function findPurchaseErrors(db, uid) {
  const userIdHash = sha256(uid).slice(0, 16);
  const docs = await db.runQuery({
    structuredQuery: {
      from: [{ collectionId: 'purchase_errors' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'userIdHash' },
          op: 'EQUAL',
          value: { stringValue: userIdHash },
        },
      },
      limit: 25,
    },
  });

  return docs
    .map((doc) => ({
      id: doc.name?.split('/').pop(),
      ...compactDoc(doc),
    }))
    .sort((a, b) => Number(b.timestamp ?? 0) - Number(a.timestamp ?? 0))
    .slice(0, 8);
}

async function loadState(args, db) {
  const userDoc = await db.getDoc('users', args.uid);
  const userFields = pickUserFields(userDoc);
  const email = args.email ?? userFields.email ?? null;
  const trialHistoryByUid = await db.getDoc('trialHistory', args.uid);
  const trialHistoryByEmail = await findTrialHistoryByEmail(db, email);
  const trialHistoryEmailMatches = trialHistoryByEmail.filter((doc) => doc.name?.split('/').pop() !== args.uid);
  const hasTrialHistory = Boolean(trialHistoryByUid) || trialHistoryByEmail.length > 0;
  let purchaseErrors = [];
  let purchaseErrorsWarning = null;

  try {
    purchaseErrors = await findPurchaseErrors(db, args.uid);
  } catch (error) {
    purchaseErrorsWarning = error instanceof Error ? error.message : String(error);
  }

  return {
    project: args.project,
    uid: args.uid,
    userIdHash: sha256(args.uid).slice(0, 16),
    emailAvailable: Boolean(email),
    emailHash: email ? hashEmail(email).slice(0, 16) : null,
    userExists: Boolean(userDoc),
    user: userFields,
    trialHistory: {
      byUid: trialHistoryByUid ? compactDoc(trialHistoryByUid) : null,
      emailMatchCount: trialHistoryByEmail.length,
      emailMatches: trialHistoryEmailMatches.map((doc) => ({
        id: doc.name?.split('/').pop(),
        firstTrialDate: doc.fields.firstTrialDate ?? null,
        createdAt: doc.fields.createdAt ?? null,
      })),
    },
    effective: {
      hasUsedTrial: userFields.hasUsedTrial === true || hasTrialHistory,
      canStartTrial: userFields.membershipStatus === 'demo' && !(userFields.hasUsedTrial === true || hasTrialHistory),
    },
    recentPurchaseErrors: purchaseErrors,
    warnings: [
      !email ? 'No email provided or present on users/{uid}; email-hash trialHistory could not be checked.' : null,
      purchaseErrorsWarning ? `Could not query purchase_errors: ${purchaseErrorsWarning}` : null,
    ].filter(Boolean),
  };
}

function print(value, asJson) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  console.log(JSON.stringify(value, null, 2));
}

async function inspect(args, db) {
  requireUid(args);
  print(await loadState(args, db), args.json);
}

async function repairTrialFlag(args, db) {
  requireConfirm(args);
  const state = await loadState(args, db);
  const hasTrialHistory = Boolean(state.trialHistory.byUid) || state.trialHistory.emailMatchCount > 0;
  if (!hasTrialHistory) {
    throw new Error('No trialHistory match found. Refusing to mark hasUsedTrial=true without evidence.');
  }

  await db.patchDoc('users', args.uid, {
    hasUsedTrial: true,
    purchaseTestRepairAt: new Date().toISOString(),
    purchaseTestRepairReason: 'trialHistory_present',
  });

  print({
    ok: true,
    action: 'repair-trial-flag',
    uid: args.uid,
    hasUsedTrial: true,
    trialHistory: state.trialHistory,
  }, args.json);
}

async function resetEntitlement(args, db) {
  requireConfirm(args);
  const state = await loadState(args, db);
  const hasTrialHistory = Boolean(state.trialHistory.byUid) || state.trialHistory.emailMatchCount > 0;
  const update = {
    ...RESET_FIELDS_BASE,
    hasUsedTrial: hasTrialHistory,
    purchaseTestResetAt: new Date().toISOString(),
    purchaseTestResetMode: 'reset-entitlement',
  };

  await db.patchDoc('users', args.uid, update);

  print({
    ok: true,
    action: 'reset-entitlement',
    uid: args.uid,
    membershipStatus: 'demo',
    hasUsedTrial: hasTrialHistory,
    note: hasTrialHistory
      ? 'Trial history was preserved; app should show paid purchase path, not a new trial.'
      : 'No trial history found; app should show fresh trial path.',
    warnings: state.warnings,
  }, args.json);
}

async function resetTrialEligibility(args, db) {
  requireConfirm(args);
  if (!args.confirmDeleteTrialHistory) {
    throw new Error('Refusing to delete trial history. Re-run with --confirm-delete-trial-history for test users only.');
  }

  const state = await loadState(args, db);
  await db.deleteDoc('trialHistory', args.uid);

  for (const match of state.trialHistory.emailMatches) {
    if (match.id) {
      await db.deleteDoc('trialHistory', match.id);
    }
  }

  await db.patchDoc('users', args.uid, {
    ...RESET_FIELDS_BASE,
    hasUsedTrial: false,
    purchaseTestResetAt: new Date().toISOString(),
    purchaseTestResetMode: 'reset-trial-eligibility',
  });

  print({
    ok: true,
    action: 'reset-trial-eligibility',
    uid: args.uid,
    deletedTrialHistoryDocs: [state.trialHistory.byUid ? args.uid : null, ...state.trialHistory.emailMatches.map((m) => m.id)].filter(Boolean),
    membershipStatus: 'demo',
    hasUsedTrial: false,
    warnings: [
      ...state.warnings,
      'This is test-only. It bypasses durable trial abuse protection.',
    ],
  }, args.json);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.command || args.command === 'help') {
    console.log(usage);
    return;
  }

  const db = new FirestoreRest(args.project);
  switch (args.command) {
    case 'inspect':
      await inspect(args, db);
      break;
    case 'repair-trial-flag':
      await repairTrialFlag(args, db);
      break;
    case 'reset-entitlement':
      await resetEntitlement(args, db);
      break;
    case 'reset-trial-eligibility':
      await resetTrialEligibility(args, db);
      break;
    default:
      throw new Error(`Unknown command: ${args.command}\n\n${usage}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
