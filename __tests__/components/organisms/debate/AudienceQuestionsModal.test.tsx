import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { AudienceQuestionsModal } from '@/components/organisms/debate/AudienceQuestionsModal';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

describe('AudienceQuestionsModal', () => {
  it('requires both audience questions before submitting', () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(getByText('Submit Questions'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('audience-question-aff'), '  How would this work?  ');
    fireEvent.press(getByText('Submit Questions'));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('audience-question-neg'), 'Why reject the motion?');
    fireEvent.press(getByText('Submit Questions'));

    expect(onSubmit).toHaveBeenCalledWith({
      aff: 'How would this work?',
      neg: 'Why reject the motion?',
    });
  });

  it('pads the submit action above the bottom system inset', () => {
    const { UNSAFE_getByType } = renderWithProviders(
      <AudienceQuestionsModal
        visible
        onSubmit={jest.fn()}
      />
    );

    const scrollView = UNSAFE_getByType(ScrollView);

    expect(scrollView.props.contentContainerStyle).toContainEqual(
      expect.objectContaining({ paddingBottom: 62 })
    );
  });
});
