import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Typography } from './Typography';
import { useTheme, type Theme } from '@/theme';

export interface ContextBarItem {
  label?: string;
  value: string;
  accentColor?: string;
  testID?: string;
}

interface ContextBarProps {
  title?: string;
  subtitle?: string;
  items?: ContextBarItem[];
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ContextBar: React.FC<ContextBarProps> = ({
  title,
  subtitle,
  items,
  rightElement,
  children,
  style,
  testID,
}) => {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme, isDark);
  const hasText = Boolean(title || subtitle);
  const hasItems = Boolean(items?.length);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.main}>
        {hasText && (
          <View style={styles.copy}>
            {title && (
              <Typography variant="body" weight="semibold" color="primary" numberOfLines={1}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="secondary" numberOfLines={2}>
                {subtitle}
              </Typography>
            )}
          </View>
        )}

        {hasItems && (
          <View style={styles.items}>
            {items?.map((item) => (
              <View key={`${item.label ?? 'item'}-${item.value}`} style={styles.item} testID={item.testID}>
                {item.accentColor && <View style={[styles.itemAccent, { backgroundColor: item.accentColor }]} />}
                <View style={styles.itemCopy}>
                  {item.label && (
                    <Typography variant="caption" color="secondary" weight="semibold" numberOfLines={1}>
                      {item.label}
                    </Typography>
                  )}
                  <Typography variant="caption" weight="semibold" color="primary" numberOfLines={1}>
                    {item.value}
                  </Typography>
                </View>
              </View>
            ))}
          </View>
        )}

        {children}
      </View>

      {rightElement && <View style={styles.right}>{rightElement}</View>}
    </View>
  );
};

const createStyles = (theme: Theme, isDark: boolean) => StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.shadowDark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.18 : 0.06,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing.xs,
  },
  copy: {
    minWidth: 0,
  },
  items: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  item: {
    minHeight: 32,
    maxWidth: '48%',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: isDark ? theme.colors.overlays.soft : theme.colors.background,
  },
  itemAccent: {
    width: 4,
  },
  itemCopy: {
    minWidth: 0,
    flexShrink: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  right: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
