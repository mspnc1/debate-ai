import { HOME_CONSTANTS } from '../../config/homeConstants';

/**
 * Navigation parameter interfaces for type safety
 */
interface ChatNavigationParams extends Record<string, unknown> {
  sessionId: string;
  initialPrompt?: string;
  userPrompt?: string;
  autoSend?: boolean;
}

/**
 * Service for handling navigation logic and parameter preparation.
 * Centralizes all navigation-related business logic for the Home screen.
 */
export class NavigationService {
  /**
   * Prepares navigation parameters for the Chat screen.
   * 
   * @param sessionId - Session ID for the chat
   * @param options - Optional parameters for the chat session
   * @returns Navigation parameters object
   */
  static prepareChatNavigation(
    sessionId: string, 
    options?: {
      initialPrompt?: string;
      userPrompt?: string;
      autoSend?: boolean;
    }
  ): ChatNavigationParams {
    this.validateSessionId(sessionId);

    return {
      sessionId,
      ...options,
    };
  }

  /**
   * Prepares navigation for a Quick Start chat session.
   * 
   * @param sessionId - Session ID for the chat
   * @param userPrompt - User's original prompt
   * @param enrichedPrompt - AI-enriched prompt
   * @returns Navigation parameters for Quick Start chat
   */
  static prepareQuickStartNavigation(
    sessionId: string,
    userPrompt: string,
    enrichedPrompt: string
  ): ChatNavigationParams {
    this.validateSessionId(sessionId);
    this.validatePrompts(userPrompt, enrichedPrompt);

    return {
      sessionId,
      initialPrompt: enrichedPrompt,
      userPrompt,
      autoSend: true,
    };
  }

  /**
   * Validates session ID format.
   * 
   * @param sessionId - Session ID to validate
   * @throws Error if session ID is invalid
   */
  static validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Session ID must be a non-empty string');
    }

    if (!sessionId.startsWith(HOME_CONSTANTS.SESSION_ID_PREFIX)) {
      throw new Error(`Session ID must start with "${HOME_CONSTANTS.SESSION_ID_PREFIX}"`);
    }
  }

  /**
   * Validates prompt parameters for Quick Start navigation.
   * 
   * @param userPrompt - User's original prompt
   * @param enrichedPrompt - AI-enriched prompt
   * @throws Error if prompts are invalid
   */
  static validatePrompts(userPrompt: string, enrichedPrompt: string): void {
    if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
      throw new Error('User prompt must be a non-empty string');
    }

    if (!enrichedPrompt || typeof enrichedPrompt !== 'string' || !enrichedPrompt.trim()) {
      throw new Error('Enriched prompt must be a non-empty string');
    }
  }

  /**
   * Gets the target screen name for chat navigation.
   * 
   * @returns Screen name constant for Chat screen
   */
  static getChatScreenName(): string {
    return HOME_CONSTANTS.SCREENS.CHAT;
  }

  /**
   * Gets the target screen name for API configuration navigation.
   * 
   * @returns Screen name constant for API Config screen
   */
  static getAPIConfigScreenName(): string {
    return HOME_CONSTANTS.SCREENS.API_CONFIG;
  }

  /**
   * Validates navigation parameters before navigation.
   * 
   * @param screenName - Target screen name
   * @param params - Navigation parameters
   * @returns True if navigation is valid, false otherwise
   */
  static validateNavigation(screenName: string, params?: Record<string, unknown>): boolean {
    if (!screenName || typeof screenName !== 'string') {
      return false;
    }

    // Validate Chat screen navigation
    if (screenName === HOME_CONSTANTS.SCREENS.CHAT) {
      if (!params || !params.sessionId) {
        return false;
      }

      try {
        this.validateSessionId(params.sessionId as string);
        return true;
      } catch {
        return false;
      }
    }

    // API Config screen doesn't require parameters
    if (screenName === HOME_CONSTANTS.SCREENS.API_CONFIG) {
      return true;
    }

    return false;
  }

  /**
   * Creates a navigation handler function for the Chat screen.
   * 
   * @param navigation - React Navigation object
   * @returns Function to handle chat navigation
   */
  static createChatNavigationHandler(
    navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void }
  ) {
    return (sessionId: string, options?: {
      initialPrompt?: string;
      userPrompt?: string;
      autoSend?: boolean;
    }) => {
      const params = this.prepareChatNavigation(sessionId, options);
      navigation.navigate(this.getChatScreenName(), params);
    };
  }

  /**
   * Creates a navigation handler function for the API Config screen.
   * 
   * @param navigation - React Navigation object
   * @returns Function to handle API config navigation
   */
  static createAPIConfigNavigationHandler(
    navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void }
  ) {
    return () => {
      navigation.navigate(this.getAPIConfigScreenName());
    };
  }

  /**
   * Builds complete navigation parameters with validation.
   * 
   * @param baseParams - Base navigation parameters
   * @param additionalParams - Additional parameters to merge
   * @returns Validated and merged navigation parameters
   */
  static buildNavigationParams(
    baseParams: Record<string, unknown>,
    additionalParams?: Record<string, unknown>
  ): Record<string, unknown> {
    const mergedParams = { ...baseParams, ...additionalParams };
    
    // Remove undefined values
    Object.keys(mergedParams).forEach(key => {
      if (mergedParams[key] === undefined) {
        delete mergedParams[key];
      }
    });

    return mergedParams;
  }
}