import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/theme';
import { SheetHeader } from '@/components/molecules';

/**
 * Shared slide-up bottom-sheet shell for the Studio's config sheets, keeping
 * the exact frame the old in-screen settings sheet used.
 */
export const CreateSheetShell: React.FC<{
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
}> = ({ visible, title, onClose, children, testID }) => {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay} testID={testID}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.background }]}>
          <SheetHeader title={title} onClose={onClose} showHandle />
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '76%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
});

export default CreateSheetShell;
