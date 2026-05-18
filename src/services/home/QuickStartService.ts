import {
  QUICK_START_TEMPLATES,
  QuickStartTemplate,
  QuickStartTemplateId,
} from '../../config/quickStartTemplates';
import { HOME_CONSTANTS } from '../../config/homeConstants';

export interface QuickStartPromptPayload {
  templateId: QuickStartTemplateId;
  userPrompt: string;
  aiPrompt: string;
}

/**
 * Service for managing Quick Start templates and prompt generation.
 */
export class QuickStartService {
  static getTemplates(): QuickStartTemplate[] {
    return QUICK_START_TEMPLATES;
  }

  static getTemplateById(templateId: QuickStartTemplateId): QuickStartTemplate | null {
    return QUICK_START_TEMPLATES.find(template => template.id === templateId) || null;
  }

  static validateTemplate(template: QuickStartTemplate | null): boolean {
    const { MIN_TITLE_LENGTH, MAX_TITLE_LENGTH, MIN_SUBTITLE_LENGTH, MAX_SUBTITLE_LENGTH } =
      HOME_CONSTANTS.QUICK_START_VALIDATION;

    if (!template?.id || !template.title || !template.subtitle || !template.icon) {
      return false;
    }

    if (template.title.length < MIN_TITLE_LENGTH || template.title.length > MAX_TITLE_LENGTH) {
      return false;
    }

    if (template.subtitle.length < MIN_SUBTITLE_LENGTH || template.subtitle.length > MAX_SUBTITLE_LENGTH) {
      return false;
    }

    if (typeof template.buildAIPrompt !== 'function') {
      return false;
    }

    return true;
  }

  static buildPrompt(templateId: QuickStartTemplateId, promptText?: string): QuickStartPromptPayload {
    const template = this.getTemplateById(templateId);
    if (!this.validateTemplate(template)) {
      throw new Error(`Unknown Quick Start template: ${templateId}`);
    }

    const safeTemplate = template as QuickStartTemplate;
    const userPrompt = this.normalizePrompt(promptText);
    if (!userPrompt) {
      throw new Error('Quick Start prompt is required');
    }

    return {
      templateId,
      userPrompt,
      aiPrompt: safeTemplate.buildAIPrompt(userPrompt).trim(),
    };
  }

  static validatePromptPayload(payload: QuickStartPromptPayload | null): boolean {
    return !!(
      payload?.templateId &&
      payload.userPrompt.trim().length > 0 &&
      payload.aiPrompt.trim().length > 0
    );
  }

  static isQuickStartAvailable(selectedAICount: number): boolean {
    return selectedAICount >= HOME_CONSTANTS.MIN_AIS_FOR_CHAT;
  }

  static getTemplateCount(): number {
    return QUICK_START_TEMPLATES.length;
  }

  private static normalizePrompt(promptText?: string): string {
    return (promptText || '').trim().replace(/\s+/g, ' ');
  }
}
