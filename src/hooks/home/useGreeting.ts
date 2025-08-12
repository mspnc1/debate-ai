import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { generateCompleteGreeting } from '../../utils/home/greetingGenerator';

/**
 * Custom hook for generating dynamic greetings.
 * Handles time-based greetings and user personalization.
 */
export const useGreeting = () => {
  const user = useSelector((state: RootState) => state.user.currentUser);

  // Generate greeting with current time and user info
  const greeting = useMemo(() => {
    return generateCompleteGreeting(user?.email);
  }, [user?.email]);

  /**
   * Gets a greeting for a specific time (useful for testing).
   * 
   * @param hour - Hour to generate greeting for (0-23)
   * @returns Greeting object with time-based and welcome messages
   */
  const getGreetingForTime = (hour: number) => {
    return generateCompleteGreeting(user?.email, hour);
  };

  /**
   * Checks if it's currently morning.
   * 
   * @returns True if current time is morning
   */
  const isMorning = (): boolean => {
    const hour = new Date().getHours();
    return hour < 12;
  };

  /**
   * Checks if it's currently afternoon.
   * 
   * @returns True if current time is afternoon
   */
  const isAfternoon = (): boolean => {
    const hour = new Date().getHours();
    return hour >= 12 && hour < 17;
  };

  /**
   * Checks if it's currently evening.
   * 
   * @returns True if current time is evening
   */
  const isEvening = (): boolean => {
    const hour = new Date().getHours();
    return hour >= 17;
  };

  /**
   * Gets the current time period.
   * 
   * @returns Time period string ('morning', 'afternoon', or 'evening')
   */
  const getTimePeriod = (): 'morning' | 'afternoon' | 'evening' => {
    if (isMorning()) return 'morning';
    if (isAfternoon()) return 'afternoon';
    return 'evening';
  };

  /**
   * Gets user display information.
   * 
   * @returns Object with user display details
   */
  const getUserInfo = () => {
    return {
      hasUser: !!user,
      email: user?.email || null,
      isAuthenticated: !!user?.email,
      canPersonalize: false, // Set to false since we're keeping it generic
    };
  };

  /**
   * Refreshes the greeting (useful for time changes).
   * 
   * @returns New greeting object
   */
  const refreshGreeting = () => {
    return generateCompleteGreeting(user?.email);
  };

  return {
    // Current Greeting
    timeBasedGreeting: greeting.timeBasedGreeting,
    welcomeMessage: greeting.welcomeMessage,
    
    // Time Checks
    isMorning,
    isAfternoon,
    isEvening,
    getTimePeriod,
    
    // User Info
    getUserInfo,
    
    // Utilities
    getGreetingForTime,
    refreshGreeting,
    
    // Complete Greeting Object
    greeting,
  };
};