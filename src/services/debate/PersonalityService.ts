/**
 * Service for managing AI personalities in debates
 * Handles personality selection, validation, and application
 */

import { 
  PersonalityOption, 
  UNIVERSAL_PERSONALITIES, 
  getPersonality, 
  getDebatePrompt 
} from '../../config/personalities';
import { AIDebater, Personality, ValidationResult } from '../../types/debate';

export class PersonalityService {
  /**
   * Get default personality for an AI
   */
  static getDefaultPersonality(): Personality {
    const defaultPersonalityOption = UNIVERSAL_PERSONALITIES.find(p => p.id === 'default');
    
    if (!defaultPersonalityOption) {
      throw new Error('Default personality not found');
    }

    return PersonalityService.convertToPersonality(defaultPersonalityOption);
  }

  /**
   * Get available personalities based on premium status
   */
  static getAvailablePersonalities(isPremium: boolean): Personality[] {
    // Free users get basic personalities
    const freePersonalities = ['default', 'debater', 'analytical'];
    
    if (!isPremium) {
      return UNIVERSAL_PERSONALITIES
        .filter(p => freePersonalities.includes(p.id))
        .map(p => PersonalityService.convertToPersonality(p));
    }

    // Premium users get all personalities
    return UNIVERSAL_PERSONALITIES.map(p => PersonalityService.convertToPersonality(p));
  }

  /**
   * Validate personality selections for all AIs
   */
  static validatePersonalitySelection(selections: Map<string, Personality>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if all personalities are valid
    for (const [aiId, personality] of selections.entries()) {
      if (!personality || !personality.id) {
        errors.push(`Invalid personality selection for AI: ${aiId}`);
        continue;
      }

      const personalityExists = UNIVERSAL_PERSONALITIES.some(p => p.id === personality.id);
      if (!personalityExists) {
        errors.push(`Unknown personality "${personality.id}" for AI: ${aiId}`);
      }
    }

    // Check for personality diversity (warning only)
    const personalityIds = Array.from(selections.values()).map(p => p.id);
    const uniquePersonalities = new Set(personalityIds);
    
    if (uniquePersonalities.size === 1 && personalityIds.length > 1) {
      warnings.push('Consider using different personalities for more diverse debate perspectives');
    }

    // Check for conflicting personalities (informational)
    if (PersonalityService.hasConflictingPersonalities(Array.from(selections.values()))) {
      warnings.push('Some personality combinations might create very intense debates');
    }

    return {
      isValid: errors.length === 0,
      message: errors.length > 0 ? errors[0] : undefined,
      errors,
      warnings,
    };
  }

  /**
   * Apply personality to debater configuration
   */
  static applyPersonalityToDebater(debater: AIDebater, personality: Personality): AIDebater {
    return {
      ...debater,
      personality: personality.id,
      debatingStyle: {
        ...debater.debatingStyle,
        ...PersonalityService.getDebatingStyleFromPersonality(personality),
      },
    };
  }

  /**
   * Get personality by ID
   */
  static getPersonalityById(id: string): Personality | null {
    const personalityOption = getPersonality(id);
    if (!personalityOption) {
      return null;
    }
    return PersonalityService.convertToPersonality(personalityOption);
  }

  /**
   * Get debate prompt for personality
   */
  static getDebatePromptForPersonality(personalityId: string): string {
    return getDebatePrompt(personalityId);
  }

  /**
   * Get recommended personality combinations
   */
  static getRecommendedCombinations(): { 
    name: string; 
    description: string; 
    personalities: string[]; 
  }[] {
    return [
      {
        name: 'Classic Debate',
        description: 'Logical vs Analytical - structured and evidence-based',
        personalities: ['debater', 'analytical'],
      },
      {
        name: 'Fun Contrast',
        description: 'Comedian vs Dramatic - entertaining and engaging',
        personalities: ['comedian', 'dramatic'],
      },
      {
        name: 'Philosophical Depth',
        description: 'Philosopher vs Skeptic - deep thinking and questioning',
        personalities: ['philosopher', 'skeptic'],
      },
      {
        name: 'Opposing Views',
        description: 'Optimist vs Contrarian - positive vs challenging perspectives',
        personalities: ['optimist', 'contrarian'],
      },
      {
        name: 'Wit & Wisdom',
        description: 'Sarcastic vs Zen - clever humor vs calm wisdom',
        personalities: ['sarcastic', 'zen'],
      },
      {
        name: 'Modern Clash',
        description: 'Nerdy vs Default - pop culture vs balanced approach',
        personalities: ['nerdy', 'default'],
      },
    ];
  }

