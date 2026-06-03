import { AI_BRAND_COLORS } from '@/constants/aiColors';
import { AI_PROVIDERS, getProviderById } from '@/config/aiProviders';
import { getModelById } from '@/config/modelConfigs';
import type { AIStats, DebateRound, DebateParticipantMetadata, TopicPerformance } from '@/types/stats';

export type StatsRollupLevel = 'provider' | 'model';
export type StatsRollupMetric = 'winRate' | 'roundWinRate' | 'totalDebates' | 'roundsWon';
export type StatsTrendPeriod = 'day' | 'week' | 'month';

export interface StatsRollupEntry extends AIStats {
  id: string;
  level: StatsRollupLevel;
  providerId: string;
  providerName: string;
  modelId?: string;
  modelName?: string;
  label: string;
  shortLabel: string;
  sourceParticipantIds: string[];
  uniqueDebates: number;
  topTopics: TopicPerformance[];
  strengths: string[];
  weaknesses: string[];
}

export interface StatsRollupSummary {
  totalDebates: number;
  totalEntries: number;
  totalRounds: number;
  providerCount: number;
  modelCount: number;
  topPerformer: StatsRollupEntry | null;
  roundLeader: StatsRollupEntry | null;
  averageWinRate: number;
  competitiveBalance: number;
}

export interface StatsInsight {
  id: string;
  title: string;
  detail: string;
  tone: 'success' | 'warning' | 'info';
}

export interface StatsTrendPoint {
  x: number;
  y: number;
  label: string;
}

export interface StatsTrendLine {
  id: string;
  label: string;
  points: StatsTrendPoint[];
}

interface ResolvedParticipantMetadata {
  id: string;
  providerId: string;
  providerName: string;
  modelId?: string;
  modelName?: string;
}

interface MutableStatsRollupEntry extends Omit<StatsRollupEntry, 'sourceParticipantIds' | 'topTopics' | 'strengths' | 'weaknesses'> {
  sourceParticipantIds: Set<string>;
}

const DEBATE_SLOT_ID_MARKER = '-debater-slot-';
const UNKNOWN_PROVIDER_ID = 'unknown';
const UNKNOWN_MODEL_ID = 'model-not-recorded';
const PROVIDER_ALIASES: Record<string, string> = {
  chatgpt: 'openai',
};

const providerIds = new Set(AI_PROVIDERS.map((provider) => provider.id));

const createEmptyStats = (): AIStats => ({
  totalDebates: 0,
  roundsWon: 0,
  roundsLost: 0,
  overallWins: 0,
  overallLosses: 0,
  lastDebated: 0,
  winRate: 0,
  roundWinRate: 0,
  topics: {},
});

const isActiveStats = (stats: AIStats): boolean => (
  stats.totalDebates > 0 || stats.roundsWon > 0 || stats.roundsLost > 0
);

const toTitleCase = (value: string): string => (
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
);

export const resolveStatsProviderId = (rawId?: string): string | undefined => {
  if (!rawId) return undefined;

  const normalized = rawId.trim().toLowerCase();
  if (!normalized) return undefined;

  const alias = PROVIDER_ALIASES[normalized];
  if (alias) return alias;

  if (providerIds.has(normalized)) {
    return normalized;
  }

  if (normalized.includes(DEBATE_SLOT_ID_MARKER)) {
    return resolveStatsProviderId(normalized.split(DEBATE_SLOT_ID_MARKER)[0]);
  }

  const providerPrefix = AI_PROVIDERS.find((provider) => (
    normalized.startsWith(`${provider.id}-`) ||
    normalized.startsWith(`${provider.id}_`) ||
    normalized.startsWith(`${provider.id}:`)
  ));

  return providerPrefix?.id;
};

export const getStatsProviderName = (providerId?: string): string => {
  const resolvedProviderId = resolveStatsProviderId(providerId);
  if (!resolvedProviderId) return 'Unknown Provider';

  return getProviderById(resolvedProviderId)?.name || toTitleCase(resolvedProviderId);
};

