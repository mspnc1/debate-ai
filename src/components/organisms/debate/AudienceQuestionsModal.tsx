import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, SheetHeader, Typography } from '@/components/molecules';
import { useTheme } from '@/theme';
import type { OxfordAudienceQuestions } from '@/config/debate/formats';

const FOOTER_PADDING = 16;

export interface AudienceQuestionsModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  affirmativeLabel?: string;
  negativeLabel?: string;
  onSubmit: (questions: OxfordAudienceQuestions) => void;
}

export const AudienceQuestionsModal: React.FC<AudienceQuestionsModalProps> = ({
  visible,
  title = 'Audience questions',
  message = 'Enter one question for each side before the debate continues.',
  affirmativeLabel = 'Affirmative',
  negativeLabel = 'Negative',
  onSubmit,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [affirmativeQuestion, setAffirmativeQuestion] = useState('');
  const [negativeQuestion, setNegativeQuestion] = useState('');

  useEffect(() => {
    if (!visible) {
      setAffirmativeQuestion('');
      setNegativeQuestion('');
    }
  }, [visible]);

  const trimmedQuestions = useMemo<OxfordAudienceQuestions>(() => ({
    aff: affirmativeQuestion.trim(),
    neg: negativeQuestion.trim(),
  }), [affirmativeQuestion, negativeQuestion]);

  const canSubmit = Boolean(trimmedQuestions.aff && trimmedQuestions.neg);
  // Android edge-to-edge modal windows may not reserve navigation-bar space.
  const bottomSystemInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      color: theme.colors.text.primary,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent={false}
      navigationBarTranslucent={false}
      onRequestClose={() => undefined}
    >
      <BlurView intensity={20} style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetPosition}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <SheetHeader title={title} showHandle testID="audience-questions-header" />

            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              <Typography variant="body" color="secondary" align="center" style={styles.message}>
                {message}
              </Typography>

              <View style={styles.fieldGroup}>
                <Typography variant="caption" weight="semibold" style={styles.label}>
                  Question for {affirmativeLabel}
                </Typography>
                <TextInput
                  testID="audience-question-aff"
                  value={affirmativeQuestion}
                  onChangeText={setAffirmativeQuestion}
                  placeholder="What should the Affirmative team answer?"
                  placeholderTextColor={theme.colors.text.disabled}
                  style={inputStyle}
                  multiline
                  numberOfLines={4}
                  showSoftInputOnFocus
                  textAlignVertical="top"
                  accessibilityLabel={`Question for ${affirmativeLabel}`}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Typography variant="caption" weight="semibold" style={styles.label}>
                  Question for {negativeLabel}
                </Typography>
                <TextInput
                  testID="audience-question-neg"
                  value={negativeQuestion}
                  onChangeText={setNegativeQuestion}
                  placeholder="What should the Negative team answer?"
                  placeholderTextColor={theme.colors.text.disabled}
                  style={inputStyle}
                  multiline
                  numberOfLines={4}
                  showSoftInputOnFocus
                  textAlignVertical="top"
                  accessibilityLabel={`Question for ${negativeLabel}`}
                />
              </View>
            </ScrollView>

            <View
              testID="audience-questions-footer"
              style={[
                styles.footer,
                {
                  borderTopColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                  paddingBottom: FOOTER_PADDING + bottomSystemInset,
                },
              ]}
            >
              <Button
                title="Submit Questions"
                onPress={() => onSubmit(trimmedQuestions)}
                disabled={!canSubmit}
                fullWidth
                accessibilityHint="Submits both audience questions and continues the debate."
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheetPosition: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  scroll: {
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  message: {
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    minHeight: 104,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: FOOTER_PADDING,
  },
});
