import { AIConfig } from '../types';
import { getModelById } from '../config/modelConfigs';
import { AdapterFactory } from '../services/ai';

/**
 * Determines if attachments (images/documents) should be enabled based on selected AIs
 * 
 * Rules:
 * 1. Only support attachments when exactly 1 AI is selected (avoid complexity with multiple AIs)
 * 2. The selected model must support vision capabilities (from modelConfigs)
 * 3. The adapter must have attachment support implemented (from adapter capabilities)
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
  
  // First check if the specific model supports vision
  // This is our source of truth for model capabilities
  const model = ai.model ? getModelById(ai.provider, ai.model) : null;
  
  // If we have a model, check its vision support
  // If no model specified, we can't determine support
  if (!model || !model.supportsVision) {
    return false;
  }
  
  // Now check if the adapter has attachment support implemented
  try {
    // Create a minimal config just to check capabilities
    const adapter = AdapterFactory.create({
      provider: ai.provider,
      apiKey: 'dummy', // Not used for capability check
      model: ai.model,
    });
    
    const capabilities = adapter.getCapabilities();
    return capabilities.attachments === true;
  } catch (error) {
    // If adapter creation fails, assume no attachment support
    console.warn(`Could not check attachment support for ${ai.provider}:`, error);
    return false;
  }
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
  
  if (!model) {
    return 'No model selected';
  }
  
  if (!model.supportsVision) {
    return `${model.name} doesn't support image attachments`;
  }
  
  // Check adapter capabilities
  try {
    const adapter = AdapterFactory.create({
      provider: ai.provider,
      apiKey: 'dummy',
      model: ai.model,
    });
    
    const capabilities = adapter.getCapabilities();
    if (!capabilities.attachments) {
      return `${ai.provider} adapter doesn't support attachments yet`;
    }
  } catch {
    return `Could not verify attachment support for ${ai.provider}`;
  }
  
  return 'You can attach images or documents';
};