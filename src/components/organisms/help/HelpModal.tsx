/**
 * HelpModal
 *
 * Presents the HelpSheet in a native Modal, driven by navigation state.
 * GlobalSheets renders it from the root; sheets that are themselves native
 * Modals mount it via HelpModalHost instead, because a sibling Modal
 * silently fails to present on iOS while another native Modal is open.
 */

import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, clearSheet, hideHelpWebView } from '@/store';
import { useSheetContainerStyle } from '@/hooks/useSheetContainerStyle';
import { HelpSheet } from './HelpSheet';
import { HelpWebViewModal } from './HelpWebViewModal';

export const HelpModal: React.FC = () => {
  const dispatch = useDispatch();
  const { activeSheet, sheetVisible, helpWebViewUrl } = useSelector(
    (state: RootState) => state.navigation
  );
  const sheetContainerStyle = useSheetContainerStyle();

  if (!sheetVisible || activeSheet !== 'help') return null;

  const handleClose = () => dispatch(clearSheet());

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Dimmed backdrop that closes the sheet when tapped */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
        accessibilityLabel="Close help"
      />
      {/* Foreground - responsive: centered on iPad, slide-up on phone */}
      <View style={sheetContainerStyle}>
        <HelpSheet onClose={handleClose} />
      </View>
      {/* Nested so it can present above this Modal while help is open */}
      {helpWebViewUrl && (
        <HelpWebViewModal
          visible={true}
          url={helpWebViewUrl}
          title="Help"
          onClose={() => dispatch(hideHelpWebView())}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default HelpModal;
