import { act } from '@testing-library/react-native';
import { renderHookWithProviders } from '../../../test-utils/renderHookWithProviders';
import { useQuickStart } from '@/hooks/home/useQuickStart';
import { QuickStartService } from '@/services/home/QuickStartService';
import type { QuickStartTemplate } from '@/config/quickStartTemplates';

jest.mock('@/services/home/QuickStartService', () => ({
  QuickStartService: {
    getTemplates: jest.fn(),
    buildPrompt: jest.fn(),
    isQuickStartAvailable: jest.fn(),
    getTemplateCount: jest.fn(),
  },
}));

describe('useQuickStart', () => {
  const mockGetTemplates = QuickStartService.getTemplates as jest.MockedFunction<typeof QuickStartService.getTemplates>;
  const mockBuildPrompt = QuickStartService.buildPrompt as jest.MockedFunction<typeof QuickStartService.buildPrompt>;
  const mockIsQuickStartAvailable = QuickStartService.isQuickStartAvailable as jest.MockedFunction<typeof QuickStartService.isQuickStartAvailable>;
  const mockGetTemplateCount = QuickStartService.getTemplateCount as jest.MockedFunction<typeof QuickStartService.getTemplateCount>;

  const templates: QuickStartTemplate[] = [
    {
      id: 'brainstorm',
      title: 'Brainstorm',
      subtitle: 'Generate ideas',
      icon: 'bulb-outline',
      buildAIPrompt: jest.fn(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTemplates.mockReturnValue(templates);
    mockGetTemplateCount.mockReturnValue(templates.length);
    mockIsQuickStartAvailable.mockReturnValue(true);
    mockBuildPrompt.mockReturnValue({
      templateId: 'brainstorm',
      userPrompt: 'app ideas',
      aiPrompt: 'Brainstorm app ideas with structure.',
    });
  });

  it('loads templates and controls sheet visibility', () => {
    const { result } = renderHookWithProviders(() => useQuickStart());

    expect(result.current.templates).toEqual(templates);
    expect(result.current.templateCount).toBe(1);
    expect(result.current.showSheet).toBe(false);

    act(() => {
      result.current.openSheet();
    });
    expect(result.current.showSheet).toBe(true);
    expect(result.current.getStatus()).toEqual({
      sheetVisible: true,
      templateCount: 1,
    });

    act(() => {
      result.current.closeSheet();
    });
    expect(result.current.showSheet).toBe(false);
  });

  it('delegates prompt generation and availability checks', () => {
    const { result } = renderHookWithProviders(() => useQuickStart());

    expect(result.current.isAvailable(1)).toBe(true);
    expect(mockIsQuickStartAvailable).toHaveBeenCalledWith(1);

    expect(result.current.buildPrompt('brainstorm', 'app ideas')).toEqual({
      templateId: 'brainstorm',
      userPrompt: 'app ideas',
      aiPrompt: 'Brainstorm app ideas with structure.',
    });
    expect(mockBuildPrompt).toHaveBeenCalledWith('brainstorm', 'app ideas');
  });

  it('reset closes the sheet', () => {
    const { result } = renderHookWithProviders(() => useQuickStart());

    act(() => {
      result.current.openSheet();
    });
    expect(result.current.showSheet).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.showSheet).toBe(false);
  });
});
