import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { SubscriptionTier, User } from '../types';

export interface UseSubscriptionStatusReturn {
  currentUser: User | null;
  subscription: SubscriptionTier | undefined;
  isPremium: boolean;
  isPro: boolean;
  isBusiness: boolean;
  isFree: boolean;
  hasFeatureAccess: (feature: PremiumFeature) => boolean;
  getSubscriptionLabel: () => string;
  getFeatureLimit: (feature: LimitedFeature) => number;
  isFeatureUnlimited: (feature: LimitedFeature) => boolean;
  getDaysRemaining: () => number | null;
  isTrialActive: () => boolean;
  canUpgrade: () => boolean;
  getUpgradeOptions: () => SubscriptionTier[];
}

export type PremiumFeature = 
  | 'expertMode'
  | 'customPersonalities'
  | 'unlimitedChats'
  | 'prioritySupport'
  | 'advancedAnalytics'
  | 'customDebateTopics'
  | 'exportTranscripts'
  | 'teamCollaboration'
  | 'apiAccess';

export type LimitedFeature = 
  | 'monthlyChats'
  | 'dailyChats'
  | 'concurrentChats'
  | 'storageLimit'
  | 'exportCount';

const FEATURE_LIMITS = {
  free: {
    monthlyChats: 50,
    dailyChats: 5,
    concurrentChats: 2,
    storageLimit: 1000, // in MB
    exportCount: 1
  },
  pro: {
    monthlyChats: 500,
    dailyChats: 50,
    concurrentChats: 5,
    storageLimit: 10000, // in MB
    exportCount: 20
  },
  business: {
    monthlyChats: -1, // unlimited
    dailyChats: -1, // unlimited
    concurrentChats: 10,
    storageLimit: 100000, // in MB
    exportCount: -1 // unlimited
  }
};

const PREMIUM_FEATURES: Record<SubscriptionTier, PremiumFeature[]> = {
  free: [],
  pro: [
    'expertMode',
    'customPersonalities', 
    'customDebateTopics',
    'exportTranscripts'
  ],
  business: [
    'expertMode',
    'customPersonalities',
    'unlimitedChats',
    'prioritySupport',
    'advancedAnalytics',
    'customDebateTopics',
    'exportTranscripts',
    'teamCollaboration',
    'apiAccess'
  ]
};

export const useSubscriptionStatus = (): UseSubscriptionStatusReturn => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  
  // TODO: Remove development override - defaulting to premium for development
  const subscription: SubscriptionTier = currentUser?.subscription || 'pro';

  /**
   * Check if user has premium subscription (pro or business)
   */
  const isPremium = subscription === 'pro' || subscription === 'business';

  /**
   * Check if user has pro subscription
   */
  const isPro = subscription === 'pro';

  /**
   * Check if user has business subscription
   */
  const isBusiness = subscription === 'business';

  /**
   * Check if user has free subscription
   */
  const isFree = subscription === 'free';

  /**
   * Check if user has access to a specific premium feature
   */
  const hasFeatureAccess = (feature: PremiumFeature): boolean => {
    const tierFeatures = PREMIUM_FEATURES[subscription] || [];
    return tierFeatures.includes(feature);
  };

  /**
   * Get human-readable subscription label
   */
  const getSubscriptionLabel = (): string => {
    switch (subscription) {
      case 'pro':
        return 'Pro';
      case 'business':
        return 'Business';
      case 'free':
      default:
        return 'Free';
    }
  };

  /**
   * Get limit for a specific feature based on subscription tier
   */
  const getFeatureLimit = (feature: LimitedFeature): number => {
    const limits = FEATURE_LIMITS[subscription] || FEATURE_LIMITS.free;
    return limits[feature] || 0;
  };

  /**
   * Check if a feature is unlimited for current subscription
   */
  const isFeatureUnlimited = (feature: LimitedFeature): boolean => {
    return getFeatureLimit(feature) === -1;
  };

  /**
   * Get days remaining in subscription (mock implementation)
   */
  const getDaysRemaining = (): number | null => {
    // TODO: Implement actual subscription expiry tracking
    if (subscription === 'free') return null;
    
    // Mock: return 30 days for development
    return 30;
  };

  /**
   * Check if trial is active (mock implementation)
   */
  const isTrialActive = (): boolean => {
    // TODO: Implement actual trial tracking
    return false;
  };

  /**
   * Check if user can upgrade their subscription
   */
  const canUpgrade = (): boolean => {
    return subscription !== 'business';
  };

  /**
   * Get available upgrade options
   */
  const getUpgradeOptions = (): SubscriptionTier[] => {
    switch (subscription) {
      case 'free':
        return ['pro', 'business'];
      case 'pro':
        return ['business'];
      case 'business':
      default:
        return [];
    }
  };

  return {
    currentUser,
    subscription,
    isPremium,
    isPro,
    isBusiness,
    isFree,
    hasFeatureAccess,
    getSubscriptionLabel,
    getFeatureLimit,
    isFeatureUnlimited,
    getDaysRemaining,
    isTrialActive,
    canUpgrade,
    getUpgradeOptions,
  };
};