import React from 'react';
import { act } from '@testing-library/react-native';
import HomeScreen from '@/screens/HomeScreen';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { showSheet, createAppStore } from '@/store';
import type { AIConfig } from '@/types';

const mockUseGreeting = jest.fn();
const mockUsePremiumFeatures = jest.fn();
const mockUseAISelection = jest.fn();
const mockUseSessionManagement = jest.fn();
const mockUseQuickStart = jest.fn();
const mockUseFeatureAccess = jest.fn();

let mockHeaderProps: any;
let mockHeaderActionsProps: any;
let mockDynamicAISelectorProps: any;
let mockQuickStartSheetProps: any;
let mockDemoBannerProps: any;
let mockChatTopicPickerProps: any;

jest.mock('@/hooks/useGreeting', () => ({
  useGreeting: (...args: unknown[]) => mockUseGreeting(...args),
}));

jest.mock('@/hooks/home/usePremiumFeatures', () => ({
  usePremiumFeatures: (...args: unknown[]) => mockUsePremiumFeatures(...args),
}));

jest.mock('@/hooks/home/useAISelection', () => ({
  useAISelection: (...args: unknown[]) => mockUseAISelection(...args),
}));

jest.mock('@/hooks/home/useSessionManagement', () => ({
  useSessionManagement: (...args: unknown[]) => mockUseSessionManagement(...args),
}));

jest.mock('@/hooks/home/useQuickStart', () => ({
  useQuickStart: (...args: unknown[]) => mockUseQuickStart(...args),
}));

jest.mock('@/hooks/useFeatureAccess', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseFeatureAccess(...args),
  useFeatureAccess: (...args: unknown[]) => mockUseFeatureAccess(...args),
}));

jest.mock('@/components/organisms', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Header: (props: any) => {
      mockHeaderProps = props;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(Text, { testID: 'header' }, 'header'),
        props.rightElement ?? null,
      );
    },
    HeaderActions: (props: any) => {
      mockHeaderActionsProps = props;
      return React.createElement(Text, { testID: 'header-actions' }, 'actions');
    },
    DynamicAISelector: (props: any) => {
      mockDynamicAISelectorProps = props;
      return React.createElement(Text, { testID: 'dynamic-ai-selector' }, 'selector');
    },
    QuickStartSheet: (props: any) => {
      mockQuickStartSheetProps = props;
      return React.createElement(Text, { testID: 'quick-start-sheet' }, props.visible ? 'visible' : 'hidden');
    },
  };
});

jest.mock('@/components/molecules/subscription/TrialBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    TrialBanner: () => React.createElement(Text, { testID: 'trial-banner' }, 'trial-banner'),
    __esModule: true,
    default: () => React.createElement(Text, { testID: 'trial-banner' }, 'trial-banner'),
  };
});

jest.mock('@/components/molecules/subscription/DemoBanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    DemoBanner: (props: any) => {
      mockDemoBannerProps = props;
      return React.createElement(Text, { testID: 'demo-banner', onPress: props.onPress }, 'demo-banner');
    },
    __esModule: true,
    default: (props: any) => {
      mockDemoBannerProps = props;
      return React.createElement(Text, { testID: 'demo-banner', onPress: props.onPress }, 'demo-banner');
    },
  };
});

jest.mock('@/components/organisms/demo/ChatTopicPickerModal', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ChatTopicPickerModal: (props: any) => {
      mockChatTopicPickerProps = props;
      return React.createElement(Text, { testID: 'topic-picker' }, props.visible ? 'visible' : 'hidden');
    },
    __esModule: true,
    default: (props: any) => {
      mockChatTopicPickerProps = props;
      return React.createElement(Text, { testID: 'topic-picker' }, props.visible ? 'visible' : 'hidden');
    },
  };
});

const createAIConfig = (overrides: Partial<AIConfig> = {}): AIConfig => ({
  id: 'claude-3-opus',
  provider: 'anthropic',
  name: 'Claude 3 Opus',
  model: 'claude-3-opus',
  description: 'Powerful model',
  capabilities: { multimodal: false, audio: false, video: false },
  ...overrides,
});

const createAISelection = (overrides: Record<string, unknown> = {}) => ({
  configuredAIs: [],
  selectedAIs: [],
  toggleAI: jest.fn(),
  changePersonality: jest.fn(),
  changeModel: jest.fn(),
  aiPersonalities: {},
  selectedModels: {},
  hasSelection: false,
  selectionCount: 0,
  maxAIs: 3,
  ...overrides,
});

