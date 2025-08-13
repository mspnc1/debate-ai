/**
 * DebateScreen - Refactored Container Component
 * Clean implementation using extracted services, hooks, and components
 * Reduced from 1055 lines to ~200 lines following atomic design principles
 */

import React, { useEffect } from 'react';
import { Alert, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
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
import { VictoryCelebration } from '../components/organisms/debate/VictoryCelebration';

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
  
  // Handle new debate from victory screen
  const handleNewDebate = () => {
    // Reset session and navigate to setup
    session.resetSession();
    navigation.navigate('MainTabs', { screen: 'DebateTab' });
  };
  
  // Handle share results
  const handleShare = async () => {
    try {
      const winner = selectedAIs[0]; // Fallback winner for now
      const scores = voting.scores;
      
      const shareContent = `🏆 Debate Results! 🏆\n\n${winner?.name} wins the debate!\n\nFinal Scores:\n${Object.entries(scores || {}).map(([_, score]) => `${score.name}: ${score.roundWins} rounds`).join('\n')}\n\n#DebateAI #AIDebate`;
      
      await Share.share({
        message: shareContent,
        title: 'Debate Results',
      });
    } catch (error) {
      console.error('Error sharing results:', error);
    }
  };
  
  // Handle view transcript
  const handleViewTranscript = () => {
    // For now, just show an alert - can be expanded later
    Alert.alert(
      'Transcript',
      `Full transcript with ${messages.messages.length} messages would be displayed here.`,
      [{ text: 'OK' }]
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
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary[500]} 
            style={{ marginBottom: 24 }}
          />
          <Typography variant="title" align="center">Initializing Debate...</Typography>
          <Typography variant="body" color="secondary" align="center" style={{ marginTop: 8 }}>
            Setting up the arena for {selectedAIs[0]?.name} vs {selectedAIs[1]?.name}
          </Typography>
        </Animated.View>
      );
    }
    
    if (showTopicPicker) {
      return (
        <Animated.View 
          entering={FadeIn.duration(400)}
          layout={Layout.springify()}
          style={{ flex: 1 }}
        >
          <TopicSelector
            {...topicSelection}
            onStartDebate={handleStartDebate}
          />
        </Animated.View>
      );
    }
    
    // Show victory celebration if debate ended and we have scores
    if (flow.isDebateEnded && voting.scores && Object.keys(voting.scores).length > 0) {
      // Determine winner from scores
      const winner = Object.entries(voting.scores).reduce((prev, current) => 
        prev[1].roundWins > current[1].roundWins ? prev : current
      );
      const winnerAI = selectedAIs.find(ai => ai.id === winner[0]) || selectedAIs[0];
      
      return (
        <Animated.View 
          entering={FadeIn.duration(500)}
          style={{ flex: 1 }}
        >
          <VictoryCelebration
            winner={winnerAI}
            scores={voting.scores}
            rounds={[
              { round: 1, winner: winner[1].name, topic: topicSelection.finalTopic || 'Debate Topic' },
              { round: 2, winner: winner[1].name, topic: topicSelection.finalTopic || 'Debate Topic' }
            ]}
            onNewDebate={handleNewDebate}
            onShare={handleShare}
            onViewTranscript={handleViewTranscript}
          />
        </Animated.View>
      );
    }
    
    if (flow.isDebateActive || flow.isDebateEnded) {
      return (
        <Animated.View 
          entering={FadeIn.duration(400)}
          layout={Layout.springify()}
          style={{ flex: 1 }}
        >
          <DebateMessageList
            messages={messages.messages}
            typingAIs={messages.typingAIs}
          />
          
          {voting.isVoting && (
            <Animated.View 
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
            >
              <VotingInterface
                participants={selectedAIs}
                isOverallVote={voting.isOverallVote}
                isFinalVote={voting.isFinalVote}
                votingRound={voting.votingRound}
                scores={voting.scores || undefined}
                votingPrompt={voting.getVotingPrompt()}
                onVote={handleVote}
              />
            </Animated.View>
          )}
          
          {/* Show scoreboard persistently after first round */}
          {voting.scores && Object.keys(voting.scores).length > 0 && (
            <Animated.View 
              entering={FadeIn.delay(200).duration(300)}
              layout={Layout.springify()}
            >
              <ScoreDisplay
                participants={selectedAIs}
                scores={voting.scores}
              />
            </Animated.View>
          )}
        </Animated.View>
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