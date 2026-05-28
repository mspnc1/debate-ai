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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Typography } from '@/components/molecules';
import { useTheme } from '@/theme';
import type { OxfordAudienceQuestions } from '@/config/debate/formats';

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
  const bottomSystemInset = Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 0);

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
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      navigationBarTranslucent={false}
      onRequestClose={() => undefined}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={[styles.sheet, { backgroundColor: theme.colors.background }]}>
            <View style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.content,
                { paddingBottom: bottomSystemInset + 28 },
              ]}
            >
              <Typography variant="heading" weight="bold" align="center" style={styles.title}>
                {title}
              </Typography>
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
                  textAlignVertical="top"
                  accessibilityLabel={`Question for ${negativeLabel}`}
                />
              </View>

              <Button
                title="Submit Questions"
                onPress={() => onSubmit(trimmedQuestions)}
                disabled={!canSubmit}
                fullWidth
                accessibilityHint="Submits both audience questions and continues the debate."
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    marginBottom: 8,
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
});
