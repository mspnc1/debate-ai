import React, { useEffect, useCallback } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AIServiceLoading } from '../components/organisms';
import { useAIService } from '../providers/AIServiceProvider';

// Chat-specific hooks
import {
  useChatSession,
  useChatMessages,
  useChatInput,
  useAIResponses,
  useMentions,
  useQuickStart,
} from '../hooks/chat';

// Chat-specific components
import {
  ChatHeader,
  ChatMessageList,
  ChatInputBar,
  ChatTypingIndicators,
  ChatMentionSuggestions,
} from '../components/organisms/chat';


interface ChatScreenProps {
  navigation: {
    goBack: () => void;
  };
  route: {
    params: {
      sessionId: string;
      resuming?: boolean;
      searchTerm?: string;
      initialPrompt?: string;
      userPrompt?: string;
      autoSend?: boolean;
    };
  };
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  // Extract route parameters
  const { 
    searchTerm, 
    initialPrompt, 
    userPrompt, 
    autoSend,
    resuming 
  } = route.params;

  // AI Service state
  const { aiService, isInitialized, isLoading, error } = useAIService();

  // Compose chat hooks
  const session = useChatSession();
  const messages = useChatMessages();
  const input = useChatInput();
  const mentions = useMentions();
  const aiResponses = useAIResponses(resuming);
  const quickStart = useQuickStart({ initialPrompt, userPrompt, autoSend });

  // Handle message sending
  const handleSendMessage = useCallback(async (messageText?: string): Promise<void> => {
    const textToSend = messageText || input.inputText;
    
    if (!textToSend.trim() || !session.currentSession) {
      return;
    }

    // Parse mentions from the message
    const messageMentions = mentions.parseMentions(textToSend);
    
    // Send user message
    messages.sendMessage(textToSend, messageMentions);
    
    // Clear input and dismiss keyboard
    input.clearInput();
    input.dismissKeyboard();

    // Create user message object for AI responses
    const userMessage = {
      id: `msg_${Date.now()}`,
      sender: 'You',
      senderType: 'user' as const,
      content: textToSend.trim(),
      timestamp: Date.now(),
      mentions: messageMentions,
    };

    // Trigger AI responses
    await aiResponses.sendAIResponses(userMessage);
  }, [input, session.currentSession, mentions, messages, aiResponses]);

  // Auto-save session when it's created or messages change
  useEffect(() => {
    if (session.currentSession) {
      session.saveSession();
    }
  }, [session, session.currentSession?.id, session.currentSession?.messages.length]);

  // Handle Quick Start auto-send logic
  useEffect(() => {
    if (quickStart.hasInitialPrompt || quickStart.shouldAutoSend) {

      quickStart.handleQuickStart(
        aiResponses.sendQuickStartResponses,
        input.setInputText,
        handleSendMessage
      );
    }
  }, [
    quickStart,
    aiResponses.sendQuickStartResponses,
    input.setInputText,
    handleSendMessage,
    initialPrompt,
    userPrompt,
    autoSend,
    session.currentSession,
    isInitialized,
    aiService,
    quickStart.initialPromptSent,
  ]);

  // Handle input changes with mention detection
  const handleInputChange = (text: string): void => {
    input.handleInputChange(text);
    
    // Detect mention trigger
    const shouldShowMentions = mentions.detectMentionTrigger(text);
    mentions.setShowMentions(shouldShowMentions);
  };

  // Handle mention selection
  const handleMentionSelect = (aiName: string): void => {
    mentions.insertMention(aiName, input.inputText, input.setInputText);
  };

  // Handle scroll to search result
  const handleScrollToSearchResult = (messageIndex: number): void => {
    messages.scrollToMessage(messageIndex);
  };

  // Show loading screen while AI service is initializing
  if (isLoading || !isInitialized) {
    return <AIServiceLoading error={error} />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <ChatHeader
          onBack={navigation.goBack}
          title="AI Conversation"
          participants={session.selectedAIs}
        />

        {/* Message List */}
        <ChatMessageList
          messages={messages.messages}
          flatListRef={messages.flatListRef}
          searchTerm={searchTerm}
          onContentSizeChange={messages.scrollToBottom}
          onScrollToSearchResult={handleScrollToSearchResult}
        />

        {/* Typing Indicators */}
        <ChatTypingIndicators typingAIs={aiResponses.typingAIs} />

        {/* Mention Suggestions */}
        <ChatMentionSuggestions
          suggestions={session.selectedAIs}
          onSelectMention={handleMentionSelect}
          visible={mentions.showMentions}
        />

        {/* Input Bar */}
        <ChatInputBar
          inputText={input.inputText}
          onInputChange={handleInputChange}
          onSend={handleSendMessage}
          placeholder="Type a message..."
          disabled={aiResponses.isProcessing}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;