  /**
   * Get personality compatibility score
   */
  static getCompatibilityScore(personality1: Personality, personality2: Personality): number {
    // Base compatibility
    let score = 50;

    // Same personality = less interesting
    if (personality1.id === personality2.id) {
      score -= 30;
    }

    // Specific interesting combinations
    const combination = [personality1.id, personality2.id].sort().join('-');
    const bonusCombinations = [
      'comedian-dramatic',
      'optimist-skeptic',
      'philosopher-contrarian',
      'sarcastic-zen',
      'analytical-nerdy',
    ];

    if (bonusCombinations.includes(combination)) {
      score += 25;
    }

    // High-energy combinations
    const highEnergy = ['dramatic', 'comedian', 'contrarian'];
    const highEnergyCount = [personality1.id, personality2.id]
      .filter(id => highEnergy.includes(id)).length;
    
    if (highEnergyCount === 2) {
      score += 15; // Very engaging
    }

    // Balanced combinations
    const calm = ['zen', 'analytical', 'default'];
    const energetic = ['dramatic', 'comedian', 'sarcastic'];
    
    const hasCalmAndEnergetic = 
      (calm.includes(personality1.id) && energetic.includes(personality2.id)) ||
      (calm.includes(personality2.id) && energetic.includes(personality1.id));
    
    if (hasCalmAndEnergetic) {
      score += 20; // Good balance
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get personality usage statistics (for recommendations)
   */
  static getPersonalityStats(): Record<string, { 
    usage: number; 
    rating: number; 
    category: 'popular' | 'balanced' | 'unique' 
  }> {
    // Mock data - in real implementation, this would come from analytics
    return {
      default: { usage: 45, rating: 3.5, category: 'popular' },
      debater: { usage: 25, rating: 4.2, category: 'popular' },
      comedian: { usage: 20, rating: 4.0, category: 'popular' },
      analytical: { usage: 18, rating: 3.8, category: 'balanced' },
      philosopher: { usage: 15, rating: 4.1, category: 'balanced' },
      sarcastic: { usage: 12, rating: 3.9, category: 'balanced' },
      dramatic: { usage: 10, rating: 3.7, category: 'balanced' },
      zen: { usage: 8, rating: 4.3, category: 'unique' },
      nerdy: { usage: 7, rating: 4.0, category: 'unique' },
      contrarian: { usage: 6, rating: 3.6, category: 'unique' },
      optimist: { usage: 5, rating: 3.8, category: 'unique' },
      skeptic: { usage: 4, rating: 3.9, category: 'unique' },
    };
  }

  // Private helper methods

  private static convertToPersonality(personalityOption: PersonalityOption): Personality {
    return {
      id: personalityOption.id,
      name: personalityOption.name,
      description: personalityOption.description,
      systemPrompt: personalityOption.systemPrompt,
      traits: PersonalityService.extractTraitsFromPersonality(personalityOption),
      isPremium: PersonalityService.isPremiumPersonality(personalityOption.id),
      debateModifiers: PersonalityService.getDebateModifiersFromPersonality(personalityOption),
    };
  }

  private static extractTraitsFromPersonality(personalityOption: PersonalityOption): {
    formality: number;
    humor: number;
    technicality: number;
    empathy: number;
  } {
    // Extract traits based on personality characteristics
    const traitMap: Record<string, { formality: number; humor: number; technicality: number; empathy: number }> = {
      default: { formality: 0.6, humor: 0.3, technicality: 0.5, empathy: 0.6 },
      comedian: { formality: 0.2, humor: 0.9, technicality: 0.3, empathy: 0.7 },
      philosopher: { formality: 0.8, humor: 0.2, technicality: 0.6, empathy: 0.5 },
      debater: { formality: 0.7, humor: 0.3, technicality: 0.7, empathy: 0.4 },
      analytical: { formality: 0.8, humor: 0.2, technicality: 0.9, empathy: 0.3 },
      sarcastic: { formality: 0.4, humor: 0.8, technicality: 0.5, empathy: 0.4 },
      dramatic: { formality: 0.5, humor: 0.4, technicality: 0.3, empathy: 0.8 },
      nerdy: { formality: 0.5, humor: 0.6, technicality: 0.9, empathy: 0.5 },
      zen: { formality: 0.6, humor: 0.3, technicality: 0.4, empathy: 0.9 },
      contrarian: { formality: 0.6, humor: 0.4, technicality: 0.6, empathy: 0.3 },
      optimist: { formality: 0.5, humor: 0.6, technicality: 0.4, empathy: 0.8 },
      skeptic: { formality: 0.7, humor: 0.3, technicality: 0.8, empathy: 0.4 },
    };

    return traitMap[personalityOption.id] || traitMap.default;
  }

  private static isPremiumPersonality(personalityId: string): boolean {
    const freePersonalities = ['default', 'debater', 'analytical'];
    return !freePersonalities.includes(personalityId);
  }

  private static getDebateModifiersFromPersonality(personalityOption: PersonalityOption) {
    const modifierMap: Record<string, {
      argumentStyle: 'logical' | 'emotional' | 'balanced';
      interruption: number;
      concession: number;
      aggression: number;
    }> = {
      default: { argumentStyle: 'balanced', interruption: 0.3, concession: 0.5, aggression: 0.4 },
      comedian: { argumentStyle: 'emotional', interruption: 0.6, concession: 0.4, aggression: 0.3 },
      philosopher: { argumentStyle: 'logical', interruption: 0.2, concession: 0.6, aggression: 0.3 },
      debater: { argumentStyle: 'logical', interruption: 0.5, concession: 0.3, aggression: 0.7 },
      analytical: { argumentStyle: 'logical', interruption: 0.3, concession: 0.4, aggression: 0.5 },
      sarcastic: { argumentStyle: 'emotional', interruption: 0.7, concession: 0.2, aggression: 0.6 },
      dramatic: { argumentStyle: 'emotional', interruption: 0.8, concession: 0.3, aggression: 0.8 },
      nerdy: { argumentStyle: 'balanced', interruption: 0.4, concession: 0.5, aggression: 0.4 },
      zen: { argumentStyle: 'balanced', interruption: 0.1, concession: 0.8, aggression: 0.1 },
      contrarian: { argumentStyle: 'logical', interruption: 0.6, concession: 0.1, aggression: 0.7 },
      optimist: { argumentStyle: 'emotional', interruption: 0.3, concession: 0.6, aggression: 0.2 },
      skeptic: { argumentStyle: 'logical', interruption: 0.5, concession: 0.2, aggression: 0.6 },
    };

    return modifierMap[personalityOption.id] || modifierMap.default;
  }

  private static getDebatingStyleFromPersonality(personality: Personality) {
    if (!personality.debateModifiers) {
      return {
        aggression: 0.5,
        formality: 0.6,
        evidenceBased: 0.7,
        emotional: 0.4,
      };
    }

    return {
      aggression: personality.debateModifiers.aggression,
      formality: personality.traits.formality,
      evidenceBased: personality.traits.technicality,
      emotional: 1 - personality.traits.technicality,
    };
  }

  private static hasConflictingPersonalities(personalities: Personality[]): boolean {
    // Check for potentially intense combinations
    const aggressivePersonalities = personalities.filter(p => 
      p.debateModifiers && p.debateModifiers.aggression > 0.6
    );

    // Multiple aggressive personalities might create very heated debates
    return aggressivePersonalities.length > 1;
  }
}