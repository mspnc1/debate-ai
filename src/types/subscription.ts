// Subscription types for the three-tier model

import type { Timestamp } from '@react-native-firebase/firestore';

export type MembershipStatus = 'demo' | 'trial' | 'premium';

export interface UserSubscriptionDoc {
  uid: string;
  membershipStatus: MembershipStatus;
  productId?: 'monthly' | 'annual' | 'lifetime';
  subscriptionId?: string;
  paymentPlatform?: 'ios' | 'android';
  autoRenewing?: boolean;
  hasUsedTrial?: boolean;
  androidPurchaseToken?: string | null;
  appAccountToken?: string | null;
  trialStartDate?: Timestamp | null;
  trialEndDate?: Timestamp | null;
  subscriptionExpiryDate?: Timestamp | null;
}
