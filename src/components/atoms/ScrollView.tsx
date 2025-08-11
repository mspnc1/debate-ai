import React from 'react';
import { ScrollView as RNScrollView, ScrollViewProps as RNScrollViewProps } from 'react-native';

export type ScrollViewProps = RNScrollViewProps;

export const ScrollView: React.FC<ScrollViewProps> = (props) => {
  return <RNScrollView {...props} />;
};