import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography, InfoButton, ConfigRow } from '@/components/molecules';
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
  const [isOpen, setIsOpen] = useState(false);
  const { isCustomized } = usePersonality();

  const currentPersonality = UNIVERSAL_PERSONALITIES.find(p => p.id === currentPersonalityId) || UNIVERSAL_PERSONALITIES[0];
  const isCurrentCustomized = useMemo(() => isCustomized(currentPersonalityId), [isCustomized, currentPersonalityId]);

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

      <ConfigRow
        primary={`${currentPersonality.emoji} ${currentPersonality.name}`}
        secondary={currentPersonality.tagline}
        showIndicatorDot={isCurrentCustomized}
        onPress={() => setIsOpen(true)}
        accessibilityLabel={`Personality: ${currentPersonality.name}`}
        accessibilityHint="Opens personality picker"
        testID="personality-picker-trigger"
      />

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
});
