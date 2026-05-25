import {
  buildDebateInterstitialTemplate,
  createDebateInterstitialMessage,
} from '@/services/debate/DebateInterstitialService';
import { getFormat, getPresetForFormat } from '@/config/debate/formats';
import { DebateStatus, type DebateSession } from '@/services/debate/DebateOrchestrator';
import type { AIService } from '@/services/aiAdapter';
import type { AI } from '@/types';

const participants: AI[] = [
  { id: 'openai-slot-1', provider: 'openai', name: 'ChatGPT', model: 'gpt-5' },
  { id: 'claude-slot-1', provider: 'claude', name: 'Claude', model: 'opus-4.1' },
];

const teamParticipants: AI[] = [
  ...participants,
  { id: 'google-slot-2', provider: 'google', name: 'Gemini', model: 'gemini-3.5-flash' },
  { id: 'grok-slot-2', provider: 'grok', name: 'Grok', model: 'grok-4' },
];

const createSession = (): DebateSession => {
  const format = getFormat('oxford');
  const preset = getPresetForFormat('oxford', 'short');
  return {
    id: 'debate-1',
    topic: 'Resolved: public transit should be free.',
    participants,
    personalities: {},
    startTime: 1,
    status: DebateStatus.ACTIVE,
    currentRound: 1,
    messageCount: 0,
    messageIndex: 0,
    currentAIIndex: 0,
    totalRounds: preset.voteCount,
    totalMessages: preset.messages.length,
    civility: 3,
    format,
    preset,
    presetId: preset.id,
    stances: {
      'openai-slot-1': 'pro',
      'claude-slot-1': 'con',
    },
    voiceConfig: {
      enabled: true,
      providerId: 'elevenlabs',
      debaterVoices: {},
      podcast: {
        enabled: true,
        scriptMode: 'byok_ai',
        outputMode: 'playlist',
        mc: {
          id: 'mc-1',
          provider: 'openai',
          name: 'Podcast MC',
          model: 'gpt-5',
        },
        mcVoice: {
          voiceId: 'voice-host',
          voiceName: 'Host',
        },
      },
    },
  };
};

const createAudienceQuestionSession = (): DebateSession => {
  const base = createSession();
  const preset = getPresetForFormat('oxford', 'long');

  return {
    ...base,
    participants: teamParticipants,
    preset,
    presetId: preset.id,
    totalRounds: preset.voteCount,
    totalMessages: preset.messages.length,
    audienceQuestions: {
      aff: 'How would your side pay for this?',
      neg: 'Why is the status quo enough?',
    },
  };
};

