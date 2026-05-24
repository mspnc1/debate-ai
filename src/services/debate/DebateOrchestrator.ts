/**
 * DebateOrchestrator Service
 * Central service that orchestrates the entire debate flow
 * Coordinates between all other debate services and manages state transitions
 */

import { AI, Message, ChatSession, Citation, type DebateSpeechMetadata, type DebateVoiceConfig } from '../../types';
import { AIService } from '../aiAdapter';
import { DebateRulesEngine } from './DebateRulesEngine';
import { VotingService } from './VotingService';
import { DebatePromptBuilder } from './DebatePromptBuilder';
import { DEBATE_CONSTANTS } from '../../config/debateConstants';
import { UNIVERSAL_PERSONALITIES, getPersonality, PersonalityOption } from '../../config/personalities';
import { StorageService } from '../chat/StorageService';
import { store } from '../../store';
import { getStreamingService } from '../streaming/StreamingService';
import { setProviderVerificationError } from '../../store/streamingSlice';
import {
  type AudienceDecisionResult,
  type AudienceStance,
  type AudienceVoteStage,
  type DebateSideId,
  getFormat,
  getPresetForFormat,
  getPresetIdForRounds,
  type DebateFormatId,
  type FormatSpec,
  type MessageSpec,
  type PresetConfig,
} from '../../config/debate/formats';
import { getExpertOverrides } from '../../utils/expertMode';
import { ErrorService } from '@/services/errors/ErrorService';
import { AppError } from '@/errors/types/AppError';
import { ErrorCode } from '@/errors/codes/ErrorCodes';
import { mergeAvailabilitiesStrict } from '@/hooks/multimodal/useModalityAvailability';
import { ensureAnswerContent } from '@/utils/citationUtils';
import { resolveProviderModelId } from '@/config/modelConfigs';
import { buildPersonalityRuntime, mergeRuntimeModelParameters } from '@/services/personality';
import { applyDebateOutputTokenCap, getDebateSpeechLengthGuidance } from './debateSpeechLength';

export interface DebateSession {
  id: string;
  topic: string;
  participants: AI[];
  personalities: { [aiId: string]: string };
  /** Optional pre-merged personalities from context (includes user customizations) */
  mergedPersonalities?: Record<string, PersonalityOption>;
  startTime: number;
  status: DebateStatus;
  currentRound: number;
  messageCount: number;
  messageIndex: number;
  currentAIIndex: number;
  totalRounds: number;
  totalMessages: number;
  civility: 1 | 2 | 3 | 4 | 5;
  format: FormatSpec;
  preset: PresetConfig;
  presetId: string;
  stances: { [aiId: string]: 'pro' | 'con' };
  audienceResult?: AudienceDecisionResult;
  webSearchEnabled?: boolean; // Auto-enabled when both AIs support it
  voiceConfig?: DebateVoiceConfig;
}

export enum DebateStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  PAUSED_FOR_REVIEW = 'paused_for_review',
  VOTING_ROUND = 'voting_round',
  VOTING_OVERALL = 'voting_overall',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface DebateError {
  type: 'rate_limit' | 'ai_error' | 'network_error' | 'validation_error';
  message: string;
  aiId?: string;
  retryable: boolean;
}

export interface DebateContinuationPrompt {
  title: string;
  message: string;
  buttonLabel: string;
  isFinalReview: boolean;
  completedMessageIndex: number;
  nextMessageIndex?: number;
}

interface PendingDebateContinuation extends DebateContinuationPrompt {
  messages: Message[];
}

interface DebateRoleContext {
  sideLabel: string;
  sidePosition: 'FOR' | 'AGAINST';
  roleLabel: string;
  teammateNames: string[];
  opposingTeamNames: string[];
  primaryOpponent?: AI;
  roleBrief: string;
}

export interface DebateEvent {
  type:
    | 'message_added'
    | 'round_changed'
    | 'voting_started'
    | 'debate_ended'
    | 'error_occurred'
    | 'debate_started'
    | 'typing_started'
    | 'typing_stopped'
    | 'voting_completed'
    | 'stream_started'
    | 'stream_chunk'
    | 'stream_completed'
    | 'stream_error'
    | 'continuation_required';
  data: Record<string, unknown>;
  timestamp: number;
}

export type DebateEventHandler = (event: DebateEvent) => void;

export class DebateOrchestrator {
  private session: DebateSession | null = null;
  private rulesEngine: DebateRulesEngine;
  private votingService: VotingService | null = null;
  private promptBuilder: DebatePromptBuilder;
  private aiService: AIService;
  private eventHandlers: DebateEventHandler[] = [];
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private currentMessages: Message[] = [];
  private currentVoteIndex = 0;
  private currentAudienceVoteStage?: AudienceVoteStage;
  private pendingContinuation: PendingDebateContinuation | null = null;
  
  constructor(aiService: AIService) {
    this.aiService = aiService;
    this.rulesEngine = new DebateRulesEngine();
    this.promptBuilder = new DebatePromptBuilder();
  }

  private getWebSearchEnabled(): boolean {
    return Boolean(this.session?.webSearchEnabled);
  }

  private applyWebSearchConfig(adapter?: { config?: { webSearchEnabled?: boolean } }): void {
    if (adapter?.config) {
      adapter.config.webSearchEnabled = this.getWebSearchEnabled();
    }
  }

  private getRequiredParticipantCount(preset: PresetConfig): number {
    return (preset.teamSize || 1) * 2;
  }

  private getSideForParticipantIndex(index: number, preset: PresetConfig): DebateSideId {
    const teamSize = preset.teamSize || 1;
    if (teamSize <= 1) {
      return index === 0 ? 'aff' : 'neg';
    }
    return index % 2 === 0 ? 'aff' : 'neg';
  }

  private getParticipantIndexForMessage(messageSpec: MessageSpec): number {
    if (!this.session) return messageSpec.speaker === 'aff' ? 0 : 1;

    const teamSize = this.session.preset.teamSize || 1;
    if (teamSize <= 1) {
      return messageSpec.speaker === 'aff' ? 0 : 1;
    }

    const slot = Math.min(Math.max(messageSpec.speakerSlot ?? 0, 0), teamSize - 1);
    return (slot * 2) + (messageSpec.speaker === 'aff' ? 0 : 1);
  }

  private getParticipantsForSide(side: DebateSideId): AI[] {
    if (!this.session) return [];
    const preset = this.session.preset;
    const teamSize = preset.teamSize || 1;
    if (teamSize <= 1) {
      return side === 'aff'
        ? this.session.participants.slice(0, 1)
        : this.session.participants.slice(1, 2);
    }

    return this.session.participants.filter((_, index) => (
      this.getSideForParticipantIndex(index, preset) === side
    ));
  }

  private getOpposingParticipant(aiIndex: number): AI | undefined {
    if (!this.session) return undefined;
    const currentSide = this.getSideForParticipantIndex(aiIndex, this.session.preset);
    const opposingSide: DebateSideId = currentSide === 'aff' ? 'neg' : 'aff';
    return this.getParticipantsForSide(opposingSide)[0];
  }

