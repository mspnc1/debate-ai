import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from '../common/Typography';
import { useTheme } from '@/theme';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { openSubscriptionManagement } from '@/services/subscription/subscriptionManagement';

interface TrialBannerProps {
  testID?: string;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({ testID }) => {
  const { theme } = useTheme();
  const { isInTrial, trialDaysRemaining } = useFeatureAccess();

  if (!isInTrial || trialDaysRemaining == null) return null;

  const color = trialDaysRemaining <= 2 ? theme.colors.warning[500] : theme.colors.info[500];

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: color }]}
      onPress={() => {
        void openSubscriptionManagement();
      }}
      activeOpacity={0.9}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Manage subscription"
    >
      <Typography variant="caption" style={styles.text}>
        {trialDaysRemaining === 1 ? 'Trial ends tomorrow' : `${trialDaysRemaining} days left in trial`}
      </Typography>
      <Typography variant="caption" weight="semibold" style={styles.text}>
        Manage →
      </Typography>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  text: {
    color: 'white',
  },
});

export default TrialBanner;
