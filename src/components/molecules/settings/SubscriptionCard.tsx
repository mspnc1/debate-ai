import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Box } from '../../atoms';
import { Typography, Badge } from '../';
import { SettingButton } from './SettingButton';
import { useTheme } from '../../../theme';
import { SubscriptionPlan } from '../../../services/settings';

export interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  expiresAt?: Date;
  onUpgrade?: () => void;
  onManage?: () => void;
  features?: string[];
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  plan,
  expiresAt,
  onUpgrade,
  onManage,
  features = [],
  loading = false,
  style,
  testID,
}) => {
  const { theme } = useTheme();

  const getPlanDisplayName = (planType: SubscriptionPlan): string => {
    switch (planType) {
      case 'free':
        return 'Free Plan';
      case 'pro':
        return 'Pro Plan';
      case 'business':
        return 'Business Plan';
      default:
        return 'Unknown Plan';
    }
  };

  const getPlanBadgeVariant = (planType: SubscriptionPlan) => {
    switch (planType) {
      case 'free':
        return 'default' as const;
      case 'pro':
        return 'success' as const;
      case 'business':
        return 'warning' as const;
      default:
        return 'default' as const;
    }
  };

  const formatExpiryDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = (date: Date): number => {
    const now = new Date();
    const timeDiff = date.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const isPremium = plan !== 'free';
  const isExpiringSoon = expiresAt ? getDaysUntilExpiry(expiresAt) <= 7 : false;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      ...theme.shadows.sm,
    },
    isPremium && {
      borderWidth: 1,
      borderColor: theme.colors.primary[200],
    },
    style,
  ];

  return (
    <Box style={containerStyle} testID={testID}>
      {/* Header */}
      <Box style={styles.header}>
        <Box style={styles.planInfo}>
          <Typography 
            variant="subtitle" 
            weight="semibold"
          >
            {getPlanDisplayName(plan)}
          </Typography>
          
          <Box style={styles.badgeContainer}>
            <Badge
              label={plan.toUpperCase()}
              type={getPlanBadgeVariant(plan) === 'success' ? 'new' : getPlanBadgeVariant(plan) === 'warning' ? 'premium' : 'default'}
            />
          </Box>
        </Box>

        {isPremium && (
          <Typography 
            variant="caption" 
            color="secondary"
          >
            ✨ Premium
          </Typography>
        )}
      </Box>

      {/* Expiry Information */}
      {expiresAt && (
        <Box style={styles.expirySection}>
          <Typography 
            variant="caption" 
            color={isExpiringSoon ? 'error' : 'secondary'}
          >
            {isExpiringSoon 
              ? `⚠️ Expires in ${getDaysUntilExpiry(expiresAt)} days` 
              : `Expires on ${formatExpiryDate(expiresAt)}`
            }
          </Typography>
        </Box>
      )}

      {/* Features List */}
      {features.length > 0 && (
        <Box style={styles.featuresSection}>
          <Typography 
            variant="caption" 
            color="secondary" 
            style={styles.featuresTitle}
          >
            Included Features:
          </Typography>
          {features.slice(0, 3).map((feature, index) => (
            <Typography 
              key={index}
              variant="caption" 
              color="secondary"
              style={styles.featureItem}
            >
              • {feature}
            </Typography>
          ))}
          {features.length > 3 && (
            <Typography 
              variant="caption" 
              color="secondary"
              style={styles.featureItem}
            >
              + {features.length - 3} more features
            </Typography>
          )}
        </Box>
      )}

      {/* Actions */}
      <Box style={styles.actionsSection}>
        {plan === 'free' && onUpgrade && (
          <SettingButton
            label="Upgrade to Pro"
            variant="primary"
            onPress={onUpgrade}
            loading={loading}
            leftIcon="subscription"
            testID={testID ? `${testID}-upgrade-button` : undefined}
            accessibilityHint="Upgrade your subscription to unlock premium features"
          />
        )}

        {isPremium && onManage && (
          <SettingButton
            label="Manage Subscription"
            variant="secondary"
            onPress={onManage}
            loading={loading}
            leftIcon="settings"
            testID={testID ? `${testID}-manage-button` : undefined}
            accessibilityHint="Manage your current subscription"
          />
        )}
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planInfo: {
    flex: 1,
  },
  badgeContainer: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  expirySection: {
    marginBottom: 12,
  },
  featuresSection: {
    marginBottom: 16,
  },
  featuresTitle: {
    marginBottom: 4,
    fontWeight: '600',
  },
  featureItem: {
    marginLeft: 8,
    marginTop: 2,
  },
  actionsSection: {
    marginTop: 8,
  },
});