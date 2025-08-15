/**
 * ShareModal Component
 * COMPLETELY REBUILT - Fixed scrolling issues, proper height management, accessible content
 * Bottom sheet modal for sharing debate results following atomic design principles
 */

import React, { useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ModalHeader } from '../../molecules/ModalHeader';
import { SharePreviewCard } from '../../molecules/SharePreviewCard';
import { ShareActionButtons } from '../../molecules/ShareActionButtons';
import { Typography } from '../../molecules';
import { useTheme } from '../../../theme';
import { Message } from '../../../types';

const { height } = Dimensions.get('window');

export interface ShareModalProps {
  topic: string;
  participants: { id: string; name: string }[];
  messages: Message[];
  winner?: { id: string; name: string };
  scores?: Record<string, { name: string; roundWins: number }>;
  onShare?: (platform?: string) => void;
  onClose?: () => void;
  visible: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  topic,
  participants,
  winner,
  scores,
  onShare,
  onClose,
  visible,
}) => {
  const { theme } = useTheme();
  const viewShotRef = useRef<ViewShot>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAndShare = async () => {
    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('Failed to capture image');
      
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share AI Debate',
          UTI: 'public.png',
        });
        
        onShare?.('ios');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Sharing not available', 'Please try saving the image instead.');
      }
    } catch (error) {
      console.error('Share failed:', error);
      Alert.alert('Error', 'Failed to share debate. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNativeShare = async () => {
    try {
      const { Share } = await import('react-native');
      await Share.share({
        message: `🤖 ${participants.map(p => p.name).join(' vs ')} debated "${topic}" and ${winner?.name} won! Create your own AI debate at DebateAI.app`,
        url: 'https://debateai.app',
        title: 'DebateAI - AI Debate Results',
      });
      onShare?.('native');
    } catch (error) {
      console.error('Native share error:', error);
    }
  };

  const handleBackdropPress = () => {
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.backdrop}>
        <TouchableOpacity 
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleBackdropPress}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={[
              styles.modalContainer, 
              { backgroundColor: theme.colors.background }
            ]}
            onPress={() => {}} // Prevent closing when tapping modal content
          >
            <SafeAreaView style={styles.safeArea}>
              {/* Header */}
              <ModalHeader 
                title="Share Debate"
                onClose={onClose || (() => {})}
              />

              {/* KeyboardAvoidingView for better mobile experience */}
              <KeyboardAvoidingView 
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={100}
              >
                {/* Content with proper scrolling */}
                <ScrollView 
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={true}
                  bounces={true}
                  alwaysBounceVertical={true}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                {/* Preview Label */}
                <Typography 
                  variant="caption" 
                  color="secondary" 
                  align="center"
                  style={styles.previewLabel}
                >
                  Preview
                </Typography>

                {/* Share Card Preview with ViewShot */}
                <ViewShot 
                  ref={viewShotRef} 
                  options={{ format: 'png', quality: 1.0 }}
                  style={styles.viewShotWrapper}
                >
                  <SharePreviewCard
                    topic={topic}
                    participants={participants}
                    winner={winner}
                    scores={scores}
                  />
                </ViewShot>

                {/* Share Actions */}
                <ShareActionButtons
                  onShareImage={handleGenerateAndShare}
                  onCopyLink={() => {}}
                  onMoreOptions={handleNativeShare}
                  isGenerating={isGenerating}
                  topic={topic}
                  winner={winner?.name}
                  participants={participants.map(p => p.name)}
                />
                </ScrollView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </TouchableOpacity>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: height * 0.75, // 75% height as requested for better accessibility
    maxHeight: height * 0.80, // Max 80% to ensure modal doesn't take full screen
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden', // Prevent content overflow
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100, // Large bottom padding for social buttons accessibility
    flexGrow: 1,
    minHeight: height * 0.9, // Taller content to ensure scrolling works
  },
  previewLabel: {
    marginBottom: 12,
  },
  viewShotWrapper: {
    alignItems: 'center',
  },
});

export default ShareModal;