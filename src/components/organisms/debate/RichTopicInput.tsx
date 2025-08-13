/**
 * RichTopicInput Component
 * Enhanced text input with formatting options for debate topics
 */

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { GlassCard } from '../../molecules/GlassCard';
import { Typography } from '../../molecules/Typography';
import { useTheme } from '../../../theme';

export interface TextFormatting {
  bold: boolean;
  italic: boolean;
}

export interface RichTopicInputProps {
  value: string;
  onChange: (text: string, formatting: TextFormatting) => void;
  maxLength?: number;
  placeholder?: string;
}

export const RichTopicInput: React.FC<RichTopicInputProps> = ({
  value,
  onChange,
  maxLength = 200,
  placeholder = "Enter your custom debate topic...",
}) => {
  const { theme } = useTheme();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const handleTextChange = (text: string) => {
    onChange(text, { bold: isBold, italic: isItalic });
  };
  
  const toggleBold = () => setIsBold(!isBold);
  const toggleItalic = () => setIsItalic(!isItalic);
  
  const dynamicContainerStyle: ViewStyle = {
    ...styles.container,
    borderColor: isFocused ? theme.colors.primary[500] : theme.colors.border,
    borderWidth: isFocused ? 2 : 1,
  };
  
  return (
    <GlassCard style={dynamicContainerStyle}>
      <TextInput
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.disabled}
        multiline
        maxLength={maxLength}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          {
            color: theme.colors.text.primary,
            backgroundColor: 'transparent',
          },
          isBold && styles.bold,
          isItalic && styles.italic,
        ]}
        textAlignVertical="top"
      />
      
      <View style={[styles.toolbar, { borderTopColor: theme.colors.border }]}>
        <View style={styles.formattingButtons}>
          <TouchableOpacity
            onPress={toggleBold}
            style={[
              styles.formatButton,
              { 
                backgroundColor: isBold ? theme.colors.primary[500] : theme.colors.surface,
                borderColor: isBold ? theme.colors.primary[500] : theme.colors.border,
              }
            ]}
            activeOpacity={0.7}
          >
            <Typography 
              weight="bold"
              style={{
                color: isBold ? '#FFFFFF' : theme.colors.text.primary,
                fontSize: 16,
              }}
            >
              B
            </Typography>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={toggleItalic}
            style={[
              styles.formatButton,
              { 
                backgroundColor: isItalic ? theme.colors.primary[500] : theme.colors.surface,
                borderColor: isItalic ? theme.colors.primary[500] : theme.colors.border,
              }
            ]}
            activeOpacity={0.7}
          >
            <Typography 
              style={{ 
                fontStyle: 'italic',
                color: isItalic ? '#FFFFFF' : theme.colors.text.primary,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              I
            </Typography>
          </TouchableOpacity>
        </View>
        
        <Typography 
          variant="caption" 
          color="secondary"
          style={value.length > maxLength * 0.9 ? 
            { ...styles.counter, color: theme.colors.error[500] } : 
            styles.counter
          }
        >
          {value.length}/{maxLength}
        </Typography>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    overflow: 'hidden',
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    padding: 16,
    minHeight: 100,
    maxHeight: 200,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  formattingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  formatButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    fontSize: 12,
    fontWeight: '500',
  },
});