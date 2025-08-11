import React from 'react';
import { ActivityIndicator as RNActivityIndicator, ActivityIndicatorProps as RNActivityIndicatorProps } from 'react-native';

export type ActivityIndicatorProps = RNActivityIndicatorProps;

export const ActivityIndicator: React.FC<ActivityIndicatorProps> = (props) => {
  return <RNActivityIndicator {...props} />;
};