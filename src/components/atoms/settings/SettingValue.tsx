import React from 'react';
import { StyleSheet } from 'react-native';
import { Typography } from '../../molecules';
import { Badge } from '../../molecules';
import { useTheme } from '../../../theme';

export interface SettingValueProps {
  value: string | number;
  type?: 'text' | 'number' | 'badge';
  badgeVariant?: 'default' | 'success' | 'warning' | 'error';
  accessibilityLabel?: string;
  testID?: string;
}

export const SettingValue: React.FC<SettingValueProps> = ({
  value,
  type = 'text',
  badgeVariant = 'default',
}) => {
  const { theme } = useTheme();

  const displayValue = typeof value === 'number' ? value.toString() : value;

  if (type === 'badge') {
    return (
      <Badge
        label={displayValue}
        type={badgeVariant === 'default' ? 'default' : badgeVariant === 'success' ? 'new' : badgeVariant === 'warning' ? 'premium' : 'default'}
      />
    );
  }

  return (
    <Typography
      variant="body"
      color="secondary"
      style={{
        ...styles.value,
        ...(type === 'number' ? styles.numberValue : {}),
        color: theme.colors.text.secondary
      }}
    >
      {displayValue}
    </Typography>
  );
};

const styles = StyleSheet.create({
  value: {
    textAlign: 'right',
  },
  numberValue: {
    fontVariant: ['tabular-nums'],
  },
});