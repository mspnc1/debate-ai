/**
 * SharePreviewCard Component
 * Professional visual preview of the debate result for sharing
 * COMPLETE REWRITE - Fixed logo sizing, proper layout, professional badges
 */

import React from 'react';
import { View, StyleSheet, Dimensions, Image, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from './Typography';
import { AppLogo } from '../organisms/AppLogo';
import { AI_BRAND_COLORS } from '../../constants/aiColors';
import { getAIProviderIcon } from '../../utils/aiProviderAssets';
import { useTheme } from '../../theme';

const { width } = Dimensions.get('window');
const PREVIEW_WIDTH = width - 40;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * 1.6; // Reduced height to fit better in modal

export interface SharePreviewCardProps {
  topic: string;
  participants: { id: string; name: string }[];
  winner?: { id: string; name: string };
  scores?: Record<string, { name: string; roundWins: number }>;
}

export const SharePreviewCard: React.FC<SharePreviewCardProps> = ({
  topic,
  participants,
  winner,
  scores,
}) => {
  const { theme } = useTheme();
  
  const getAIConfig = (participant: { id: string; name: string }) => {
    const normalized = participant.name.toLowerCase();
    let aiBrandKey = '';
    
    if (normalized.includes('claude')) aiBrandKey = 'claude';
    else if (normalized.includes('chatgpt') || normalized.includes('openai')) aiBrandKey = 'openai';
    else if (normalized.includes('gemini')) aiBrandKey = 'gemini';
    else if (normalized.includes('nomi')) aiBrandKey = 'nomi';
    
    const colors = aiBrandKey ? AI_BRAND_COLORS[aiBrandKey as keyof typeof AI_BRAND_COLORS] : theme.colors.primary;
    const providerIcon = aiBrandKey ? getAIProviderIcon(aiBrandKey) : null;
    
    return { colors, providerIcon };
  };

  return (
    <Animated.View entering={FadeIn.duration(800)} style={styles.shareCard}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb', '#f5576c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientCard}
      >
        {/* Header with Logo and Tagline */}
        <View style={styles.headerSection}>
          <AppLogo size={50} />
          <Typography variant="title" weight="bold" style={styles.appTitle}>
            DebateAI
          </Typography>
          <Typography variant="caption" style={styles.appTagline}>
            Where AIs Debate. Where Truth Emerges.
          </Typography>
        </View>

        {/* Debate Topic - AT THE TOP as requested */}
        <View style={styles.topicSection}>
          <Typography variant="caption" weight="semibold" style={styles.topicLabel}>
            💬 DEBATE TOPIC
          </Typography>
          <Typography variant="body" weight="bold" style={styles.topicText}>
            "{topic}"
          </Typography>
        </View>

        {/* AI Participants with Scores */}
        <View style={styles.battleSection}>
          {participants.map((participant) => {
            const { colors, providerIcon } = getAIConfig(participant);
            const score = scores?.[participant.id];
            
            return (
              <View key={participant.id} style={styles.aiColumn}>
                {/* AI Logo */}
                <View style={[styles.aiLogoContainer, { backgroundColor: colors[500] }]}>
                  {providerIcon && providerIcon.iconType === 'image' ? (
                    <Image 
                      source={providerIcon.icon as number} 
                      style={styles.aiLogoImage} 
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.aiLogoText}>
                      {providerIcon?.icon || participant.name.charAt(0)}
                    </Text>
                  )}
                </View>
                
                {/* AI Name */}
                <Typography variant="body" weight="semibold" style={styles.aiName}>
                  {participant.name}
                </Typography>
                
                {/* Score */}
                <Typography variant="title" weight="bold" style={styles.aiScore}>
                  {score?.roundWins || 0}
                </Typography>
                <Typography variant="caption" style={styles.aiScoreLabel}>
                  {score?.roundWins === 1 ? 'round' : 'rounds'}
                </Typography>
              </View>
            );
          })}
          
          {/* VS in the middle */}
          <View style={styles.vsContainer}>
            <Typography variant="title" weight="bold" style={styles.vsText}>
              VS
            </Typography>
          </View>
        </View>

        {/* Winner Section */}
        {winner && (
          <View style={styles.winnerSection}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.winnerBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Typography variant="caption" weight="semibold" style={styles.winnerLabel}>
                🏆 WINNER
              </Typography>
              <View style={styles.winnerContent}>
                {(() => {
                  const { colors, providerIcon } = getAIConfig(winner);
                  return (
                    <View style={styles.winnerLogoContainer}>
                      <View style={[styles.winnerAiLogo, { backgroundColor: colors[500] }]}>
                        {providerIcon && providerIcon.iconType === 'image' ? (
                          <Image 
                            source={providerIcon.icon as number} 
                            style={styles.winnerLogoImage} 
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={styles.winnerLogoText}>
                            {providerIcon?.icon || winner.name.charAt(0)}
                          </Text>
                        )}
                      </View>
                      <Typography variant="body" weight="bold" style={styles.winnerName}>
                        {winner.name}
                      </Typography>
                    </View>
                  );
                })()}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Footer with App Store badges and Braveheart */}
        <View style={styles.footerSection}>
          {/* Professional App Store Badges */}
          <View style={styles.storeBadges}>
            {/* App Store Badge */}
            <View style={styles.appStoreBadge}>
              <View style={styles.badgeContent}>
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                <View style={styles.badgeTextContainer}>
                  <Text style={styles.badgeSmallText}>Download on the</Text>
                  <Text style={styles.badgeLargeText}>App Store</Text>
                </View>
              </View>
            </View>
            
            {/* Google Play Badge */}
            <View style={styles.playStoreBadge}>
              <View style={styles.badgeContent}>
                <Ionicons name="logo-google-playstore" size={18} color="#FFFFFF" />
                <View style={styles.badgeTextContainer}>
                  <Text style={styles.badgeSmallText}>GET IT ON</Text>
                  <Text style={styles.badgeLargeText}>Google Play</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Braveheart Innovations Branding */}
          <View style={styles.brandingSection}>
            <View style={styles.brandRow}>
              <Image
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                source={require('../../../assets/BraveheartInnovationsLogoNoText.png') as number}
                style={styles.braveheartLogo}
                resizeMode="contain"
              />
              <Typography variant="caption" style={styles.brandText}>
                by Braveheart Innovations LLC
              </Typography>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  shareCard: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    marginBottom: 20,
  },
  gradientCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    justifyContent: 'space-between', // Better content distribution
  },
  
  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 12, // Reduced margin
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 22, // Slightly smaller
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appTagline: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  // Topic Section
  topicSection: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 12, // Reduced padding
    marginBottom: 16, // Reduced margin
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  topicLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  topicText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Battle Section
  battleSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16, // Reduced margin
    position: 'relative',
  },
  aiColumn: {
    alignItems: 'center',
    flex: 1,
  },
  aiLogoContainer: {
    width: 80, // Participant logos: 80x80 as requested
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiLogoImage: {
    width: 48, // Proportional to container
    height: 48,
    tintColor: '#FFFFFF',
  },
  aiLogoText: {
    fontSize: 32, // Proportional fallback text
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  aiName: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  aiScore: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  aiScoreLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
  },
  vsContainer: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -20 }],
  },
  vsText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  
  // Winner Section
  winnerSection: {
    marginBottom: 16, // Reduced margin
  },
  winnerBadge: {
    borderRadius: 16,
    padding: 10, // Reduced padding
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  winnerLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  winnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerLogoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  winnerAiLogo: {
    width: 100, // Winner logo: 100x100 - BIGGER than participants as requested
    height: 100,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  winnerLogoImage: {
    width: 60, // Proportional to larger container
    height: 60,
    tintColor: '#FFFFFF',
  },
  winnerLogoText: {
    fontSize: 40, // Larger text for winner
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  winnerName: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Footer
  footerSection: {
    marginTop: 'auto',
  },
  storeBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    justifyContent: 'center',
  },
  appStoreBadge: {
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 110,
  },
  playStoreBadge: {
    backgroundColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    minWidth: 110,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeTextContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  badgeSmallText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 8,
    letterSpacing: 0.2,
    fontWeight: '400',
  },
  badgeLargeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.1,
    lineHeight: 14,
  },
  brandingSection: {
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  braveheartLogo: {
    width: 16,
    height: 16,
  },
  brandText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    fontWeight: '600',
  },
});

export default SharePreviewCard;