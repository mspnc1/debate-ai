import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Text as RNText } from 'react-native';
import { Box } from '../../atoms';
import { useTheme } from '../../../theme';

export interface ChatInputBarProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  inputText,
  onInputChange,
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  multiline = true,
}) => {
  const { theme } = useTheme();
  const canSend = inputText.trim().length > 0 && !disabled;
  
  const handleSend = () => {
    if (canSend) {
      onSend();
    }
  };

  return (
    <Box style={[
      styles.inputContainer,
      {
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
      }
    ]}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.xl,
            color: theme.colors.text.primary,
            maxHeight: 100,
          }
        ]}
        value={inputText}
        onChangeText={onInputChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.secondary}
        multiline={multiline}
        editable={!disabled}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          {
            backgroundColor: canSend ? theme.colors.primary[500] : theme.colors.gray[400],
          }
        ]}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.7}
      >
        <RNText style={styles.sendButtonText}>↑</RNText>
      </TouchableOpacity>
    </Box>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});