  private getSideLabel(side: DebateSideId): string {
    if (this.session?.format.id === 'oxford') {
      return side === 'aff' ? 'Proposition' : 'Opposition';
    }

    return side === 'aff' ? 'Affirmative' : 'Negative';
  }

  private getOrdinalLabel(value: number): string {
    const labels = ['First', 'Second', 'Third', 'Fourth'];
    return labels[value - 1] || `Speaker ${value}`;
  }

  private buildRoleContext(aiIndex: number, messageSpec: MessageSpec): DebateRoleContext {
    if (!this.session) {
      const fallbackSide = messageSpec.speaker;
      const fallbackSideLabel = fallbackSide === 'aff' ? 'Affirmative' : 'Negative';
      const fallbackPosition = fallbackSide === 'aff' ? 'FOR' : 'AGAINST';
      return {
        sideLabel: fallbackSideLabel,
        sidePosition: fallbackPosition,
        roleLabel: `${fallbackSideLabel} speaker`,
        teammateNames: [],
        opposingTeamNames: [],
        roleBrief: `Role brief: You are the ${fallbackSideLabel} speaker (${fallbackPosition}).`,
      };
    }

    const { participants, preset } = this.session;
    const currentAI = participants[aiIndex];
    const side = this.getSideForParticipantIndex(aiIndex, preset);
    const opposingSide: DebateSideId = side === 'aff' ? 'neg' : 'aff';
    const sideLabel = this.getSideLabel(side);
    const opposingSideLabel = this.getSideLabel(opposingSide);
    const sidePosition: 'FOR' | 'AGAINST' = side === 'aff' ? 'FOR' : 'AGAINST';
    const teamSize = preset.teamSize || 1;
    const speakerNumber = (messageSpec.speakerSlot ?? 0) + 1;
    const roleLabel = teamSize > 1
      ? `${this.getOrdinalLabel(speakerNumber)} ${sideLabel} speaker`
      : `${sideLabel} speaker`;
    const teammateNames = this.getParticipantsForSide(side)
      .filter(participant => participant.id !== currentAI?.id)
      .map(participant => participant.name);
    const opposingTeam = this.getParticipantsForSide(opposingSide);
    const opposingTeamNames = opposingTeam.map(participant => participant.name);
    const primaryOpponent = opposingTeam[0];
    const isAudienceVoteModel = preset.voteModel === 'audience_stance';

    const roleLines = [
      `Role brief: You are the ${roleLabel} for ${sideLabel} (${sidePosition}).`,
      teamSize > 1 && teammateNames.length > 0
        ? `Teammate${teammateNames.length === 1 ? '' : 's'}: ${teammateNames.join(', ')}.`
        : undefined,
      opposingTeamNames.length > 0
        ? `${teamSize > 1 ? 'Opposing team' : `Opposing ${opposingSideLabel} side`}: ${opposingTeamNames.join(', ')}.`
        : undefined,
      teamSize > 1
        ? 'Coordinate with your teammate by extending the shared team case instead of repeating it.'
        : undefined,
      isAudienceVoteModel
        ? 'Audience context: the user casts an opening stance before the first speech and a final vote after the closing speeches.'
        : undefined,
      `Current speech: ${messageSpec.label}.`,
    ].filter(Boolean);

    return {
      sideLabel,
      sidePosition,
      roleLabel,
      teammateNames,
      opposingTeamNames,
      primaryOpponent,
      roleBrief: roleLines.join('\n'),
    };
  }

  private buildAIResponseMetadata(
    ai: AI,
    modelUsed?: string,
    citations?: Citation[],
    debateSpeech?: DebateSpeechMetadata
  ): Message['metadata'] {
    const metadata: Message['metadata'] = {
      providerId: ai.id,
      webSearchEnabled: this.getWebSearchEnabled(),
    };

    if (modelUsed) {
      metadata.modelUsed = modelUsed;
    }

    if (citations && citations.length > 0) {
      metadata.citations = citations;
    }

    if (debateSpeech) {
      metadata.debateSpeech = debateSpeech;
    }

    return metadata;
  }

  private buildDebateSpeechMetadata(
    messageIndex: number,
    messageSpec: MessageSpec
  ): DebateSpeechMetadata | undefined {
    if (!this.session) return undefined;

    return {
      formatId: this.session.format.id,
      presetId: this.session.presetId,
      messageIndex,
      totalMessages: this.session.totalMessages,
      phase: messageSpec.phase,
      speaker: messageSpec.speaker,
      ...(typeof messageSpec.speakerSlot === 'number' ? { speakerSlot: messageSpec.speakerSlot } : {}),
      ...(messageSpec.cxRole ? { cxRole: messageSpec.cxRole } : {}),
      label: messageSpec.label,
    };
  }
  
  /**
   * Initialize a new debate session
   */
  async initializeDebate(
    topic: string,
    participants: AI[],
    personalities: { [aiId: string]: string } = {},
    options?: {
      formatId?: DebateFormatId;
      presetId?: string;
      rounds?: number; // 1–5
      civility?: 1 | 2 | 3 | 4 | 5;
      stances?: { [aiId: string]: 'pro' | 'con' };
      /** Optional pre-merged personalities from context (includes user customizations) */
      mergedPersonalities?: Record<string, PersonalityOption>;
      voiceConfig?: DebateVoiceConfig;
    }
  ): Promise<DebateSession> {
    // Resolve configuration
    const formatId = options?.formatId || 'oxford';
    const format = getFormat(formatId);
    const presetId = options?.presetId || getPresetIdForRounds(options?.rounds);
    const preset = getPresetForFormat(formatId, presetId);

    // Validate debate setup
    const validation = this.rulesEngine.validateDebateSetup(participants, topic);
    const requiredParticipants = this.getRequiredParticipantCount(preset);
    if (participants.length < requiredParticipants) {
      validation.errors.push(`${preset.shortLabel} requires ${requiredParticipants} debaters.`);
    }
    if (!validation.valid || validation.errors.length > 0) {
      throw new AppError({
        code: ErrorCode.VALIDATION_REQUIRED,
        message: `Invalid debate setup: ${validation.errors.join(', ')}`,
        userMessage: validation.errors.join('. '),
        recoverable: true,
      });
    }

    const resolvedParticipants = participants.slice(0, requiredParticipants).map(participant => ({
      ...participant,
      model: resolveProviderModelId(participant.provider, participant.model) || participant.model,
    }));

    const totalRounds = preset.voteCount;
    const totalMessages = preset.messages.length;
    const civility = (options?.civility as 1|2|3|4|5) || 3;
    const stances: { [aiId: string]: 'pro' | 'con' } = {};
    resolvedParticipants.forEach((participant, index) => {
      const side = this.getSideForParticipantIndex(index, preset);
      stances[participant.id] = options?.stances?.[participant.id] || (side === 'aff' ? 'pro' : 'con');
    });

    // Require both resolved debater models to support web search.
    const webSearchAvailability = mergeAvailabilitiesStrict(
      resolvedParticipants.map(p => ({ provider: p.provider, model: p.model }))
    );
    const webSearchEnabled = webSearchAvailability.webSearch.supported;

    // Create new session
    const session: DebateSession = {
      id: `debate_${Date.now()}`,
      topic,
      participants: resolvedParticipants,
      personalities,
      mergedPersonalities: options?.mergedPersonalities,
      startTime: Date.now(),
      status: DebateStatus.INITIALIZING,
      currentRound: 1,
      messageCount: 0,
      messageIndex: 0,
      currentAIIndex: 0,
      totalRounds,
      totalMessages,
      civility,
      format,
      preset,
      presetId: preset.id,
      stances,
      webSearchEnabled,
      voiceConfig: options?.voiceConfig,
    };

    this.session = session;
    this.currentVoteIndex = 0;
    this.currentAudienceVoteStage = undefined;
    this.pendingContinuation = null;
    this.currentMessages = [];
    
    // Initialize services
    this.votingService = new VotingService(resolvedParticipants, preset, format.id);
    this.rulesEngine = new DebateRulesEngine(preset);
    
    // Update status
    this.updateSessionStatus(DebateStatus.ACTIVE);
    
    this.emitEvent({
      type: 'debate_started',
      data: { session },
      timestamp: Date.now(),
    });
    
    return session;
  }
  