export const getStatsProviderColor = (providerId?: string, fallback = '#007AFF'): string => {
  const resolvedProviderId = resolveStatsProviderId(providerId);
  const colorKey = resolvedProviderId === 'google' ? 'gemini' : resolvedProviderId;
  const brandColors = colorKey ? AI_BRAND_COLORS[colorKey as keyof typeof AI_BRAND_COLORS] : undefined;
  if (brandColors) return brandColors[500];

  const provider = resolvedProviderId ? getProviderById(resolvedProviderId) : undefined;
  return provider?.color || fallback;
};

export const getStatsModelName = (providerId?: string, modelId?: string): string => {
  const resolvedProviderId = resolveStatsProviderId(providerId);
  if (!modelId) return 'Historical model';

  const model = resolvedProviderId ? getModelById(resolvedProviderId, modelId) : undefined;
  return model?.name || modelId;
};

const getRollupId = (level: StatsRollupLevel, metadata: ResolvedParticipantMetadata): string => {
  if (level === 'provider') {
    return `provider:${metadata.providerId}`;
  }

  return `model:${metadata.providerId}:${metadata.modelId || UNKNOWN_MODEL_ID}`;
};

const getRollupLabels = (
  level: StatsRollupLevel,
  metadata: ResolvedParticipantMetadata
): Pick<StatsRollupEntry, 'label' | 'shortLabel'> => {
  if (level === 'provider') {
    return {
      label: metadata.providerName,
      shortLabel: metadata.providerName,
    };
  }

  const modelName = metadata.modelName || getStatsModelName(metadata.providerId, metadata.modelId);
  if (!metadata.modelId) {
    return {
      label: `${metadata.providerName} / ${modelName}`,
      shortLabel: `${metadata.providerName} (historical)`,
    };
  }

  return {
    label: `${metadata.providerName} / ${modelName}`,
    shortLabel: modelName,
  };
};

const resolveParticipantMetadata = (
  participantId: string,
  participantDetails?: DebateParticipantMetadata
): ResolvedParticipantMetadata => {
  const providerId = resolveStatsProviderId(participantDetails?.provider)
    || resolveStatsProviderId(participantId)
    || UNKNOWN_PROVIDER_ID;
  const providerName = getStatsProviderName(providerId);
  const modelId = participantDetails?.model || undefined;
  const modelName = modelId ? getStatsModelName(providerId, modelId) : undefined;

  return {
    id: participantId,
    providerId,
    providerName,
    modelId,
    modelName,
  };
};

const buildParticipantMetadataMap = (
  stats: Record<string, AIStats>,
  history: DebateRound[]
): Map<string, ResolvedParticipantMetadata> => {
  const metadataById = new Map<string, ResolvedParticipantMetadata>();

  const upsert = (participantId: string, participantDetails?: DebateParticipantMetadata): void => {
    const existing = metadataById.get(participantId);
    if (existing?.modelId && !participantDetails?.model) return;

    metadataById.set(participantId, resolveParticipantMetadata(participantId, participantDetails));
  };

  Object.keys(stats).forEach((participantId) => upsert(participantId));

  history.forEach((debate) => {
    debate.participants.forEach((participantId) => {
      upsert(participantId, debate.participantDetails?.[participantId]);
    });

    Object.entries(debate.participantDetails || {}).forEach(([participantId, participantDetails]) => {
      upsert(participantId, participantDetails);
    });
  });

  return metadataById;
};

const mergeTopics = (
  target: AIStats['topics'],
  source: AIStats['topics']
): void => {
  Object.entries(source).forEach(([topic, topicStats]) => {
    if (!target[topic]) {
      target[topic] = { participated: 0, won: 0 };
    }

    target[topic].participated += topicStats.participated;
    target[topic].won += topicStats.won;
  });
};

