import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { renderWithProviders } from '../../../../test-utils/renderWithProviders';
import { PersonalityPicker } from '@/components/organisms/home/PersonalityPicker';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const mockModal = jest.fn(() => null);

jest.mock('@/components/organisms/debate/PersonalityModal', () => ({
  PersonalityModal: (props: any) => {
    mockModal(props);
    return null;
  },
}));

jest.mock('@/config/personalities', () => ({
  UNIVERSAL_PERSONALITIES: [
    { id: 'default', name: 'Default', signatureMoves: [], sampleOpeners: {}, bio: '', tagline: '', emoji: '🙂' },
    { id: 'scholar', name: 'Scholar', signatureMoves: ['Research'], sampleOpeners: { chat: 'Hello' }, bio: 'Curious', tagline: 'Thoughtful', emoji: '📚' },
  ],
  getPersonality: jest.fn(),
}));

jest.mock('@/hooks/usePersonality', () => ({
  usePersonality: () => ({
    isLoading: false,
    settings: { customizations: {}, lastSyncedAt: 0, version: 1 },
    getPersonality: jest.fn().mockReturnValue(null),
    getAllPersonalities: jest.fn().mockReturnValue([]),
    isCustomized: jest.fn().mockReturnValue(false),
    getCustomization: jest.fn().mockReturnValue(null),
    updateCustomization: jest.fn(),
    updateTone: jest.fn(),
    updateDebateProfile: jest.fn(),
    updateModelParameters: jest.fn(),
    toggleCustomization: jest.fn(),
    resetToDefaults: jest.fn(),
    resetAll: jest.fn(),
    reload: jest.fn(),
  }),
  usePersonalityById: () => null,
}));

describe('PersonalityPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

it('opens modal and returns selected personality', async () => {
    const onSelect = jest.fn();

  const { getByTestId } = renderWithProviders(
    <PersonalityPicker
      currentPersonalityId="default"
      onSelectPersonality={onSelect}
      aiName="Claude"
    />,
  );

    fireEvent.press(getByTestId('personality-picker-trigger'));
    expect(mockModal).toHaveBeenLastCalledWith(expect.objectContaining({ visible: true }));

  const modalProps = mockModal.mock.calls[mockModal.mock.calls.length - 1][0];
  await act(async () => {
    modalProps.onConfirm('scholar');
  });

    expect(onSelect).toHaveBeenCalledWith('scholar');
    expect(require('expo-haptics').impactAsync).toHaveBeenCalled();
  });
});
