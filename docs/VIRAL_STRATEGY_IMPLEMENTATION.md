# DebateAI Viral Strategy Implementation Plan

> A comprehensive technical roadmap for implementing viral growth features in React Native
> Generated: August 15, 2025

## Executive Summary

This implementation plan combines the best viral growth strategies from both strategy documents with detailed React Native technical specifications. The plan prioritizes quick wins (shareable image cards - already partially implemented) while building toward advanced features like video generation and social challenges.

**Key Objectives:**
- Transform debates from static PDFs to viral social content
- Implement growth loops where every debate creates shareable moments
- Track viral metrics to optimize sharing mechanisms
- Build platform-specific sharing optimizations

## Current State Analysis

### What's Already Implemented ✅
- `ShareableDebateCard.tsx` component (needs integration)
- Basic debate stats tracking via Redux
- PDF transcript generation (to be replaced)
- Expo sharing dependencies installed

### What's Missing ❌
- Analytics tracking system
- Social sharing integration in Victory screen
- Video generation capabilities
- Viral mechanics (challenges, remixes)
- Trending debates discovery
- Deep linking for shared content

## Phase 1: Quick Wins (Week 1)
**Goal:** 10-20x increase in sharing rate

### 1.1 Integrate ShareableDebateCard (2 hours)

#### Technical Implementation

```typescript
// Update: src/screens/DebateScreen.tsx
import { ShareableDebateCard } from '../components/organisms/debate/ShareableDebateCard';

// Add state for sharing modal
const [showShareCard, setShowShareCard] = useState(false);

// Replace PDF button in VictoryCelebration with:
<Button
  title="📸 Share Results"
  onPress={() => setShowShareCard(true)}
  variant="secondary"
  size="large"
  fullWidth
/>

// Add share modal
<Modal 
  visible={showShareCard} 
  animationType="slide"
  onRequestClose={() => setShowShareCard(false)}
>
  <ShareableDebateCard
    topic={topicSelection.finalTopic}
    participants={aiParticipants}
    messages={debate.messages}
    winner={winnerAI}
    scores={voting.scores}
    onShare={() => {
      trackEvent('debate_shared', { method: 'image_card' });
      setShowShareCard(false);
    }}
  />
</Modal>
```

### 1.2 Add Analytics Service (4 hours)

#### Architecture

```typescript
// Create: src/services/analytics/index.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  platform: string;
}

class AnalyticsService {
  private sessionId: string;
  private queue: AnalyticsEvent[] = [];
  
  constructor() {
    this.sessionId = Date.now().toString();
    this.flushQueue = debounce(this.flushQueue.bind(this), 5000);
  }
  
  track(eventName: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      platform: Platform.OS,
    };
    
    this.queue.push(event);
    this.persistEvent(event);
    
    // For now, store locally. Later integrate with Firebase/Mixpanel
    if (this.queue.length >= 10) {
      this.flushQueue();
    }
  }
  
  private async persistEvent(event: AnalyticsEvent) {
    try {
      const events = await AsyncStorage.getItem('analytics_events');
      const parsed = events ? JSON.parse(events) : [];
      parsed.push(event);
      
      // Keep only last 1000 events locally
      if (parsed.length > 1000) {
        parsed.splice(0, parsed.length - 1000);
      }
      
      await AsyncStorage.setItem('analytics_events', JSON.stringify(parsed));
    } catch (error) {
      console.error('Failed to persist analytics event:', error);
    }
  }
  
  private async flushQueue() {
    if (this.queue.length === 0) return;
    
    // TODO: Send to analytics backend
    // For now, just clear the queue
    console.log('[Analytics] Flushing', this.queue.length, 'events');
    this.queue = [];
  }
  
  // Viral-specific tracking methods
  trackShare(platform: string, content: string, success: boolean) {
    this.track('content_shared', {
      platform,
      content_type: content,
      success,
      share_method: 'native',
    });
  }
  
  trackViralAction(action: 'challenge_created' | 'remix_started' | 'trending_viewed') {
    this.track(`viral_${action}`, {
      timestamp: Date.now(),
    });
  }
}

export const analytics = new AnalyticsService();
```

