import { useMemo, useState } from 'react';
import type { QuickStartTemplateId } from '@/config/quickStartTemplates';
import { QuickStartService } from '../../services/home/QuickStartService';

/**
 * Custom hook for managing the Home screen Quick Start sheet.
 */
export const useQuickStart = () => {
  const [showSheet, setShowSheet] = useState(false);

  const templates = useMemo(() => {
    return QuickStartService.getTemplates();
  }, []);

  const openSheet = () => {
    setShowSheet(true);
  };

  const closeSheet = () => {
    setShowSheet(false);
  };

  const reset = () => {
    setShowSheet(false);
  };

  const buildPrompt = (templateId: QuickStartTemplateId, promptText?: string) => {
    return QuickStartService.buildPrompt(templateId, promptText);
  };

  const isAvailable = (selectedAICount: number): boolean => {
    return QuickStartService.isQuickStartAvailable(selectedAICount);
  };

  const getStatus = () => {
    return {
      sheetVisible: showSheet,
      templateCount: QuickStartService.getTemplateCount(),
    };
  };

  return {
    showSheet,
    templates,
    openSheet,
    closeSheet,
    reset,
    isAvailable,
    buildPrompt,
    getStatus,
    templateCount: templates.length,
  };
};
