import React from 'react';
import { StyleSheet } from 'react-native';
import {
  KeyboardAvoidingView,
  type KeyboardAvoidingViewProps,
} from 'react-native-keyboard-controller';

/**
 * KeyboardAvoider
 *
 * Single source of truth for keyboard avoidance across screens. Wraps
 * `react-native-keyboard-controller`'s `KeyboardAvoidingView` — NOT React
 * Native's built-in one.
 *
 * Why the library: the app is edge-to-edge (`edgeToEdgeEnabled=true`) on the
 * new architecture (RN 0.83 / Expo 55). Under that config, RN's built-in
 * `KeyboardAvoidingView` cannot reliably read the IME inset on Android —
 * `adjustResize` no longer shrinks the window, so `'height'`/`'padding'`/
 * `undefined` all behave inconsistently across devices. The library reads the
 * real keyboard frame natively and works identically on both platforms, so we
 * default to `behavior="padding"` everywhere.
 *
 * Requires a `<KeyboardProvider>` above it in the tree. The app root
 * (`App.tsx`) mounts one. Content rendered inside a native `<Modal>` lives in a
 * separate window that the root provider does not reach, so those modals mount
 * their own nested `<KeyboardProvider>` around this component.
 *
 * Screens must NOT hand-write the `behavior` ternary. Routing every screen
 * through this wrapper keeps the fix in exactly one place; the old
 * `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` pattern silently
 * no-oped on Android and repeatedly reintroduced the "keyboard covers the
 * composer" bug.
 *
 * Accepts every library `KeyboardAvoidingView` prop, so `keyboardVerticalOffset`
 * and a custom `style` pass straight through. `behavior` may be overridden for
 * genuine edge cases, but prefer the default.
 */
// The library types `KeyboardAvoidingViewProps` as a discriminated union:
// `behavior: 'position'` correlates with `contentContainerStyle`. The wrapper
// doesn't manage `contentContainerStyle`, and the app only ever needs
// `padding`/`height`, so we drop the `position` variant. This keeps `behavior`
// a plain string (no union to narrow) and lets us default it cleanly.
export type KeyboardAvoiderProps = Omit<
  KeyboardAvoidingViewProps,
  'behavior' | 'contentContainerStyle'
> & {
  behavior?: 'padding' | 'height';
};

export const KeyboardAvoider: React.FC<KeyboardAvoiderProps> = ({
  style,
  behavior = 'padding',
  children,
  ...rest
}) => (
  <KeyboardAvoidingView behavior={behavior} style={style ?? styles.flex} {...rest}>
    {children}
  </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
