import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  subscriptionService, 
  SubscriptionPlan, 
  SubscriptionStatus, 
  PlanFeatures 
} from '../../services/settings';

interface UseSubscriptionSettingsReturn {
  subscription: SubscriptionStatus;
  currentPlan: SubscriptionPlan;
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  expiryInfo: { daysRemaining: number; willExpire: boolean } | null;
  planFeatures: PlanFeatures;
  canAccessFeature: (feature: keyof PlanFeatures) => Promise<boolean>;
  getFeatureLimit: (feature: keyof PlanFeatures) => Promise<number>;
  upgradeToPro: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

export const useSubscriptionSettings = (): UseSubscriptionSettingsReturn => {
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    plan: 'free',
    isActive: true,
    features: [],
    willRenew: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiryInfo, setExpiryInfo] = useState<{ daysRemaining: number; willExpire: boolean } | null>(null);

  // Get user subscription from Redux store
  const { currentUser } = useSelector((state: RootState) => state.user);

  /**
   * Load subscription status from service
   */
  const loadSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const status = await subscriptionService.getCurrentSubscription();
      setSubscription(status);
      
      // Load expiry info
      const expiry = await subscriptionService.getExpiryInfo();
      setExpiryInfo(expiry);
    } catch (err) {
      console.error('Failed to load subscription:', err);
      setError('Failed to load subscription status');
      
      // Fallback to free plan
      setSubscription({
        plan: 'free',
        isActive: true,
        features: [],
        willRenew: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if user can access a specific feature
   */
  const canAccessFeature = useCallback(async (feature: keyof PlanFeatures): Promise<boolean> => {
    try {
      return await subscriptionService.canAccessFeature(feature);
    } catch (err) {
      console.error(`Failed to check feature access for ${feature}:`, err);
      return false;
    }
  }, []);

  /**
   * Get feature limit for numeric features
   */
  const getFeatureLimit = useCallback(async (feature: keyof PlanFeatures): Promise<number> => {
    try {
      return await subscriptionService.getFeatureLimit(feature);
    } catch (err) {
      console.error(`Failed to get feature limit for ${feature}:`, err);
      return 0;
    }
  }, []);

  /**
   * Initiate upgrade to Pro plan
   */
  const upgradeToPro = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      await subscriptionService.initiatePurchase('pro');
      await loadSubscription(); // Refresh subscription status
    } catch (err) {
      console.error('Failed to upgrade to Pro:', err);
      setError('Failed to upgrade subscription');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSubscription]);

  /**
   * Cancel current subscription
   */
  const cancelSubscription = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      await subscriptionService.cancelSubscription();
      await loadSubscription(); // Refresh subscription status
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      setError('Failed to cancel subscription');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSubscription]);

  /**
   * Restore previous purchases
   */
  const restorePurchases = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      await subscriptionService.restorePurchases();
      await loadSubscription(); // Refresh subscription status
    } catch (err) {
      console.error('Failed to restore purchases:', err);
      setError('Failed to restore purchases');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSubscription]);

  /**
   * Refresh subscription status
   */
  const refreshSubscription = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  // Load subscription on mount
  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  // Update subscription when Redux user changes
  useEffect(() => {
    if (currentUser?.subscription && currentUser.subscription !== subscription.plan) {
      loadSubscription();
    }
  }, [currentUser?.subscription, subscription.plan, loadSubscription]);

  // Return values at the end
  const currentPlan = subscription.plan;
  const isPremium = subscription.plan !== 'free' && subscription.isActive;
  const planFeatures = subscriptionService.getPlanFeatures(subscription.plan);

  // Set up periodic refresh for expiry info
  useEffect(() => {
    if (subscription.plan !== 'free' && subscription.expiresAt) {
      const interval = setInterval(async () => {
        try {
          const expiry = await subscriptionService.getExpiryInfo();
          setExpiryInfo(expiry);
        } catch (err) {
          console.error('Failed to update expiry info:', err);
        }
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
    
    // Return empty cleanup function for the else case
    return () => {};
  }, [subscription.plan, subscription.expiresAt]);

  return {
    subscription,
    currentPlan,
    isPremium,
    isLoading,
    error,
    expiryInfo,
    planFeatures,
    canAccessFeature,
    getFeatureLimit,
    upgradeToPro,
    cancelSubscription,
    restorePurchases,
    refreshSubscription,
  };
};