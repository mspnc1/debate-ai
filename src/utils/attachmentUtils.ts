import { AIConfig } from '../types';
import { getModelById } from '../config/modelConfigs';

/**
 * Determines if attachments (images/documents) should be enabled based on selected AIs
 * 
 * Rules:
 * 1. Only support attachments when exactly 1 AI is selected (avoid complexity with multiple AIs)
 * 2. The selected AI's provider must have attachment support implemented
 * 3. The selected model must support vision capabilities
 * 
 * @param selectedAIs Array of selected AI configurations
 * @returns true if attachments should be enabled, false otherwise
 */
export const getAttachmentSupport = (selectedAIs: AIConfig[]): boolean => {
  // Only support attachments when exactly 1 AI is selected
  // This avoids complexity of sending attachments to multiple AIs
  if (selectedAIs.length !== 1) {
    return false;
  }
  
  const ai = selectedAIs[0];
  
  // Check if the provider has attachment support implemented in the adapter
  // These providers have full attachment handling in their adapters
  const providersWithAttachmentSupport = [
    'claude',    // ClaudeAdapter supports images and documents
    'openai',    // ChatGPTAdapter supports images and documents
    'chatgpt',   // Same as openai
    'google',    // GeminiAdapter supports images and documents
  ];
  
  if (!providersWithAttachmentSupport.includes(ai.provider)) {
    return false;
  }
  
  // Check if the specific model supports vision
  // If no model is specified, check the provider default
  if (!ai.model) {
    // For providers without model selection, default to true if provider supports it
    return true;
  }
  
  // Get the model configuration to check vision support
  const model = getModelById(ai.provider, ai.model);
  
  // Return true if the model explicitly supports vision
  return model?.supportsVision === true;
};

/**
 * Gets a user-friendly message about attachment support
 * 
 * @param selectedAIs Array of selected AI configurations
 * @returns A message explaining why attachments are or aren't available
 */
export const getAttachmentSupportMessage = (selectedAIs: AIConfig[]): string => {
  if (selectedAIs.length === 0) {
    return 'Select an AI to enable attachments';
  }
  
  if (selectedAIs.length > 1) {
    return 'Attachments are only available when using a single AI';
  }
  
  const ai = selectedAIs[0];
  const model = ai.model ? getModelById(ai.provider, ai.model) : null;
  
  if (!model?.supportsVision) {
    return `The selected model doesn't support image/document attachments`;
  }
  
  const providersWithAttachmentSupport = ['claude', 'openai', 'chatgpt', 'google'];
  if (!providersWithAttachmentSupport.includes(ai.provider)) {
    return `${ai.provider} doesn't support attachments yet`;
  }
  
  return 'You can attach images or documents';
};