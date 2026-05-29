import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type EmitterSubscription,
  type KeyboardEvent,
} from 'react-native';
import { AudienceQuestionsModal } from '@/components/organisms/debate/AudienceQuestionsModal';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

let mockSafeAreaInsets = { top: 0, bottom: 34, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockSafeAreaInsets,
}));

const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

describe('AudienceQuestionsModal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockSafeAreaInsets = { top: 0, bottom: 34, left: 0, right: 0 };
    if (originalPlatformDescriptor) {
      Object.defineProperty(Platform, 'OS', originalPlatformDescriptor);
    }
  });

  it('requires both audience questions before submitting', () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(getByText('Submit Questions'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('audience-question-aff'), '  How would this work?  ');
    fireEvent.press(getByText('Submit Questions'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('audience-question-neg'), 'Why reject the motion?');
    fireEvent.press(getByText('Submit Questions'));

    expect(onSubmit).toHaveBeenCalledWith({
      aff: 'How would this work?',
      neg: 'Why reject the motion?',
    });
  });

  it('pads the submit action above the bottom system inset', () => {
    const { getByTestId, UNSAFE_getByType } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={jest.fn()}
      />
    );

    const scrollView = UNSAFE_getByType(ScrollView);
    const footer = getByTestId('audience-questions-footer');

    expect(StyleSheet.flatten(footer.props.style)).toEqual(
      expect.objectContaining({ paddingBottom: 50 })
    );
    expect(StyleSheet.flatten(scrollView.props.contentContainerStyle)).toEqual(
      expect.objectContaining({ paddingBottom: 4 })
    );
  });

  it('uses the shared sheet header shell without exposing a fake close action', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={jest.fn()}
      />
    );

    expect(getByTestId('audience-questions-header')).toBeTruthy();
    expect(queryByTestId('audience-questions-header-close')).toBeNull();
  });

  it('keeps the standard full-height bottom sheet position for keyboard resizing', () => {
    const { UNSAFE_getByType } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={jest.fn()}
      />
    );

    const keyboardAvoidingView = UNSAFE_getByType(KeyboardAvoidingView);

    expect(keyboardAvoidingView.props.pointerEvents).toBe('box-none');
    expect(StyleSheet.flatten(keyboardAvoidingView.props.style)).toEqual(
      expect.objectContaining({
        flex: 1,
        justifyContent: 'flex-end',
      })
    );
  });

  it('uses the measured Android keyboard height when modal window resize is unavailable', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const keyboardListeners: Partial<Record<'keyboardDidShow' | 'keyboardDidHide', (event: KeyboardEvent) => void>> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation((eventName, listener) => {
      keyboardListeners[eventName as keyof typeof keyboardListeners] = listener as (event: KeyboardEvent) => void;
      return { remove: jest.fn() } as unknown as EmitterSubscription;
    });

    const { UNSAFE_getAllByType, UNSAFE_getByType } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={jest.fn()}
      />
    );

    const sheet = UNSAFE_getAllByType(View).find((view) => {
      const style = StyleSheet.flatten(view.props.style);
      return style?.borderTopLeftRadius === 24;
    });
    const keyboardAvoidingView = UNSAFE_getByType(KeyboardAvoidingView);

    expect(keyboardAvoidingView.props.behavior).toBeUndefined();
    expect(StyleSheet.flatten(sheet?.props.style)).toEqual(
      expect.objectContaining({
        maxHeight: '88%',
      })
    );
    expect(StyleSheet.flatten(keyboardAvoidingView.props.style).paddingBottom).toBeUndefined();

    act(() => {
      keyboardListeners.keyboardDidShow?.({
        endCoordinates: { height: 312 },
      } as unknown as KeyboardEvent);
    });

    expect(StyleSheet.flatten(keyboardAvoidingView.props.style)).toEqual(
      expect.objectContaining({
        flex: 1,
        justifyContent: 'flex-end',
        paddingBottom: 312,
      })
    );
  });

  it('keeps Android modal system bars non-translucent so bottom controls clear the navigation bar', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

    const { UNSAFE_getByType } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={jest.fn()}
      />
    );

    const modal = UNSAFE_getByType(Modal);

    expect(modal.props.statusBarTranslucent).toBe(false);
    expect(modal.props.navigationBarTranslucent).toBe(false);
  });

  it('keeps Android bottom controls clear when the device reports no bottom inset', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    mockSafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

    const { getByTestId } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={jest.fn()}
      />
    );

    const footer = getByTestId('audience-questions-footer');

    expect(StyleSheet.flatten(footer.props.style)).toEqual(
      expect.objectContaining({ paddingBottom: 40 })
    );
  });

  it('does not stack Android navigation padding above the visible keyboard', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    mockSafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };
    const keyboardListeners: Partial<Record<'keyboardDidShow' | 'keyboardDidHide', (event: KeyboardEvent) => void>> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation((eventName, listener) => {
      keyboardListeners[eventName as keyof typeof keyboardListeners] = listener as (event: KeyboardEvent) => void;
      return { remove: jest.fn() } as unknown as EmitterSubscription;
    });

    const { getByTestId } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={jest.fn()}
      />
    );

    act(() => {
      keyboardListeners.keyboardDidShow?.({
        endCoordinates: { height: 312 },
      } as unknown as KeyboardEvent);
    });

    const footer = getByTestId('audience-questions-footer');

    expect(StyleSheet.flatten(footer.props.style)).toEqual(
      expect.objectContaining({ paddingBottom: 16 })
    );
  });

  it('explicitly requests the soft keyboard when inputs receive focus', () => {
    const { getByTestId } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={jest.fn()}
      />
    );

    expect(getByTestId('audience-question-aff').props.showSoftInputOnFocus).toBe(true);
    expect(getByTestId('audience-question-neg').props.showSoftInputOnFocus).toBe(true);
  });
});
