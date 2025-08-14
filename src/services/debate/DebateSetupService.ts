/**
 * Main service for orchestrating debate setup
 * Coordinates all aspects of debate configuration and validation
 */

import { 
  DebateConfig, 
  DebateSession, 
  ValidationResult, 
  AIDebater, 
  Personality,
  DebateParticipant,
  DebateSettings,
} from '../../types/debate';
import { DEBATE_SETUP_CONFIG } from '../../config/debate/debateSetupConfig';
import { TopicService } from './TopicService';
import { DebaterSelectionService } from './DebaterSelectionService';
import { PersonalityService } from './PersonalityService';

export class DebateSetupService {
  /**
   * Validate complete debate configuration
   */
  static validateDebateConfiguration(config: DebateConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate topic
    const topicValidation = TopicService.validateCustomTopic(config.topic);
    if (!topicValidation.isValid) {
      errors.push(...topicValidation.errors);
    }
    warnings.push(...topicValidation.warnings);

    // Validate debaters
    const debatersValidation = DebaterSelectionService.validateSelection(config.debaters);
    if (!debatersValidation.isValid) {
      errors.push(...debatersValidation.errors);
    }
    warnings.push(...debatersValidation.warnings);

    // Validate personalities
    const personalitiesValidation = PersonalityService.validatePersonalitySelection(config.personalities);
    if (!personalitiesValidation.isValid) {
      errors.push(...personalitiesValidation.errors);
    }
    warnings.push(...personalitiesValidation.warnings);

    // Validate settings
    const settingsValidation = DebateSetupService.validateSettings(config.settings);
    if (!settingsValidation.isValid) {
      errors.push(...settingsValidation.errors);
    }

    // Cross-validation checks
    if (config.debaters.length !== config.personalities.size) {
      warnings.push('Not all debaters have personality assignments');
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? errors[0] : undefined,
      errors,
      warnings,
    };
  }

  /**
   * Create a new debate session from configuration
   */
  static createDebateSession(config: DebateConfig): DebateSession {
    // Validate configuration first
    const validation = DebateSetupService.validateDebateConfiguration(config);
    if (!validation.isValid) {
      throw new Error(`Invalid debate configuration: ${validation.errors.join(', ')}`);
    }

    // Create session ID
    const sessionId = DebateSetupService.generateSessionId();

    // Create participants from debaters and personalities
    const participants = DebateSetupService.createParticipants(config.debaters, config.personalities);

    // Create the debate session
    const session: DebateSession = {
      id: sessionId,
      config,
      status: 'setup',
      currentRound: 0,
      messages: [],
      scores: [],
      participants,
      createdAt: Date.now(),
    };

    return session;
  }

  /**
   * Get default debate configuration
   */
  static getDefaultConfiguration(): Partial<DebateConfig> {
    return {
      topic: '',
      topicMode: DEBATE_SETUP_CONFIG.DEFAULT_TOPIC_MODE,
      debaters: [],
      personalities: new Map(),
      settings: DebateSetupService.getDefaultSettings(),
      estimatedDuration: DEBATE_SETUP_CONFIG.ESTIMATED_DURATION.MEDIUM_TOPIC,
    };
  }

  /**
   * Calculate estimated duration for debate
   */
  static calculateEstimatedDuration(topic: string, debaters: AIDebater[]): number {
    let baseDuration = TopicService.getEstimatedDuration(topic);

    // Adjust for number of debaters
    const debaterMultiplier = Math.max(1, debaters.length / 2);
    baseDuration *= debaterMultiplier;

    // Adjust for debater complexity (if personalities affect debate length)
    const hasComplexPersonalities = debaters.some(debater => 
      debater.personality && !['default', 'debater'].includes(debater.personality)
    );
    
    if (hasComplexPersonalities) {
      baseDuration *= 1.2; // 20% longer for complex personalities
    }

    // Round to nearest 5 minutes
    return Math.round(baseDuration / 5) * 5;
  }

  /**
   * Get debate configuration summary
   */
  static getConfigurationSummary(config: DebateConfig): {
    topic: string;
    debaterCount: number;
    debaterNames: string[];
    hasCustomPersonalities: boolean;
    estimatedDuration: number;
    complexity: 'simple' | 'moderate' | 'complex';
  } {
    const hasCustomPersonalities = Array.from(config.personalities.values())
      .some(p => p.id !== 'default');

    const complexity = DebateSetupService.calculateComplexity(config);

    return {
      topic: config.topic,
      debaterCount: config.debaters.length,
      debaterNames: config.debaters.map(d => d.name),
      hasCustomPersonalities,
      estimatedDuration: config.estimatedDuration,
      complexity,
    };
  }

