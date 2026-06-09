import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { GeneratedContentReportModal } from '@/components/organisms/report/GeneratedContentReportModal';
import GeneratedContentReportService from '@/services/reports/GeneratedContentReportService';
import { ErrorService } from '@/services/errors/ErrorService';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Medium: 'medium',
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text>{name}</Text>;
  },
}));

jest.mock('@/services/reports/GeneratedContentReportService', () => ({
  __esModule: true,
  default: {
    submitReport: jest.fn(() => Promise.resolve({ success: true, reportId: 'report-1' })),
  },
}));

jest.mock('@/services/errors/ErrorService', () => ({
  ErrorService: {
    showSuccess: jest.fn(),
    handleWithToast: jest.fn(),
  },
}));

describe('GeneratedContentReportModal', () => {
  const target = {
    surface: 'chat' as const,
    contentType: 'text' as const,
    contentId: 'msg-1',
    title: 'Chat text from Claude',
    contentText: 'Generated answer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits the selected reason and optional details in-app', async () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <GeneratedContentReportModal
        visible
        target={target}
        onClose={onClose}
      />
    );

    fireEvent.press(getByTestId('generated-content-report-reason-hate_harassment'));
    fireEvent.changeText(getByTestId('generated-content-report-details'), 'This response targeted a protected class.');
    fireEvent.press(getByTestId('generated-content-report-submit'));

    await waitFor(() => {
      expect(GeneratedContentReportService.submitReport).toHaveBeenCalledWith({
        target,
        reason: 'hate_harassment',
        details: 'This response targeted a protected class.',
      });
      expect(ErrorService.showSuccess).toHaveBeenCalledWith('Report submitted for review.', 'safety');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
