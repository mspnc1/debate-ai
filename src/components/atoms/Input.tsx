import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

export type InputProps = TextInputProps;

export const Input: React.FC<InputProps> = (props) => {
  return <TextInput {...props} />;
};