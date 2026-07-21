/**
 * PersonalityModal Component
 * Full-screen modal for selecting a personality with richer content
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Modal, View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../theme';
import { Typography } from '../../molecules';
import { SheetHeader } from '@/components/molecules';
import { GradientButton } from '../../molecules';
import { PersonalityOption } from '../../../config/personalities';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PersonalityOptionGrid } from '../personality/PersonalityOptionGrid';

const MODAL_TOP_MIN_CLEARANCE = 88;
const MODAL_TOP_SAFE_AREA_GAP = 40;

export interface PersonalityModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (personalityId: string) => void;
  selectedPersonalityId: string;
  availablePersonalities: PersonalityOption[];
  aiName?: string;
  disableBackdropDismiss?: boolean;
  testID?: string;
}

export const PersonalityModal: React.FC<PersonalityModalProps> = ({
  visible,
  onClose,
  onConfirm,
  selectedPersonalityId,
  availablePersonalities,
  aiName,
  disableBackdropDismiss = false,
  testID,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const modalTop = Math.max(MODAL_TOP_MIN_CLEARANCE, insets.top + MODAL_TOP_SAFE_AREA_GAP);
  const [localSelection, setLocalSelection] = useState<string>(selectedPersonalityId);

  useEffect(() => {
    if (visible) {
      setLocalSelection(selectedPersonalityId);
    }
  }, [selectedPersonalityId, visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [onClose, visible]);

  const canConfirm = useMemo(() => {
    return Boolean(localSelection);
  }, [localSelection]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      <View
        accessibilityViewIsModal
        style={StyleSheet.absoluteFill}
        testID={testID}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (!disableBackdropDismiss) onClose();
          }}
          style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        />
        <View
          testID="personality-modal-sheet"
          style={[styles.modalContainer, { top: modalTop, backgroundColor: theme.colors.background }]}
        >
          <SheetHeader title="Choose a Personality" onClose={onClose} showHandle />
          {aiName ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
              <Typography variant="caption" color="secondary">for {aiName}</Typography>
            </View>
          ) : null}

          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <PersonalityOptionGrid
              personalities={availablePersonalities}
              selectedPersonalityId={localSelection}
              onSelectPersonality={setLocalSelection}
            />
          </View>

          <View
            testID="personality-modal-action-bar"
            style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(16, insets.bottom + 12) }}
          >
            <GradientButton
              title="Use This Style"
              onPress={() => canConfirm && onConfirm(localSelection)}
              disabled={!canConfirm}
              gradient={theme.colors.gradients.primary}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
});

export default PersonalityModal;
