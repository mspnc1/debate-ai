import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import axios from 'axios';
import { google, androidpublisher_v3 } from 'googleapis';

// Initialize Admin if not already
try { admin.app(); } catch { admin.initializeApp(); }

// Define secret for Apple shared secret (stored in Firebase Secret Manager)
const appleSharedSecret = defineSecret('APPLE_SHARED_SECRET');

const APPLE_PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';
const PACKAGE_NAME_ANDROID = 'com.braveheartinnovations.debateai';

type ValidateRequest = {
  receipt?: string; // iOS base64 receipt
  platform: 'ios' | 'android';
  productId: string; // subscription or product id
  purchaseToken?: string; // Android purchase token
};

type AndroidSubscriptionState = {
  expiryTimeMillis?: string;
  startTimeMillis?: string;
  autoRenewing?: boolean;
  paymentState?: number;
  productId?: string;
  basePlanId?: string;
};

type AndroidProductState = {
  purchaseState?: number;
  productId?: string;
};

type ErrorSummary = {
  name?: string;
  message?: string;
  code?: unknown;
  status?: number;
  googleStatus?: string;
  googleMessage?: string;
};

// Lifetime product IDs
const LIFETIME_PRODUCT_IDS = [
  'com.braveheartinnovations.debateai.premium.lifetime.v2', // iOS
  'premium_lifetime', // Android
];

/**
 * Hash email for privacy-preserving trial tracking
 */
const sha256 = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

const hashEmail = (email: string): string => {
  return sha256(email.toLowerCase().trim());
};

/**
 * Check if user has already used a trial (survives account deletion)
 * Returns: { used: boolean, sameAccount: boolean }
 * - used: true if they've used a trial before (by UID or email)
 * - sameAccount: true if the match was by UID (re-validating current trial is OK)
 */
const checkTrialHistory = async (uid: string, email: string | undefined): Promise<{ used: boolean; sameAccount: boolean }> => {
  const firestore = admin.firestore();

  // Check by UID first - same account re-validating
  const uidDoc = await firestore.collection('trialHistory').doc(uid).get();
  if (uidDoc.exists) {
    return { used: true, sameAccount: true };
  }

  // Check by email hash - different account, potential fraud
  if (email) {
    const emailHash = hashEmail(email);
    const emailQuery = await firestore
      .collection('trialHistory')
      .where('emailHash', '==', emailHash)
      .limit(1)
      .get();
    if (!emailQuery.empty) {
      return { used: true, sameAccount: false };
    }
  }

  return { used: false, sameAccount: false };
};

/**
 * Record trial usage to prevent future abuse after account deletion
 */
