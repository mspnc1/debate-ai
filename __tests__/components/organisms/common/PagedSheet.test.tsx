import React from 'react';
import { Modal, Text, TouchableOpacity } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { PagedSheet, usePagedSheetNav } from '@/components/organisms/common/PagedSheet';

jest.mock('@/components/organisms/help/HelpModalHost', () => ({
  HelpModalHost: () => null,
}));

const PushButton: React.FC<{ to: string }> = ({ to }) => {
  const nav = usePagedSheetNav();
  return (
    <TouchableOpacity testID={`push-${to}`} onPress={() => nav.push(to)}>
      <Text>{`go to ${to}`}</Text>
    </TouchableOpacity>
  );
};

const renderSheet = (onClose = jest.fn()) => {
  const result = renderWithProviders(
    <PagedSheet visible onClose={onClose} testID="paged">
      <PagedSheet.Page id="root" title="Root Title">
        <Text>root body</Text>
        <PushButton to="second" />
      </PagedSheet.Page>
      <PagedSheet.Page id="second" title="Second Title">
        <Text>second body</Text>
      </PagedSheet.Page>
    </PagedSheet>
  );
  return { ...result, onClose };
};

describe('PagedSheet', () => {
  it('renders the root page with its title and no back button', () => {
    const { getByText, queryByTestId } = renderSheet();

    expect(getByText('Root Title')).toBeTruthy();
    expect(getByText('root body')).toBeTruthy();
    expect(queryByTestId('paged-back')).toBeNull();
  });

  it('pushes a page, updates the title, and pops via the back button', () => {
    const { getByText, getByTestId, queryByText, queryByTestId } = renderSheet();

    fireEvent.press(getByTestId('push-second'));
    expect(getByText('Second Title')).toBeTruthy();
    expect(getByText('second body')).toBeTruthy();

    fireEvent.press(getByTestId('paged-back'));
    expect(getByText('Root Title')).toBeTruthy();
    expect(queryByText('second body')).toBeNull();
    expect(queryByTestId('paged-back')).toBeNull();
  });

  it('pops a pushed page on request-close before closing the sheet', () => {
    const { getByTestId, getByText, onClose, UNSAFE_getByType } = renderSheet();

    fireEvent.press(getByTestId('push-second'));
    act(() => {
      UNSAFE_getByType(Modal).props.onRequestClose();
    });
    expect(getByText('Root Title')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      UNSAFE_getByType(Modal).props.onRequestClose();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes from any depth when the backdrop is pressed', () => {
    const { getByTestId, onClose } = renderSheet();

    fireEvent.press(getByTestId('push-second'));
    fireEvent.press(getByTestId('paged-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