  /**
   * Start the debate with the first AI
   */
  async startDebate(existingMessages: Message[]): Promise<void> {
    if (!this.session) {
      throw new AppError({
        code: ErrorCode.APP_SESSION_NOT_FOUND,
        message: 'No active debate session',
        userMessage: 'No active debate session. Please start a new debate.',
        recoverable: true,
      });
    }
    
    // Enforce storage limits BEFORE starting the debate
    // This ensures we have room for this new debate
    try {
      const state = store.getState();
      const currentUser = state.user.currentUser;
      const isPremium = currentUser?.subscription === 'pro' || currentUser?.subscription === 'business';
      
      await StorageService.enforceStorageLimits('debate', isPremium, true);
    } catch {
      // Continue anyway - don't block the debate
    }
    
    // Store the initial messages
    this.currentMessages = [...existingMessages];

    if (this.votingService?.isAudienceStanceVoteModel() && !this.votingService.hasAudienceVote('initial')) {
      this.showAudienceStanceVoting('initial');
      return;
    }
    
    await this.executeDebateMessage(0, this.currentMessages);
  }
  
  /**
   * Execute a single debate message from the active format preset.
   */
  async executeDebateMessage(
    messageIndex: number,
    existingMessages: Message[]
  ): Promise<void> {
    if (!this.session || !this.votingService) {
      throw new AppError({
        code: ErrorCode.APP_SESSION_NOT_FOUND,
        message: 'No active debate session or voting service',
        userMessage: 'The debate session has ended or was interrupted.',
        recoverable: true,
      });
    }

    const { participants, personalities, topic, format, preset, totalRounds, civility } = this.session;
    const maxMessages = preset.messages.length;

    // Check if debate should end
    if (this.session.status === DebateStatus.COMPLETED || messageIndex >= maxMessages) {
      this.endDebate();
      return;
    }

    const messageSpec = preset.messages[messageIndex];
    if (!messageSpec) {
      this.endDebate();
      return;
    }

    // Check if we need to show voting from the prior completed speech group.
    if (!this.votingService.isAudienceStanceVoteModel() && this.currentVoteIndex > 0 && !this.votingService.hasVotedForRound(this.currentVoteIndex)) {
      const isFinalRoundVote = this.currentVoteIndex === this.session.totalRounds;
      this.showVotingForRound(this.currentVoteIndex, isFinalRoundVote);
      return;
    }

    const aiIndex = this.getParticipantIndexForMessage(messageSpec);
    const currentAI = participants[aiIndex];
    if (!currentAI) {
      this.endDebate();
      return;
    }
    const phase = messageSpec.phase;
    const debateSpeech = this.buildDebateSpeechMetadata(messageIndex, messageSpec);
    const currentRound = this.currentVoteIndex + 1;

    if (currentRound !== this.session.currentRound) {
      this.session.currentRound = currentRound;
      this.emitEvent({
        type: 'round_changed',
        data: { round: currentRound, isFinal: currentRound >= totalRounds },
        timestamp: Date.now(),
      });
    }

    this.session.currentAIIndex = aiIndex;
    this.session.messageIndex = messageIndex;
    this.session.messageCount = messageIndex + 1;

    try {
      const stances = this.session.stances;
      // Build per-turn prompt with the orchestrator-resolved speech role.
      const personalityId = personalities[currentAI.id] || 'default';
      const previousMessage = this.promptBuilder.extractPreviousMessage(existingMessages, currentAI);
      const roleContext = this.buildRoleContext(aiIndex, messageSpec);
      const speechLength = getDebateSpeechLengthGuidance({
        formatId: format.id,
        presetId: preset.id,
        phase,
        cxRole: messageSpec.cxRole,
      });
      const minimal = this.promptBuilder.buildTurnPrompt({
        topic,
        phase,
        previousMessage,
        isFinalRound: phase === 'closing' || messageIndex >= maxMessages - 2,
        guidance: format.guidance[phase] ?? '',
        format,
        presetId: preset.id,
        civilityLevel: civility,
        personalityId,
        messageLabel: messageSpec.label,
        roleBrief: roleContext.roleBrief,
        cxRole: messageSpec.cxRole,
      });
      const contextualPrompt = minimal;

      // Get debate-only conversation slice
      const debateMessages = existingMessages.filter(msg => msg.timestamp >= (this.session?.startTime || 0));

      // Prefer streaming if adapter supports it
      let adapter = this.aiService.getAdapter(currentAI.provider);
      if (!adapter) {
        const ensureAdapter = (this.aiService as { ensureAdapter?: AIService['ensureAdapter'] }).ensureAdapter;
        if (ensureAdapter) {
          adapter = await ensureAdapter.call(this.aiService, currentAI.provider, currentAI.provider, currentAI.model);
        }
      }
      this.applyWebSearchConfig(adapter);
      const supportsStreaming = !!adapter?.getCapabilities()?.streaming;
      // Respect global/provider streaming preferences
      const streamingState = store.getState().streaming;
      const providerId = currentAI.provider;
      const providerEnabled = streamingState?.streamingPreferences?.[providerId]?.enabled ?? true;
      const globalEnabled = streamingState?.globalStreamingEnabled ?? true;
      const providerHasVerificationError = !!streamingState?.providerVerificationErrors?.[providerId];
      const streamingAllowed = globalEnabled && providerEnabled && !providerHasVerificationError;
      const streamSpeed = (streamingState?.streamingSpeed as 'instant' | 'natural' | 'slow') || 'natural';

      // Resolve expert parameters (expert model acts as default elsewhere; currentAI.model is authoritative here)
      const expert = getExpertOverrides((store.getState().settings?.expertMode || {}) as Record<string, unknown>, currentAI.provider) as {
        enabled: boolean;
        model?: string;
        parameters?: import('../../types').ModelParameters;
      };

      const stance = stances[currentAI.id] || (aiIndex === 0 ? 'pro' : 'con');
      const persona = this.session?.mergedPersonalities?.[personalityId] || getPersonality(personalityId);
      const opponent = roleContext.primaryOpponent || this.getOpposingParticipant(aiIndex) || participants.find((_, idx) => idx !== aiIndex) || participants[(aiIndex + 1) % participants.length];
      const opponentPersonalityId = personalities[opponent?.id || ''] || 'default';
      const opponentPersona = this.session?.mergedPersonalities?.[opponentPersonalityId] || getPersonality(opponentPersonalityId);
      const runtime = buildPersonalityRuntime({
        mode: 'debate',
        personality: persona,
        ai: currentAI,
        debate: {
          topic,
          formatId: format.id,
          formatName: format.name,
          presetLabel: preset.label,
          totalRounds,
          totalMessages: this.session.totalMessages,
          stance,
          sideLabel: roleContext.sideLabel,
          roleLabel: roleContext.roleLabel,
          currentSpeechLabel: messageSpec.label,
          teamMode: preset.teamMode,
          teamSize: preset.teamSize,
          teammateNames: roleContext.teammateNames,
          opposingTeamNames: roleContext.opposingTeamNames,
          audienceVoteModel: preset.voteModel === 'audience_stance',
          initialVoteRequired: preset.initialVoteRequired,
          finalVoteRequired: preset.finalVoteRequired,
          opponentName: opponent?.name || 'Opponent',
          opponentPersonality: opponentPersona,
          civility,
        },
      });
      const runtimeParameters = applyDebateOutputTokenCap(
        mergeRuntimeModelParameters(
          expert.enabled,
          expert.parameters,
          runtime.modelParameters
        ),
        speechLength.maxTokens,
        expert.enabled
      );

      // Compose a stance-aware, persona- and format-inflected system prompt for this AI
      try {
        if (adapter) {
          adapter.setTemporaryPersonality(runtime.personalityConfig);
          // Ensure debate mode is active for turn mapping
          adapter.config.isDebateMode = true;
          if (runtimeParameters) {
            adapter.config.parameters = runtimeParameters;
          }
          this.applyWebSearchConfig(adapter);

          // Debug logging
          try {
            const { PromptDebugLogger } = await import('../debug/PromptDebugLogger');
            const sysCombined = adapter.debugGetSystemPrompt();
            PromptDebugLogger.logTurn('streaming-turn', {
              aiId: currentAI.id,
              aiName: currentAI.name,
              model: currentAI.model,
              personalityId,
              personalityName: runtime.debug.personalityName,
              stance,
              civility,
              format: { id: format.id, name: format.name },
              phase,
              round: currentRound,
              messageCount: messageIndex + 1,
              systemPromptApplied: runtime.systemPrompt,
              systemPromptAdapter: sysCombined,
              userPrompt: contextualPrompt,
            });
          } catch { /* ignore debug log errors */ }
        }
      } catch { /* ignore persona application errors */ }

      if (adapter && supportsStreaming && streamingAllowed) {
        // Apply expert parameters when enabled; otherwise use personality model parameters.
        try {
          if (runtimeParameters) {
            adapter.config.parameters = runtimeParameters;
          }
        } catch { /* ignore */ }
        // Create placeholder message and emit immediately
        const personalityName = UNIVERSAL_PERSONALITIES.find(p => p.id === personalityId)?.name || 'Default';
        const placeholderMessage: Message = {
          id: `msg_${Date.now()}_${currentAI.id}`,
          sender: `${currentAI.name} (${personalityName})`,
          senderType: 'ai',
          content: '',
          timestamp: Date.now(),
          metadata: this.buildAIResponseMetadata(currentAI, currentAI.model, undefined, debateSpeech),
        };

        const messageId = placeholderMessage.id;
        this.currentMessages = [...existingMessages, placeholderMessage];
        this.emitEvent({
          type: 'message_added',
          data: { message: placeholderMessage, messageIndex, phase, messageLabel: messageSpec.label, cxRole: messageSpec.cxRole },
          timestamp: Date.now(),
        });
        this.emitEvent({
          type: 'stream_started',
          data: { messageId, aiProvider: currentAI.id, webSearchEnabled: this.getWebSearchEnabled(), messageIndex, phase, messageLabel: messageSpec.label, cxRole: messageSpec.cxRole },
          timestamp: Date.now(),
        });

        const streamingService = getStreamingService();
        let finalContent = '';
        let hadError = false;
        let capturedCitations: Citation[] | undefined;

        let errorForFallback: string | null = null;
        await streamingService.streamResponse(
          {
            messageId,
            adapter,
            message: contextualPrompt,
            conversationHistory: debateMessages,
            modelOverride: currentAI.model,
            speed: streamSpeed,
          },
            (chunk: string) => {
            this.emitEvent({ type: 'stream_chunk', data: { messageId, chunk, aiProvider: currentAI.id, messageIndex, phase, messageLabel: messageSpec.label, cxRole: messageSpec.cxRole }, timestamp: Date.now() });
          },
          (completeText: string) => {
            const normalizedAnswer = ensureAnswerContent(completeText, capturedCitations, currentAI.name);
            finalContent = normalizedAnswer.content;
            capturedCitations = normalizedAnswer.citations;
            this.emitEvent({ type: 'stream_completed', data: { messageId, finalContent: normalizedAnswer.content, modelUsed: currentAI.model, aiProvider: currentAI.id, webSearchEnabled: this.getWebSearchEnabled(), citations: normalizedAnswer.citations, messageIndex, phase, messageLabel: messageSpec.label, cxRole: messageSpec.cxRole }, timestamp: Date.now() });
          },
          (err: Error) => {
            hadError = true;
            const msg = err?.message || '';
            errorForFallback = msg;
            this.emitEvent({ type: 'stream_error', data: { messageId, error: msg, aiProvider: currentAI.id, messageIndex, phase, messageLabel: messageSpec.label, cxRole: messageSpec.cxRole }, timestamp: Date.now() });
          },
          (event: unknown) => {
            // Handle citation events from providers like Perplexity
            try {
              const e = event as Record<string, unknown>;
              const type = String(e?.type || '');
              if (type === 'citations') {
                const citations = (e as { citations?: Citation[] }).citations;
                if (citations && citations.length > 0) {
                  capturedCitations = citations;
                }
              }
            } catch { /* ignore event handling errors */ }
          }
        );

        if (!hadError) {
          // Update local message content for subsequent prompts/history, including citations if captured
          const updated = {
            ...placeholderMessage,
            content: finalContent,
            metadata: this.buildAIResponseMetadata(currentAI, currentAI.model, capturedCitations, debateSpeech),
          };
          this.currentMessages = [...existingMessages, updated];
        } else {
          // Determine if we should fallback to non-streaming
          const msgStr = String(errorForFallback || '');
          const isVerificationError = (
            msgStr.includes('organization verification') ||
            msgStr.includes('Streaming requires organization verification') ||
            msgStr.includes('must be verified to stream') ||
            msgStr.includes('Verify Organization')
          );
          const lower = msgStr.toLowerCase();
          const isOverloadError = (
            lower.includes('overload') ||
            lower.includes('temporarily busy') ||
            lower.includes('rate limit')
          );

          if (isVerificationError) {
            try {
              store.dispatch(setProviderVerificationError({ providerId, hasError: true }));
            } catch { /* ignore */ }
          }

          if (isVerificationError || isOverloadError) {
            try {
              // Ensure adapter carries expert or personality parameters on fallback
              try {
                if (runtimeParameters) {
                  adapter.config.parameters = runtimeParameters;
                }
              } catch { /* ignore */ }
              const fallback = await this.aiService.sendMessage(
                currentAI.provider,
                contextualPrompt,
                debateMessages,
                runtime.personalityConfig,
                undefined,
                undefined,
                currentAI.model
              );
              const { response: text } = typeof fallback === 'string' ? { response: fallback } : fallback;
              const fallbackMetadata = typeof fallback === 'string'
                ? undefined
                : (fallback as { metadata?: { citations?: Citation[] } }).metadata;
              const normalizedAnswer = ensureAnswerContent(text, fallbackMetadata?.citations, currentAI.name);
              finalContent = normalizedAnswer.content;
              // Emit completion to update the placeholder message and end stream state in UI
              this.emitEvent({ type: 'stream_completed', data: { messageId, finalContent: normalizedAnswer.content, modelUsed: currentAI.model, aiProvider: currentAI.id, webSearchEnabled: this.getWebSearchEnabled(), citations: normalizedAnswer.citations, messageIndex, phase, messageLabel: messageSpec.label, cxRole: messageSpec.cxRole }, timestamp: Date.now() });
              const updated = {
                ...placeholderMessage,
                content: normalizedAnswer.content,
                metadata: this.buildAIResponseMetadata(currentAI, currentAI.model, normalizedAnswer.citations, debateSpeech),
              };
              this.currentMessages = [...existingMessages, updated];
            } catch {
              // As last resort, append a host error message so the flow continues
              const errorMessage: Message = {
                id: `msg_${Date.now()}_error`,
                sender: 'Debate Host',
                senderType: 'user',
                content: DEBATE_CONSTANTS.MESSAGES.ERROR(currentAI.name),
                timestamp: Date.now(),
              };
              this.emitEvent({ type: 'message_added', data: { message: errorMessage, messageIndex, phase, messageLabel: messageSpec.label, cxRole: messageSpec.cxRole }, timestamp: Date.now() });
              this.currentMessages = [...existingMessages, placeholderMessage, errorMessage];
            }
          } else {
            // Non-recoverable error: add a host error message
            const errorMessage: Message = {
              id: `msg_${Date.now()}_error`,
              sender: 'Debate Host',
              senderType: 'user',
              content: DEBATE_CONSTANTS.MESSAGES.ERROR(currentAI.name),
              timestamp: Date.now(),
            };
            this.emitEvent({ type: 'message_added', data: { message: errorMessage, messageIndex, phase, messageLabel: messageSpec.label, cxRole: messageSpec.cxRole }, timestamp: Date.now() });
            this.currentMessages = [...existingMessages, placeholderMessage, errorMessage];
          }
        }

        this.continueAfterMessage(messageIndex, this.currentMessages, true);
      } else {
        // Non-streaming fallback (retain existing typing behavior)
        this.emitEvent({ type: 'typing_started', data: { aiName: currentAI.name }, timestamp: Date.now() });

        // Apply expert parameters when enabled; otherwise use personality model parameters.
        try {
          if (runtimeParameters && adapter) {
            adapter.config.parameters = runtimeParameters;
          }
          this.applyWebSearchConfig(adapter);
        } catch { /* ignore */ }

        const response = await this.aiService.sendMessage(
          currentAI.provider,
          contextualPrompt,
          debateMessages,
          runtime.personalityConfig,
          undefined,
          undefined,
          true // ensure debate mode enabled in adapter
        );

        // Best-effort debug: log the prompts for non-streaming path too
        try {
          const adapter = this.aiService.getAdapter(currentAI.provider);
          if (adapter) {
            // Ensure adapter reflects the composed personality for logging
            try {
              adapter.setTemporaryPersonality(runtime.personalityConfig);
              adapter.config.isDebateMode = true;
            } catch { /* noop: debug logging helper */ }
            const sysCombined = adapter.debugGetSystemPrompt();
            const { PromptDebugLogger } = await import('../debug/PromptDebugLogger');
            PromptDebugLogger.logTurn('nonstream-turn', {
              aiId: currentAI.id,
              aiName: currentAI.name,
              model: currentAI.model,
              personalityId,
              personalityName: runtime.debug.personalityName,
              stance,
              civility,
              format: { id: format.id, name: format.name },
              phase,
              round: currentRound,
              messageCount: messageIndex + 1,
              systemPromptApplied: runtime.systemPrompt,
              systemPromptAdapter: sysCombined,
              userPrompt: contextualPrompt,
            });
          }
        } catch { /* ignore debug log errors */ }

        const personalityName = UNIVERSAL_PERSONALITIES.find(p => p.id === personalityId)?.name || 'Default';
        const { response: responseText, modelUsed } = response;
        const responseMetadata = (response as { metadata?: { citations?: Citation[] } }).metadata;
        const normalizedAnswer = ensureAnswerContent(responseText, responseMetadata?.citations, currentAI.name);
        const aiMessage: Message = {
          id: `msg_${Date.now()}_${currentAI.id}`,
          sender: `${currentAI.name} (${personalityName})`,
          senderType: 'ai',
          content: normalizedAnswer.content,
          timestamp: Date.now(),
          metadata: this.buildAIResponseMetadata(currentAI, modelUsed, normalizedAnswer.citations, debateSpeech),
        };
        this.currentMessages = [...existingMessages, aiMessage];
        this.emitEvent({
          type: 'message_added',
          data: { message: aiMessage, messageIndex, phase, messageLabel: messageSpec.label, cxRole: messageSpec.cxRole },
          timestamp: Date.now(),
        });
        this.emitEvent({ type: 'typing_stopped', data: { aiName: currentAI.name }, timestamp: Date.now() });

        this.continueAfterMessage(messageIndex, this.currentMessages, false);
      }

    } catch (error) {
      // Use ErrorService for centralized error handling
      const appError = ErrorService.handleError(error, {
        feature: 'debate',
        showToast: false, // We show errors in the debate UI
        context: { provider: currentAI.provider, aiName: currentAI.name, round: this.session?.currentRound },
      });
      await this.handleDebateError(appError, currentAI, messageIndex, existingMessages);
    }
  }

