import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

// Settings Service Types
export interface AppSettings {
  themeMode: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  privacy: {
    analyticsEnabled: boolean;
    crashReportingEnabled: boolean;
  };
  accessibility: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    reducedMotion: boolean;
  };
  version: string;
}

// Theme Service Types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemePreferences {
  mode: ThemeMode;
  lastResolvedTheme: ResolvedTheme;
  systemThemeEnabled: boolean;
}

// Subscription Service Types
export type SubscriptionPlan = 'free' | 'pro' | 'business';

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  isActive: boolean;
  expiresAt?: Date;
  features: string[];
  purchaseDate?: Date;
  cancelledAt?: Date;
  willRenew: boolean;
}

export interface PlanFeatures {
  [key: string]: boolean | number;
  maxChatSessions: number;
  maxDebates: number;
  customTopics: boolean;
  expertMode: boolean;
  personalityVariants: number;
  prioritySupport: boolean;
  dataExport: boolean;
  advancedAnalytics: boolean;
}

export interface SubscriptionExpiryInfo {
  daysRemaining: number;
  willExpire: boolean;
}

// Hook Return Types
export interface UseSettingsReturn {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => Promise<void>;
  resetSettings: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  exportSettings: () => Promise<string>;
  importSettings: (settingsJson: string) => Promise<void>;
}

export interface UseThemeSettingsReturn {
  themeMode: ThemeMode;
  isDark: boolean;
  isLight: boolean;
  isSystemMode: boolean;
  systemTheme: ResolvedTheme;
  isLoading: boolean;
  error: string | null;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  resetToSystemTheme: () => Promise<void>;
}

export interface UseSubscriptionSettingsReturn {
  subscription: SubscriptionStatus;
  currentPlan: SubscriptionPlan;
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  expiryInfo: SubscriptionExpiryInfo | null;
  planFeatures: PlanFeatures;
  canAccessFeature: (feature: keyof PlanFeatures) => Promise<boolean>;
  getFeatureLimit: (feature: keyof PlanFeatures) => Promise<number>;
  upgradeToPro: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

export interface UseAuthSettingsReturn {
  currentUser: unknown; // This should match your user type from Redux
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  signOutWithConfirmation: () => void;
  clearError: () => void;
}

// Component Props Types
export interface SettingLabelProps {
  text: string;
  variant?: 'primary' | 'secondary';
  weight?: 'normal' | 'semibold' | 'bold';
  accessibilityLabel?: string;
  testID?: string;
}

export interface SettingValueProps {
  value: string | number;
  type?: 'text' | 'number' | 'badge';
  badgeVariant?: 'default' | 'success' | 'warning' | 'error';
  accessibilityLabel?: string;
  testID?: string;
}

export interface SettingIconProps {
  name: string;
  size?: number;
  color?: string;
  accessibilityLabel?: string;
  testID?: string;
}

export interface SettingItemProps {
  label: string;
  description?: string;
  value?: string | boolean;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  leftIcon?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export interface SettingSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: string;
  hapticFeedback?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

export interface SettingButtonProps {
  label: string;
  description?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'brand';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

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

export interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  animationDelay?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  animationDelay?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Settings List Configuration Types
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
    plan: SubscriptionPlan;
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

// Screen Props Types
export interface SettingsScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
    canGoBack: () => boolean;
  };
  route?: {
    params?: Record<string, unknown>;
  };
}

// Service Configuration Types
export interface SettingsServiceConfig {
  storageKey: string;
  version: string;
  enableMigration: boolean;
  enableValidation: boolean;
}

export interface ThemeServiceConfig {
  storageKey: string;
  enableSystemThemeDetection: boolean;
  enableAnimations: boolean;
}

export interface SubscriptionServiceConfig {
  storageKey: string;
  enableAutoRefresh: boolean;
  refreshInterval: number;
  enableReceiptValidation: boolean;
}

// Error Types
export interface SettingsError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ThemeError extends SettingsError {
  type: 'theme_load_error' | 'theme_save_error' | 'theme_migration_error';
}

export interface SubscriptionError extends SettingsError {
  type: 'subscription_load_error' | 'purchase_error' | 'validation_error';
}

// Event Types
export interface SettingsChangeEvent {
  key: keyof AppSettings;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
}

export interface ThemeChangeEvent {
  oldTheme: ResolvedTheme;
  newTheme: ResolvedTheme;
  mode: ThemeMode;
  timestamp: Date;
}

export interface SubscriptionChangeEvent {
  oldPlan: SubscriptionPlan;
  newPlan: SubscriptionPlan;
  timestamp: Date;
}

// Validation Types
export interface SettingsValidationRule {
  key: keyof AppSettings;
  validator: (value: unknown) => boolean;
  errorMessage: string;
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: string[];
}

// Migration Types
export interface SettingsMigration {
  fromVersion: string;
  toVersion: string;
  migrator: (oldSettings: Record<string, unknown>) => AppSettings;
}

// Export utility types
export type SettingsKey = keyof AppSettings;
export type PlanFeatureKey = keyof PlanFeatures;
export type SettingItemType = SettingItemConfig['type'];
export type ButtonVariant = SettingButtonProps['variant'];
export type BadgeVariant = SettingValueProps['badgeVariant'];

