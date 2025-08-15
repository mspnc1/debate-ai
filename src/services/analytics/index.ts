/**
 * Analytics Service
 * Local-first analytics tracking with preparation for cloud integration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
  platform: string;
  userId?: string;
}

interface ShareMetrics {
  totalShares: number;
  sharesByPlatform: Record<string, number>;
  lastShareTimestamp: number;
  shareRate: number;
}

class AnalyticsService {
  private sessionId: string;
  private queue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  
  constructor() {
    this.sessionId = Date.now().toString();
    this.initializeUserId();
  }
  
  private async initializeUserId() {
    try {
      let userId = await AsyncStorage.getItem('analytics_user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('analytics_user_id', userId);
      }
      this.userId = userId;
    } catch (error) {
      console.error('Failed to initialize user ID:', error);
    }
  }
  
  track(eventName: string, properties?: Record<string, unknown>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      platform: Platform.OS,
      userId: this.userId || undefined,
    };
    
    this.queue.push(event);
    this.persistEvent(event);
    
    // Auto-flush queue after 10 events or 5 seconds
    if (this.queue.length >= 10) {
      this.flushQueue();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flushQueue(), 5000);
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
    
    // TODO: Send to analytics backend when ready
    // For now, just log and clear the queue
    // Log only in development
    if (__DEV__) {
      // Analytics events logged here for debugging
    }
    
    this.queue = [];
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
  
  // Viral-specific tracking methods
  trackShare(platform: string, contentType: string, success: boolean, metadata?: Record<string, unknown>) {
    this.track('content_shared', {
      platform,
      content_type: contentType,
      success,
      share_method: 'native',
      ...metadata,
    });
    
    // Update share metrics
    this.updateShareMetrics(platform);
  }
  
  private async updateShareMetrics(platform: string) {
    try {
      const metricsStr = await AsyncStorage.getItem('share_metrics');
      const metrics: ShareMetrics = metricsStr ? JSON.parse(metricsStr) : {
        totalShares: 0,
        sharesByPlatform: {},
        lastShareTimestamp: 0,
        shareRate: 0,
      };
      
      metrics.totalShares++;
      metrics.sharesByPlatform[platform] = (metrics.sharesByPlatform[platform] || 0) + 1;
      metrics.lastShareTimestamp = Date.now();
      
      // Calculate share rate (shares per day)
      const firstShareStr = await AsyncStorage.getItem('first_share_timestamp');
      if (firstShareStr) {
        const daysSinceFirstShare = (Date.now() - parseInt(firstShareStr)) / (1000 * 60 * 60 * 24);
        metrics.shareRate = metrics.totalShares / Math.max(daysSinceFirstShare, 1);
      } else {
        await AsyncStorage.setItem('first_share_timestamp', Date.now().toString());
      }
      
      await AsyncStorage.setItem('share_metrics', JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to update share metrics:', error);
    }
  }
  
  trackViralAction(action: 'challenge_created' | 'remix_started' | 'trending_viewed' | 'debate_from_share') {
    this.track(`viral_${action}`, {
      timestamp: Date.now(),
      sessionId: this.sessionId,
    });
  }
  
  trackDebateStart(topic: string, participants: string[], isPremium: boolean) {
    this.track('debate_started', {
      topic,
      participants,
      participant_count: participants.length,
      is_premium: isPremium,
      timestamp: Date.now(),
    });
  }
  
  trackDebateComplete(topic: string, winner: string, duration: number, messageCount: number) {
    this.track('debate_completed', {
      topic,
      winner,
      duration_seconds: Math.round(duration / 1000),
      message_count: messageCount,
      timestamp: Date.now(),
    });
  }
  
  trackEngagement(action: 'vote_cast' | 'transcript_viewed' | 'new_debate_started') {
    this.track(`engagement_${action}`, {
      timestamp: Date.now(),
    });
  }
  
  // Attribution tracking for viral loops
  async trackAttribution(source: string, medium: string, campaign?: string, referrer?: string) {
    this.track('attribution', {
      source,
      medium,
      campaign,
      referrer,
      timestamp: Date.now(),
    });
    
    // Store attribution for later analysis
    try {
      const attribution = { source, medium, campaign, referrer, timestamp: Date.now() };
      await AsyncStorage.setItem('user_attribution', JSON.stringify(attribution));
    } catch (error) {
      console.error('Failed to store attribution:', error);
    }
  }
  
  // Get analytics summary for display
  async getAnalyticsSummary(): Promise<{
    totalEvents: number;
    shareMetrics: ShareMetrics;
    recentEvents: AnalyticsEvent[];
  }> {
    try {
      const eventsStr = await AsyncStorage.getItem('analytics_events');
      const events = eventsStr ? JSON.parse(eventsStr) : [];
      
      const metricsStr = await AsyncStorage.getItem('share_metrics');
      const shareMetrics = metricsStr ? JSON.parse(metricsStr) : {
        totalShares: 0,
        sharesByPlatform: {},
        lastShareTimestamp: 0,
        shareRate: 0,
      };
      
      return {
        totalEvents: events.length,
        shareMetrics,
        recentEvents: events.slice(-10),
      };
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return {
        totalEvents: 0,
        shareMetrics: {
          totalShares: 0,
          sharesByPlatform: {},
          lastShareTimestamp: 0,
          shareRate: 0,
        },
        recentEvents: [],
      };
    }
  }
  
  // Clean up old events
  async cleanupOldEvents(daysToKeep: number = 30) {
    try {
      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
      const eventsStr = await AsyncStorage.getItem('analytics_events');
      
      if (eventsStr) {
        const events = JSON.parse(eventsStr);
        const filtered = events.filter((e: AnalyticsEvent) => e.timestamp > cutoffTime);
        await AsyncStorage.setItem('analytics_events', JSON.stringify(filtered));
        
        // Cleanup logging disabled in production
      }
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
    }
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export types for use in other files
export type { AnalyticsEvent, ShareMetrics };