describe('DebateInterstitialService', () => {
  it('generates metadata-first MC copy with the selected BYOK provider and model', async () => {
    const forbiddenBrand = ['Intelligence', 'Squared'].join(' ');
    const aiService = {
      sendMessage: jest.fn().mockResolvedValue({
        response: 'Welcome to the debate. Tonight, the motion is tested by two sharply opposed advocates.',
        modelUsed: 'gpt-5',
      }),
    };

    const message = await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session: createSession(),
      kind: 'intro',
      now: () => 123,
    });

    expect(aiService.sendMessage).toHaveBeenCalledWith(
      'openai',
      expect.stringContaining('Write one concise podcast host interstitial'),
      [],
      undefined,
      undefined,
      expect.objectContaining({ maxTokens: 260, temperature: 0.62 }),
      'gpt-5'
    );
    expect(aiService.sendMessage).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining(forbiddenBrand),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    expect(message).toMatchObject({
      sender: 'Debate MC',
      senderType: 'user',
      content: 'Welcome to the debate. Tonight, the motion is tested by two sharply opposed advocates.',
      metadata: {
        debateInterstitial: {
          kind: 'intro',
          label: 'MC Introduction',
          generatedByProvider: 'openai',
          generatedByModel: 'gpt-5',
          usedTemplateFallback: false,
        },
      },
    });
  });

  it('prompts the MC as a neutral public-radio host with stakes framing', async () => {
    const aiService = {
      sendMessage: jest.fn().mockResolvedValue({
        response: 'Welcome to the debate. This motion reaches into everyday choices and public priorities.',
        modelUsed: 'gpt-5',
      }),
    };

    await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session: createSession(),
      kind: 'intro',
      now: () => 234,
    });

    const prompt = aiService.sendMessage.mock.calls[0][1] as string;
    expect(prompt).toContain('neutral public radio host');
    expect(prompt).toContain('Use stakes framing, not argument framing');
    expect(prompt).toContain('Intro beat: preserve the required opening line');
    expect(prompt).toContain('Neutrality rule: do not say either side is stronger');
    expect(prompt).toContain('Context mode: live web context is available');
  });

  it('uses broad-context guardrails when the selected MC model has no live web search', async () => {
    const session = createSession();
    if (session.voiceConfig?.podcast) {
      session.voiceConfig.podcast.mc = {
        id: 'mc-claude',
        provider: 'claude',
        name: 'Podcast MC',
        model: 'opus-4.1',
      };
    }
    const aiService = {
      sendMessage: jest.fn().mockResolvedValue({
        response: 'Welcome to the debate. This motion has long asked communities to weigh access against cost.',
        modelUsed: 'opus-4.1',
      }),
    };

    await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session,
      kind: 'intro',
      now: () => 235,
    });

    const prompt = aiService.sendMessage.mock.calls[0][1] as string;
    expect(prompt).toContain('Context mode: broad context only');
    expect(prompt).toContain('Do not make specific current claims, cite dates, quote statistics, or name recent events');
  });

  it('enables live web search only for supported MC models and stores returned citations', async () => {
    const adapter = { config: { webSearchEnabled: false } };
    const citations = [{ index: 1, url: 'https://example.com/context', title: 'Context source' }];
    const aiService = {
      ensureAdapter: jest.fn().mockResolvedValue(adapter),
      sendMessage: jest.fn().mockImplementation(async () => {
        expect(adapter.config.webSearchEnabled).toBe(true);
        return {
          response: 'Welcome to the debate. Current transit fights often turn on access, budgets, and trust.',
          modelUsed: 'gpt-5',
          metadata: { citations },
        };
      }),
    };

    const message = await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session: createSession(),
      kind: 'intro',
      now: () => 236,
    });

    expect(aiService.ensureAdapter).toHaveBeenCalledWith('podcast-mc:mc-1:gpt-5', 'openai', 'gpt-5');
    expect(adapter.config.webSearchEnabled).toBe(false);
    expect(message?.metadata?.webSearchEnabled).toBe(true);
    expect(message?.metadata?.citations).toEqual(citations);
  });

  it('uses an isolated MC adapter when one is available', async () => {
    const adapter = {
      config: {
        webSearchEnabled: false,
        parameters: { temperature: 0.1 },
        isDebateMode: true,
        model: 'gpt-4.1-mini',
        personality: { id: 'debater' },
      },
      sendMessage: jest.fn().mockImplementation(async () => ({
        response: 'Welcome to the debate. The motion now comes into focus.',
        modelUsed: 'gpt-5',
      })),
      setTemporaryPersonality: jest.fn(),
    };
    const aiService = {
      ensureAdapter: jest.fn().mockResolvedValue(adapter),
      sendMessage: jest.fn(),
    };

    const message = await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session: createSession(),
      kind: 'intro',
      now: () => 2361,
    });

    expect(aiService.ensureAdapter).toHaveBeenCalledWith('podcast-mc:mc-1:gpt-5', 'openai', 'gpt-5');
    expect(adapter.sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('Write one concise podcast host interstitial'),
      [],
      undefined,
      undefined,
      'gpt-5'
    );
    expect(aiService.sendMessage).not.toHaveBeenCalled();
    expect(adapter.config).toEqual({
      webSearchEnabled: false,
      parameters: { temperature: 0.1 },
      isDebateMode: true,
      model: 'gpt-4.1-mini',
      personality: { id: 'debater' },
    });
    expect(message?.metadata?.debateInterstitial).toMatchObject({
      kind: 'intro',
      generatedByModel: 'gpt-5',
      usedTemplateFallback: false,
    });
  });

  it('temporarily disables MC live web search when the MC model does not support it', async () => {
    const session = createSession();
    if (session.voiceConfig?.podcast) {
      session.voiceConfig.podcast.mc = {
        id: 'mc-claude',
        provider: 'claude',
        name: 'Podcast MC',
        model: 'opus-4.1',
      };
    }
    const adapter = { config: { webSearchEnabled: true } };
    const aiService = {
      ensureAdapter: jest.fn().mockResolvedValue(adapter),
      sendMessage: jest.fn().mockImplementation(async () => {
        expect(adapter.config.webSearchEnabled).toBe(false);
        return {
          response: 'Welcome to the debate. Transit funding has always forced choices about access and responsibility.',
          modelUsed: 'opus-4.1',
        };
      }),
    };

    const message = await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session,
      kind: 'intro',
      now: () => 237,
    });

    expect(adapter.config.webSearchEnabled).toBe(true);
    expect(message?.metadata?.webSearchEnabled).toBeUndefined();
    expect(message?.metadata?.citations).toBeUndefined();
  });

  it('includes recent MC lines so generated copy can avoid repetition', async () => {
    const aiService = {
      sendMessage: jest.fn().mockResolvedValue({
        response: 'The debate now turns from opening values to the practical test of implementation.',
        modelUsed: 'gpt-5',
      }),
    };

    await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session: createSession(),
      kind: 'phase_segue',
      completedMessageSpec: { label: 'Opening', phase: 'opening', speaker: 'aff' },
      nextMessageSpec: { label: 'Floor Speech', phase: 'rebuttal', speaker: 'neg' },
      recentMcMessages: [
        'Welcome to the debate. This motion asks how a city defines access.',
        'The opening frame is now on the table.',
      ],
      now: () => 238,
    });

    const prompt = aiService.sendMessage.mock.calls[0][1] as string;
    expect(prompt).toContain('Recent MC lines to avoid repeating');
    expect(prompt).toContain('Welcome to the debate. This motion asks how a city defines access.');
    expect(prompt).toContain('The opening frame is now on the table.');
  });

  it('falls back when pre-result generated copy judges a side', async () => {
    const aiService = {
      sendMessage: jest.fn().mockResolvedValue({
        response: 'The Affirmative is clearly stronger and already winning this debate.',
        modelUsed: 'gpt-5',
      }),
    };

    const message = await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session: createSession(),
      kind: 'intro',
      now: () => 239,
    });

    expect(message?.content).toContain('Welcome to the Symposium AI Debate Arena');
    expect(message?.content).not.toContain('clearly stronger');
    expect(message?.metadata?.debateInterstitial?.usedTemplateFallback).toBe(true);
  });

  it('opens local intro templates with the Symposium AI debate arena line', () => {
    const copy = buildDebateInterstitialTemplate({
      session: createSession(),
      kind: 'intro',
    });

    expect(copy).toContain('Welcome to the Symposium AI Debate Arena: where ideas converge, and understanding emerges.');
    expect(copy).toContain('The motion is: Resolved: public transit should be free.');
  });

  it('falls back to local copy if generated copy references a third-party debate brand', async () => {
    const forbiddenBrand = ['Intelligence', 'Squared'].join(' ');
    const aiService = {
      sendMessage: jest.fn().mockResolvedValue({
        response: `${forbiddenBrand} welcomes you to this debate.`,
        modelUsed: 'gpt-5',
      }),
    };

    const message = await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session: createSession(),
      kind: 'intro',
      now: () => 321,
    });

    expect(message?.content).toContain('Welcome to the Symposium AI Debate Arena');
    expect(message?.content).not.toContain(forbiddenBrand);
    expect(message?.metadata?.debateInterstitial).toMatchObject({
      kind: 'intro',
      usedTemplateFallback: true,
    });
  });

  it('falls back to deterministic local copy when MC generation fails', async () => {
    const aiService = {
      sendMessage: jest.fn().mockRejectedValue(new Error('missing key')),
    };

    const message = await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session: createSession(),
      kind: 'phase_segue',
      completedMessageSpec: { label: 'Opening', phase: 'opening', speaker: 'aff' },
      nextMessageSpec: { label: 'Closing', phase: 'closing', speaker: 'neg' },
      now: () => 456,
    });

    expect(message?.content).toContain('That concludes opening speeches.');
    expect(message?.metadata?.debateInterstitial).toMatchObject({
      kind: 'phase_segue',
      usedTemplateFallback: true,
    });
  });

  it('uses audience-result wording for winner templates', () => {
    const copy = buildDebateInterstitialTemplate({
      session: createSession(),
      kind: 'winner',
      audienceResult: {
        initialStance: 'undecided',
        finalStance: 'for',
        winningSide: 'aff',
        winningSideLabel: 'Affirmative',
        resultVerb: 'persuaded',
        summary: 'The audience moved toward the proposition after closing speeches.',
        winningParticipantIds: ['openai-slot-1'],
      },
    });

    expect(copy).toContain('The audience decision is in: Affirmative.');
    expect(copy).toContain('The audience moved toward the proposition');
  });

  it('reads the submitted audience question in local Q&A templates', () => {
    const session = createAudienceQuestionSession();
    const copy = buildDebateInterstitialTemplate({
      session,
      kind: 'audience_question',
      nextMessageSpec: session.preset.messages[4],
    });

    expect(copy).toContain('ChatGPT');
    expect(copy).toContain('Affirmative');
    expect(copy).toContain('How would your side pay for this?');
  });

  it('falls back when generated Q&A copy omits the submitted question', async () => {
    const session = createAudienceQuestionSession();
    const aiService = {
      sendMessage: jest.fn().mockResolvedValue({
        response: 'We now move to a sharp audience exchange.',
        modelUsed: 'gpt-5',
      }),
    };

    const message = await createDebateInterstitialMessage({
      aiService: aiService as unknown as AIService,
      session,
      kind: 'audience_question',
      nextMessageSpec: session.preset.messages[4],
      now: () => 654,
    });

    expect(message?.content).toContain('How would your side pay for this?');
    expect(message?.metadata?.debateInterstitial).toMatchObject({
      kind: 'audience_question',
      label: 'MC Audience Question',
      usedTemplateFallback: true,
    });
  });
});
