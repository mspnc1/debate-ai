import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../../molecules';
import { useTheme } from '../../../theme';
import { AI } from '../../../types';

export interface ChatMentionSuggestionsProps {
  suggestions: AI[];
  onSelectMention: (aiName: string) => void;
  visible: boolean;
}

export const ChatMentionSuggestions: React.FC<ChatMentionSuggestionsProps> = ({
  suggestions,
  onSelectMention,
  visible,
}) => {
  const { theme } = useTheme();

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <Animated.View 
      entering={FadeInDown.springify()}
      style={[
        styles.mentionSuggestions,
        {
          backgroundColor: theme.colors.card,
          shadowColor: theme.colors.shadow,
        }
      ]}
    >
      {suggestions.map((ai) => (
        <Button
          key={ai.id}
          title={`@${ai.name.toLowerCase()}`}
          variant="ghost"
          style={{ ...styles.mentionItem, borderWidth: 0 }}
          onPress={() => onSelectMention(ai.name)}
        />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  mentionSuggestions: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    paddingVertical: 8,
  },
  mentionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});