import { HOME_CONSTANTS } from '../../config/homeConstants';

/**
 * Generates a unique session ID with timestamp and random component.
 * 
 * @returns Unique session ID string in format: session_{timestamp}_{random}
 */
export const generateSessionId = (): string => {
  const timestamp = Date.now();
  const randomComponent = Math.random()
    .toString(36)
    .substr(2, HOME_CONSTANTS.SESSION_ID_RANDOM_LENGTH);
  
  return `${HOME_CONSTANTS.SESSION_ID_PREFIX}${timestamp}_${randomComponent}`;
};

/**
 * Generates a simple session ID compatible with current implementation.
 * This maintains backward compatibility with the existing format.
 * 
 * @returns Simple session ID string in format: session_{timestamp}
 */
export const generateSimpleSessionId = (): string => {
  return `${HOME_CONSTANTS.SESSION_ID_PREFIX}${Date.now()}`;
};

/**
 * Validates that a session ID follows the expected format.
 * 
 * @param sessionId - Session ID to validate
 * @returns True if the session ID is valid, false otherwise
 */
export const validateSessionId = (sessionId: string): boolean => {
  // Check for simple format (current implementation)
  const simplePattern = new RegExp(`^${HOME_CONSTANTS.SESSION_ID_PREFIX}\\d+$`);
  if (simplePattern.test(sessionId)) {
    return true;
  }
  
  // Check for enhanced format (future implementation)
  const enhancedPattern = new RegExp(`^${HOME_CONSTANTS.SESSION_ID_PREFIX}\\d+_[a-z0-9]+$`);
  return enhancedPattern.test(sessionId);
};

/**
 * Extracts the timestamp from a session ID.
 * 
 * @param sessionId - Session ID to extract timestamp from
 * @returns Timestamp as number, or null if invalid
 */
export const extractTimestampFromSessionId = (sessionId: string): number | null => {
  if (!validateSessionId(sessionId)) {
    return null;
  }
  
  const withoutPrefix = sessionId.replace(HOME_CONSTANTS.SESSION_ID_PREFIX, '');
  const timestampPart = withoutPrefix.split('_')[0];
  const timestamp = parseInt(timestampPart, 10);
  
  return isNaN(timestamp) ? null : timestamp;
};