  /**
   * Preview debate configuration
   */
  static previewDebate(config: Partial<DebateConfig>): {
    canStart: boolean;
    missingElements: string[];
    recommendations: string[];
    warnings: string[];
  } {
    const missingElements: string[] = [];
    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Check required elements
    if (!config.topic || config.topic.trim().length === 0) {
      missingElements.push('Topic selection');
    }

    if (!config.debaters || config.debaters.length < DEBATE_SETUP_CONFIG.REQUIRED_DEBATERS) {
      missingElements.push('AI debater selection');
    }

    // Make recommendations
    if (config.debaters && config.debaters.length === DEBATE_SETUP_CONFIG.REQUIRED_DEBATERS) {
      const providers = new Set(config.debaters.map(d => d.provider));
      if (providers.size === 1) {
        recommendations.push('Consider selecting AIs from different providers for more diverse perspectives');
      }
    }

    if (config.personalities && config.personalities.size > 0) {
      const uniquePersonalities = new Set(Array.from(config.personalities.values()).map(p => p.id));
      if (uniquePersonalities.size === 1) {
        recommendations.push('Try different personalities for more varied debate styles');
      }
    }

    // Check for warnings
    if (config.topic && config.topic.length > 150) {
      warnings.push('Long topics may be challenging to debate effectively');
    }

    return {
      canStart: missingElements.length === 0,
      missingElements,
      recommendations,
      warnings,
    };
  }

  /**
   * Update debate configuration
   */
  static updateConfiguration(
    currentConfig: Partial<DebateConfig>,
    updates: Partial<DebateConfig>
  ): Partial<DebateConfig> {
    const updatedConfig = { ...currentConfig, ...updates };

    // Recalculate estimated duration if topic or debaters changed
    if (updates.topic || updates.debaters) {
      const topic = updatedConfig.topic || '';
      const debaters = updatedConfig.debaters || [];
      
      if (topic && debaters.length > 0) {
        updatedConfig.estimatedDuration = DebateSetupService.calculateEstimatedDuration(topic, debaters);
      }
    }

    return updatedConfig;
  }

  // Private helper methods

  private static validateSettings(settings: DebateSettings): ValidationResult {
    const errors: string[] = [];

    if (settings.maxRounds < 1 || settings.maxRounds > 10) {
      errors.push('Max rounds must be between 1 and 10');
    }

    if (settings.turnDuration < 30 || settings.turnDuration > 300) {
      errors.push('Turn duration must be between 30 and 300 seconds');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private static getDefaultSettings(): DebateSettings {
    return {
      maxRounds: 3,
      turnDuration: 120, // 2 minutes per turn
      allowInterruptions: false,
      moderationLevel: 'light',
      isPremium: false,
    };
  }

  private static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 9);
    return `debate_${timestamp}_${randomStr}`;
  }

  private static createParticipants(
    debaters: AIDebater[],
    personalities: Map<string, Personality>
  ): DebateParticipant[] {
    return debaters.map((debater, index) => {
      const personality = personalities.get(debater.id) || PersonalityService.getDefaultPersonality();
      
      return {
        id: debater.id,
        ai: debater,
        personality,
        position: index === 0 ? 'pro' : 'con', // Simple alternating positions
        stats: {
          messagesCount: 0,
          totalWords: 0,
          averageResponseTime: 0,
          score: 0,
        },
      };
    });
  }

  private static calculateComplexity(config: DebateConfig): 'simple' | 'moderate' | 'complex' {
    let complexityScore = 0;

    // Topic complexity
    if (config.topic.length > 100) complexityScore += 1;
    const topicCategory = TopicService.getTopicCategory(config.topic);
    if (topicCategory === 'Philosophy' || topicCategory === 'Science') {
      complexityScore += 2;
    }

    // Debater count
    if (config.debaters.length > 2) complexityScore += 1;

    // Personality diversity
    const uniquePersonalities = new Set(Array.from(config.personalities.values()).map(p => p.id));
    if (uniquePersonalities.size > 1) complexityScore += 1;
    if (Array.from(config.personalities.values()).some(p => p.isPremium)) {
      complexityScore += 1;
    }

    // Settings complexity
    if (config.settings.maxRounds > 3) complexityScore += 1;
    if (config.settings.allowInterruptions) complexityScore += 1;

    if (complexityScore <= 2) return 'simple';
    if (complexityScore <= 4) return 'moderate';
    return 'complex';
  }
}