const getTopRollupTopics = (topics: AIStats['topics'], limit = 3): TopicPerformance[] => (
  Object.entries(topics)
    .map(([topic, stats]) => ({
      topic,
      won: stats.won,
      participated: stats.participated,
      winRate: stats.participated > 0 ? (stats.won / stats.participated) * 100 : 0,
    }))
    .sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      return b.winRate - a.winRate;
    })
    .slice(0, limit)
);

const buildStrengths = (entry: AIStats): string[] => {
  const strengths: string[] = [];

  if (entry.winRate >= 70 && entry.totalDebates > 0) {
    strengths.push('Strong final ballot conversion');
  } else if (entry.winRate >= 55 && entry.totalDebates > 0) {
    strengths.push('Positive overall record');
  }

  if (entry.roundWinRate >= 65 && entry.roundsWon + entry.roundsLost > 0) {
    strengths.push('Consistently wins judged rounds');
  }

  if (entry.roundWinRate >= 50 && entry.winRate < entry.roundWinRate) {
    strengths.push('Competitive during debate checkpoints');
  }

  if (strengths.length === 0 && entry.totalDebates > 0) {
    strengths.push('Usable early sample');
  }

  return strengths.slice(0, 2);
};

const buildWeaknesses = (entry: AIStats): string[] => {
  const weaknesses: string[] = [];
  const roundTotal = entry.roundsWon + entry.roundsLost;

  if (entry.winRate < 45 && entry.totalDebates > 0) {
    weaknesses.push('Below-average final results');
  }

  if (entry.roundWinRate < 45 && roundTotal > 0) {
    weaknesses.push('Loses more round checkpoints');
  }

  if (entry.roundWinRate - entry.winRate >= 15 && entry.totalDebates > 0) {
    weaknesses.push('Strong rounds are not becoming wins');
  }

  if (entry.totalDebates > 0 && entry.totalDebates < 3) {
    weaknesses.push('Small sample size');
  }

  return weaknesses.slice(0, 2);
};

export const buildDebateStatsRollups = (
  stats: Record<string, AIStats>,
  history: DebateRound[],
  level: StatsRollupLevel
): StatsRollupEntry[] => {
  const metadataByParticipantId = buildParticipantMetadataMap(stats, history);
  const debatesByRollupId = new Map<string, Set<string>>();

  history.forEach((debate) => {
    debate.participants.forEach((participantId) => {
      const metadata = metadataByParticipantId.get(participantId)
        || resolveParticipantMetadata(participantId, debate.participantDetails?.[participantId]);
      const rollupId = getRollupId(level, metadata);
      const debateIds = debatesByRollupId.get(rollupId) || new Set<string>();
      debateIds.add(debate.debateId);
      debatesByRollupId.set(rollupId, debateIds);
    });
  });

  const rollups = new Map<string, MutableStatsRollupEntry>();

  Object.entries(stats).forEach(([participantId, participantStats]) => {
    if (!isActiveStats(participantStats)) return;

    const metadata = metadataByParticipantId.get(participantId)
      || resolveParticipantMetadata(participantId);
    const rollupId = getRollupId(level, metadata);
    const labels = getRollupLabels(level, metadata);
    const existing = rollups.get(rollupId);

    if (!existing) {
      rollups.set(rollupId, {
        ...createEmptyStats(),
        id: rollupId,
        level,
        providerId: metadata.providerId,
        providerName: metadata.providerName,
        modelId: level === 'model' ? metadata.modelId : undefined,
        modelName: level === 'model' ? metadata.modelName || getStatsModelName(metadata.providerId, metadata.modelId) : undefined,
        ...labels,
        sourceParticipantIds: new Set([participantId]),
        uniqueDebates: debatesByRollupId.get(rollupId)?.size || 0,
      });
    }

    const rollup = rollups.get(rollupId);
    if (!rollup) return;

    rollup.sourceParticipantIds.add(participantId);
    rollup.totalDebates += participantStats.totalDebates;
    rollup.roundsWon += participantStats.roundsWon;
    rollup.roundsLost += participantStats.roundsLost;
    rollup.overallWins += participantStats.overallWins;
    rollup.overallLosses += participantStats.overallLosses;
    rollup.lastDebated = Math.max(rollup.lastDebated, participantStats.lastDebated);
    mergeTopics(rollup.topics, participantStats.topics);
  });

  return Array.from(rollups.values())
    .map((rollup): StatsRollupEntry => {
      const roundTotal = rollup.roundsWon + rollup.roundsLost;
      const finalizedRollup: StatsRollupEntry = {
        ...rollup,
        sourceParticipantIds: Array.from(rollup.sourceParticipantIds),
        uniqueDebates: debatesByRollupId.get(rollup.id)?.size || rollup.uniqueDebates,
        winRate: rollup.totalDebates > 0 ? (rollup.overallWins / rollup.totalDebates) * 100 : 0,
        roundWinRate: roundTotal > 0 ? (rollup.roundsWon / roundTotal) * 100 : 0,
        topTopics: getTopRollupTopics(rollup.topics),
        strengths: [],
        weaknesses: [],
      };

      return {
        ...finalizedRollup,
        strengths: buildStrengths(finalizedRollup),
        weaknesses: buildWeaknesses(finalizedRollup),
      };
    })
    .sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalDebates - a.totalDebates;
    });
};