const createQuickStart = (overrides: Record<string, unknown> = {}) => ({
  templates: [
    {
      id: 'brainstorm',
      title: 'Brainstorm',
      subtitle: 'Generate ideas',
      icon: 'bulb-outline',
      buildAIPrompt: jest.fn(),
    },
  ],
  showSheet: false,
  openSheet: jest.fn(),
  closeSheet: jest.fn(),
  reset: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true),
  buildPrompt: jest.fn().mockReturnValue({
    templateId: 'brainstorm',
    userPrompt: 'app ideas',
    aiPrompt: 'Brainstorm app ideas with structure.',
  }),
  templateCount: 1,
  getStatus: jest.fn(),
  ...overrides,
});

const collectTestIds = (node: any, ids: string[] = []): string[] => {
  if (!node) return ids;
  if (Array.isArray(node)) {
    node.forEach((child) => collectTestIds(child, ids));
    return ids;
  }
  if (node.props?.testID) {
    ids.push(node.props.testID);
  }
  node.children?.forEach((child: any) => collectTestIds(child, ids));
  return ids;
};

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaderProps = undefined;
    mockHeaderActionsProps = undefined;
    mockDynamicAISelectorProps = undefined;
    mockQuickStartSheetProps = undefined;
    mockDemoBannerProps = undefined;
    mockChatTopicPickerProps = undefined;
  });

  const baseGreeting = {
    timeBasedGreeting: 'Good afternoon',
    welcomeMessage: 'Ready for a new debate?',
    greeting: {
      timeBasedGreeting: 'Good afternoon',
      welcomeMessage: 'Ready for a new debate?',
    },
  };

