import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { render } from '@testing-library/react-native';
import { KeyboardAvoider } from '@/components/molecules/common/KeyboardAvoider';

// `react-native-keyboard-controller` is mocked in jest.setup.ts; its
// `KeyboardAvoidingView` resolves to a plain host view, so we can assert the
// props the wrapper forwards to it.

describe('KeyboardAvoider', () => {
  const renderWrapper = (props: React.ComponentProps<typeof KeyboardAvoider> = {}) =>
    render(
      <KeyboardAvoider {...props}>
        <Text>content</Text>
      </KeyboardAvoider>
    );

  it("defaults to the library's padding behavior on both platforms", () => {
    const { UNSAFE_getByType } = renderWrapper();
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('padding');
  });

  it('applies a default flex:1 style when none is provided', () => {
    const { UNSAFE_getByType } = renderWrapper();
    expect(StyleSheet.flatten(UNSAFE_getByType(KeyboardAvoidingView).props.style)).toEqual(
      expect.objectContaining({ flex: 1 })
    );
  });

  it('forwards style, keyboardVerticalOffset and pointerEvents', () => {
    const { UNSAFE_getByType } = renderWrapper({
      style: { justifyContent: 'flex-end' },
      keyboardVerticalOffset: 12,
      pointerEvents: 'box-none',
    });
    const kav = UNSAFE_getByType(KeyboardAvoidingView);
    expect(StyleSheet.flatten(kav.props.style)).toEqual(
      expect.objectContaining({ justifyContent: 'flex-end' })
    );
    expect(kav.props.keyboardVerticalOffset).toBe(12);
    expect(kav.props.pointerEvents).toBe('box-none');
  });

  it('allows the behavior to be overridden', () => {
    const { UNSAFE_getByType } = renderWrapper({ behavior: 'height' });
    expect(UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe('height');
  });
});
