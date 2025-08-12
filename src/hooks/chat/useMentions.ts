import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { AI } from '../../types';
import { MessageService } from '../../services/chat';

export interface MentionSuggestion {
  id: string;
  name: string;
  displayName: string;
}

export interface MentionsHook {
  showMentions: boolean;
  setShowMentions: (show: boolean) => void;
  suggestions: MentionSuggestion[];
  insertMention: (aiName: string, inputText: string, setInputText: (text: string) => void) => void;
  parseMentions: (text: string) => string[];
  hasMentions: (text: string) => boolean;
  detectMentionTrigger: (text: string) => boolean;
  filterSuggestions: (text: string, availableAIs: AI[]) => MentionSuggestion[];
}

export const useMentions = (): MentionsHook => {
  const [showMentions, setShowMentions] = useState(false);
  const { currentSession } = useSelector((state: RootState) => state.chat);
  const selectedAIs = currentSession?.selectedAIs || [];

  // Convert AIs to mention suggestions
  const suggestions: MentionSuggestion[] = selectedAIs.map(ai => ({
    id: ai.id,
    name: ai.name.toLowerCase(),
    displayName: ai.name,
  }));

  const insertMention = (
    aiName: string, 
    inputText: string, 
    setInputText: (text: string) => void
  ): void => {
    // Replace the incomplete mention with the complete one
    const updatedText = inputText.replace(/@\w*$/, `@${aiName.toLowerCase()} `);
    setInputText(updatedText);
    setShowMentions(false);
  };

  const parseMentions = (text: string): string[] => {
    const result = MessageService.parseMentions(text);
    return result.mentions;
  };

  const hasMentions = (text: string): boolean => {
    const result = MessageService.parseMentions(text);
    return result.hasMentions;
  };

  const detectMentionTrigger = (text: string): boolean => {
    // Check if user is typing a mention (@ at the end or @ followed by partial word)
    const lastChar = text[text.length - 1];
    const hasIncompleteMention = !!text.match(/@\w*$/);
    
    return lastChar === '@' || hasIncompleteMention;
  };

  const filterSuggestions = (text: string, availableAIs: AI[]): MentionSuggestion[] => {
    // Extract the partial mention text
    const mentionMatch = text.match(/@(\w*)$/);
    if (!mentionMatch) return [];

    const partialMention = mentionMatch[1].toLowerCase();

    // Filter AIs that match the partial mention
    return availableAIs
      .filter(ai => ai.name.toLowerCase().startsWith(partialMention))
      .map(ai => ({
        id: ai.id,
        name: ai.name.toLowerCase(),
        displayName: ai.name,
      }));
  };

  return {
    showMentions,
    setShowMentions,
    suggestions,
    insertMention,
    parseMentions,
    hasMentions,
    detectMentionTrigger,
    filterSuggestions,
  };
};