const renderHome = (options?: { aiSelection?: ReturnType<typeof createAISelection>; quickStart?: ReturnType<typeof createQuickStart>; featureAccess?: Record<string, unknown>; session?: Record<string, unknown>; premium?: Record<string, unknown>; navigation?: any; store?: ReturnType<typeof createAppStore>; }) => {
    const aiSelection = options?.aiSelection ?? createAISelection();
    mockUseAISelection.mockReturnValue(aiSelection);

    const quickStart = options?.quickStart ?? createQuickStart();
    mockUseQuickStart.mockReturnValue(quickStart);

    const featureAccess = { isDemo: false, ...options?.featureAccess };
    mockUseFeatureAccess.mockReturnValue(featureAccess);

    const session = { createSession: jest.fn().mockReturnValue('session-123'), ...options?.session };
    mockUseSessionManagement.mockReturnValue(session);

    const premium = { maxAIs: 3, ...options?.premium };
    mockUsePremiumFeatures.mockReturnValue(premium);

    mockUseGreeting.mockReturnValue(baseGreeting);

    const navigation = options?.navigation ?? { navigate: jest.fn() };

    const store = options?.store ?? createAppStore();

    const renderResult = renderWithProviders(<HomeScreen navigation={navigation} />, { store });

    return {
      renderResult,
      aiSelection,
      quickStart,
      featureAccess,
      session,
      premium,
      navigation,
      store,
    };
  };

  it('renders header with greeting information and configures child components', () => {
    const { premium, aiSelection } = renderHome();

    expect(mockUseAISelection).toHaveBeenCalledWith(premium.maxAIs);
    expect(mockHeaderProps).toBeDefined();
    // The header is now a clean slim bar with a task-oriented title; no greeting/demo badge.
    expect(mockHeaderProps.slim).toBe(true);
    expect(mockHeaderProps.title).toBe("Let's Talk");
    expect(mockHeaderActionsProps).toBeDefined();
    expect(mockHeaderActionsProps.variant).toBe('gradient');
    expect(mockHeaderActionsProps.helpCategoryId).toBe('chat');
    expect(mockDynamicAISelectorProps.maxAIs).toBe(aiSelection.maxAIs);
    expect(mockDynamicAISelectorProps.hideHeaderTitle).toBe(true);
    // Quick Start is exposed through the trailing lightbulb on the primary button.
    expect(mockDynamicAISelectorProps.onQuickStart).toBeDefined();
  });

  it('places the trial banner below the header surface', () => {
    const { renderResult } = renderHome({
      featureAccess: { isDemo: false, isInTrial: true, trialDaysRemaining: 1 },
    });

    const testIds = collectTestIds(renderResult.toJSON());

    expect(testIds.indexOf('header')).toBeGreaterThanOrEqual(0);
    expect(testIds.indexOf('trial-banner')).toBeGreaterThanOrEqual(0);
    expect(testIds.indexOf('header')).toBeLessThan(testIds.indexOf('trial-banner'));
    expect(testIds.indexOf('trial-banner')).toBeLessThan(testIds.indexOf('dynamic-ai-selector'));
  });

  it('does not start chat when no AI is selected', async () => {
    const navigation = { navigate: jest.fn() };
    const session = { createSession: jest.fn() };
    const aiSelection = createAISelection({ hasSelection: false, selectedAIs: [], selectionCount: 0 });

    renderHome({ navigation, session, aiSelection });

    await act(async () => {
      mockDynamicAISelectorProps.onStartChat();
    });

    expect(session.createSession).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(mockChatTopicPickerProps).toBeUndefined();
  });

  it('creates a session and navigates to chat when selection is valid', async () => {
    const navigation = { navigate: jest.fn() };
    const selectedAIs = [createAIConfig()];
    const session = { createSession: jest.fn().mockReturnValue('session-456') };
    const aiSelection = createAISelection({
      hasSelection: true,
      selectionCount: selectedAIs.length,
      selectedAIs,
    });

    renderHome({ navigation, session, aiSelection });

    await act(async () => {
      mockDynamicAISelectorProps.onStartChat();
    });

    expect(session.createSession).toHaveBeenCalledWith(selectedAIs);
    expect(navigation.navigate).toHaveBeenCalledWith('Chat', { sessionId: 'session-456' });
  });

  it('shows the topic picker when in demo mode and AI selection is valid', async () => {
    const selectedAIs = [createAIConfig()];
    const aiSelection = createAISelection({
      hasSelection: true,
      selectionCount: selectedAIs.length,
      selectedAIs,
    });

    renderHome({ aiSelection, featureAccess: { isDemo: true } });

    expect(mockChatTopicPickerProps.visible).toBe(false);

    await act(async () => {
      mockDynamicAISelectorProps.onStartChat();
    });

    expect(mockChatTopicPickerProps.visible).toBe(true);
    expect(mockChatTopicPickerProps.providers).toEqual(selectedAIs.map(ai => ai.provider));
  });

  it('passes single AI personality to topic picker when available', async () => {
    const selectedAIs = [createAIConfig({ id: 'anthropic', provider: 'anthropic' })];
    const aiSelection = createAISelection({
      hasSelection: true,
      selectionCount: selectedAIs.length,
      selectedAIs,
      aiPersonalities: { anthropic: 'friendly' },
    });

    renderHome({ aiSelection, featureAccess: { isDemo: true } });

    await act(async () => {
      mockDynamicAISelectorProps.onStartChat();
    });

    expect(mockChatTopicPickerProps.personaId).toBe('friendly');
  });

  it('does not forward persona when multiple AIs selected', async () => {
    const selectedAIs = [createAIConfig({ id: 'anthropic', provider: 'anthropic' }), createAIConfig({ id: 'openai', provider: 'openai' })];
    const aiSelection = createAISelection({
      hasSelection: true,
      selectionCount: selectedAIs.length,
      selectedAIs,
      aiPersonalities: { anthropic: 'friendly', openai: 'succinct' },
    });

    renderHome({ aiSelection, featureAccess: { isDemo: true } });

    await act(async () => {
      mockDynamicAISelectorProps.onStartChat();
    });

    expect(mockChatTopicPickerProps.personaId).toBeUndefined();
  });

  it('opens quick start sheet when onQuickStart is called', async () => {
    const selectedAIs = [createAIConfig()];
    const quickStart = createQuickStart();
    const aiSelection = createAISelection({
      hasSelection: true,
      selectionCount: selectedAIs.length,
      selectedAIs,
    });

    renderHome({ aiSelection, quickStart });

    await act(async () => {
      mockDynamicAISelectorProps.onQuickStart();
    });

    expect(quickStart.openSheet).toHaveBeenCalled();
  });

  it('passes quick start sheet props correctly', () => {
    const quickStart = createQuickStart({
      showSheet: true,
    });

    renderHome({ quickStart });

    expect(mockQuickStartSheetProps.visible).toBe(true);
    expect(mockQuickStartSheetProps.templates).toEqual(quickStart.templates);
    expect(mockQuickStartSheetProps.onStart).toBeDefined();
    expect(mockQuickStartSheetProps.onClose).toBeDefined();
  });

  it('closes quick start sheet when onClose is called', async () => {
    const quickStart = createQuickStart({
      showSheet: true,
      closeSheet: jest.fn(),
    });

    renderHome({ quickStart });

    await act(async () => {
      mockQuickStartSheetProps.onClose();
    });

    expect(quickStart.closeSheet).toHaveBeenCalled();
  });

  it('does not show onQuickStart in demo mode', () => {
    const aiSelection = createAISelection({
      hasSelection: true,
      selectedAIs: [createAIConfig()],
    });

    renderHome({ aiSelection, featureAccess: { isDemo: true } });

    expect(mockDynamicAISelectorProps.onQuickStart).toBeUndefined();
  });

  it('handles quick start completion when selection exists', async () => {
    const selectedAIs = [createAIConfig({ id: 'anthropic' })];
    const session = { createSession: jest.fn().mockReturnValue('session-789') };
    const quickStart = createQuickStart({
      showSheet: true,
      closeSheet: jest.fn(),
    });
    const aiSelection = createAISelection({
      hasSelection: true,
      selectionCount: selectedAIs.length,
      selectedAIs,
    });
    const navigation = { navigate: jest.fn() };

    renderHome({ aiSelection, quickStart, session, navigation });

    await act(async () => {
      mockQuickStartSheetProps.onStart({
        templateId: 'brainstorm',
        userPrompt: 'user prompt',
        aiPrompt: 'ai prompt',
      });
    });

    expect(session.createSession).toHaveBeenCalledWith(selectedAIs);
    expect(navigation.navigate).toHaveBeenCalledWith('Chat', {
      sessionId: 'session-789',
      initialPrompt: 'ai prompt',
      userPrompt: 'user prompt',
      autoSend: true,
    });
    expect(quickStart.closeSheet).toHaveBeenCalled();
  });

  it('closes quick start sheet without navigation when no AI is selected', async () => {
    const quickStart = createQuickStart({
      showSheet: true,
      closeSheet: jest.fn(),
    });
    const session = { createSession: jest.fn() };
    const navigation = { navigate: jest.fn() };

    renderHome({ quickStart, session, navigation });

    await act(async () => {
      mockQuickStartSheetProps.onStart({
        templateId: 'brainstorm',
        userPrompt: 'user prompt',
        aiPrompt: 'ai prompt',
      });
    });

    expect(session.createSession).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(quickStart.closeSheet).toHaveBeenCalled();
  });

  it('dispatches subscription sheet when demo banner is pressed', async () => {
    const store = createAppStore();
    const dispatchSpy = jest.spyOn(store, 'dispatch');
    renderHome({ featureAccess: { isDemo: true }, store });

    await act(async () => {
      mockDemoBannerProps.onPress();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(showSheet({ sheet: 'subscription' }));
  });

  it('does not show trial-start copy in the demo banner after the trial was used', () => {
    renderHome({ featureAccess: { isDemo: true, canStartTrial: false } });

    expect(mockDemoBannerProps.subtitle).toBe('Simulated chat preview. Upgrade to Premium to chat for real.');
  });

  it('creates demo session from topic picker selection and closes modal', async () => {
    const selectedAIs = [createAIConfig({ id: 'anthropic', provider: 'anthropic' })];
    const session = { createSession: jest.fn().mockReturnValue('session-demo') };
    const navigation = { navigate: jest.fn() };
    const aiSelection = createAISelection({
      hasSelection: true,
      selectionCount: selectedAIs.length,
      selectedAIs,
      aiPersonalities: { anthropic: 'friendly' },
    });

    renderHome({ aiSelection, session, navigation, featureAccess: { isDemo: true } });

    await act(async () => {
      mockDynamicAISelectorProps.onStartChat();
    });

    expect(mockChatTopicPickerProps.visible).toBe(true);

    await act(async () => {
      mockChatTopicPickerProps.onSelect('sample-123');
    });

    expect(session.createSession).toHaveBeenCalledWith(selectedAIs);
    expect(navigation.navigate).toHaveBeenCalledWith('Chat', {
      sessionId: 'session-demo',
      demoSampleId: 'sample-123',
    });
    expect(mockChatTopicPickerProps.visible).toBe(false);
  });

  it('hides topic picker when closed without selection', async () => {
    const selectedAIs = [createAIConfig()];
    const aiSelection = createAISelection({
      hasSelection: true,
      selectionCount: selectedAIs.length,
      selectedAIs,
    });

    renderHome({ aiSelection, featureAccess: { isDemo: true } });

    await act(async () => {
      mockDynamicAISelectorProps.onStartChat();
    });

    expect(mockChatTopicPickerProps.visible).toBe(true);

    await act(async () => {
      mockChatTopicPickerProps.onClose();
    });

    expect(mockChatTopicPickerProps.visible).toBe(false);
  });

  it('navigates to API config when add AI is requested', async () => {
    const navigation = { navigate: jest.fn() };

    renderHome({ navigation });

    await act(async () => {
      mockDynamicAISelectorProps.onAddAI();
    });

    expect(navigation.navigate).toHaveBeenCalledWith('APIConfig');
  });
});
