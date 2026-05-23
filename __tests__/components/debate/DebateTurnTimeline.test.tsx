import React from 'react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { DebateTurnTimeline } from '@/components/organisms/debate/DebateTurnTimeline';
import { getPresetForFormat } from '@/config/debate/formats';

describe('DebateTurnTimeline', () => {
  it('renders speech order, current index, and cross-examination role labels', () => {
    const preset = getPresetForFormat('lincoln_douglas', 'standard');
    const { getByText, getAllByText } = renderWithProviders(
      <DebateTurnTimeline
        messages={preset.messages}
        currentMessageIndex={2}
        currentTurnLabel="Cross-Examination (CX) · answering"
      />
    );

    expect(getByText('Speech Order')).toBeTruthy();
    expect(getByText('3/8')).toBeTruthy();
    expect(getAllByText('Cross-Examination (CX)').length).toBeGreaterThan(0);
    expect(getByText('Aff · answers')).toBeTruthy();
  });
});
