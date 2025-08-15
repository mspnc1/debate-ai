/**
 * TimeFormatterService - Time formatting utilities for API verification status
 * Extracted from APIConfigScreen for better separation of concerns
 */

export class TimeFormatterService {
  private static instance: TimeFormatterService;

  static getInstance(): TimeFormatterService {
    if (!TimeFormatterService.instance) {
      TimeFormatterService.instance = new TimeFormatterService();
    }
    return TimeFormatterService.instance;
  }

  /**
   * Format verification time for API provider status
   * Based on the original formatVerificationTime logic from APIConfigScreen
   */
  formatVerificationTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Verified just now';
    if (diffMins < 60) return `Verified ${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `Verified ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `Verified ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return `Verified ${date.toLocaleDateString()}`;
  }

  /**
   * Get relative time difference in milliseconds
   */
  getTimeDifference(timestamp: number): number {
    return new Date().getTime() - timestamp;
  }

  /**
   * Check if timestamp is within last N minutes
   */
  isWithinMinutes(timestamp: number, minutes: number): boolean {
    const diffMs = this.getTimeDifference(timestamp);
    return diffMs <= (minutes * 60 * 1000);
  }

  /**
   * Check if timestamp is within last N hours
   */
  isWithinHours(timestamp: number, hours: number): boolean {
    const diffMs = this.getTimeDifference(timestamp);
    return diffMs <= (hours * 60 * 60 * 1000);
  }

  /**
   * Check if timestamp is within last N days
   */
  isWithinDays(timestamp: number, days: number): boolean {
    const diffMs = this.getTimeDifference(timestamp);
    return diffMs <= (days * 24 * 60 * 60 * 1000);
  }

  /**
   * Format duration for API operations
   */
  formatDuration(startTimestamp: number, endTimestamp?: number): string {
    const end = endTimestamp || Date.now();
    const diffMs = end - startTimestamp;
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get timestamp for current time
   */
  getCurrentTimestamp(): number {
    return Date.now();
  }

  /**
   * Format timestamp to readable date string
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Format timestamp to readable date and time string
   */
  formatTimestampWithTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Check if verification is still fresh (within last hour)
   */
  isVerificationFresh(timestamp: number): boolean {
    return this.isWithinHours(timestamp, 1);
  }

  /**
   * Check if verification is stale (older than 24 hours)
   */
  isVerificationStale(timestamp: number): boolean {
    return !this.isWithinDays(timestamp, 1);
  }

  /**
   * Get verification status based on age
   */
  getVerificationStatus(timestamp: number): 'fresh' | 'recent' | 'stale' {
    if (this.isVerificationFresh(timestamp)) {
      return 'fresh';
    } else if (this.isWithinDays(timestamp, 1)) {
      return 'recent';
    } else {
      return 'stale';
    }
  }
}

export default TimeFormatterService.getInstance();