export const buildStatsRollupSummary = (
  providerRollups: StatsRollupEntry[],
  modelRollups: StatsRollupEntry[],
  history: DebateRound[],
  activeRollups: StatsRollupEntry[]
): StatsRollupSummary => {
  const totalEntries = activeRollups.reduce((sum, entry) => sum + entry.totalDebates, 0);
  const totalRounds = activeRollups.reduce((sum, entry) => sum + entry.roundsWon + entry.roundsLost, 0);
  const topPerformer = activeRollups[0] || null;
  const roundLeader = [...activeRollups]
    .sort((a, b) => {
      if (b.roundWinRate !== a.roundWinRate) return b.roundWinRate - a.roundWinRate;
      return b.totalDebates - a.totalDebates;
    })[0] || null;
  const averageWinRate = activeRollups.length > 0
    ? activeRollups.reduce((sum, entry) => sum + entry.winRate, 0) / activeRollups.length
    : 0;
  const standardDeviation = activeRollups.length > 0
    ? Math.sqrt(
      activeRollups.reduce((sum, entry) => sum + Math.pow(entry.winRate - averageWinRate, 2), 0) / activeRollups.length
    )
    : 0;

  return {
    totalDebates: history.length,
    totalEntries,
    totalRounds,
    providerCount: providerRollups.length,
    modelCount: modelRollups.length,
    topPerformer,
    roundLeader,
    averageWinRate,
    competitiveBalance: Math.max(0, 100 - standardDeviation),
  };
};

