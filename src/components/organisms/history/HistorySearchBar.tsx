import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Box } from '../../atoms';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';
import { HistorySearchBarProps } from '../../../types/history';

export const HistorySearchBar: React.FC<HistorySearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search messages or AI names...',
  onClear,
  autoFocus = false
}) => {
  const { theme } = useTheme();

  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <Box style={[
      styles.container,
      { backgroundColor: theme.colors.surface }
    ]}>
      <Box style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              borderRadius: theme.borderRadius.lg,
              borderColor: value ? theme.colors.primary[300] : theme.colors.border,
              color: theme.colors.text.primary,
            }
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.secondary}
          value={value}
          onChangeText={onChange}
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="never" // We'll handle clear manually
        />
        
        {/* Search Icon or Clear Button */}
        {value ? (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
          >
            <Typography
              variant="body"
              style={{
                color: theme.colors.text.secondary,
                fontSize: 18,
                lineHeight: 20
              }}
            >
              ✕
            </Typography>
          </TouchableOpacity>
        ) : (
          <Box style={styles.searchIcon}>
            <Typography
              variant="body"
              style={{
                color: theme.colors.text.secondary,
                fontSize: 16
              }}
            >
              🔍
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Search Results Indicator */}
      {value && (
        <Box style={styles.searchIndicator}>
          <Typography variant="caption" color="secondary">
            Searching...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 44, // Space for icon/clear button
    fontSize: 16,
    borderWidth: 1,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    right: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIndicator: {
    marginTop: 4,
    alignItems: 'center',
  },
});