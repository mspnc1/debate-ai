/**
 * ModalHeader Component
 * Reusable modal header with title and close button following atomic design principles
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '../../theme';

export interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onClose,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <Typography variant="title" weight="bold">
        {title}
      </Typography>
      <TouchableOpacity 
        onPress={onClose}
        style={[styles.closeButton, { backgroundColor: theme.colors.surface }]}
        activeOpacity={0.7}
      >
        <Typography variant="body" weight="bold" style={styles.closeIcon}>
          ✕
        </Typography>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
  },
});

export default ModalHeader;