import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '../../../theme';

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
  style?: TextStyle;
  numberOfLines?: number;
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  searchTerm,
  style,
  numberOfLines
}) => {
  const { theme } = useTheme();

  if (!searchTerm) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Split text and highlight search terms
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === searchTerm.toLowerCase();
        
        return isMatch ? (
          <Text 
            key={index} 
            style={{ 
              backgroundColor: theme.colors.warning[50], 
              fontWeight: '600',
              color: theme.colors.warning[700]
            }}
          >
            {part}
          </Text>
        ) : (
          part
        );
      })}
    </Text>
  );
};