### 1.3 Add Share Incentives (2 hours)

```typescript
// Create: src/services/shareIncentives/index.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface ShareMilestone {
  count: number;
  reward: string;
  title: string;
  message: string;
}

const MILESTONES: ShareMilestone[] = [
  {
    count: 1,
    reward: 'bonus_topic',
    title: '🎉 First Share!',
    message: 'You\'ve unlocked a bonus debate topic!',
  },
  {
    count: 5,
    reward: 'premium_24h',
    title: '🏆 Super Sharer!',
    message: 'You\'ve unlocked premium topics for 24 hours!',
  },
  {
    count: 10,
    reward: 'exclusive_ai',
    title: '🚀 Viral Master!',
    message: 'You\'ve unlocked an exclusive AI personality!',
  },
];

export class ShareIncentiveService {
  private shareCount = 0;
  
  async initialize() {
    const count = await AsyncStorage.getItem('share_count');
    this.shareCount = count ? parseInt(count, 10) : 0;
  }
  
  async recordShare(): Promise<void> {
    this.shareCount++;
    await AsyncStorage.setItem('share_count', this.shareCount.toString());
    
    const milestone = MILESTONES.find(m => m.count === this.shareCount);
    if (milestone) {
      this.showMilestoneReward(milestone);
      await this.unlockReward(milestone.reward);
    }
  }
  
  private showMilestoneReward(milestone: ShareMilestone) {
    Alert.alert(milestone.title, milestone.message);
  }
  
  private async unlockReward(reward: string) {
    const rewards = await AsyncStorage.getItem('unlocked_rewards');
    const parsed = rewards ? JSON.parse(rewards) : [];
    parsed.push({ reward, unlockedAt: Date.now() });
    await AsyncStorage.setItem('unlocked_rewards', JSON.stringify(parsed));
  }
}

export const shareIncentives = new ShareIncentiveService();
```

## Phase 2: Social Mechanics (Week 2)
**Goal:** Create viral loops through challenges and remixes

### 2.1 Debate Challenges Feature

#### Architecture

```typescript
// Create: src/services/challenges/index.ts
import { generateUUID } from '../../utils';

export interface DebateChallenge {
  id: string;
  challengerId: string;
  challengerName: string;
  topic: string;
  prediction: {
    winner: string;
    confidence: number;
  };
  createdAt: number;
  expiresAt: number;
  shareUrl: string;
  accepted: boolean;
  result?: {
    actualWinner: string;
    challengerCorrect: boolean;
  };
}

export class ChallengeService {
  async createChallenge(
    topic: string,
    predictedWinner: string,
    confidence: number
  ): Promise<DebateChallenge> {
    const challenge: DebateChallenge = {
      id: generateUUID(),
      challengerId: await this.getUserId(),
      challengerName: await this.getUserName(),
      topic,
      prediction: {
        winner: predictedWinner,
        confidence,
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      shareUrl: `debateai://challenge/${generateUUID()}`,
      accepted: false,
    };
    
    await this.saveChallenge(challenge);
    return challenge;
  }
  
  generateShareMessage(challenge: DebateChallenge): string {
    return `🎯 I bet ${challenge.prediction.winner} wins the "${challenge.topic}" debate!\n\n` +
           `Think I'm wrong? Prove it! 👇\n${challenge.shareUrl}\n\n` +
           `#AIDebateChallenge #DebateAI`;
  }
}
```

#### UI Component

```typescript
// Create: src/components/organisms/challenges/ChallengeCreator.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography, Button, Card } from '../../molecules';
import Slider from '@react-native-community/slider';

