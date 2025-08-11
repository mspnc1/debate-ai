import React from 'react';
import { Image as RNImage, ImageProps as RNImageProps } from 'react-native';

export type ImageProps = RNImageProps;

export const Image: React.FC<ImageProps> = (props) => {
  return <RNImage {...props} />;
};