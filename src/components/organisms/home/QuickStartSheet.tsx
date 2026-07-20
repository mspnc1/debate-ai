import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  DEFAULT_QUICK_START_TEMPLATE_ID,
  QuickStartTemplate,
  QuickStartTemplateId,
} from '@/config/quickStartTemplates';
import { QuickStartPromptPayload, QuickStartService } from '@/services/home/QuickStartService';
import { GradientButton, InputField, KeyboardAvoider, SheetHeader, Typography } from '@/components/molecules';
import { useTheme } from '@/theme';

interface QuickStartSheetProps {
  visible: boolean;
  templates: QuickStartTemplate[];
  onClose: () => void;
  onStart: (payload: QuickStartPromptPayload) => void;
}

export const QuickStartSheet: React.FC<QuickStartSheetProps> = ({
  visible,
  templates,
  onClose,
  onStart,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedTemplateId, setSelectedTemplateId] = useState<QuickStartTemplateId>(DEFAULT_QUICK_START_TEMPLATE_ID);
  const [promptText, setPromptText] = useState('');

  const promptPayload = useMemo(() => {
    if (!promptText.trim()) {
      return null;
    }
    return QuickStartService.buildPrompt(selectedTemplateId, promptText);
  }, [promptText, selectedTemplateId]);

  const handleClose = () => {
    setSelectedTemplateId(DEFAULT_QUICK_START_TEMPLATE_ID);
    setPromptText('');
    onClose();
  };

  const handleSelect = (templateId: QuickStartTemplateId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTemplateId(templateId);
  };

  const handleStart = () => {
    if (!promptPayload) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onStart(promptPayload);
    setSelectedTemplateId(DEFAULT_QUICK_START_TEMPLATE_ID);
    setPromptText('');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <KeyboardProvider>
        <View style={styles.backdrop}>
          <TouchableOpacity
            testID="quick-start-backdrop"
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close Quick Start"
          />
          <KeyboardAvoider
            style={styles.sheetPosition}
            pointerEvents="box-none"
          >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.background,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <SheetHeader title="Quick Start" onClose={handleClose} showHandle testID="quick-start-header" />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.content, { padding: theme.spacing.lg }]}
            >
              <Typography variant="body" color="secondary" style={styles.intro}>
                Enter what you want to chat about, then choose how the first response should be shaped.
              </Typography>

              <InputField
                label="Prompt"
                placeholder="What do you want to talk through?"
                value={promptText}
                onChangeText={setPromptText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                inputStyle={styles.promptInput}
                helperText="This will be sent as your first chat message."
              />

              <Typography variant="caption" color="secondary" weight="semibold" style={styles.sectionLabel}>
                Response Style
              </Typography>
              <View style={styles.templateGrid}>
                {templates.map(template => {
                  const selected = template.id === selectedTemplateId;

                  return (
                    <TouchableOpacity
                      key={template.id}
                      testID={`quick-start-template-${template.id}`}
                      onPress={() => handleSelect(template.id)}
                      activeOpacity={0.82}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={template.title}
                      style={[
                        styles.templateCard,
                        {
                          backgroundColor: selected
                            ? (isDark ? theme.colors.overlays.medium : theme.colors.primary[50])
                            : theme.colors.card,
                          borderColor: selected ? theme.colors.primary[400] : theme.colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons
                          name={template.icon as keyof typeof Ionicons.glyphMap}
                          size={20}
                          color={selected ? theme.colors.primary[600] : theme.colors.text.secondary}
                        />
                      </View>
                      <View style={styles.templateText}>
                        <Typography variant="body" weight="semibold">
                          {template.title}
                        </Typography>
                        <Typography variant="caption" color="secondary" numberOfLines={2}>
                          {template.subtitle}
                        </Typography>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View
                style={[
                  styles.preview,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Typography variant="caption" color="secondary" weight="semibold" style={styles.previewLabel}>
                  Preview
                </Typography>
                <Typography variant="body" selectable>
                  {promptPayload?.userPrompt || 'Enter a prompt to preview the first message.'}
                </Typography>
              </View>
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  borderTopColor: theme.colors.border,
                  paddingHorizontal: theme.spacing.lg,
                  paddingTop: theme.spacing.md,
                  paddingBottom: theme.spacing.lg,
                },
              ]}
            >
              <GradientButton
                title="Start Chat"
                onPress={handleStart}
                disabled={!promptPayload}
                gradient={theme.colors.gradients.ocean}
                fullWidth
                hapticType="medium"
              />
            </View>
          </View>
          </KeyboardAvoider>
        </View>
      </KeyboardProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  },
  content: {
    gap: 16,
  },
  intro: {
    marginBottom: 2,
  },
  templateGrid: {
    gap: 10,
  },
  templateCard: {
    minHeight: 76,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateText: {
    flex: 1,
    gap: 2,
  },
  promptInput: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    textTransform: 'uppercase',
  },
  preview: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 12,
  },
  previewLabel: {
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
