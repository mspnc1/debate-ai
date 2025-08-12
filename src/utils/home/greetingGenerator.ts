import { HOME_CONSTANTS } from '../../config/homeConstants';

/**
 * Generates time-based greetings based on the current hour.
 * 
 * @param hour - Optional hour to use for testing, defaults to current hour
 * @returns Time-appropriate greeting string
 */
export const generateTimeBasedGreeting = (hour?: number): string => {
  const currentHour = hour ?? new Date().getHours();
  
  if (currentHour < HOME_CONSTANTS.GREETING_TIMES.MORNING_END) {
    return 'Good morning';
  }
  
  if (currentHour < HOME_CONSTANTS.GREETING_TIMES.AFTERNOON_END) {
    return 'Good afternoon';
  }
  
  return 'Good evening';
};

/**
 * Generates a personalized welcome message.
 * Modified to remain generic since we don't have authenticated users yet.
 * 
 * @param _userEmail - Optional user email (not used in current implementation)
 * @returns Generic welcome message
 */
export const generateWelcomeMessage = (_userEmail?: string): string => {
  // Keep generic for now since we don't have authenticated users
  // TODO: Implement personalization when authentication is added
  return 'Welcome back!';
};

/**
 * Combines time-based greeting with welcome message.
 * 
 * @param userEmail - Optional user email
 * @param hour - Optional hour for testing
 * @returns Complete greeting object with time-based and welcome messages
 */
export const generateCompleteGreeting = (userEmail?: string, hour?: number) => {
  return {
    timeBasedGreeting: generateTimeBasedGreeting(hour),
    welcomeMessage: generateWelcomeMessage(userEmail),
  };
};