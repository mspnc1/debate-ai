import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, InfoButton } from '@/components/molecules';
import { useTheme } from '@/theme';
import { UNIVERSAL_PERSONALITIES } from '@/config/personalities';
import * as Haptics from 'expo-haptics';
import { PersonalityModal } from '../debate/PersonalityModal';
import { usePersonality } from '@/hooks/usePersonality';

interface PersonalityPickerProps {
  currentPersonalityId: string;
  onSelectPersonality: (personalityId: string) => void;
  aiName: string;
}

export const PersonalityPicker: React.FC<PersonalityPickerProps> = ({
  currentPersonalityId,
  onSelectPersonality,
  aiName,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { isCustomized } = usePersonality();

  const currentPersonality = UNIVERSAL_PERSONALITIES.find(p => p.id === currentPersonalityId) || UNIVERSAL_PERSONALITIES[0];
  const isCurrentCustomized = useMemo(() => isCustomized(currentPersonalityId), [isCustomized, currentPersonalityId]);

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
  };

  const handleSelect = (personalityId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectPersonality(personalityId);
    setIsOpen(false);
  };

  const availablePersonalities = UNIVERSAL_PERSONALITIES;

  return (
    <View style={styles.container}>
      {/* Label with InfoButton */}
      <View style={styles.labelRow}>
        <Typography variant="caption" color="secondary">
          Personality
        </Typography>
        <InfoButton topicId="personalities" size="small" />
      </View>

      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Personality: ${currentPersonality.name}`}
        accessibilityHint="Opens personality picker"
        testID="personality-picker-trigger"
        style={[
          styles.trigger,
          {
            padding: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.sm,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.triggerValue}>
          <View style={styles.nameRow}>
            <Typography variant="body" weight="medium">
              {currentPersonality.emoji} {currentPersonality.name}
            </Typography>
            {isCurrentCustomized && (
              <View
                style={[
                  styles.customizedDot,
                  { backgroundColor: theme.colors.primary[500] },
                ]}
              />
            )}
          </View>
          <Typography variant="caption" color="secondary" style={styles.tagline}>
            {currentPersonality.tagline}
          </Typography>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.text.secondary} />
      </TouchableOpacity>

      <PersonalityModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleSelect}
        selectedPersonalityId={currentPersonalityId}
        availablePersonalities={availablePersonalities}
        aiName={aiName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    width: '100%',
    minHeight: 44,
  },
  triggerValue: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customizedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  tagline: {
    marginTop: 2,
  },
});
