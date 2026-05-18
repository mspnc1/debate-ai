import { QUICK_START_TEMPLATES, type QuickStartTemplateId } from '@/config/quickStartTemplates';
import { QuickStartService } from '@/services/home/QuickStartService';

describe('QuickStartService', () => {
  it('exposes valid unique templates', () => {
    const templates = QuickStartService.getTemplates();
    const ids = templates.map(template => template.id);

    expect(templates).toHaveLength(6);
    expect(new Set(ids).size).toBe(ids.length);
    templates.forEach(template => {
      expect(QuickStartService.validateTemplate(template)).toBe(true);
      expect(template.title).toBeTruthy();
      expect(template.subtitle).toBeTruthy();
      expect(template.icon).toBeTruthy();
    });
  });

  it('builds non-empty prompt pairs for every template without personality injection', () => {
    QUICK_START_TEMPLATES.forEach(template => {
      const payload = QuickStartService.buildPrompt(template.id, '  help me understand this messy idea  ');

      expect(payload.templateId).toBe(template.id);
      expect(payload.userPrompt).toBe('help me understand this messy idea');
      expect(payload.aiPrompt.length).toBeGreaterThan(payload.userPrompt.length);
      expect(payload.userPrompt).not.toContain('[PERSONALITY:');
      expect(payload.aiPrompt).not.toContain('[PERSONALITY:');
      expect(payload.aiPrompt).not.toContain('systemPrompt');
      expect(payload.aiPrompt).toContain('Chat mode');
      expect(QuickStartService.validatePromptPayload(payload)).toBe(true);
    });
  });

  it('uses the user-entered prompt as the visible first message', () => {
    const payload = QuickStartService.buildPrompt('brainstorm', '  privacy-first   family calendar ideas  ');

    expect(payload.userPrompt).toBe('privacy-first family calendar ideas');
    expect(payload.aiPrompt).toContain('privacy-first family calendar ideas');
  });

  it('does not generate a default prompt when the input is empty', () => {
    expect(() => QuickStartService.buildPrompt('brainstorm', '   ')).toThrow('Quick Start prompt is required');
  });

  it('validates prompt payloads and rejects unknown templates', () => {
    expect(QuickStartService.validatePromptPayload(null)).toBe(false);
    expect(QuickStartService.validatePromptPayload({
      templateId: 'brainstorm',
      userPrompt: '',
      aiPrompt: 'Prompt',
    })).toBe(false);

    expect(() => QuickStartService.buildPrompt('missing' as QuickStartTemplateId)).toThrow(
      'Unknown Quick Start template',
    );
  });
});
