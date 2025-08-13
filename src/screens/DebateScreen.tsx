/**
 * DebateScreen - Refactored Container Component
 * Clean implementation using extracted services, hooks, and components
 * Reduced from 1055 lines to ~200 lines following atomic design principles
 */

import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '../components/atoms';
import { Typography } from '../components/molecules';
import { useTheme } from '../theme';
import { AI } from '../types';
import {
  useDebateSession,
  useDebateFlow,
  useDebateVoting,
  useTopicSelection,
  useDebateMessages,
} from '../hooks/debate';
import {
  DebateHeader,
  TopicSelector,
  DebateMessageList,
  VotingInterface,
  ScoreDisplay,
} from '../components/organisms';

interface DebateScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: {
    params: {
      selectedAIs: AI[];
      topic?: string;
      personalities?: { [key: string]: string };
    };
  };
}

const DebateScreen: React.FC<DebateScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { selectedAIs, topic: initialTopic, personalities: initialPersonalities } = route.params;
  
  // Initialize all hooks
  const session = useDebateSession(selectedAIs);
  const topicSelection = useTopicSelection(initialTopic);
  const flow = useDebateFlow(session.orchestrator);
  const voting = useDebateVoting(session.orchestrator, selectedAIs);
  const messages = useDebateMessages(session.session?.startTime);
  
  // Handle topic selection and debate start
  const handleStartDebate = async (topic?: string) => {
    const topicToUse = topic || topicSelection.finalTopic;
    if (!topicToUse) {
      Alert.alert('Invalid Topic', 'Please select a valid topic');
      return;
    }
    
    try {
      // Initialize debate session
      await session.initializeSession(
        topicToUse,
        selectedAIs,
        initialPersonalities || {}
      );
      
      // Add initial host message with cleaner formatting
      messages.addHostMessage(
        `"${topicToUse}"\n\n${selectedAIs[0].name} opens the debate.`
      );
      
      // Start the debate flow
      await flow.startDebate();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start debate';
      Alert.alert('Error', errorMessage);
    }
  };
  
  // Auto-start debate if topic is provided from DebateSetupScreen
  useEffect(() => {
    if (initialTopic && !session.isInitialized && selectedAIs.length >= 2 && session.orchestrator) {
      handleStartDebate(initialTopic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopic, session.isInitialized, session.orchestrator]);
  
  // Handle voting
  const handleVote = async (aiId: string) => {
    try {
      await voting.recordVote(aiId);
      
      // Debate completion will be handled by the UI components themselves
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record vote';
      Alert.alert('Error', errorMessage);
    }
  };
  
  // Handle Start Over with confirmation
  const handleStartOver = () => {
    Alert.alert(
      'Start Over?',
      'This will end the current debate and return to setup. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start Over',
          style: 'destructive',
          onPress: () => {
            // Reset session if needed
            session.resetSession();
            // Navigate back to the Debate tab (DebateSetupScreen)
            navigation.navigate('MainTabs', { screen: 'DebateTab' });
          },
        },
      ]
    );
  };
  
  // Show loading state while waiting for orchestrator when topic is provided
  const isLoading = initialTopic && !session.orchestrator && !session.isInitialized;
  
  // Show topic picker only if no topic was provided and debate hasn't started
  const showTopicPicker = !initialTopic && (!session.isInitialized || (!flow.isDebateActive && !flow.isDebateEnded));
  
  // Determine what to show based on debate state
  const renderContent = () => {
    if (isLoading) {
      return (
        <Box style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="title" align="center">Initializing Debate...</Typography>
          <Typography variant="body" color="secondary" align="center" style={{ marginTop: 8 }}>
            Setting up the arena for {selectedAIs[0]?.name} vs {selectedAIs[1]?.name}
          </Typography>
        </Box>
      );
    }
    
    if (showTopicPicker) {
      return (
        <TopicSelector
          {...topicSelection}
          onStartDebate={handleStartDebate}
        />
      );
    }
    
    if (flow.isDebateActive || flow.isDebateEnded) {
      return (
        <>
          <DebateMessageList
            messages={messages.messages}
            typingAIs={messages.typingAIs}
          />
          
          {voting.isVoting && (
            <VotingInterface
              participants={selectedAIs}
              isOverallVote={voting.isOverallVote}
              isFinalVote={voting.isFinalVote}
              votingRound={voting.votingRound}
              scores={voting.scores || undefined}
              votingPrompt={voting.getVotingPrompt()}
              onVote={handleVote}
            />
          )}
          
          {/* Show scoreboard persistently after first round */}
          {voting.scores && Object.keys(voting.scores).length > 0 && (
            <ScoreDisplay
              participants={selectedAIs}
              scores={voting.scores}
            />
          )}
        </>
      );
    }
    
    return null;
  };
  
  // Handle error states
  useEffect(() => {
    if (session.error) {
      Alert.alert('Session Error', session.error);
    }
  }, [session.error]);
  
  useEffect(() => {
    if (flow.error) {
      Alert.alert('Debate Error', flow.error);
    }
  }, [flow.error]);
  
  useEffect(() => {
    if (voting.error) {
      Alert.alert('Voting Error', voting.error);
    }
  }, [voting.error]);
  
  return (
    <SafeAreaView style={{
      flex: 1,
      backgroundColor: theme.colors.background,
    }}>
      <DebateHeader
        onStartOver={handleStartOver}
        currentRound={flow.currentRound}
        maxRounds={flow.maxRounds}
        isActive={flow.isDebateActive}
        showStartOver={flow.isDebateActive || flow.isDebateEnded}
      />
      
      {renderContent()}
    </SafeAreaView>
  );
};

export default DebateScreen;