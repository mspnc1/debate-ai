import React from 'react';
import {
  KeyboardAvoidingView,
  KeyboardAvoidingViewProps,
  Platform,
  StyleSheet,
} from 'react-native';

/**
 * KeyboardAvoider
 *
 * Single source of truth for keyboard avoidance across screens. Wraps RN's
 * KeyboardAvoidingView with the one behavior combination that actually works in
 * this app: `padding` on iOS, `height` on Android.
 *
 * Screens must NOT hand-write the `behavior` ternary. An Android value of
 * `undefined` is a silent no-op (the view renders but never lifts), and that
 * mistake has repeatedly re-introduced the "keyboard covers the composer" bug
 * on new screens. Routing every screen through this wrapper keeps the fix in
 * exactly one place.
 *
 * Accepts every KeyboardAvoidingView prop, so `keyboardVerticalOffset` and a
 * custom `style` pass straight through. `behavior` may be overridden for genuine
 * edge cases, but prefer the platform-correct default.
 */
export type KeyboardAvoiderProps = KeyboardAvoidingViewProps;

export const KeyboardAvoider: React.FC<KeyboardAvoiderProps> = ({
  style,
  behavior,
  children,
  ...rest
}) => (
  <KeyboardAvoidingView
    style={style ?? styles.flex}
    behavior={behavior ?? (Platform.OS === 'ios' ? 'padding' : 'height')}
    {...rest}
  >
    {children}
  </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