const recordTrialUsage = async (uid: string, email: string | undefined): Promise<void> => {
  const firestore = admin.firestore();
  await firestore.collection('trialHistory').doc(uid).set({
    uid,
    emailHash: email ? hashEmail(email) : null,
    firstTrialDate: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const getTimestampMillis = (value: unknown): number | null => {
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
};

const userHasActiveTrial = (userData: admin.firestore.DocumentData | undefined): boolean => {
  if (userData?.membershipStatus !== 'trial') return false;
  const trialEndMs = getTimestampMillis(userData.trialEndDate) ?? getTimestampMillis(userData.trialEndsAt);
  return trialEndMs !== null && trialEndMs > Date.now();
};

const toStatusCode = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const summarizeError = (error: unknown): ErrorSummary => {
  const err = error as {
    name?: string;
    message?: string;
    code?: unknown;
    status?: unknown;
    response?: {
      status?: unknown;
      data?: {
        error?: {
          status?: string;
          message?: string;
        };
      };
    };
  };

  return {
    name: err?.name,
    message: err?.message,
    code: err?.code,
    status: toStatusCode(err?.status) ?? toStatusCode(err?.response?.status),
    googleStatus: err?.response?.data?.error?.status,
    googleMessage: err?.response?.data?.error?.message,
  };
};

const isGoogleInvalidValueError = (summary: ErrorSummary): boolean => {
  if (summary.status !== 400) return false;
  return summary.message === 'Invalid Value'
    || summary.googleMessage === 'Invalid Value'
    || summary.googleStatus === 'INVALID_ARGUMENT';
};

/**
 * Callable Function: validatePurchase
 * Validates App Store/Play Store receipts and returns authoritative subscription state.
 * Expected: { receipt (iOS), purchaseToken (Android), platform, productId }
 */
export const validatePurchase = onCall({ secrets: [appleSharedSecret] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;
  const userEmail = request.auth.token?.email;
  const data = request.data as ValidateRequest;
  const { receipt, platform, productId, purchaseToken } = data;
  if (!platform || !productId) {
    throw new HttpsError('invalid-argument', 'Missing required fields');
  }

  // ALWAYS validate receipt with Apple/Google - no caching
  // Caching causes bugs: trial->premium conversion missed, cancellations missed
  // Only exception: lifetime purchases (one-time, never expire)
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const userData = userDoc.data();
  if (userData?.isLifetime === true) {
    console.log(`User ${userId} is lifetime - returning cached state`);
    return {
      valid: true,
      membershipStatus: 'premium',
      expiryDate: null,
      trialStartDate: userData.trialStartDate || null,
      trialEndDate: userData.trialEndDate || null,
      autoRenewing: false,
      productId: 'lifetime',
      hasUsedTrial: userData.hasUsedTrial ?? false,
      isLifetime: true,
    };
  }

  try {
    const isLifetime = LIFETIME_PRODUCT_IDS.includes(productId);
    let expiresAt: Date | null = null;
    let inTrial = false;
    let trialStart: Date | null = null;
    let trialEnd: Date | null = null;
    let autoRenewing = !isLifetime; // Lifetime never auto-renews

    if (isLifetime) {
      // Handle lifetime (one-time) purchase validation
      if (platform === 'ios') {
        if (!receipt) throw new HttpsError('invalid-argument', 'Missing iOS receipt');
        const sharedSecret = appleSharedSecret.value();
        if (!sharedSecret) {
          throw new HttpsError('failed-precondition', 'Apple shared secret not configured');
        }

        const ios = await validateAppleReceipt(receipt, sharedSecret);
        // For non-consumables, check receipt.in_app array
        const inAppPurchases = ios.receipt?.in_app || [];
        const lifetimePurchase = inAppPurchases.find((item: any) => item.product_id === productId);
        if (!lifetimePurchase) {
          throw new HttpsError('not-found', 'No matching lifetime purchase found in receipt');
        }
        // Lifetime purchases have no expiry
        expiresAt = null;
      } else {
        // Android: Validate one-time product purchase
        if (!purchaseToken) throw new HttpsError('invalid-argument', 'Missing Android purchase token');
        const android = await validateAndroidProduct(PACKAGE_NAME_ANDROID, productId, purchaseToken);
        if (!android || android.purchaseState !== 0 || android.productId !== productId) {
          throw new HttpsError('invalid-argument', 'Invalid Android product purchase state');
        }
        // Lifetime purchases have no expiry
        expiresAt = null;
      }
    } else {
      // Handle subscription validation (existing logic)
      if (platform === 'ios') {
        if (!receipt) throw new HttpsError('invalid-argument', 'Missing iOS receipt');
        const sharedSecret = appleSharedSecret.value();
        if (!sharedSecret) {
          throw new HttpsError('failed-precondition', 'Apple shared secret not configured');
        }

        const ios = await validateAppleReceipt(receipt, sharedSecret);
        // Filter to subscription entries matching productId
        const items = (ios.latest_receipt_info || []).filter((it: any) => it.product_id === productId);
        const target = items.length
          ? items.reduce((a: any, b: any) => (parseInt(a.expires_date_ms) > parseInt(b.expires_date_ms) ? a : b))
          : null;
        if (!target) {
          throw new HttpsError('not-found', 'No matching subscription found in receipt');
        }
        expiresAt = new Date(parseInt(target.expires_date_ms, 10));
        inTrial = target.is_trial_period === 'true' || target.is_in_intro_offer_period === 'true';
        if (inTrial) {
          // Approximate trial window from purchase to expiry
          trialStart = new Date(parseInt(target.purchase_date_ms, 10));
          trialEnd = new Date(parseInt(target.expires_date_ms, 10));
        }
        // Determine auto-renew from pending_renewal_info
        const pending = ios.pending_renewal_info?.find((p: any) => p.product_id === productId);
        autoRenewing = pending ? pending.auto_renew_status === '1' : true;
      } else {
        // Android validation via Google Play Developer API
        if (!purchaseToken) throw new HttpsError('invalid-argument', 'Missing Android purchase token');
        const android = await validateAndroidSubscription(PACKAGE_NAME_ANDROID, productId, purchaseToken);
        if (!android || !android.expiryTimeMillis) {
          throw new HttpsError('invalid-argument', 'Invalid Android subscription state');
        }
        if (android.productId && android.productId !== productId) {
          throw new HttpsError('not-found', 'No matching Android subscription found');
        }
        expiresAt = new Date(parseInt(android.expiryTimeMillis, 10));
        autoRenewing = !!android.autoRenewing;
        // Trial detection via paymentState (2 = Free trial)
        // This is more reliable than offerTags which indicates offer TYPE, not user's current state
        inTrial = android.paymentState === 2;
        if (inTrial) {
          trialStart = android.startTimeMillis
            ? new Date(parseInt(android.startTimeMillis, 10))
            : new Date();
          trialEnd = expiresAt;
        }
      }
    }

    // Determine product type for storage
    let resolvedProductId: 'monthly' | 'annual' | 'lifetime' = 'monthly';
    if (isLifetime) {
      resolvedProductId = 'lifetime';
    } else if (productId.includes('annual')) {
      resolvedProductId = 'annual';
    }

    // Persist authoritative state
    // If starting a trial, mark hasUsedTrial = true so they can't retry later
    const updateData: Record<string, any> = {
      membershipStatus: inTrial ? 'trial' : 'premium',
      isPremium: true, // Both trial and premium users have premium access
      subscriptionSource: platform === 'ios' ? 'apple_iap' : 'google_play',
      subscriptionId: productId,
      subscriptionExpiryDate: expiresAt ? admin.firestore.Timestamp.fromDate(expiresAt) : null,
      trialStartDate: trialStart ? admin.firestore.Timestamp.fromDate(trialStart) : null,
      trialEndDate: trialEnd ? admin.firestore.Timestamp.fromDate(trialEnd) : null,
      productId: resolvedProductId,
      autoRenewing,
      isLifetime,
      lastValidated: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (platform === 'ios') {
      updateData.appAccountToken = sha256(userId);
      updateData.lastReceiptData = receipt ?? null;
    }

    if (platform === 'android') {
      updateData.androidPurchaseToken = purchaseToken ?? null;
      updateData.lastReceiptData = purchaseToken ?? null;
    }

    // Check and record trial usage to prevent abuse after account deletion
    if (inTrial) {
      // Check persistent trial history (survives account deletion)
      const trialCheck = await checkTrialHistory(userId, userEmail);

      const hasPriorTrialOnCurrentUser = userData?.hasUsedTrial === true;
      const hasPriorTrial = trialCheck.used || hasPriorTrialOnCurrentUser;
      const isSameAccountTrial = trialCheck.sameAccount || hasPriorTrialOnCurrentUser;

      if (hasPriorTrial && !isSameAccountTrial) {
        // FRAUD ATTEMPT: Different account but same email - they already used a trial
        // Block them completely - set to demo and reject
        console.log(`User ${userId} attempted trial fraud (email already used trial) - blocking`);
        throw new HttpsError(
          'failed-precondition',
          'You have already used your free trial. Please subscribe to continue using premium features.'
        );
      } else if (hasPriorTrial && isSameAccountTrial) {
        if (userHasActiveTrial(userData)) {
          // Same account re-validating their current active trial - this is fine.
          console.log(`User ${userId} re-validating existing trial - keeping trial status`);
          updateData.hasUsedTrial = true;
        } else {
          // Same account has already consumed and left trial. If Google reports a
          // trial phase from a stale offer token, store the entitlement as premium
          // so the app does not briefly regress to trial copy/state.
          console.log(`User ${userId} already used trial - treating purchase as premium`);
          inTrial = false;
          trialStart = null;
          trialEnd = null;
          updateData.membershipStatus = 'premium';
          updateData.trialStartDate = null;
          updateData.trialEndDate = null;
          updateData.hasUsedTrial = true;
        }
      } else {
        // First time using trial - record it for future tracking
        console.log(`User ${userId} starting first trial - recording usage`);
        await recordTrialUsage(userId, userEmail);
        updateData.hasUsedTrial = true;
      }
    }

    await admin.firestore().collection('users').doc(userId).set(updateData, { merge: true });

    return {
      valid: true,
      membershipStatus: updateData.membershipStatus, // Use the actual status we saved
      expiryDate: expiresAt ? admin.firestore.Timestamp.fromDate(expiresAt) : null,
      trialStartDate: trialStart ? admin.firestore.Timestamp.fromDate(trialStart) : null,
      trialEndDate: trialEnd ? admin.firestore.Timestamp.fromDate(trialEnd) : null,
      autoRenewing,
      productId: resolvedProductId,
      hasUsedTrial: updateData.hasUsedTrial ?? userData?.hasUsedTrial ?? false,
      isLifetime,
    };
  } catch (err) {
    const errorSummary = summarizeError(err);
    console.error('validatePurchase error', errorSummary);
    // Re-throw HttpsError as-is (e.g., "Trial already used" message)
    if (err instanceof HttpsError) {
      throw err;
    }
    if (platform === 'android' && isGoogleInvalidValueError(errorSummary)) {
      throw new HttpsError(
        'invalid-argument',
        'Google Play rejected this purchase token. Please restore purchases or contact support if you were charged.'
      );
    }
    throw new HttpsError('internal', 'Validation failed');
  }
});

async function validateAppleReceipt(receiptData: string, sharedSecret: string) {
  // Try production first
  let response = await axios.post(APPLE_PRODUCTION_URL, {
    'receipt-data': receiptData,
    password: sharedSecret,
    'exclude-old-transactions': true,
  });
  let data = response.data;
  if (data?.status === 21007) {
    // Retry sandbox
    response = await axios.post(APPLE_SANDBOX_URL, {
      'receipt-data': receiptData,
      password: sharedSecret,
      'exclude-old-transactions': true,
    });
    data = response.data;
  }
  if (data?.status !== 0) {
    throw new Error(`Apple receipt invalid: status ${data?.status}`);
  }
  return data;
}

function getAndroidPublisherClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return auth.getClient().then((authClient) => {
    google.options({ auth: authClient as any });
    return google.androidpublisher('v3');
  });
}

function parseAndroidTimestampMillis(value?: string | null): string | undefined {
  if (!value) return undefined;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? String(millis) : undefined;
}

function isValidAndroidSubscriptionState(state?: string | null): boolean {
  return state === 'SUBSCRIPTION_STATE_ACTIVE'
    || state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
    || state === 'SUBSCRIPTION_STATE_CANCELED';
}

function getLatestSubscriptionLineItem(
  lineItems: androidpublisher_v3.Schema$SubscriptionPurchaseLineItem[] | undefined,
  productId: string
): androidpublisher_v3.Schema$SubscriptionPurchaseLineItem | undefined {
  const matching = (lineItems ?? []).filter((item) => item.productId === productId);
  const candidates = matching.length > 0 ? matching : (lineItems ?? []);
  return candidates.reduce<androidpublisher_v3.Schema$SubscriptionPurchaseLineItem | undefined>((latest, item) => {
    if (!latest) return item;
    const latestExpiry = Date.parse(latest.expiryTime ?? '');
    const itemExpiry = Date.parse(item.expiryTime ?? '');
    return itemExpiry > latestExpiry ? item : latest;
  }, undefined);
}

async function validateAndroidSubscription(
  packageName: string,
  productId: string,
  token: string
): Promise<AndroidSubscriptionState> {
  const publisher = await getAndroidPublisherClient();
  const res = await publisher.purchases.subscriptionsv2.get({
    packageName,
    token,
  } as any);
  const purchase = res.data as androidpublisher_v3.Schema$SubscriptionPurchaseV2;
  const lineItem = getLatestSubscriptionLineItem(purchase.lineItems, productId);

  if (!isValidAndroidSubscriptionState(purchase.subscriptionState) || !lineItem?.expiryTime) {
    return {};
  }

  return {
    expiryTimeMillis: parseAndroidTimestampMillis(lineItem.expiryTime),
    startTimeMillis: parseAndroidTimestampMillis(purchase.startTime),
    autoRenewing: lineItem.autoRenewingPlan?.autoRenewEnabled ?? false,
    paymentState: lineItem.offerPhase?.freeTrial ? 2 : 1,
    productId: lineItem.productId ?? undefined,
    basePlanId: lineItem.offerDetails?.basePlanId ?? undefined,
  };
}

async function validateAndroidProduct(
  packageName: string,
  productId: string,
  token: string
): Promise<AndroidProductState> {
  const publisher = await getAndroidPublisherClient();

  const v2 = await publisher.purchases.productsv2.getproductpurchasev2({
    packageName,
    token,
  });
  const data = v2.data as androidpublisher_v3.Schema$ProductPurchaseV2;
  const lineItem = data.productLineItem?.find((item) => item.productId === productId);

  return {
    // Legacy code expects 0 = purchased.
    purchaseState: data.purchaseStateContext?.purchaseState === 'PURCHASED' ? 0 : 1,
    productId: lineItem?.productId ?? data.productLineItem?.[0]?.productId ?? undefined,
  };
}