  /**
   * Compatibility wrapper for older callers that still think in message counts.
   */
  async executeDebateRound(
    _prompt: string,
    _aiIndex: number,
    messageCount: number,
    existingMessages: Message[]
  ): Promise<void> {
    await this.executeDebateMessage(Math.max(0, messageCount - 1), existingMessages);
  }
  
  /**
   * Handle errors during debate execution
   */
  private async handleDebateError(
    error: AppError | Error,
    currentAI: AI,
    messageIndex: number,
    existingMessages: Message[]
  ): Promise<void> {
    if (!this.session) return;

    // Determine error type from AppError code or error message
    const isRateLimit = error instanceof AppError
      ? error.code === ErrorCode.API_RATE_LIMITED
      : error.message?.includes('429');

    const debateError: DebateError = {
      type: isRateLimit ? 'rate_limit' : 'ai_error',
      message: error instanceof AppError ? error.userMessage : error.message,
      aiId: currentAI.id,
      retryable: error instanceof AppError ? error.retryable : true,
    };
    
    // Emit typing stopped
    this.emitEvent({
      type: 'typing_stopped',
      data: { aiName: currentAI.name },
      timestamp: Date.now(),
    });
    
    // Create error message
    const errorMessage: Message = {
      id: `msg_${Date.now()}_error`,
      sender: 'Debate Host',
      senderType: 'user',
      content: debateError.type === 'rate_limit' 
        ? DEBATE_CONSTANTS.MESSAGES.RATE_LIMIT(currentAI.name)
        : DEBATE_CONSTANTS.MESSAGES.ERROR(currentAI.name),
      timestamp: Date.now(),
    };
    
    // Emit error message
    this.emitEvent({
      type: 'message_added',
      data: { message: errorMessage },
      timestamp: Date.now(),
    });
    
    // Emit error event
    this.emitEvent({
      type: 'error_occurred',
      data: { error: debateError },
      timestamp: Date.now(),
    });
    
    // Update tracked messages with error message
    this.currentMessages = [...existingMessages, errorMessage];
    
    // Continue with next AI after delay
    const nextMessageIndex = messageIndex + 1;
    const maxMessages = this.rulesEngine.calculateMaxMessages(this.session.participants.length);
    
    if (nextMessageIndex < maxMessages && this.session.status === DebateStatus.ACTIVE) {
      const delay = debateError.type === 'rate_limit' 
        ? DEBATE_CONSTANTS.DELAYS.RATE_LIMIT_RECOVERY 
        : DEBATE_CONSTANTS.DELAYS.ERROR_RECOVERY;
      
      this.scheduleNextMessage(nextMessageIndex, this.currentMessages, delay);
    } else {
      this.endDebate();
    }
  }
  
