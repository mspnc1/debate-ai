import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

export type TextProps = RNTextProps;

export const Text: React.FC<TextProps> = (props) => {
  return <RNText {...props} />;
};