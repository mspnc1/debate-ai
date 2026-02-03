/**
 * Data Connector Key Management
 *
 * Manages encrypted API keys for data connectors used by the fetch_api tool.
 * Follows the same encryption pattern as apiKeys.ts (AES-256-GCM).
 *
 * Firestore path: users/{uid}/dataServiceKeys/{connectorId}
 *
 * Three callable functions:
 * - saveDataServiceKey: Encrypt and store a user's API key for a data connector
 * - deleteDataServiceKey: Remove a stored key
 * - getConfiguredDataServices: List which connectors have keys (no actual keys returned)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { encrypt, getDecryptedDataServiceKey, encryptionKey } from './dataConnectorCrypto';

// Managed API keys for Symposium-provided connectors
const fredApiKey = defineSecret('FRED_API_KEY');
const socrataAppToken = defineSecret('SOCRATA_APP_TOKEN');

// Valid data connector IDs (must match client-side data-connectors.ts)
const VALID_CONNECTOR_IDS = [
  // Symposium-managed (no user key needed, but FRED uses a managed key)
  'weather_gov',
  'fred',
  'usgs_earthquake',
  'arxiv',
  'sec_edgar',
  'world_bank',
  'socrata',
  'pubmed',
  'overpass_osm',
  // BYOK (user provides key)
  'alpha_vantage',
  'openweathermap',
  'newsapi',
  'semantic_scholar',
  'github',
  'google_sheets_csv',
];

// Connector auth configuration (server-side source of truth for key injection)
export interface ConnectorAuthConfig {
  authType: 'query_param' | 'header' | 'bearer' | 'none';
  authKeyName?: string;
  /** For Symposium-managed connectors: function returning the platform key */
  getManagedKey?: () => string | undefined;
}

export const CONNECTOR_AUTH_CONFIG: Record<string, ConnectorAuthConfig> = {
  weather_gov: { authType: 'none' },
  fred: { authType: 'query_param', authKeyName: 'api_key', getManagedKey: () => fredApiKey.value() || undefined },
  usgs_earthquake: { authType: 'none' },
  arxiv: { authType: 'none' },
  sec_edgar: { authType: 'header', authKeyName: 'User-Agent' },
  alpha_vantage: { authType: 'query_param', authKeyName: 'apikey' },
  openweathermap: { authType: 'query_param', authKeyName: 'appid' },
  newsapi: { authType: 'header', authKeyName: 'X-Api-Key' },
  semantic_scholar: { authType: 'header', authKeyName: 'x-api-key' },
  world_bank: { authType: 'none' },
  socrata: { authType: 'query_param', authKeyName: '$$app_token', getManagedKey: () => socrataAppToken.value() || undefined },
  pubmed: { authType: 'none' },
  overpass_osm: { authType: 'none' },
  github: { authType: 'bearer' },
  google_sheets_csv: { authType: 'none' },
};

/**
 * Save an API key for a data connector.
 * Encrypts the key before storing in Firestore.
 */
export const saveDataServiceKey = onCall(
  { secrets: [encryptionKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to save data service keys');
    }

    const keyValue = encryptionKey.value();
    if (!keyValue) {
      throw new HttpsError('internal', 'Encryption not configured');
    }

    const { connectorId, apiKey } = request.data;

    // Validate inputs
    if (!connectorId || typeof connectorId !== 'string') {
      throw new HttpsError('invalid-argument', 'Connector ID is required');
    }

    if (!VALID_CONNECTOR_IDS.includes(connectorId)) {
      throw new HttpsError('invalid-argument', `Invalid connector: ${connectorId}`);
    }

    if (!apiKey || typeof apiKey !== 'string') {
      throw new HttpsError('invalid-argument', 'API key is required');
    }

    if (apiKey.length < 5 || apiKey.length > 500) {
      throw new HttpsError('invalid-argument', 'API key has invalid length');
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    try {
      const { encrypted, iv, tag } = encrypt(apiKey.trim(), keyValue);

      await db.collection('users').doc(uid).collection('dataServiceKeys').doc(connectorId).set({
        encrypted,
        iv,
        tag,
        connectorId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, connectorId };
    } catch (error) {
      console.error('Error saving data service key:', error);
      throw new HttpsError('internal', 'Failed to save data service key');
    }
  }
);

/**
 * Delete an API key for a data connector.
 */
export const deleteDataServiceKey = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { connectorId } = request.data;

  if (!connectorId || !VALID_CONNECTOR_IDS.includes(connectorId)) {
    throw new HttpsError('invalid-argument', 'Invalid connector ID');
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  try {
    await db.collection('users').doc(uid).collection('dataServiceKeys').doc(connectorId).delete();
    return { success: true, connectorId };
  } catch (error) {
    console.error('Error deleting data service key:', error);
    throw new HttpsError('internal', 'Failed to delete data service key');
  }
});

/**
 * Get list of configured data services (not the actual keys).
 * Returns connector IDs and timestamps for connectors that have stored keys.
 */
export const getConfiguredDataServices = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  try {
    const snapshot = await db.collection('users').doc(uid).collection('dataServiceKeys').get();

    const services = snapshot.docs.map(doc => ({
      connectorId: doc.id,
      configuredAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    return { services };
  } catch (error) {
    console.error('Error getting configured data services:', error);
    throw new HttpsError('internal', 'Failed to get configured data services');
  }
});

// Re-export for use by tools.ts
export { getDecryptedDataServiceKey, VALID_CONNECTOR_IDS, fredApiKey, socrataAppToken };
