import React from 'react';
import { ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Box } from '../../atoms';
import { SettingsSection } from './SettingsSection';
import { 
  SettingItem, 
  SettingSwitch, 
  SettingButton, 
  SubscriptionCard 
} from '../../molecules/settings';

export interface SettingItemConfig {
  id: string;
  type: 'item' | 'switch' | 'button' | 'subscription' | 'custom';
  label: string;
  description?: string;
  value?: string | boolean;
  onPress?: () => void;
  onChange?: (value: boolean) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'brand';
  leftIcon?: string;
  rightIcon?: string;
  disabled?: boolean;
  loading?: boolean;
  component?: React.ReactNode;
  subscription?: {
    plan: 'free' | 'pro' | 'business';
    expiresAt?: Date;
    onUpgrade?: () => void;
    onManage?: () => void;
    features?: string[];
  };
  testID?: string;
}

export interface SettingSectionConfig {
  id: string;
  title: string;
  description?: string;
  items: SettingItemConfig[];
  animationDelay?: number;
}

export interface SettingsListProps {
  sections: SettingSectionConfig[];
  footer?: React.ReactNode;
  showsVerticalScrollIndicator?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SettingsList: React.FC<SettingsListProps> = ({
  sections,
  footer,
  showsVerticalScrollIndicator = false,
  style,
  contentContainerStyle,
  testID,
}) => {
  const renderSettingItem = (item: SettingItemConfig) => {
    switch (item.type) {
      case 'switch':
        return (
          <SettingSwitch
            key={item.id}
            testID={item.testID}
            label={item.label}
            description={item.description}
            value={item.value as boolean}
            onChange={item.onChange!}
            disabled={item.disabled}
            loading={item.loading}
            leftIcon={item.leftIcon}
          />
        );

      case 'button':
        return (
          <SettingButton
            key={item.id}
            testID={item.testID}
            label={item.label}
            description={item.description}
            variant={item.variant}
            onPress={item.onPress!}
            disabled={item.disabled}
            loading={item.loading}
            leftIcon={item.leftIcon}
            rightIcon={item.rightIcon}
          />
        );

      case 'subscription':
        return (
          <SubscriptionCard
            key={item.id}
            testID={item.testID}
            plan={item.subscription!.plan}
            expiresAt={item.subscription?.expiresAt}
            onUpgrade={item.subscription?.onUpgrade}
            onManage={item.subscription?.onManage}
            features={item.subscription?.features}
            loading={item.loading}
          />
        );

      case 'custom':
        return (
          <Box key={item.id} testID={item.testID}>
            {item.component}
          </Box>
        );

      case 'item':
      default:
        return (
          <SettingItem
            key={item.id}
            testID={item.testID}
            label={item.label}
            description={item.description}
            value={item.value as string}
            onPress={item.onPress}
            leftIcon={item.leftIcon}
            disabled={item.disabled}
          />
        );
    }
  };

  const scrollViewStyle = [
    styles.scrollView,
    style,
  ];

  const contentStyle = [
    styles.contentContainer,
    contentContainerStyle,
  ];

  return (
    <ScrollView
      style={scrollViewStyle}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      {sections.map((section, sectionIndex) => (
        <SettingsSection
          key={section.id}
          title={section.title}
          description={section.description}
          animationDelay={section.animationDelay || (sectionIndex + 1) * 100}
          testID={testID ? `${testID}-section-${section.id}` : undefined}
        >
          {section.items.map(renderSettingItem)}
        </SettingsSection>
      ))}

      {footer && (
        <Box 
          style={styles.footer}
          testID={testID ? `${testID}-footer` : undefined}
        >
          {footer}
        </Box>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});