import { Message } from '../../types';

export interface MessageFormatOptions {
  includeTimestamp?: boolean;
  includeMetadata?: boolean;
  truncateLength?: number;
}

export interface MentionParseResult {
  mentions: string[];
  cleanText: string;
  hasMentions: boolean;
}

export class MessageService {
  /**
   * Formats a message for display or processing
   */
  static formatMessage(
    message: Message,
    options: MessageFormatOptions = {}
  ): string {
    const {
      includeTimestamp = false,
      includeMetadata = false,
      truncateLength
    } = options;

    let formatted = message.content;

    // Truncate if requested
    if (truncateLength && formatted.length > truncateLength) {
      formatted = formatted.substring(0, truncateLength) + '...';
    }

    // Add timestamp if requested
    if (includeTimestamp) {
      const timeStr = this.formatTime(message.timestamp);
      formatted = `[${timeStr}] ${formatted}`;
    }

    // Add metadata if requested
    if (includeMetadata) {
      const senderInfo = message.senderType === 'user' ? 'You' : message.sender;
      formatted = `${senderInfo}: ${formatted}`;
    }

    return formatted;
  }

  /**
   * Formats timestamp to HH:MM format
   */
  static formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formats timestamp to human-readable relative time
   */
  static formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return this.formatTime(timestamp);
  }

  /**
   * Parses mentions from message text
   */
  static parseMentions(text: string): MentionParseResult {
    const mentionRegex = /@(\w+)/g;
    const matches = Array.from(text.matchAll(mentionRegex));
    
    const mentions = matches.map(match => match[1].toLowerCase());
    const cleanText = text.replace(mentionRegex, (_, name) => `@${name}`);
    
    return {
      mentions: [...new Set(mentions)], // Remove duplicates
      cleanText,
      hasMentions: mentions.length > 0
    };
  }

  /**
   * Validates message content for safety and format
   */
  static validateMessageContent(content: string): {
    isValid: boolean;
    sanitized: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let sanitized = content;

    // Basic validation
    if (!content || typeof content !== 'string') {
      return {
        isValid: false,
        sanitized: '',
        warnings: ['Invalid content type']
      };
    }

    // Trim whitespace
    sanitized = content.trim();

    if (!sanitized) {
      return {
        isValid: false,
        sanitized: '',
        warnings: ['Empty message']
      };
    }

    // Check length
    if (sanitized.length > 10000) {
      warnings.push('Message too long, truncating');
      sanitized = sanitized.substring(0, 10000);
    }

    // Check for potential issues
    if (sanitized.includes('\n'.repeat(10))) {
      warnings.push('Excessive line breaks');
    }

    return {
      isValid: true,
      sanitized,
      warnings
    };
  }

  /**
   * Enriches message with metadata
   */
  static enrichMessage(
    message: Message,
    metadata: Partial<{
      sessionId: string;
      conversationTurn: number;
      responseTime: number;
      wordCount: number;
    }>
  ): Message {
    const wordCount = message.content.split(/\s+/).length;
    
    return {
      ...message,
      metadata: {
        wordCount,
        ...metadata
      }
    };
  }

  /**
   * Extracts key information from message content
   */
  static extractMessageInfo(content: string): {
    wordCount: number;
    characterCount: number;
    lineCount: number;
    hasMentions: boolean;
    hasLinks: boolean;
    hasDebateMode: boolean;
  } {
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = content.length;
    const lineCount = content.split('\n').length;
    
    const hasMentions = /@\w+/.test(content);
    const hasLinks = /https?:\/\//.test(content);
    const hasDebateMode = /\[debate mode\]/i.test(content);

    return {
      wordCount,
      characterCount,
      lineCount,
      hasMentions,
      hasLinks,
      hasDebateMode
    };
  }

  /**
   * Prepares message for AI context (removes sensitive data, formats properly)
   */
  static prepareForAIContext(
    message: Message,
    options: {
      includeMetadata?: boolean;
      truncateLength?: number;
      anonymize?: boolean;
    } = {}
  ): string {
    const { includeMetadata = false, truncateLength, anonymize = false } = options;

    let content = message.content;

    // Truncate if requested
    if (truncateLength && content.length > truncateLength) {
      content = content.substring(0, truncateLength) + '...';
    }

    // Anonymize sender if requested
    const sender = anonymize ? 
      (message.senderType === 'user' ? 'User' : 'AI') : 
      message.sender;

    // Include metadata if requested
    if (includeMetadata) {
      return `${sender}: ${content}`;
    }

    return content;
  }

  /**
   * Filters messages by criteria
   */
  static filterMessages(
    messages: Message[],
    criteria: {
      senderType?: 'user' | 'ai';
      sender?: string;
      timeRange?: { start: number; end: number };
      containsText?: string;
      hasMentions?: boolean;
    }
  ): Message[] {
    return messages.filter(message => {
      if (criteria.senderType && message.senderType !== criteria.senderType) {
        return false;
      }

      if (criteria.sender && message.sender !== criteria.sender) {
        return false;
      }

      if (criteria.timeRange) {
        const { start, end } = criteria.timeRange;
        if (message.timestamp < start || message.timestamp > end) {
          return false;
        }
      }

      if (criteria.containsText && 
          !message.content.toLowerCase().includes(criteria.containsText.toLowerCase())) {
        return false;
      }

      if (criteria.hasMentions !== undefined) {
        const { hasMentions } = this.parseMentions(message.content);
        if (hasMentions !== criteria.hasMentions) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Gets conversation statistics
   */
  static getConversationStats(messages: Message[]): {
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    totalWords: number;
    averageWordsPerMessage: number;
    participants: string[];
    duration: number;
  } {
    const userMessages = messages.filter(m => m.senderType === 'user').length;
    const aiMessages = messages.filter(m => m.senderType === 'ai').length;
    
    const totalWords = messages.reduce((sum, msg) => {
      return sum + msg.content.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);

    const participants = [...new Set(messages.map(m => m.sender))];
    
    const timestamps = messages.map(m => m.timestamp);
    const duration = timestamps.length > 0 ? 
      Math.max(...timestamps) - Math.min(...timestamps) : 0;

    return {
      totalMessages: messages.length,
      userMessages,
      aiMessages,
      totalWords,
      averageWordsPerMessage: messages.length > 0 ? totalWords / messages.length : 0,
      participants,
      duration
    };
  }
}