export const ChallengeCreator: React.FC<{
  topic: string;
  participants: string[];
  onCreateChallenge: (winner: string, confidence: number) => void;
}> = ({ topic, participants, onCreateChallenge }) => {
  const [selectedWinner, setSelectedWinner] = useState(participants[0]);
  const [confidence, setConfidence] = useState(75);
  
  return (
    <Card style={styles.container}>
      <Typography variant="h3">🎯 Create a Challenge</Typography>
      <Typography variant="body">
        Bet your friends on who will win this debate!
      </Typography>
      
      <View style={styles.prediction}>
        <Typography variant="label">I predict:</Typography>
        {participants.map(ai => (
          <Button
            key={ai}
            title={ai}
            onPress={() => setSelectedWinner(ai)}
            variant={selectedWinner === ai ? 'primary' : 'secondary'}
          />
        ))}
      </View>
      
      <View style={styles.confidence}>
        <Typography variant="label">
          Confidence: {confidence}%
        </Typography>
        <Slider
          value={confidence}
          onValueChange={setConfidence}
          minimumValue={50}
          maximumValue={100}
          step={5}
        />
      </View>
      
      <Button
        title="Share Challenge 🚀"
        onPress={() => onCreateChallenge(selectedWinner, confidence)}
        variant="gradient"
        size="large"
        fullWidth
      />
    </Card>
  );
};
```

### 2.2 Remix Feature

```typescript
// Create: src/components/organisms/remix/RemixCreator.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography, Button } from '../../molecules';

interface RemixCreatorProps {
  originalDebate: {
    topic: string;
    participants: string[];
    winner: string;
  };
  availableAIs: string[];
  onRemix: (newParticipants: string[]) => void;
}

