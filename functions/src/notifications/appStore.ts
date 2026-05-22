import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  SignedDataVerifier,
  Environment,
  ResponseBodyV2DecodedPayload,
  JWSTransactionDecodedPayload,
  OfferType,
} from '@apple/app-store-server-library';

// App configuration
const BUNDLE_ID = 'com.braveheartinnovations.debateai';
const APP_APPLE_ID = 6751146458;

// Use PRODUCTION for live app, SANDBOX for TestFlight/development
// The library handles both - it will verify against the appropriate Apple certificates
const ENVIRONMENT = Environment.PRODUCTION;

// Initialize the verifier using Apple's official library
// This properly handles x5c certificate chain verification against Apple Root CA
const verifier = new SignedDataVerifier(
  [], // Empty array = use built-in Apple root certificates
  true, // Enable online certificate revocation checking (OCSP)
  ENVIRONMENT,
  BUNDLE_ID,
  APP_APPLE_ID
);

function getTimestampMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'object') {
    const timestampLike = value as {
      toMillis?: () => number;
      toDate?: () => Date;
    };
    if (typeof timestampLike.toMillis === 'function') return timestampLike.toMillis();
    if (typeof timestampLike.toDate === 'function') return timestampLike.toDate().getTime();
  }
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Handle App Store Server Notifications V2
 *
 * Apple sends signed JWS payloads containing subscription lifecycle events.
 * We verify the signature using Apple's official library which handles
 * x5c certificate chain validation against Apple's Root CA.
 */
export const handleAppStoreNotification = functions.https.onRequest(async (req, res) => {
  console.log('Received App Store notification');

  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { signedPayload } = req.body || {};
    if (!signedPayload) {
      console.warn('Missing signedPayload in request body');
      res.status(400).send('Missing signedPayload');
      return;
    }

    // Verify and decode the notification using Apple's official library
    console.log('Verifying notification signature...');
    let payload: ResponseBodyV2DecodedPayload;
    try {
      payload = await verifier.verifyAndDecodeNotification(signedPayload);
      console.log('Notification verified successfully');
    } catch (verifyError) {
      console.error('Notification verification failed:', verifyError);
      // Return 200 to prevent Apple from retrying invalid notifications
      res.status(200).send('Verification failed');
      return;
    }

    const notificationType = payload.notificationType;
    const subtype = payload.subtype;
    console.log(`Notification type: ${notificationType}, subtype: ${subtype}`);

    // Get the signed transaction info from the notification data
    const signedTransactionInfo = payload.data?.signedTransactionInfo;
    if (!signedTransactionInfo) {
      console.warn('No signedTransactionInfo in notification');
      res.status(200).send('OK - no transaction info');
      return;
    }

    // Verify and decode the transaction
    console.log('Verifying transaction info...');
    let transaction: JWSTransactionDecodedPayload;
    try {
      transaction = await verifier.verifyAndDecodeTransaction(signedTransactionInfo);
      console.log('Transaction verified successfully');
    } catch (txError) {
      console.error('Transaction verification failed:', txError);
      res.status(200).send('Transaction verification failed');
      return;
    }

    const productId = transaction.productId;
    const expiresDate = transaction.expiresDate; // Already a number (milliseconds)
    const appAccountToken = transaction.appAccountToken;

    console.log(`Transaction: productId=${productId}, expiresDate=${expiresDate}, hasAppAccountToken=${!!appAccountToken}`);

    if (!appAccountToken) {
      console.warn('No appAccountToken in transaction - cannot link to user');
      res.status(200).send('OK - no app account token');
      return;
    }

    // Find the user by their appAccountToken
    const userId = await findUserByAppAccountToken(appAccountToken);
    if (!userId) {
      console.warn(`No user found for appAccountToken ${appAccountToken.substring(0, 8)}...`);
      res.status(200).send('OK - user not found');
      return;
    }

    // Only update if we have a valid expiry date
    if (!expiresDate) {
      console.warn(`Notification for user ${userId} missing expiresDate - skipping update`);
      res.status(200).send('OK - no expiry date');
      return;
    }

    const expiresAt = new Date(expiresDate);
    const isActive = expiresAt.getTime() > Date.now();
    const userRef = admin.firestore().collection('users').doc(userId);
    const userSnap = await userRef.get();
    const userData = userSnap.data();
    const existingTrialEndMs = getTimestampMillis(userData?.trialEndDate) ?? getTimestampMillis(userData?.trialEndsAt);
    const storeReportsTrial = transaction.offerType === OfferType.INTRODUCTORY_OFFER;
    const preserveActiveTrial = isActive && !storeReportsTrial && userData?.hasUsedTrial === true
      && existingTrialEndMs !== null
      && existingTrialEndMs > Date.now();
    const inTrial = isActive && (storeReportsTrial || preserveActiveTrial);
    const newStatus = isActive ? (inTrial ? 'trial' : 'premium') : 'demo';
    const trialEndMs = inTrial
      ? (storeReportsTrial ? expiresAt.getTime() : existingTrialEndMs)
      : null;

    console.log(`Updating user ${userId}: membershipStatus=${newStatus}, expiresAt=${expiresAt.toISOString()}`);

    const updateData: Record<string, unknown> = {
      membershipStatus: newStatus,
      isPremium: isActive,
      subscriptionSource: 'apple_iap',
      subscriptionExpiryDate: admin.firestore.Timestamp.fromDate(expiresAt),
      trialEndDate: inTrial && trialEndMs ? admin.firestore.Timestamp.fromDate(new Date(trialEndMs)) : null,
      productId: productId && productId.includes('annual') ? 'annual' : 'monthly',
      lastValidated: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (inTrial) {
      updateData.hasUsedTrial = true;
    }
    await userRef.set(updateData, { merge: true });

    console.log(`Successfully updated user ${userId} to ${newStatus}`);
    res.status(200).send('OK');

  } catch (e) {
    console.error('handleAppStoreNotification error:', e);
    // Return 200 to Apple to acknowledge receipt (prevents endless retries)
    res.status(200).send('Error logged');
  }
});

/**
 * Find a user by their appAccountToken (SHA256 hash of their UID)
 */
async function findUserByAppAccountToken(token: string): Promise<string | null> {
  const snap = await admin.firestore()
    .collection('users')
    .where('appAccountToken', '==', token)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;
  return null;
}
