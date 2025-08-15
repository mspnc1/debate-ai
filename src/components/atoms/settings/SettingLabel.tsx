import React from 'react';
import { Typography } from '../../molecules';

export interface SettingLabelProps {
  text: string;
  variant?: 'primary' | 'secondary';
  weight?: 'normal' | 'semibold' | 'bold';
  accessibilityLabel?: string;
  testID?: string;
}

export const SettingLabel: React.FC<SettingLabelProps> = ({
  text,
  variant = 'primary',
  weight = 'semibold',
}) => {
  return (
    <Typography
      variant="subtitle"
      weight={weight}
      color={variant === 'primary' ? 'primary' : 'secondary'}
    >
      {text}
    </Typography>
  );
};