  /**
   * Schedule the next message with a delay
   */
  private scheduleNextMessage(
    messageIndex: number,
    messages: Message[],
    delay: number
  ): void {
    if (!this.session) return;
    
    const timeoutId = `next_message_${Date.now()}`;
    const timeout = setTimeout(() => {
      this.timeouts.delete(timeoutId);
      if (this.session?.status === DebateStatus.ACTIVE) {
        this.executeDebateMessage(messageIndex, messages);
      }
    }, delay);
    
    this.timeouts.set(timeoutId, timeout);
  }

  private shouldPauseForAudienceReview(messageIndex: number): boolean {
    if (!this.session || !this.votingService?.isAudienceStanceVoteModel()) {
      return false;
    }

    const completedSpeechCount = messageIndex + 1;
    return completedSpeechCount % 2 === 0 || completedSpeechCount >= this.session.totalMessages;
  }

  private getAudienceReviewTitle(messageSpec?: MessageSpec): string {
    switch (messageSpec?.phase) {
      case 'opening':
        return 'Opening speeches complete';
      case 'rebuttal':
        return 'Floor speeches complete';
      case 'closing':
        return 'Closing speeches complete';
      default:
        return 'Review checkpoint';
    }
  }

  private pauseForAudienceReview(
    messageIndex: number,
    messages: Message[],
    nextMessageIndex?: number
  ): void {
    if (!this.session) return;

    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();

    const isFinalReview = typeof nextMessageIndex !== 'number' || nextMessageIndex >= this.session.totalMessages;
    const messageSpec = this.session.preset.messages[messageIndex];
    const prompt: DebateContinuationPrompt = {
      title: this.getAudienceReviewTitle(messageSpec),
      message: isFinalReview
        ? 'Finish any remaining clips or transcript review before casting the final audience vote.'
        : 'Review the last two speeches or finish any voice clips before the next round begins.',
      buttonLabel: isFinalReview ? 'Cast Final Vote' : 'Continue Debate',
      isFinalReview,
      completedMessageIndex: messageIndex,
      ...(typeof nextMessageIndex === 'number' ? { nextMessageIndex } : {}),
    };

    this.pendingContinuation = {
      ...prompt,
      messages,
    };
    this.updateSessionStatus(DebateStatus.PAUSED_FOR_REVIEW);

    this.emitEvent({
      type: 'continuation_required',
      data: { ...prompt },
      timestamp: Date.now(),
    });
  }
  