export const RemixCreator: React.FC<RemixCreatorProps> = ({
  originalDebate,
  availableAIs,
  onRemix,
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  
  const handleRemix = () => {
    analytics.track('debate_remixed', {
      original_participants: originalDebate.participants,
      new_participants: selected,
      topic: originalDebate.topic,
    });
    
    onRemix(selected);
  };
  
  return (
    <View style={styles.container}>
      <Typography variant="h3">
        🔄 Remix This Debate
      </Typography>
      
      <Typography variant="body">
        Original: {originalDebate.participants.join(' vs ')}
      </Typography>
      
      <Typography variant="body">
        {originalDebate.winner} won. Can other AIs do better?
      </Typography>
      
      <View style={styles.aiSelector}>
        {availableAIs.map(ai => (
          <Button
            key={ai}
            title={ai}
            onPress={() => toggleAI(ai)}
            variant={selected.includes(ai) ? 'primary' : 'secondary'}
          />
        ))}
      </View>
      
      <Button
        title="Start Remix Battle"
        onPress={handleRemix}
        disabled={selected.length !== 2}
        variant="gradient"
        fullWidth
      />
    </View>
  );
};
```

## Phase 3: Video Generation (Week 3-4)
**Goal:** Create TikTok/Reels-ready content

### 3.1 Install Video Dependencies

```bash
npm install react-native-video-editor react-native-ffmpeg react-native-video
# iOS
cd ios && pod install
```

### 3.2 Video Generator Service

```typescript
// Create: src/services/videoGenerator/index.ts
import { FFmpegKit, FFmpegKitConfig } from 'react-native-ffmpeg';
import RNFS from 'react-native-fs';

export class VideoGeneratorService {
  async generateDebateVideo(
    debate: DebateData,
    format: 'tiktok' | 'reels' | 'youtube-shorts'
  ): Promise<string> {
    const config = this.getFormatConfig(format);
    
    // 1. Extract key moments
    const highlights = this.extractHighlights(debate);
    
    // 2. Generate text frames
    const frames = await this.generateFrames(highlights, config);
    
    // 3. Add transitions and effects
    const processedFrames = await this.addEffects(frames);
    
    // 4. Compile video with FFmpeg
    const videoPath = await this.compileVideo(processedFrames, config);
    
    // 5. Add audio/music
    const finalPath = await this.addAudio(videoPath, config);
    
    return finalPath;
  }
  
  private extractHighlights(debate: DebateData): DebateHighlight[] {
    // Algorithm to find most engaging exchanges
    const highlights: DebateHighlight[] = [];
    
    // Find opening statement
    highlights.push({
      type: 'opening',
      content: debate.messages[0],
      duration: 3,
    });
    
    // Find climax (longest exchange)
    const climax = this.findClimaxExchange(debate.messages);
    highlights.push({
      type: 'climax',
      content: climax,
      duration: 10,
    });
    
    // Add winner announcement
    highlights.push({
      type: 'winner',
      content: debate.winner,
      duration: 3,
    });
    
    return highlights;
  }
  
  private getFormatConfig(format: string) {
    const configs = {
      'tiktok': {
        width: 1080,
        height: 1920,
        fps: 30,
        maxDuration: 60,
      },
      'reels': {
        width: 1080,
        height: 1920,
        fps: 30,
        maxDuration: 90,
      },
      'youtube-shorts': {
        width: 1080,
        height: 1920,
        fps: 30,
        maxDuration: 60,
      },
    };
    
    return configs[format];
  }
}
```

### 3.3 Video UI Component

```typescript
// Create: src/components/organisms/video/VideoGenerator.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Typography, Button } from '../../molecules';
import { VideoGeneratorService } from '../../../services/videoGenerator';

export const VideoGenerator: React.FC<{
  debate: DebateData;
  onVideoGenerated: (videoPath: string) => void;
}> = ({ debate, onVideoGenerated }) => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const generateVideo = async (format: string) => {
    setGenerating(true);
    
    try {
      const videoService = new VideoGeneratorService();
      
      // Subscribe to progress updates
      videoService.onProgress((percent) => {
        setProgress(percent);
      });
      
      const videoPath = await videoService.generateDebateVideo(debate, format);
      
      analytics.track('video_generated', {
        format,
        duration: debate.messages.length,
        topic: debate.topic,
      });
      
      onVideoGenerated(videoPath);
    } catch (error) {
      console.error('Video generation failed:', error);
      Alert.alert('Error', 'Failed to generate video');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };
  
  if (generating) {
    return (
      <View style={styles.progressContainer}>
        <ActivityIndicator size="large" />
        <Typography variant="h3">Generating Video...</Typography>
        <Typography variant="body">{Math.round(progress)}%</Typography>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Typography variant="h3">🎬 Create Viral Video</Typography>
      
      <View style={styles.formats}>
        <Button
          title="TikTok (9:16)"
          onPress={() => generateVideo('tiktok')}
          variant="secondary"
        />
        <Button
          title="Reels (9:16)"
          onPress={() => generateVideo('reels')}
          variant="secondary"
        />
        <Button
          title="Shorts (9:16)"
          onPress={() => generateVideo('youtube-shorts')}
          variant="secondary"
        />
      </View>
    </View>
  );
};
```

## Phase 4: Trending & Discovery (Week 3)
**Goal:** Surface viral content to drive engagement

### 4.1 Trending Debates Screen

```typescript
// Create: src/screens/TrendingScreen.tsx
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { Screen } from '../components/atoms';
import { TrendingDebateCard } from '../components/organisms';
import { TrendingService } from '../services/trending';

export const TrendingScreen: React.FC = () => {
  const [trending, setTrending] = useState<TrendingDebate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadTrending();
  }, []);
  
  const loadTrending = async () => {
    const trendingService = new TrendingService();
    const debates = await trendingService.getTrendingDebates();
    setTrending(debates);
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTrending();
    setRefreshing(false);
  };
  
  return (
    <Screen>
      <FlatList
        data={trending}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrendingDebateCard
            debate={item}
            onTap={() => navigateToDebate(item)}
            onShare={() => shareDebate(item)}
            onRemix={() => remixDebate(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Typography variant="h1">🔥 Trending Debates</Typography>
            <Typography variant="caption">
              Most shared in the last 24 hours
            </Typography>
          </View>
        }
      />
    </Screen>
  );
};
```

### 4.2 Trending Algorithm

```typescript
// Create: src/services/trending/algorithm.ts
export class TrendingAlgorithm {
  calculateTrendingScore(debate: DebateData): number {
    const now = Date.now();
    const age = now - debate.timestamp;
    const ageInHours = age / (1000 * 60 * 60);
    
    // Factors that increase trending score
    const shareCount = debate.shares || 0;
    const viewCount = debate.views || 0;
    const remixCount = debate.remixes || 0;
    const challengeCount = debate.challenges || 0;
    
    // Engagement rate (shares per view)
    const engagementRate = viewCount > 0 ? shareCount / viewCount : 0;
    
    // Virality coefficient
    const viralityScore = 
      shareCount * 10 +
      remixCount * 15 +
      challengeCount * 20 +
      viewCount * 0.1;
    
    // Time decay (newer content scores higher)
    const timeDecay = Math.exp(-ageInHours / 24);
    
    // Topic boost (trending topics get bonus)
    const topicBoost = this.getTopicTrendingBoost(debate.topic);
    
    return viralityScore * timeDecay * topicBoost * engagementRate;
  }
  
  private getTopicTrendingBoost(topic: string): number {
    const trendingTopics = [
      'AI Safety',
      'Climate Change',
      'Cryptocurrency',
      // Add more based on current events
    ];
    
    const matchesTrending = trendingTopics.some(t => 
      topic.toLowerCase().includes(t.toLowerCase())
    );
    
    return matchesTrending ? 1.5 : 1.0;
  }
}
```

## Phase 5: Deep Linking & Attribution (Week 2)
**Goal:** Track viral loops and enable seamless sharing

### 5.1 Deep Link Configuration

```typescript
// Update: app.json
{
  "expo": {
    "scheme": "debateai",
    "ios": {
      "associatedDomains": ["applinks:debateai.app"]
    },
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "debateai.app",
              "pathPrefix": "/"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### 5.2 Deep Link Handler

```typescript
// Create: src/services/deepLinking/index.ts
import * as Linking from 'expo-linking';
import { NavigationContainerRef } from '@react-navigation/native';

export class DeepLinkService {
  private navigation: NavigationContainerRef<any> | null = null;
  
  initialize(navigation: NavigationContainerRef<any>) {
    this.navigation = navigation;
    
    // Handle initial URL
    Linking.getInitialURL().then(this.handleUrl);
    
    // Handle URL changes
    Linking.addEventListener('url', ({ url }) => this.handleUrl(url));
  }
  
  private handleUrl = (url: string | null) => {
    if (!url || !this.navigation) return;
    
    const parsed = Linking.parse(url);
    
    // Handle different deep link types
    switch (parsed.hostname) {
      case 'debate':
        this.handleDebateLink(parsed.path, parsed.queryParams);
        break;
      case 'challenge':
        this.handleChallengeLink(parsed.path, parsed.queryParams);
        break;
      case 'remix':
        this.handleRemixLink(parsed.path, parsed.queryParams);
        break;
    }
    
    // Track attribution
    this.trackAttribution(parsed);
  };
  
  private handleDebateLink(path: string, params: any) {
    const debateId = path?.split('/')[1];
    if (debateId) {
      this.navigation?.navigate('DebateViewer', { debateId });
      
      analytics.track('deeplink_opened', {
        type: 'debate',
        debateId,
        source: params?.source,
      });
    }
  }
  
  private trackAttribution(parsed: any) {
    const source = parsed.queryParams?.utm_source || 'direct';
    const medium = parsed.queryParams?.utm_medium || 'share';
    const campaign = parsed.queryParams?.utm_campaign || 'viral';
    
    analytics.track('attribution', {
      source,
      medium,
      campaign,
      referrer: parsed.queryParams?.referrer,
    });
  }
  
  generateShareLink(
    type: 'debate' | 'challenge' | 'remix',
    id: string,
    userId?: string
  ): string {
    const baseUrl = 'https://debateai.app';
    const utm = `utm_source=app&utm_medium=share&utm_campaign=viral`;
    const referrer = userId ? `&referrer=${userId}` : '';
    
    return `${baseUrl}/${type}/${id}?${utm}${referrer}`;
  }
}
```

## Phase 6: Viral Metrics & Analytics Dashboard

### 6.1 Metrics to Track

```typescript
// Create: src/types/metrics.ts
export interface ViralMetrics {
  // Core metrics
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  
  // Sharing metrics
  shareRate: number; // % of debates shared
  sharesPerUser: number;
  platformBreakdown: Record<string, number>;
  
  // Viral coefficients
  kFactor: number; // viral coefficient
  viralCycle: number; // days for viral loop
  
  // Content metrics
  debatesCreated: number;
  debatesShared: number;
  debatesFromShares: number; // attribution
  
  // Engagement
  avgDebateLength: number;
  completionRate: number;
  remixRate: number;
  challengeAcceptRate: number;
  
  // Growth
  newUsersFromShares: number;
  retentionBySource: Record<string, number>;
}
```

### 6.2 Metrics Calculator

```typescript
// Create: src/services/metrics/viralMetricsCalculator.ts
export class ViralMetricsCalculator {
  async calculateKFactor(): Promise<number> {
    // K = i * c
    // i = invites sent per user
    // c = conversion rate
    
    const totalUsers = await this.getTotalUsers();
    const totalInvites = await this.getTotalShares();
    const conversions = await this.getConversionsFromShares();
    
    const i = totalInvites / totalUsers;
    const c = conversions / totalInvites;
    
    return i * c;
  }
  
  async calculateViralCycle(): Promise<number> {
    // Average time from user acquisition to first share
    const acquisitionToShare = await this.getAvgTimeToFirstShare();
    
    // Average time from share to new user conversion
    const shareToConversion = await this.getAvgShareToConversion();
    
    return acquisitionToShare + shareToConversion;
  }
  
  async getShareFunnel(): Promise<ShareFunnel> {
    return {
      debatesCompleted: await this.getDebatesCompleted(),
      shareButtonClicks: await this.getShareButtonClicks(),
      shareCardsGenerated: await this.getShareCardsGenerated(),
      sharesCompleted: await this.getSharesCompleted(),
      clicksFromShares: await this.getClicksFromShares(),
      conversionsFromShares: await this.getConversionsFromShares(),
    };
  }
}
```

## Performance Considerations

### Image Generation Optimization

```typescript
// Optimize ViewShot rendering
const optimizedViewShotOptions = {
  format: 'png',
  quality: 0.8, // Reduce quality for faster generation
  result: 'tmpfile', // Write to temp file instead of base64
  width: 1200, // Fixed dimensions for consistency
  height: 630,
};

// Cache generated images
const cacheGeneratedImage = async (debateId: string, imagePath: string) => {
  const cacheDir = `${RNFS.CachesDirectoryPath}/share-images`;
  await RNFS.mkdir(cacheDir);
  
  const cachedPath = `${cacheDir}/${debateId}.png`;
  await RNFS.copyFile(imagePath, cachedPath);
  
  return cachedPath;
};
```

### Video Generation Optimization

```typescript
// Use background processing for video generation
import BackgroundTask from 'react-native-background-task';

BackgroundTask.define(async () => {
  const pendingVideos = await getPendingVideoJobs();
  
  for (const job of pendingVideos) {
    try {
      await generateVideo(job);
      await notifyUserVideoReady(job);
    } catch (error) {
      console.error('Background video generation failed:', error);
    }
  }
});

// Schedule background task
BackgroundTask.schedule({
  period: 900, // 15 minutes
});
```

## Platform-Specific Implementations

### iOS Specific

```typescript
// iOS Share Extensions
import { ShareMenu } from 'react-native-share-menu';

// Enable sharing TO the app
ShareMenu.getInitialShare((share) => {
  if (share?.data) {
    // Handle incoming share
    handleIncomingDebateTopic(share.data);
  }
});
```

### Android Specific

```typescript
// Android Intent Handling
import { IntentLauncher } from 'expo-intent-launcher';

// Share to specific apps
const shareToWhatsApp = async (message: string) => {
  const activityAction = 'android.intent.action.SEND';
  const intentParams = {
    type: 'text/plain',
    extra: {
      'android.intent.extra.TEXT': message,
    },
    packageName: 'com.whatsapp',
  };
  
  await IntentLauncher.startActivityAsync(activityAction, intentParams);
};
```

## Testing Strategy

### Unit Tests

```typescript
// Test viral metrics calculation
describe('ViralMetricsCalculator', () => {
  it('should calculate K-factor correctly', async () => {
    const calculator = new ViralMetricsCalculator();
    mockGetTotalUsers.mockResolvedValue(1000);
    mockGetTotalShares.mockResolvedValue(500);
    mockGetConversionsFromShares.mockResolvedValue(50);
    
    const kFactor = await calculator.calculateKFactor();
    expect(kFactor).toBe(0.1); // (500/1000) * (50/500) = 0.5 * 0.1
  });
});
```

### Integration Tests

```typescript
// Test share flow end-to-end
describe('Share Flow', () => {
  it('should generate and share image card', async () => {
    const { getByText, getByTestId } = render(<DebateScreen />);
    
    // Complete a debate
    await completeDebate();
    
    // Click share button
    fireEvent.press(getByText('Share Results'));
    
    // Verify share card is displayed
    expect(getByTestId('share-card')).toBeTruthy();
    
    // Trigger share
    fireEvent.press(getByText('Share Image'));
    
    // Verify analytics tracked
    expect(analytics.track).toHaveBeenCalledWith('debate_shared', 
      expect.objectContaining({ method: 'image_card' })
    );
  });
});
```

## Rollout Plan

### Week 1: Foundation
- [ ] Integrate ShareableDebateCard into Victory screen
- [ ] Implement basic analytics service
- [ ] Add share incentives system
- [ ] Deploy and monitor sharing metrics

### Week 2: Viral Mechanics
- [ ] Implement challenge system
- [ ] Add remix functionality
- [ ] Setup deep linking
- [ ] Add attribution tracking

### Week 3: Discovery
- [ ] Build trending debates screen
- [ ] Implement trending algorithm
- [ ] Add to main navigation
- [ ] A/B test trending placement

### Week 4: Advanced Features
- [ ] Video generation MVP
- [ ] Platform-specific optimizations
- [ ] Advanced analytics dashboard
- [ ] Performance optimizations

## Success Metrics

### Target Metrics (30 days post-launch)

| Metric | Current | Target | Growth |
|--------|---------|--------|--------|
| Share Rate | <1% | 15% | 15x |
| K-Factor | 0 | 0.5 | ∞ |
| DAU from Shares | 0 | 20% | New |
| Viral Cycle | N/A | 3 days | New |
| Debates per User | 2 | 5 | 2.5x |

## Risk Mitigation

### Technical Risks
1. **Video generation performance**: Use background processing
2. **Image generation memory**: Optimize quality and caching
3. **Deep link conflicts**: Thoroughly test all platforms

### Product Risks
1. **Low sharing rate**: A/B test incentives and messaging
2. **Platform rejection**: Follow platform guidelines strictly
3. **Spam/abuse**: Implement rate limiting and moderation

## Conclusion

This implementation plan transforms DebateAI from a utility app into a viral growth machine. By prioritizing shareable content formats and building viral mechanics into the core experience, we can achieve sustainable organic growth.

**Next Steps:**
1. Review and approve implementation plan
2. Begin Phase 1 implementation (ShareableDebateCard integration)
3. Setup analytics tracking infrastructure
4. Start measuring baseline metrics

The foundation (ShareableDebateCard) is already built. Now it's time to integrate and iterate based on real user behavior.