/**
 * ShareActionButtons Component
 * REBUILT - Ensured all social media buttons are visible and accessible
 * Comprehensive viral-worthy share options grid following atomic design principles
 */

import React from 'react';
import { StyleSheet, Linking, Alert, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Box } from '../atoms';
import { GradientButton } from './GradientButton';
import { Button } from './Button';
import { Typography } from './Typography';
import { useTheme } from '../../theme';

export interface ShareActionButtonsProps {
  onShareImage: () => void;
  onShareTwitter?: () => void;
  onShareInstagram?: () => void;
  onShareFacebook?: () => void;
  onShareWhatsApp?: () => void;
  onCopyLink: () => void;
  onMoreOptions?: () => void;
  isGenerating: boolean;
  topic?: string;
  winner?: string;
  participants?: string[];
}

export const ShareActionButtons: React.FC<ShareActionButtonsProps> = ({
  onShareImage,
  onShareTwitter,
  onShareInstagram,
  onShareFacebook,
  onShareWhatsApp,
  onCopyLink,
  onMoreOptions,
  isGenerating,
  topic = 'AI Debate',
  winner,
  participants = [],
}) => {
  const { theme } = useTheme();

  const handleInstagramShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const url = 'instagram-stories://share';
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        onShareInstagram?.();
      } else {
        Alert.alert(
          'Instagram not found',
          'Please install Instagram to share stories.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Instagram share error:', error);
      Alert.alert('Error', 'Could not open Instagram');
    }
  };

  const handleFacebookShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = encodeURIComponent(
      `🤖 ${participants.join(' vs ')} debated "${topic}"\n` +
      `🏆 ${winner} wins!\n\n` +
      `Create your own AI debate at DebateAI.app`
    );
    
    try {
      const fbUrl = `fb://facewebmodal/f?href=https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://debateai.app')}&quote=${text}`;
      const webUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://debateai.app')}&quote=${text}`;
      
      const canOpen = await Linking.canOpenURL(fbUrl);
      if (canOpen) {
        await Linking.openURL(fbUrl);
      } else {
        await Linking.openURL(webUrl);
      }
      onShareFacebook?.();
    } catch (error) {
      console.error('Facebook share error:', error);
    }
  };

  const handleWhatsAppShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = encodeURIComponent(
      `🤖 ${participants.join(' vs ')} just debated "${topic}"\n\n` +
      `🏆 ${winner} won the debate!\n\n` +
      `Want to create your own AI debate? Check out DebateAI.app 🚀`
    );
    
    try {
      const whatsappUrl = `whatsapp://send?text=${text}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        onShareWhatsApp?.();
      } else {
        Alert.alert(
          'WhatsApp not found',
          'Please install WhatsApp to share.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('WhatsApp share error:', error);
    }
  };

  const handleTwitterShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = encodeURIComponent(
      `🤖 ${participants.join(' vs ')} debate: "${topic}"\n\n` +
      `🏆 ${winner} wins!\n\n` +
      `Create your own AI debate at DebateAI.app\n\n` +
      `#AIDebate #${participants.join(' #')} #ArtificialIntelligence`
    );
    
    try {
      const twitterUrl = `twitter://post?text=${text}`;
      const webUrl = `https://twitter.com/intent/tweet?text=${text}`;
      
      const canOpen = await Linking.canOpenURL(twitterUrl);
      if (canOpen) {
        await Linking.openURL(twitterUrl);
      } else {
        await Linking.openURL(webUrl);
      }
      onShareTwitter?.();
    } catch (error) {
      console.error('Twitter share error:', error);
    }
  };

  const handleCopyLink = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const shareText = `🤖 ${participants.join(' vs ')} debated "${topic}" and ${winner} won! Create your own AI debate at DebateAI.app`;
    await Clipboard.setStringAsync(shareText);
    Alert.alert('Copied!', 'Debate details copied to clipboard');
    onCopyLink();
  };

  return (
    <Box style={styles.actionsContainer}>
      {/* Main Share Image Button */}
      <GradientButton
        title={isGenerating ? "🎨 Generating Image..." : "📸 Share Debate Image"}
        onPress={onShareImage}
        gradient={theme.colors.gradients.primary}
        disabled={isGenerating}
        fullWidth
        style={styles.mainShareButton}
      />
      
      {/* Social Platform Grid */}
      <Box style={styles.socialGrid}>
        <Typography 
          variant="caption" 
          color="secondary" 
          align="center"
          style={styles.sectionTitle}
        >
          Share on Social Media
        </Typography>
        
        <Box style={styles.platformsRow}>
          {/* Instagram Stories */}
          <Box style={styles.platformContainer}>
            <TouchableOpacity
              onPress={handleInstagramShare}
              style={[styles.platformButton, { backgroundColor: '#E4405F' }]}
            >
              <MaterialCommunityIcons
                name="instagram"
                size={28}
                color="white"
              />
            </TouchableOpacity>
            <Typography variant="caption" style={styles.platformLabel}>
              Stories
            </Typography>
          </Box>
          
          {/* Facebook */}
          <Box style={styles.platformContainer}>
            <TouchableOpacity
              onPress={handleFacebookShare}
              style={[styles.platformButton, { backgroundColor: '#1877F2' }]}
            >
              <MaterialCommunityIcons
                name="facebook"
                size={28}
                color="white"
              />
            </TouchableOpacity>
            <Typography variant="caption" style={styles.platformLabel}>
              Facebook
            </Typography>
          </Box>
          
          {/* Twitter/X */}
          <Box style={styles.platformContainer}>
            <TouchableOpacity
              onPress={handleTwitterShare}
              style={[styles.platformButton, { backgroundColor: '#000000' }]}
            >
              <MaterialCommunityIcons
                name="twitter"
                size={28}
                color="white"
              />
            </TouchableOpacity>
            <Typography variant="caption" style={styles.platformLabel}>
              Twitter
            </Typography>
          </Box>
          
          {/* WhatsApp */}
          <Box style={styles.platformContainer}>
            <TouchableOpacity
              onPress={handleWhatsAppShare}
              style={[styles.platformButton, { backgroundColor: '#25D366' }]}
            >
              <MaterialCommunityIcons
                name="whatsapp"
                size={28}
                color="white"
              />
            </TouchableOpacity>
            <Typography variant="caption" style={styles.platformLabel}>
              WhatsApp
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Quick Actions Row */}
      <Box style={styles.quickActionsRow}>
        <Button
          title="📋 Copy Text"
          onPress={handleCopyLink}
          variant="secondary"
          size="medium"
          style={styles.quickAction}
        />
        {onMoreOptions && (
          <Button
            title="⚡ More Options"
            onPress={onMoreOptions}
            variant="secondary"
            size="medium"
            style={styles.quickAction}
          />
        )}
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    gap: 24, // Increased gap for better accessibility
    paddingVertical: 12,
    paddingHorizontal: 4, // Add horizontal padding for better touch targets
  },
  mainShareButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  socialGrid: {
    gap: 20, // Increased gap for better separation
    paddingVertical: 8, // Add vertical padding
  },
  sectionTitle: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  platformsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Better distribution
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12, // Add vertical padding for better touch targets
    minHeight: 80, // Ensure minimum height for accessibility
  },
  platformContainer: {
    alignItems: 'center',
    gap: 10, // Slightly larger gap
    minWidth: 70, // Ensure minimum width for touch targets
    paddingVertical: 4, // Add padding for better accessibility
  },
  platformButton: {
    width: 58, // Slightly larger for better touch targets
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    // Ensure minimum touch target size (44pt for iOS)
    padding: 2,
  },
  platformLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16, // Larger gap for better separation
    paddingHorizontal: 8, // Add padding for better touch targets
    paddingVertical: 8,
    minHeight: 50, // Ensure minimum height for accessibility
  },
  quickAction: {
    flex: 1,
    minHeight: 44, // Ensure minimum touch target height
  },
});

export default ShareActionButtons;