  /**
   * Advance the debate after a message resolves.
   */
  private continueAfterMessage(messageIndex: number, messages: Message[], usedStreaming: boolean): void {
    if (!this.session) return;

    const messageSpec = this.session.preset.messages[messageIndex];
    if (messageSpec?.voteAfter && !this.votingService?.isAudienceStanceVoteModel()) {
      this.currentVoteIndex = this.rulesEngine.getVoteIndex(messageIndex);
      const isFinalRoundVote = this.currentVoteIndex === this.session.totalRounds;
      if (isFinalRoundVote) {
        this.endDebate();
      } else {
        this.showVotingForRound(this.currentVoteIndex, false);
      }
      return;
    }

    const nextMessageIndex = messageIndex + 1;
    if (this.shouldPauseForAudienceReview(messageIndex)) {
      this.pauseForAudienceReview(
        messageIndex,
        messages,
        nextMessageIndex < this.session.totalMessages ? nextMessageIndex : undefined
      );
      return;
    }

    if (nextMessageIndex < this.session.totalMessages && this.session.status === DebateStatus.ACTIVE) {
      const delay = usedStreaming
        ? DEBATE_CONSTANTS.DELAYS.POST_STREAM_PAUSE
        : DEBATE_CONSTANTS.DELAYS.AI_RESPONSE;
      this.scheduleNextMessage(nextMessageIndex, messages, delay);
    } else {
      this.endDebate();
    }
  }

  continueDebate(): void {
    if (!this.session || !this.pendingContinuation) return;

    const pending = this.pendingContinuation;
    this.pendingContinuation = null;

    if (pending.isFinalReview) {
      this.updateSessionStatus(DebateStatus.ACTIVE);
      this.endDebate();
      return;
    }

    if (typeof pending.nextMessageIndex !== 'number') {
      return;
    }

    this.updateSessionStatus(DebateStatus.ACTIVE);
    this.scheduleNextMessage(
      pending.nextMessageIndex,
      pending.messages,
      DEBATE_CONSTANTS.DELAYS.VOTING_CONTINUATION
    );
  }
  