export const buildStatsInsights = (
  activeRollups: StatsRollupEntry[],
  level: StatsRollupLevel
): StatsInsight[] => {
  if (activeRollups.length === 0) return [];

  const label = level === 'provider' ? 'provider' : 'model';
  const topPerformer = activeRollups[0];
  const roundLeader = [...activeRollups].sort((a, b) => b.roundWinRate - a.roundWinRate)[0];
  const closingRisk = [...activeRollups]
    .filter((entry) => entry.roundWinRate - entry.winRate >= 15 && entry.totalDebates > 0)
    .sort((a, b) => (b.roundWinRate - b.winRate) - (a.roundWinRate - a.winRate))[0];
  const needsWork = [...activeRollups]
    .filter((entry) => entry.totalDebates > 0)
    .sort((a, b) => {
      if (a.winRate !== b.winRate) return a.winRate - b.winRate;
      return b.totalDebates - a.totalDebates;
    })[0];

  const insights: StatsInsight[] = [];

  if (topPerformer) {
    insights.push({
      id: 'top-performer',
      title: `${topPerformer.shortLabel} leads`,
      detail: `${Math.round(topPerformer.winRate)}% win rate across ${topPerformer.totalDebates} ${topPerformer.totalDebates === 1 ? 'entry' : 'entries'}.`,
      tone: 'success',
    });
  }

  if (roundLeader && roundLeader.id !== topPerformer?.id) {
    insights.push({
      id: 'round-leader',
      title: `${roundLeader.shortLabel} wins rounds`,
      detail: `${Math.round(roundLeader.roundWinRate)}% round win rate, even when final ballots differ.`,
      tone: 'info',
    });
  }

  if (closingRisk) {
    insights.push({
      id: 'closing-risk',
      title: `${closingRisk.shortLabel} drops finals`,
      detail: `Round rate is ${Math.round(closingRisk.roundWinRate - closingRisk.winRate)} points above final win rate.`,
      tone: 'warning',
    });
  } else if (needsWork && needsWork.id !== topPerformer?.id && needsWork.winRate < 50) {
    insights.push({
      id: 'needs-work',
      title: `${needsWork.shortLabel} is trailing`,
      detail: `${Math.round(needsWork.winRate)}% final win rate for this ${label}.`,
      tone: 'warning',
    });
  }

  return insights.slice(0, 3);
};

const getPeriodMs = (period: StatsTrendPeriod): number => {
  switch (period) {
    case 'day':
      return 24 * 60 * 60 * 1000;
    case 'week':
      return 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
};

const getPeriodLabel = (period: StatsTrendPeriod, bucketIndex: number): string => {
  if (bucketIndex === 0) {
    if (period === 'day') return 'Today';
    if (period === 'week') return 'This week';
    return 'This month';
  }

  const suffix = period === 'day' ? 'd' : period === 'week' ? 'w' : 'm';
  return `${bucketIndex}${suffix} ago`;
};

export const buildRollupTrendLines = (
  history: DebateRound[],
  entries: StatsRollupEntry[],
  level: StatsRollupLevel,
  period: StatsTrendPeriod,
  now = Date.now()
): StatsTrendLine[] => {
  const trackedEntries = entries.slice(0, 5);
  if (trackedEntries.length === 0) return [];

  const trackedIds = new Set(trackedEntries.map((entry) => entry.id));
  const metadataByParticipantId = buildParticipantMetadataMap({}, history);
  const periodMs = getPeriodMs(period);
  const bucketCount = 6;
  const buckets = Array.from({ length: bucketCount }, () => new Map<string, { entries: number; wins: number }>());

  history.forEach((debate) => {
    const age = now - debate.timestamp;
    if (age < 0 || age >= periodMs * bucketCount) return;

    const bucketIndex = Math.floor(age / periodMs);
    const winnerIds = new Set(debate.overallWinners && debate.overallWinners.length > 0
      ? debate.overallWinners
      : debate.overallWinner ? [debate.overallWinner] : []
    );

    debate.participants.forEach((participantId) => {
      const metadata = metadataByParticipantId.get(participantId)
        || resolveParticipantMetadata(participantId, debate.participantDetails?.[participantId]);
      const rollupId = getRollupId(level, metadata);
      if (!trackedIds.has(rollupId)) return;

      const bucket = buckets[bucketIndex];
      const current = bucket.get(rollupId) || { entries: 0, wins: 0 };
      current.entries += 1;
      if (winnerIds.has(participantId)) {
        current.wins += 1;
      }
      bucket.set(rollupId, current);
    });
  });

  return trackedEntries.map((entry) => ({
    id: entry.id,
    label: entry.shortLabel,
    points: Array.from({ length: bucketCount }, (_, pointIndex) => {
      const bucketIndex = bucketCount - 1 - pointIndex;
      const bucketValue = buckets[bucketIndex].get(entry.id);
      return {
        x: pointIndex,
        y: bucketValue && bucketValue.entries > 0 ? (bucketValue.wins / bucketValue.entries) * 100 : 0,
        label: getPeriodLabel(period, bucketIndex),
      };
    }),
  }));
};
