import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ToastNotification } from '@/components/molecules/feedback/ToastNotification';
import { KeyboardAvoider, Typography } from '@/components/molecules';
import { useTheme } from '@/theme';
import { ErrorService } from '@/services/errors/ErrorService';
import GeneratedContentReportService, {
  type GeneratedContentReportReason,
  type GeneratedContentReportTarget,
} from '@/services/reports/GeneratedContentReportService';

interface GeneratedContentReportModalProps {
  visible: boolean;
  target: GeneratedContentReportTarget | null;
  onClose: () => void;
  onSubmitted?: () => void;
  presentation?: 'modal' | 'overlay';
}

const REPORT_REASON_OPTIONS: Array<{
  value: GeneratedContentReportReason;
  label: string;
}> = [
  { value: 'offensive', label: 'Offensive' },
  { value: 'hate_harassment', label: 'Hate or harassment' },
  { value: 'sexual_content', label: 'Sexual content' },
  { value: 'violence_self_harm', label: 'Violence or self-harm' },
  { value: 'child_safety', label: 'Child safety' },
  { value: 'deceptive_impersonation', label: 'Deceptive or impersonation' },
  { value: 'other', label: 'Other' },
];

const REPORT_SUCCESS_MESSAGE = 'Report submitted for review.';
const OVERLAY_SUCCESS_CLOSE_DELAY_MS = 1200;

export const GeneratedContentReportModal: React.FC<GeneratedContentReportModalProps> = ({
  visible,
  target,
  onClose,
  onSubmitted,
  presentation = 'modal',
}) => {
  const { theme } = useTheme();
  const [reason, setReason] = useState<GeneratedContentReportReason>('offensive');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearCloseTimer();
    if (visible) {
      setReason('offensive');
      setDetails('');
      setSubmitting(false);
      setSubmitted(false);
    }
  }, [clearCloseTimer, visible, target?.contentId]);

  useEffect(() => () => {
    clearCloseTimer();
  }, [clearCloseTimer]);

  const targetLabel = useMemo(() => (
    target?.title || 'AI-generated content'
  ), [target?.title]);

  const handleClose = useCallback(() => {
    clearCloseTimer();
    setSubmitted(false);
    onClose();
  }, [clearCloseTimer, onClose]);

  const handleSubmit = async () => {
    if (!target || submitting || submitted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setSubmitting(true);
    try {
      await GeneratedContentReportService.submitReport({
        target,
        reason,
        details: details.trim() || undefined,
      });
      onSubmitted?.();
      if (presentation === 'overlay') {
        setSubmitted(true);
        closeTimerRef.current = setTimeout(() => {
          closeTimerRef.current = null;
          setSubmitted(false);
          onClose();
        }, OVERLAY_SUCCESS_CLOSE_DELAY_MS);
      } else {
        ErrorService.showSuccess(REPORT_SUCCESS_MESSAGE, 'safety');
        onClose();
      }
    } catch (error) {
      ErrorService.handleWithToast(error, { feature: 'safety' });
    } finally {
      setSubmitting(false);
    }
  };

  const controlsDisabled = submitting || submitted;

  const content = (
    <KeyboardAvoider
      style={[
        styles.overlay,
        presentation === 'overlay' && styles.hostedOverlay,
      ]}
    >
      {presentation === 'overlay' && (
        <ToastNotification
          message={REPORT_SUCCESS_MESSAGE}
          severity="success"
          visible={submitted}
          onDismiss={() => setSubmitted(false)}
          duration={0}
          position="top"
        />
      )}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          },
        ]}
      >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Typography variant="title" weight="semibold">
                Report AI Content
              </Typography>
              <Typography variant="caption" color="secondary" numberOfLines={2}>
                {targetLabel}
              </Typography>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close report"
              style={[styles.closeButton, { backgroundColor: theme.colors.surface }]}
            >
              <Ionicons name="close-outline" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Typography variant="caption" weight="semibold" style={styles.fieldLabel}>
              Reason
            </Typography>
            <View style={styles.reasonGrid}>
              {REPORT_REASON_OPTIONS.map((option) => {
                const selected = reason === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setReason(option.value)}
                    disabled={controlsDisabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    testID={`generated-content-report-reason-${option.value}`}
                    style={[
                      styles.reasonChip,
                      {
                        backgroundColor: selected
                          ? theme.colors.primary[500]
                          : theme.colors.surface,
                        borderColor: selected
                          ? theme.colors.primary[500]
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Typography
                      variant="caption"
                      weight="semibold"
                      style={{ color: selected ? '#FFFFFF' : theme.colors.text.primary }}
                    >
                      {option.label}
                    </Typography>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Typography variant="caption" weight="semibold" style={styles.fieldLabel}>
              Details
            </Typography>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Optional"
              placeholderTextColor={theme.colors.text.secondary}
              multiline
              maxLength={1200}
              editable={!controlsDisabled}
              textAlignVertical="top"
              testID="generated-content-report-details"
              style={[
                styles.detailsInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text.primary,
                },
              ]}
            />
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={controlsDisabled}
              accessibilityRole="button"
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Typography variant="caption" weight="semibold">
                Cancel
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={controlsDisabled}
              accessibilityRole="button"
              accessibilityLabel="Submit content report"
              testID="generated-content-report-submit"
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.colors.error[500],
                  borderColor: theme.colors.error[500],
                },
                controlsDisabled && styles.disabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : submitted ? (
                <>
                  <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
                  <Typography variant="caption" weight="semibold" style={{ color: '#FFFFFF' }}>
                    Submitted
                  </Typography>
                </>
              ) : (
                <>
                  <Ionicons name="flag-outline" size={17} color="#FFFFFF" />
                  <Typography variant="caption" weight="semibold" style={{ color: '#FFFFFF' }}>
                    Submit
                  </Typography>
                </>
              )}
            </TouchableOpacity>
          </View>
      </View>
    </KeyboardAvoider>
  );

  if (presentation === 'overlay') {
    return visible && target ? content : null;
  }

  return (
    <Modal
      visible={visible && Boolean(target)}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardProvider>{content}</KeyboardProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  hostedOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    elevation: 20,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  fieldLabel: {
    marginTop: 10,
    marginBottom: 8,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  detailsInput: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  disabled: {
    opacity: 0.65,
  },
});

export default GeneratedContentReportModal;
