import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '../../theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  style?: ViewStyle;
  onAction?: () => void;
  actionLabel?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  style,
  onAction,
  actionLabel,
}) => {
  const { theme } = useTheme();
  
  return (
    <View style={[{ marginBottom: theme.spacing.md }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon && (
            <Typography style={{ fontSize: 20, marginRight: 8 }}>
              {icon}
            </Typography>
          )}
          <Typography variant="title" weight="semibold">
            {title}
          </Typography>
        </View>
        {onAction && actionLabel && (
          <TouchableOpacity onPress={onAction}>
            <Typography 
              variant="body" 
              color="primary"
              style={{ paddingHorizontal: theme.spacing.sm }}
            >
              {actionLabel}
            </Typography>
          </TouchableOpacity>
        )}
      </View>
      {subtitle && (
        <Typography variant="body" color="secondary">
          {subtitle}
        </Typography>
      )}
    </View>
  );
};