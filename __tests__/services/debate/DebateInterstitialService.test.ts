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
      expect.objectContaining({ maxTokens: 140 }),
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
        winningSideLabel: 'Proposition',
        resultVerb: 'persuaded',
        summary: 'The audience moved toward the proposition after closing speeches.',
        winningParticipantIds: ['openai-slot-1'],
      },
    });

    expect(copy).toContain('The audience decision is in: Proposition.');
    expect(copy).toContain('The audience moved toward the proposition');
  });
});
