import * as crypto from 'crypto';

export type AndroidPurchaseOwnershipInput = {
  obfuscatedExternalAccountId?: string | null;
  obfuscatedExternalProfileId?: string | null;
};

export type AndroidPurchaseOwnershipDecision = {
  expectedObfuscatedAccountId: string;
  purchaseObfuscatedAccountId: string | null;
  hasAccountIdentifier: boolean;
  matchesCurrentUser: boolean;
};

export const sha256 = (value: string): string => (
  crypto.createHash('sha256').update(value).digest('hex')
);

export const getExpectedAndroidObfuscatedAccountId = (uid: string): string => sha256(uid);

export function getAndroidPurchaseOwnershipDecision(
  uid: string,
  purchase: AndroidPurchaseOwnershipInput
): AndroidPurchaseOwnershipDecision {
  const purchaseObfuscatedAccountId = purchase.obfuscatedExternalAccountId ?? null;
  const expectedObfuscatedAccountId = getExpectedAndroidObfuscatedAccountId(uid);

  return {
    expectedObfuscatedAccountId,
    purchaseObfuscatedAccountId,
    hasAccountIdentifier: Boolean(purchaseObfuscatedAccountId),
    matchesCurrentUser: purchaseObfuscatedAccountId === expectedObfuscatedAccountId,
  };
}
