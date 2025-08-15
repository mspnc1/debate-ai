import { NativeModules, Platform } from 'react-native';
import { DateFormatOptions } from '../../types/history';

export class DateFormatterService {
  private static instance: DateFormatterService;
  private locale: string = 'en-US';

  constructor() {
    this.locale = this.getDeviceLocale();
  }

  static getInstance(): DateFormatterService {
    if (!DateFormatterService.instance) {
      DateFormatterService.instance = new DateFormatterService();
    }
    return DateFormatterService.instance;
  }

  /**
   * Get device locale
   */
  private getDeviceLocale(): string {
    try {
      if (Platform.OS === 'ios') {
        const locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
                      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
        return locale || 'en-US';
      } else if (Platform.OS === 'android') {
        const locale = NativeModules.I18nManager?.localeIdentifier;
        return locale || 'en-US';
      }
      return 'en-US';
    } catch (error) {
      console.warn('Failed to get device locale, using fallback:', error);
      return 'en-US';
    }
  }

  /**
   * Set the locale for date formatting
   */
  setLocale(locale: string): void {
    this.locale = locale;
  }

  /**
   * Format date relative to current time (Smart formatting from original code)
   */
  formatRelativeDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return `Today, ${date.toLocaleTimeString(this.locale, { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else if (days === 1) {
      return `Yesterday, ${date.toLocaleTimeString(this.locale, { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else if (days < 7) {
      return date.toLocaleDateString(this.locale, { 
        weekday: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString(this.locale, { 
        day: 'numeric', 
        month: 'short',
        year: days > 365 ? 'numeric' : undefined
      });
    }
  }

  /**
   * Format absolute date and time
   */
  formatAbsoluteDate(timestamp: number, options: Partial<DateFormatOptions> = {}): string {
    const date = new Date(timestamp);
    const formatOptions: Intl.DateTimeFormatOptions = {};

    if (options.includeTime !== false) {
      formatOptions.hour = '2-digit';
      formatOptions.minute = '2-digit';
    }

    formatOptions.day = 'numeric';
    formatOptions.month = 'short';

    if (options.includeYear !== false) {
      formatOptions.year = 'numeric';
    }

    return date.toLocaleDateString(options.locale || this.locale, formatOptions);
  }

  /**
   * Format time ago (e.g., "2 hours ago", "3 days ago")
   */
  formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minute = 60 * 1000;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const month = day * 30;
    const year = day * 365;

    if (diff < minute) {
      return 'Just now';
    } else if (diff < hour) {
      const minutes = Math.floor(diff / minute);
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else if (diff < day) {
      const hours = Math.floor(diff / hour);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diff < week) {
      const days = Math.floor(diff / day);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (diff < month) {
      const weeks = Math.floor(diff / week);
      return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
    } else if (diff < year) {
      const months = Math.floor(diff / month);
      return `${months} month${months === 1 ? '' : 's'} ago`;
    } else {
      const years = Math.floor(diff / year);
      return `${years} year${years === 1 ? '' : 's'} ago`;
    }
  }

  /**
   * Format duration between two timestamps
   */
  formatDuration(startTimestamp: number, endTimestamp: number): string {
    const diff = endTimestamp - startTimestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get date group for organizing sessions
   */
  getDateGroup(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return 'This Week';
    } else if (diffDays < 30) {
      return 'This Month';
    } else if (diffDays < 365) {
      return date.toLocaleDateString(this.locale, { month: 'long', year: 'numeric' });
    } else {
      return date.getFullYear().toString();
    }
  }

  /**
   * Format date for specific contexts
   */
  formatForContext(timestamp: number, context: 'card' | 'list' | 'detail' | 'export'): string {
    switch (context) {
      case 'card':
        return this.formatRelativeDate(timestamp);
      
      case 'list':
        return this.formatTimeAgo(timestamp);
      
      case 'detail':
        return this.formatAbsoluteDate(timestamp, { includeTime: true, includeYear: true });
      
      case 'export':
        return new Date(timestamp).toISOString();
      
      default:
        return this.formatRelativeDate(timestamp);
    }
  }

  /**
   * Check if two timestamps are on the same day
   */
  isSameDay(timestamp1: number, timestamp2: number): boolean {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * Check if timestamp is today
   */
  isToday(timestamp: number): boolean {
    return this.isSameDay(timestamp, Date.now());
  }

  /**
   * Check if timestamp is yesterday
   */
  isYesterday(timestamp: number): boolean {
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    return this.isSameDay(timestamp, yesterday);
  }

  /**
   * Check if timestamp is within current week
   */
  isThisWeek(timestamp: number): boolean {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const date = new Date(timestamp);
    
    return date >= weekAgo && date <= now;
  }

  /**
   * Get start and end of day for a given timestamp
   */
  getDayBounds(timestamp: number): { start: number; end: number } {
    const date = new Date(timestamp);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const end = start + (24 * 60 * 60 * 1000) - 1;
    
    return { start, end };
  }

  /**
   * Get start and end of week for a given timestamp
   */
  getWeekBounds(timestamp: number): { start: number; end: number } {
    const date = new Date(timestamp);
    const day = date.getDay();
    const diff = date.getDate() - day; // First day of the week
    
    const start = new Date(date.setDate(diff)).setHours(0, 0, 0, 0);
    const end = start + (7 * 24 * 60 * 60 * 1000) - 1;
    
    return { start, end };
  }

  /**
   * Format date range
   */
  formatDateRange(startTimestamp: number, endTimestamp: number): string {
    const start = new Date(startTimestamp);
    const end = new Date(endTimestamp);
    
    if (this.isSameDay(startTimestamp, endTimestamp)) {
      return this.formatRelativeDate(startTimestamp);
    }
    
    const startFormatted = start.toLocaleDateString(this.locale, { 
      month: 'short', 
      day: 'numeric' 
    });
    
    const endFormatted = end.toLocaleDateString(this.locale, { 
      month: 'short', 
      day: 'numeric',
      year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined
    });
    
    return `${startFormatted} - ${endFormatted}`;
  }

  /**
   * Smart format that chooses best format based on age
   */
  smartFormat(timestamp: number): string {
    const now = Date.now();
    const age = now - timestamp;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    if (age < oneHour) {
      return this.formatTimeAgo(timestamp);
    } else if (age < oneWeek) {
      return this.formatRelativeDate(timestamp);
    } else {
      return this.formatAbsoluteDate(timestamp);
    }
  }

  /**
   * Get formatted time only (no date)
   */
  formatTimeOnly(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(this.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * Get formatted date only (no time)
   */
  formatDateOnly(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(this.locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format for different locales with fallback
   */
  formatLocalized(timestamp: number, _locale?: string): string {
    try {
      // Future enhancement: use locale-specific formatting
      // For now, use the standard formatting regardless of locale
      return this.formatRelativeDate(timestamp);
    } catch (error) {
      console.warn('Date formatting failed for locale, using fallback:', error);
      return this.formatRelativeDate(timestamp);
    }
  }
}

export default DateFormatterService.getInstance();