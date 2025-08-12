import { useState } from 'react';
import { Keyboard } from 'react-native';
import { MessageService } from '../../services/chat';

export interface ChatInputHook {
  inputText: string;
  setInputText: (text: string) => void;
  handleInputChange: (text: string) => void;
  clearInput: () => void;
  dismissKeyboard: () => void;
  isValid: boolean;
  isEmpty: boolean;
  validation: {
    isValid: boolean;
    sanitized: string;
    warnings: string[];
  };
  characterCount: number;
  wordCount: number;
}

export const useChatInput = (initialText: string = ''): ChatInputHook => {
  const [inputText, setInputText] = useState(initialText);

  const handleInputChange = (text: string): void => {
    setInputText(text);
  };

  const clearInput = (): void => {
    setInputText('');
  };

  const dismissKeyboard = (): void => {
    Keyboard.dismiss();
  };

  // Get validation information
  const validation = MessageService.validateMessageContent(inputText);
  const isValid = validation.isValid && inputText.trim().length > 0;
  const isEmpty = inputText.trim().length === 0;

  // Get text statistics
  const characterCount = inputText.length;
  const wordCount = inputText.trim().split(/\s+/).filter(word => word.length > 0).length;

  return {
    inputText,
    setInputText,
    handleInputChange,
    clearInput,
    dismissKeyboard,
    isValid,
    isEmpty,
    validation,
    characterCount,
    wordCount,
  };
};