import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Typography } from '../molecules';
import { useTheme } from '../../theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  style,
}) => {
  const { theme } = useTheme();
  
  return (
    <View style={[{ marginBottom: theme.spacing.md }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        {icon && (
          <Typography style={{ fontSize: 20, marginRight: 8 }}>
            {icon}
          </Typography>
        )}
        <Typography variant="title" weight="semibold">
          {title}
        </Typography>
      </View>
      {subtitle && (
        <Typography variant="body" color="secondary">
          {subtitle}
        </Typography>
      )}
    </View>
  );
};