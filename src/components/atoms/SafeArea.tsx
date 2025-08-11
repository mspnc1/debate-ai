import React from 'react';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

export type SafeAreaProps = SafeAreaViewProps;

export const SafeArea: React.FC<SafeAreaProps> = (props) => {
  return <SafeAreaView {...props} />;
};