/**
 * Statistics formatting utilities
 * Pure functions for formatting dates, numbers, and text for display
 */

/**
 * Format a timestamp to a localized date string
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date string (MM/DD/YYYY)
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Format a timestamp to a localized date and time string
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted datetime string
 */
export const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

/**
 * Format a number as a percentage with specified decimal places
 * @param value Number to format as percentage (0-100)
 * @param decimals Number of decimal places (default: 0)
 * @returns Formatted percentage string (e.g., "75%")
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Truncate text to specified length with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with "..." if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  // Try to break at a word boundary if possible
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength - 10) {
    return `${truncated.slice(0, lastSpace)}...`;
  }
  return `${truncated}...`;
};

/**
 * Truncate topic name for display in badges
 * @param topic Topic string to truncate
 * @param maxLength Maximum length (default: 30)
 * @returns Truncated topic name
 */
export const truncateTopic = (topic: string, maxLength: number = 30): string => {
  return truncateText(topic, maxLength);
};

/**
 * Format a large number with abbreviations (K, M, B)
 * @param value Number to format
 * @returns Formatted number string (e.g., "1.2K", "5.4M")
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Format win/loss ratio as a readable string
 * @param wins Number of wins
 * @param losses Number of losses
 * @returns Formatted ratio string (e.g., "3:1", "1:2")
 */
export const formatWinLossRatio = (wins: number, losses: number): string => {
  if (wins === 0 && losses === 0) return '0:0';
  if (losses === 0) return `${wins}:0`;
  if (wins === 0) return `0:${losses}`;
  
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(wins, losses);
  
  return `${wins / divisor}:${losses / divisor}`;
};

/**
 * Format ordinal numbers (1st, 2nd, 3rd, etc.)
 * @param number Number to format as ordinal
 * @returns Ordinal string (e.g., "1st", "2nd", "3rd")
 */
export const formatOrdinal = (number: number): string => {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const value = number % 100;
  return number + (suffix[(value - 20) % 10] || suffix[value] || suffix[0]);
};

/**
 * Format rank with hashtag prefix
 * @param rank Rank number
 * @returns Formatted rank string (e.g., "#1", "#2")
 */
export const formatRank = (rank: number): string => {
  return `#${rank}`;
};

/**
 * Format topic statistics for display
 * @param won Number of times won
 * @param participated Number of times participated
 * @returns Formatted topic stats string (e.g., "3/5")
 */
export const formatTopicStats = (won: number, participated: number): string => {
  return `${won}/${participated}`;
};

/**
 * Format time elapsed since last debate
 * @param timestamp Unix timestamp of last debate
 * @returns Human-readable time elapsed string
 */
export const formatTimeElapsed = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};