import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { UseSubscriptionLimitsReturn } from '../../types/history';

export const useSubscriptionLimits = (currentSessionCount: number = 0): UseSubscriptionLimitsReturn => {
  // Get subscription info from Redux store
  const subscription = useSelector(
    (state: RootState) => state.user.currentUser?.subscription || 'free'
  );

  /**
   * Calculate session limits based on subscription
   */
  const limits = useMemo(() => {
    switch (subscription) {
      case 'free':
        return {
          maxSessions: 3,
          name: 'Free',
          features: ['Up to 3 conversations', 'Basic AI models', 'Standard support']
        };
      
      case 'pro':
        return {
          maxSessions: 25,
          name: 'Pro',
          features: ['Up to 25 conversations', 'Premium AI models', 'Priority support', 'Export conversations']
        };
      
      case 'business':
        return {
          maxSessions: Infinity,
          name: 'Business',
          features: ['Unlimited conversations', 'All AI models', '24/7 support', 'Advanced analytics', 'Team collaboration']
        };
      
      default:
        return {
          maxSessions: 3,
          name: 'Free',
          features: ['Up to 3 conversations', 'Basic AI models', 'Standard support']
        };
    }
  }, [subscription]);

  /**
   * Check if user is limited by their subscription
   */
  const isLimited = useMemo(() => {
    return limits.maxSessions !== Infinity;
  }, [limits.maxSessions]);

  /**
   * Check if user can create more sessions
   */
  const canCreateMore = useMemo(() => {
    return currentSessionCount < limits.maxSessions;
  }, [currentSessionCount, limits.maxSessions]);

  /**
   * Get usage percentage
   */
  const usagePercentage = useMemo(() => {
    if (limits.maxSessions === Infinity) return 0;
    return Math.round((currentSessionCount / limits.maxSessions) * 100);
  }, [currentSessionCount, limits.maxSessions]);

  /**
   * Get warning message when approaching limit
   */
  const limitWarning = useMemo((): string | undefined => {
    if (!isLimited) return undefined;
    
    const remaining = limits.maxSessions - currentSessionCount;
    
    if (remaining <= 0) {
      return "You've reached your conversation limit. Upgrade to continue chatting.";
    }
    
    if (remaining === 1) {
      return 'Only 1 conversation slot remaining. Consider upgrading soon.';
    }
    
    if (usagePercentage >= 80) {
      return `${remaining} conversation slots remaining. You're almost at your limit.`;
    }
    
    return undefined;
  }, [isLimited, limits.maxSessions, currentSessionCount, usagePercentage]);

  /**
   * Get upgrade prompt message
   */
  const upgradePrompt = useMemo((): string | undefined => {
    if (!isLimited) return undefined;
    
    if (currentSessionCount >= limits.maxSessions) {
      return 'Upgrade to Pro for more conversations and premium features!';
    }
    
    if (usagePercentage >= 70) {
      return 'Running low on conversation slots? Upgrade for unlimited access!';
    }
    
    return undefined;
  }, [isLimited, currentSessionCount, limits.maxSessions, usagePercentage]);

  /**
   * Get status info for display
   */
  const statusInfo = useMemo(() => {
    if (!isLimited) {
      return {
        text: 'Unlimited conversations',
        color: 'success' as const,
        showBadge: false
      };
    }

    const remaining = limits.maxSessions - currentSessionCount;
    
    if (remaining <= 0) {
      return {
        text: `${currentSessionCount}/${limits.maxSessions} conversations (Limit reached)`,
        color: 'error' as const,
        showBadge: true
      };
    }
    
    if (usagePercentage >= 80) {
      return {
        text: `${currentSessionCount}/${limits.maxSessions} conversations`,
        color: 'warning' as const,
        showBadge: true
      };
    }
    
    return {
      text: `${currentSessionCount}/${limits.maxSessions} conversations`,
      color: 'info' as const,
      showBadge: true
    };
  }, [isLimited, limits.maxSessions, currentSessionCount, usagePercentage]);

  /**
   * Get next tier benefits
   */
  const nextTierBenefits = useMemo(() => {
    switch (subscription) {
      case 'free':
        return {
          tierName: 'Pro',
          benefits: [
            '25 conversations (vs 3)',
            'Premium AI models',
            'Export conversations',
            'Priority support'
          ],
          primaryBenefit: '22 more conversation slots'
        };
      
      case 'pro':
        return {
          tierName: 'Business',
          benefits: [
            'Unlimited conversations',
            'All AI models',
            '24/7 support',
            'Advanced analytics',
            'Team collaboration'
          ],
          primaryBenefit: 'Unlimited conversations'
        };
      
      default:
        return null;
    }
  }, [subscription]);

  /**
   * Check if should show upgrade nudge
   */
  const shouldShowUpgradeNudge = useMemo(() => {
    return isLimited && (
      usagePercentage >= 70 || 
      currentSessionCount >= limits.maxSessions
    );
  }, [isLimited, usagePercentage, currentSessionCount, limits.maxSessions]);

  return {
    maxSessions: limits.maxSessions,
    sessionCount: currentSessionCount,
    isLimited,
    canCreateMore,
    usagePercentage,
    limitWarning,
    upgradePrompt,
    statusInfo,
    nextTierBenefits,
    shouldShowUpgradeNudge,
    subscriptionName: limits.name,
    subscriptionFeatures: limits.features
  };
};