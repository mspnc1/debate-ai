/**
 * Debate Prompt Builder Service
 * Handles construction of prompts for different phases of debate
 */

import { AI, Message } from '../../types';
import { DEBATE_CONSTANTS } from '../../config/debateConstants';
import { getDebatePrompt } from '../../config/personalities';

export interface PromptContext {
  topic: string;
  ai: AI;
  personalityId?: string;
  isFirstMessage: boolean;
  isLastRound: boolean;
  previousMessage?: string;
  roundNumber: number;
  messageCount: number;
}

export class DebatePromptBuilder {
  /**
   * Build opening argument prompt for the first AI
   */
  buildOpeningPrompt(context: PromptContext): string {
    const { topic, ai, personalityId = 'default' } = context;
    
    const personalityPrompt = getDebatePrompt(personalityId);
    const openingPrompt = [
      `${DEBATE_CONSTANTS.PROMPT_MARKERS.DEBATE_MODE} ${DEBATE_CONSTANTS.PROMPT_MARKERS.TOPIC_PREFIX}"${topic}"`,
      '',
      personalityPrompt,
      '',
      `You are ${ai.name}. Take a strong position on this topic and make your opening argument. Be persuasive and engaging!`
    ].join('\n');
    
    return openingPrompt;
  }
  
  /**
   * Build response prompt for subsequent AIs
   */
  buildResponsePrompt(context: PromptContext): string {
    const { topic, personalityId = 'default', previousMessage, isLastRound } = context;
    
    const personalityPrompt = getDebatePrompt(personalityId);
    const actionText = isLastRound ? 
      DEBATE_CONSTANTS.PROMPT_MARKERS.FINAL_ARGUMENT : 
      DEBATE_CONSTANTS.PROMPT_MARKERS.CONTINUE_DEBATE;
    
    const responsePrompt = [
      personalityPrompt,
      '',
      previousMessage ? `${DEBATE_CONSTANTS.PROMPT_MARKERS.PREVIOUS_SPEAKER}"${previousMessage}"` : '',
      '',
      `Respond to their argument about "${topic}". ${actionText}`
    ].filter(line => line !== '').join('\n');
    
    return responsePrompt;
  }
  
  /**
   * Build continuation prompt after errors or rate limits
   */
  buildContinuationPrompt(context: PromptContext): string {
    const { topic, personalityId = 'default' } = context;
    
    const personalityPrompt = getDebatePrompt(personalityId);
    const continuationPrompt = [
      personalityPrompt,
      '',
      `Continue the debate about "${topic}". Make your argument!`
    ].join('\n');
    
    return continuationPrompt;
  }
  
  /**
   * Build final round prompt
   */
  buildFinalRoundPrompt(context: PromptContext): string {
    const { topic, personalityId = 'default', previousMessage } = context;
    
    const personalityPrompt = getDebatePrompt(personalityId);
    const finalPrompt = [
      personalityPrompt,
      '',
      previousMessage ? `${DEBATE_CONSTANTS.PROMPT_MARKERS.PREVIOUS_SPEAKER}"${previousMessage}"` : '',
      '',
      `This is the final round! Make your strongest closing argument about "${topic}". Be compelling and decisive!`
    ].filter(line => line !== '').join('\n');
    
    return finalPrompt;
  }
  
  /**
   * Extract previous message content from debate messages
   */
  extractPreviousMessage(messages: Message[], currentAI: AI): string | undefined {
    // Find the most recent AI message that's not from the current AI
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.senderType === 'ai' && !message.sender.startsWith(currentAI.name)) {
        return message.content;
      }
    }
    return undefined;
  }
  
  /**
   * Build context-aware prompt based on debate state
   */
  buildContextualPrompt(
    topic: string,
    ai: AI,
    personalityId: string,
    messages: Message[],
    roundNumber: number,
    messageCount: number,
    maxMessages: number
  ): string {
    const isFirstMessage = messageCount === 1;
    const isLastRound = messageCount === maxMessages;
    const previousMessage = this.extractPreviousMessage(messages, ai);
    
    const context: PromptContext = {
      topic,
      ai,
      personalityId,
      isFirstMessage,
      isLastRound,
      previousMessage,
      roundNumber,
      messageCount,
    };
    
    if (isFirstMessage) {
      return this.buildOpeningPrompt(context);
    } else if (isLastRound) {
      return this.buildFinalRoundPrompt(context);
    } else {
      return this.buildResponsePrompt(context);
    }
  }
  
  /**
   * Add personality injection to any prompt
   */
  injectPersonality(basePrompt: string, personalityId: string): string {
    const personalityPrompt = getDebatePrompt(personalityId);
    return `${personalityPrompt}\n\n${basePrompt}`;
  }
  
  /**
   * Add debate mode marker to any prompt
   */
  addDebateModeMarker(prompt: string): string {
    if (!prompt.includes(DEBATE_CONSTANTS.PROMPT_MARKERS.DEBATE_MODE)) {
      return `${DEBATE_CONSTANTS.PROMPT_MARKERS.DEBATE_MODE}\n\n${prompt}`;
    }
    return prompt;
  }
  
  /**
   * Validate prompt length and content
   */
  validatePrompt(prompt: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!prompt || prompt.trim().length === 0) {
      errors.push('Prompt cannot be empty');
    }
    
    if (prompt.length > 4000) {
      errors.push('Prompt is too long (max 4000 characters)');
    }
    
    if (!prompt.includes(DEBATE_CONSTANTS.PROMPT_MARKERS.DEBATE_MODE)) {
      errors.push('Prompt should include debate mode marker');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}