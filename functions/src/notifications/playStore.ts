import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';
import { google, androidpublisher_v3 } from 'googleapis';

const PACKAGE_NAME_ANDROID = 'com.braveheartinnovations.debateai';

type AndroidSubscriptionState = {
  expiryTimeMillis?: string;
  autoRenewing?: boolean;
};

export const handlePlayStoreNotification = onMessagePublished(
  'play-store-notifications',
  async (event) => {
    const message = event.data;
    try {
      const data = JSON.parse(Buffer.from(message.message.data || '', 'base64').toString());
      const subtype = data?.subscriptionNotification?.notificationType;
      const purchaseToken = data?.subscriptionNotification?.purchaseToken as string | undefined;
      const subscriptionId = data?.subscriptionNotification?.subscriptionId as string | undefined;
      if (!purchaseToken || !subscriptionId) return;

      const userId = await findUserByPurchaseToken(purchaseToken);
      if (!userId) {
        console.warn('RTDN: No user found for purchase token');
        return;
      }

      // Refresh status via Google API
      const state = await validateAndroidSubscription(PACKAGE_NAME_ANDROID, subscriptionId, purchaseToken);
      const expiresAt = state?.expiryTimeMillis ? new Date(parseInt(state.expiryTimeMillis, 10)) : null;
      const autoRenewing = !!state?.autoRenewing;

      // Update user doc
      const isActive = !!(expiresAt && expiresAt.getTime() > Date.now());
      await admin.firestore().collection('users').doc(userId).set({
        membershipStatus: isActive ? 'premium' : 'demo',
        isPremium: isActive,
        subscriptionSource: 'google_play',
        subscriptionExpiryDate: expiresAt ? admin.firestore.Timestamp.fromDate(expiresAt) : null,
        autoRenewing,
        productId: subscriptionId.includes('annual') ? 'annual' : 'monthly',
        lastValidated: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error('handlePlayStoreNotification error', e);
    }
  });

async function findUserByPurchaseToken(token: string): Promise<string | null> {
  const snap = await admin.firestore()
    .collection('users')
    .where('androidPurchaseToken', '==', token)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;
  return null;
}

function parseAndroidTimestampMillis(value?: string | null): string | undefined {
  if (!value) return undefined;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? String(millis) : undefined;
}

function getLatestSubscriptionLineItem(
  lineItems: androidpublisher_v3.Schema$SubscriptionPurchaseLineItem[] | undefined,
  subscriptionId: string
): androidpublisher_v3.Schema$SubscriptionPurchaseLineItem | undefined {
  const matching = (lineItems ?? []).filter((item) => item.productId === subscriptionId);
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
  subscriptionId: string,
  token: string
): Promise<AndroidSubscriptionState> {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const authClient = await auth.getClient();
  google.options({ auth: authClient as any });
  const publisher = google.androidpublisher('v3');
  const res = await publisher.purchases.subscriptionsv2.get({
    packageName,
    token,
  } as any);
  const purchase = res.data as androidpublisher_v3.Schema$SubscriptionPurchaseV2;
  const lineItem = getLatestSubscriptionLineItem(purchase.lineItems, subscriptionId);

  return {
    expiryTimeMillis: parseAndroidTimestampMillis(lineItem?.expiryTime),
    autoRenewing: lineItem?.autoRenewingPlan?.autoRenewEnabled ?? false,
  };
}
