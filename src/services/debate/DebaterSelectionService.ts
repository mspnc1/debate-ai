/**
 * Service for managing AI debater selection
 * Handles validation, compatibility checking, and optimization
 */

import { AIConfig } from '../../types/index';
import { AIDebater, ValidationResult } from '../../types/debate';
import { DEBATE_SETUP_CONFIG } from '../../config/debate/debateSetupConfig';

export class DebaterSelectionService {
  /**
   * Validate AI selection for debates
   */
  static validateSelection(debaters: AIDebater[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check minimum requirement
    if (debaters.length < DEBATE_SETUP_CONFIG.MIN_DEBATERS) {
      errors.push(DEBATE_SETUP_CONFIG.VALIDATION_MESSAGES.MIN_DEBATERS);
    }

    // Check maximum limit
    if (debaters.length > DEBATE_SETUP_CONFIG.MAX_DEBATERS) {
      errors.push(DEBATE_SETUP_CONFIG.VALIDATION_MESSAGES.MAX_DEBATERS_EXCEEDED);
    }

    // Check for exact requirement in standard debate mode
    if (debaters.length !== DEBATE_SETUP_CONFIG.REQUIRED_DEBATERS) {
      errors.push(DEBATE_SETUP_CONFIG.VALIDATION_MESSAGES.DEBATERS_REQUIRED);
    }

    // Check for duplicate AIs
    const uniqueIds = new Set(debaters.map(ai => ai.id));
    if (uniqueIds.size !== debaters.length) {
      errors.push('Duplicate AI selections are not allowed');
    }

    // Check for provider diversity (warning only)
    const providers = new Set(debaters.map(ai => ai.provider));
    if (providers.size === 1 && debaters.length > 1) {
      warnings.push('Consider selecting AIs from different providers for more diverse perspectives');
    }

    // Check AI availability (basic check)
    const invalidAIs = debaters.filter(ai => !ai.id || !ai.provider);
    if (invalidAIs.length > 0) {
      errors.push('Some selected AIs are invalid or unavailable');
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? errors[0] : undefined,
      errors,
      warnings,
    };
  }

  /**
   * Get optimal AIs for a given topic
   */
  static getOptimalDebaters(topic: string, availableAIs: AIDebater[]): AIDebater[] {
    if (availableAIs.length === 0) {
      return [];
    }

    // For now, return a balanced selection
    // In the future, this could use ML to match AIs to topics
    const scoredAIs = availableAIs.map(ai => ({
      ai,
      score: this.calculateTopicRelevanceScore(ai, topic),
    }));

    // Sort by score and diversity
    scoredAIs.sort((a, b) => {
      // Primary sort: by score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Secondary sort: prefer different providers
      return a.ai.provider === b.ai.provider ? 0 : -1;
    });

    // Return top selections up to the required amount
    return scoredAIs
      .slice(0, DEBATE_SETUP_CONFIG.REQUIRED_DEBATERS)
      .map(item => item.ai);
  }

  /**
   * Check if selected debaters are compatible
   */
  static checkDebaterCompatibility(debaters: AIDebater[]): boolean {
    if (debaters.length < 2) {
      return false;
    }

    // Basic compatibility checks
    // All AIs should have valid configurations
    const hasValidConfig = debaters.every(ai => 
      ai.id && 
      ai.provider && 
      ai.name
    );

    if (!hasValidConfig) {
      return false;
    }

    // Check for known incompatible combinations
    // (None defined yet, but could be added based on provider limitations)
    
    return true;
  }

  /**
   * Enforce selection limits
   */
  static enforceSelectionLimits(debaters: AIDebater[], min: number, max: number): AIDebater[] {
    if (debaters.length <= max && debaters.length >= min) {
      return debaters;
    }

    if (debaters.length > max) {
      // Keep the most recently selected AIs
      return debaters.slice(-max);
    }

    // If below minimum, return as-is (let validation handle the error)
    return debaters;
  }

  /**
   * Toggle AI selection (add/remove)
   */
  static toggleAISelection(
    currentSelection: AIDebater[], 
    aiToToggle: AIDebater,
    maxAllowed = DEBATE_SETUP_CONFIG.MAX_DEBATERS
  ): AIDebater[] {
    const isSelected = currentSelection.some(ai => ai.id === aiToToggle.id);
    
    if (isSelected) {
      // Remove the AI
      return currentSelection.filter(ai => ai.id !== aiToToggle.id);
    } else {
      // Add the AI if under limit
      if (currentSelection.length >= maxAllowed) {
        return currentSelection; // Don't add if at max
      }
      return [...currentSelection, aiToToggle];
    }
  }

  /**
   * Check if an AI is already selected
   */
  static isAISelected(selection: AIDebater[], aiId: string): boolean {
    return selection.some(ai => ai.id === aiId);
  }

  /**
   * Get selection summary
   */
  static getSelectionSummary(debaters: AIDebater[]): {
    count: number;
    providers: string[];
    isValid: boolean;
    canProceed: boolean;
  } {
    const providers = Array.from(new Set(debaters.map(ai => ai.provider)));
    const validation = this.validateSelection(debaters);
    
    return {
      count: debaters.length,
      providers,
      isValid: validation.isValid,
      canProceed: debaters.length === DEBATE_SETUP_CONFIG.REQUIRED_DEBATERS,
    };
  }

  /**
   * Convert AIConfig to AIDebater
   */
  static convertToDebater(aiConfig: AIConfig): AIDebater {
    return {
      ...aiConfig,
      debatingStyle: this.getDefaultDebatingStyle(),
      strengthAreas: this.getProviderStrengths(aiConfig.provider),
      weaknessAreas: this.getProviderWeaknesses(aiConfig.provider),
    };
  }

  /**
   * Get recommended AI pairs for debates
   */
  static getRecommendedPairs(availableAIs: AIDebater[]): AIDebater[][] {
    if (availableAIs.length < 2) {
      return [];
    }

    const pairs: AIDebater[][] = [];
    
    // Generate all possible pairs
    for (let i = 0; i < availableAIs.length; i++) {
      for (let j = i + 1; j < availableAIs.length; j++) {
        const pair = [availableAIs[i], availableAIs[j]];
        if (this.checkDebaterCompatibility(pair)) {
          pairs.push(pair);
        }
      }
    }

    // Sort pairs by diversity (different providers preferred)
    pairs.sort((a, b) => {
      const aDiverse = a[0].provider !== a[1].provider ? 1 : 0;
      const bDiverse = b[0].provider !== b[1].provider ? 1 : 0;
      return bDiverse - aDiverse;
    });

    return pairs.slice(0, 5); // Return top 5 pairs
  }

  // Private helper methods

  private static calculateTopicRelevanceScore(ai: AIDebater, topic: string): number {
    // Base score for all AIs
    let score = 50;

    // Provider-specific adjustments
    const topicLower = topic.toLowerCase();
    
    if (ai.provider === 'claude') {
      // Claude tends to be good at philosophical and analytical topics
      if (topicLower.includes('philosophy') || topicLower.includes('ethics') || 
          topicLower.includes('analysis')) {
        score += 20;
      }
    } else if (ai.provider === 'openai' || ai.provider === 'chatgpt') {
      // GPT models are generally well-rounded
      score += 10;
    } else if (ai.provider === 'gemini') {
      // Google's model might be good at technical topics
      if (topicLower.includes('technology') || topicLower.includes('science')) {
        score += 15;
      }
    }

    // Strength area matching
    if (ai.strengthAreas) {
      ai.strengthAreas.forEach(area => {
        if (topicLower.includes(area.toLowerCase())) {
          score += 15;
        }
      });
    }

    // Random factor to add variety
    score += Math.random() * 10;

    return score;
  }

  private static getDefaultDebatingStyle() {
    return {
      aggression: 0.5,
      formality: 0.6,
      evidenceBased: 0.7,
      emotional: 0.4,
    };
  }

  private static getProviderStrengths(provider: string): string[] {
    const strengths: Record<string, string[]> = {
      claude: ['philosophy', 'ethics', 'analysis', 'reasoning'],
      openai: ['creativity', 'general knowledge', 'conversation'],
      chatgpt: ['creativity', 'general knowledge', 'conversation'],
      gemini: ['technology', 'science', 'research', 'factual'],
      nomi: ['personality', 'emotional intelligence'],
      replika: ['emotional support', 'personal connection'],
      character: ['roleplay', 'character consistency'],
    };

    return strengths[provider] || ['general discussion'];
  }

  private static getProviderWeaknesses(provider: string): string[] {
    const weaknesses: Record<string, string[]> = {
      claude: ['casual conversation', 'humor'],
      openai: ['very recent events', 'real-time data'],
      chatgpt: ['very recent events', 'real-time data'],
      gemini: ['creative writing', 'personal connection'],
      nomi: ['technical analysis', 'factual debates'],
      replika: ['formal debate', 'aggressive arguments'],
      character: ['factual accuracy', 'formal analysis'],
    };

    return weaknesses[provider] || [];
  }
}