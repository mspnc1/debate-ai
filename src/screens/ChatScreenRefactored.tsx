import React from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Box } from '../components/atoms';
import { Typography, Button } from '../components/molecules';
import { MessageBubble } from '../components/organisms/MessageBubble';
import { TypingIndicator } from '../components/organisms/TypingIndicator';
import { AIServiceLoading } from '../components/organisms';
import { useMessageHandler } from '../hooks/useMessageHandler';
import { useChatEffects } from '../hooks/useChatEffects';
import { useTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

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
  const { theme } = useTheme();
  
  // Use custom hooks for clean separation of concerns
  const {
    inputText,
    setInputText,
    showMentions,
    handleInputChange,
    insertMention,
    sendMessage,
    handleSendMessage,
    handleQuickStartMessage,
  } = useMessageHandler();

  const { flatListRef, searchTerm } = useChatEffects({
    route,
    onQuickStart: handleQuickStartMessage,
    onRegularSend: handleSendMessage,
    setInputText,
  });

  // Redux state
  const { currentSession, typingAIs } = useSelector((state: RootState) => state.chat);
  const messages = currentSession?.messages || [];
  const selectedAIs = currentSession?.selectedAIs || [];
  const { isLoading, error } = useSelector((state: RootState) => ({
    isLoading: false, // This should come from your AI service state
    error: null as string | null,
  }));

  // Loading state
  if (isLoading) {
    return <AIServiceLoading />;
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Box style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Typography variant="title" weight="bold" style={{ marginBottom: 10 }}>
            Oops! Something went wrong
          </Typography>
          <Typography variant="body" color="secondary" align="center">
            {error}
          </Typography>
          <Button
            title="Go Back"
            onPress={navigation.goBack}
            variant="primary"
            style={{ marginTop: 20 }}
          />
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Typography variant="subtitle" weight="bold">
              Chat Session
            </Typography>
            <Typography variant="caption" color="secondary">
              {selectedAIs.length} AI{selectedAIs.length !== 1 ? 's' : ''} active
            </Typography>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              isLast={index === messages.length - 1}
              searchTerm={searchTerm}
            />
          )}
          contentContainerStyle={{ paddingVertical: 16 }}
          inverted={false}
          onScrollToIndexFailed={() => {}}
        />

        {/* Typing Indicators */}
        {Object.entries(typingAIs).map(([aiName, isTyping]) =>
          isTyping ? <TypingIndicator key={aiName} aiName={aiName} /> : null
        )}

        {/* Mention Suggestions */}
        {showMentions && (
          <Animated.View 
            entering={FadeIn}
            style={[styles.mentionsContainer, { backgroundColor: theme.colors.surface }]}
          >
            {selectedAIs.map((ai) => (
              <TouchableOpacity
                key={ai.id}
                style={[styles.mentionItem, { backgroundColor: theme.colors.card }]}
                onPress={() => insertMention(ai.name)}
              >
                <Typography variant="body">{ai.name}</Typography>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Input Bar */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text.primary,
                borderColor: theme.colors.border,
              },
            ]}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.text.disabled}
            multiline
            maxHeight={100}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? theme.colors.primary[500] : theme.colors.disabled },
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#fff' : theme.colors.text.disabled}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  mentionsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    borderRadius: 8,
    padding: 8,
    maxHeight: 150,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mentionItem: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;