  /**
   * Show voting interface for a round
   */
  private showVotingForRound(round: number, isFinalRound: boolean): void {
    this.updateSessionStatus(DebateStatus.VOTING_ROUND);
    
    this.emitEvent({
      type: 'voting_started',
      data: {
        round,
        isFinalRound,
        isOverallVote: false,
        votingLabel: this.votingService?.getVotingLabel(round),
        voteCriterion: this.votingService?.getVoteCriterion(round, false),
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Show required Oxford audience stance voting.
   */
  private showAudienceStanceVoting(stage: AudienceVoteStage): void {
    if (!this.votingService) return;

    this.currentAudienceVoteStage = stage;
    this.updateSessionStatus(DebateStatus.VOTING_ROUND);

    this.emitEvent({
      type: 'voting_started',
      data: {
        round: stage === 'initial' ? 0 : 1,
        isFinalRound: stage === 'final',
        isOverallVote: stage === 'final',
        voteKind: 'audience_stance',
        audienceVoteStage: stage,
        votingLabel: stage === 'initial' ? 'Opening Audience Stance' : 'Final Audience Vote',
        voteCriterion: this.votingService.getAudienceVoteCriterion(stage),
        audienceVoteOptions: this.votingService.getAudienceVoteOptions(stage),
      },
      timestamp: Date.now(),
    });
  }
  
  /**
   * Record a vote and continue the debate
   */
  async recordVote(round: number, winnerId: string, _isOverallVote: boolean = false): Promise<void> {
    if (!this.votingService || !this.session) {
      throw new AppError({
        code: ErrorCode.APP_SESSION_NOT_FOUND,
        message: 'No active voting session',
        userMessage: 'Voting is not available. Please restart the debate.',
        recoverable: true,
      });
    }

    if (this.votingService.isAudienceStanceVoteModel()) {
      await this.recordAudienceVote(winnerId as AudienceStance);
      return;
    }
    
    // Record round vote
    const voteRecord = this.votingService.recordRoundVote(round, winnerId);
    
    // Emit round winner message
    const winnerMessage: Message = {
      id: `msg_${Date.now()}_round_${round}`,
      sender: 'Debate Host',
      senderType: 'user',
      content: this.votingService.getWinnerMessage(round, winnerId, round === this.session.totalRounds),
      timestamp: Date.now(),
      metadata: {
        debateVote: voteRecord,
      },
    };
    
    this.emitEvent({
      type: 'message_added',
      data: { message: winnerMessage },
      timestamp: Date.now(),
    });
    this.currentMessages = [...this.currentMessages, winnerMessage];
    
    // Update scores after voting (UI will display persistent scoreboard)
    const scores = this.votingService.calculateScores();
    
    // Emit score update event instead of message
    this.emitEvent({
      type: 'voting_completed',
      data: { round, winnerId, scores, voteRecord },
      timestamp: Date.now(),
    });
    
    // Check if all rounds are complete
    if (this.votingService.areAllRoundsVoted()) {
      // Declare overall winner based on scores (no more voting)
      this.declareOverallWinner();
    } else {
      // Continue the debate after voting
      this.updateSessionStatus(DebateStatus.ACTIVE);
      
      // Resume debate with the next round
      this.resumeDebateAfterVoting();
    }
  }

  private async recordAudienceVote(stance: AudienceStance): Promise<void> {
    if (!this.votingService || !this.session || !this.currentAudienceVoteStage) {
      throw new AppError({
        code: ErrorCode.APP_SESSION_NOT_FOUND,
        message: 'No active audience voting session',
        userMessage: 'Voting is not available. Please restart the debate.',
        recoverable: true,
      });
    }

    const stage = this.currentAudienceVoteStage;
    const voteRecord = this.votingService.recordAudienceVote(stage, stance);
    const stageLabel = stage === 'initial' ? 'Opening audience stance' : 'Final audience vote';
    const voteMessage: Message = {
      id: `msg_${Date.now()}_audience_${stage}`,
      sender: 'Debate Host',
      senderType: 'user',
      content: `${stageLabel}: ${voteRecord.winnerName}`,
      timestamp: Date.now(),
      metadata: {
        debateVote: voteRecord,
      },
    };

    this.emitEvent({
      type: 'message_added',
      data: { message: voteMessage },
      timestamp: Date.now(),
    });
    this.currentMessages = [...this.currentMessages, voteMessage];

    this.emitEvent({
      type: 'voting_completed',
      data: {
        round: voteRecord.round,
        winnerId: voteRecord.winnerId,
        voteRecord,
        voteKind: 'audience_stance',
        audienceVoteStage: stage,
        audienceResult: this.votingService.getAudienceDecisionResult(),
      },
      timestamp: Date.now(),
    });

    this.currentAudienceVoteStage = undefined;

    if (stage === 'initial') {
      this.updateSessionStatus(DebateStatus.ACTIVE);
      this.scheduleNextMessage(0, this.currentMessages, DEBATE_CONSTANTS.DELAYS.VOTING_CONTINUATION);
      return;
    }

    this.declareAudienceDecision();
  }
  
  /**
   * Resume debate after voting is complete
   */
  private resumeDebateAfterVoting(): void {
    if (!this.session || !this.votingService) return;

    // Continue with the next message in the debate
    const nextMessageIndex = this.session.messageIndex + 1;
    if (nextMessageIndex >= this.session.totalMessages) {
      this.endDebate();
      return;
    }
    
    // Use shorter delay for faster flow after voting
    const delay = DEBATE_CONSTANTS.DELAYS.VOTING_CONTINUATION;
    
    // Schedule the next message with the accumulated messages
    this.scheduleNextMessage(nextMessageIndex, this.currentMessages, delay);
  }

  private declareAudienceDecision(): void {
    if (!this.votingService || !this.session) return;

    const audienceResult = this.votingService.getAudienceDecisionResult();
    if (!audienceResult) {
      this.showAudienceStanceVoting('final');
      return;
    }

    this.session.audienceResult = audienceResult;
    const [winnerId] = audienceResult.winningParticipantIds;
    if (winnerId) {
      this.votingService.recordOverallWinner(winnerId, audienceResult.winningParticipantIds);
    }

    const scores = this.votingService.calculateScores();
    const winnerMessage: Message = {
      id: `msg_${Date.now()}_audience_decision`,
      sender: 'Debate Host',
      senderType: 'user',
      content: `\n🏛️ **AUDIENCE DECISION: ${audienceResult.winningSideLabel}!**\n\n${audienceResult.summary}`,
      timestamp: Date.now(),
    };

    this.updateSessionStatus(DebateStatus.COMPLETED);

    this.emitEvent({
      type: 'message_added',
      data: { message: winnerMessage },
      timestamp: Date.now(),
    });
    this.currentMessages = [...this.currentMessages, winnerMessage];

    this.emitEvent({
      type: 'debate_ended',
      data: {
        session: this.session,
        overallWinner: winnerId,
        overallWinnerIds: audienceResult.winningParticipantIds,
        finalScores: scores,
        voteRecords: this.votingService.getVoteRecords(),
        audienceResult,
      },
      timestamp: Date.now(),
    });

    this.saveDebateToHistory();
  }
  
  /**
   * Declare overall winner based on scores
   */
  private declareOverallWinner(): void {
    if (!this.votingService || !this.session) return;
    
    const scores = this.votingService.calculateScores();
    const sortedAIs = Object.entries(scores)
      .sort((a, b) => b[1].roundWins - a[1].roundWins);
    
    if (sortedAIs.length === 0) return;
    
    const [winnerId, winnerScore] = sortedAIs[0];
    const isTie = sortedAIs.length > 1 && sortedAIs[1][1].roundWins === winnerScore.roundWins;
    
    // Record the overall winner in the voting service
    if (!isTie) {
      this.votingService.recordOverallWinner(winnerId);
    }
    
    // Create overall winner message (simplified)
    let winnerMessage: Message;
    if (isTie) {
      const tiedAIs = sortedAIs
        .filter(([_, score]) => score.roundWins === winnerScore.roundWins)
        .map(([_, score]) => score.name);
      winnerMessage = {
        id: `msg_${Date.now()}_overall_winner`,
        sender: 'Debate Host',
        senderType: 'user',
        content: `\n🏆 **DEBATE ENDED IN A TIE!**\n\n${tiedAIs.join(' and ')} both won ${winnerScore.roundWins} ${winnerScore.roundWins === 1 ? 'round' : 'rounds'}!`,
        timestamp: Date.now(),
      };
    } else {
      winnerMessage = {
        id: `msg_${Date.now()}_overall_winner`,
        sender: 'Debate Host',
        senderType: 'user',
        content: `\n🏆 **OVERALL WINNER: ${winnerScore.name}!**\n\n${winnerScore.name} won ${winnerScore.roundWins} out of ${this.session.totalRounds} rounds!`,
        timestamp: Date.now(),
      };
    }
    
    this.updateSessionStatus(DebateStatus.COMPLETED);
    
    this.emitEvent({
      type: 'message_added',
      data: { message: winnerMessage },
      timestamp: Date.now(),
    });
    this.currentMessages = [...this.currentMessages, winnerMessage];
    
    this.emitEvent({
      type: 'debate_ended',
      data: {
        session: this.session,
        overallWinner: winnerId,
        finalScores: scores,
        voteRecords: this.votingService.getVoteRecords(),
      },
      timestamp: Date.now(),
    });

    // Save the debate to history
    this.saveDebateToHistory();
  }

  /**
   * Save completed debate to history
   * Note: Messages should be collected by the DebateScreen via events
   */
  private async saveDebateToHistory(): Promise<void> {
    if (!this.session) return;

    try {
      // Use the session ID directly (it's already prefixed with 'debate_')
      const sessionId = this.session.id;
      
      const reduxSession = store.getState().chat.currentSession;
      const reduxMessages = reduxSession?.sessionType === 'debate' ? reduxSession.messages : undefined;
      const messagesForHistory = reduxMessages && reduxMessages.length >= this.currentMessages.length
        ? reduxMessages
        : this.currentMessages;

      const debateSession: ChatSession = {
        id: sessionId,
        sessionType: 'debate',
        topic: this.session.topic, // Store the debate topic directly
        selectedAIs: this.session.participants,
        messages: messagesForHistory,
        isActive: false,
        createdAt: this.session.startTime,
        lastMessageAt: Date.now(),
        debateConfig: {
          formatId: this.session.format.id,
          presetId: this.session.presetId,
          rounds: this.session.totalRounds,
          tempo: 'streaming',
          postStreamPauseMs: DEBATE_CONSTANTS.DELAYS.POST_STREAM_PAUSE,
          civility: this.session.civility,
          voteResults: this.votingService?.getVoteRecords(),
          audienceResult: this.session.audienceResult,
          voiceConfig: this.session.voiceConfig,
        }
      };
      
      // Save to storage
      await StorageService.saveSession(debateSession);
    } catch (error) {
      console.error('Failed to save debate to history:', error);
    }
  }
  
  /**
   * End the debate
   */
  endDebate(): void {
    if (!this.session) return;

    if (this.votingService?.isAudienceStanceVoteModel()) {
      if (this.votingService.hasAudienceVote('final')) {
        this.declareAudienceDecision();
        return;
      }

      this.updateSessionStatus(DebateStatus.VOTING_ROUND);

      // Clear any pending timeouts
      this.timeouts.forEach(timeout => clearTimeout(timeout));
      this.timeouts.clear();

      const endMessage: Message = {
        id: `msg_${Date.now()}_end`,
        sender: 'Debate Host',
        senderType: 'user',
        content: 'The debate is complete. Cast your final audience vote.',
        timestamp: Date.now(),
      };

      this.emitEvent({
        type: 'message_added',
        data: { message: endMessage },
        timestamp: Date.now(),
      });
      this.currentMessages = [...this.currentMessages, endMessage];
      this.showAudienceStanceVoting('final');
      return;
    }

    if (this.votingService?.areAllRoundsVoted()) {
      this.declareOverallWinner();
      return;
    }
    
    this.updateSessionStatus(DebateStatus.VOTING_ROUND);
    
    // Clear any pending timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    
    // Add debate complete message
    const endMessage: Message = {
      id: `msg_${Date.now()}_end`,
      sender: 'Debate Host',
      senderType: 'user',
      content: DEBATE_CONSTANTS.MESSAGES.DEBATE_COMPLETE,
      timestamp: Date.now(),
    };
    
    this.emitEvent({
      type: 'message_added',
      data: { message: endMessage },
      timestamp: Date.now(),
    });
    this.currentMessages = [...this.currentMessages, endMessage];

    const nextVoteRound = this.votingService?.getNextVotingRound() ?? this.session.totalRounds;
    const activeVoteRound = this.currentVoteIndex > 0 && !this.votingService?.hasVotedForRound(this.currentVoteIndex)
      ? this.currentVoteIndex
      : nextVoteRound;
    this.currentVoteIndex = activeVoteRound;

    // Show voting for the final pending checkpoint.
    this.showVotingForRound(activeVoteRound, activeVoteRound === this.session.totalRounds);
  }
  
  /**
   * Update session status
   */
  private updateSessionStatus(status: DebateStatus): void {
    if (this.session) {
      this.session.status = status;
    }
  }
  
  /**
   * Add event handler
   */
  addEventListener(handler: DebateEventHandler): void {
    this.eventHandlers.push(handler);
  }
  
  /**
   * Remove event handler
   */
  removeEventListener(handler: DebateEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }
  
  /**
   * Emit event to all handlers
   */
  private emitEvent(event: DebateEvent): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in debate event handler:', error);
      }
    });
  }
  
  /**
   * Get current session
   */
  getSession(): DebateSession | null {
    return this.session;
  }
  
  /**
   * Get voting service
   */
  getVotingService(): VotingService | null {
    return this.votingService;
  }
  
  /**
   * Reset and cleanup
   */
  reset(): void {
    // Cancel any pending scheduled turns
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    // Proactively cancel any active provider streams
    try {
      const streaming = getStreamingService();
      streaming.cancelAllStreams();
    } catch {
      // ignore
    }
    this.session = null;
    this.votingService = null;
    this.eventHandlers = [];
    this.currentMessages = [];
    this.currentVoteIndex = 0;
    this.currentAudienceVoteStage = undefined;
    this.pendingContinuation = null;
  }
}
