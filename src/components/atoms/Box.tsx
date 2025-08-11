import React from 'react';
import { View, ViewProps } from 'react-native';

export type BoxProps = ViewProps;

export const Box: React.FC<BoxProps> = (props) => {
  return <View {...props} />;
};