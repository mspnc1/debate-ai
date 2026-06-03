import { useCallback, useMemo } from 'react';
import { useTheme } from '@/theme';
import {
  buildDebateStatsRollups,
  buildRollupTrendLines,
  buildStatsInsights,
  buildStatsRollupSummary,
  getStatsProviderColor,
  type StatsRollupEntry,
  type StatsRollupLevel,
  type StatsRollupMetric,
  type StatsTrendLine,
  type StatsTrendPeriod,
} from '@/services/stats';
import { useDebateStats } from './useDebateStats';

export interface RollupBarData {
  id: string;
  value: number;
  color: string;
  label: string;
}

export interface RollupTrendLineData extends StatsTrendLine {
  color: string;
}

const MODEL_PALETTE = [
  '#0EA5E9',
  '#22C55E',
  '#F97316',
  '#A855F7',
  '#E11D48',
  '#14B8A6',
  '#F59E0B',
  '#6366F1',
];

const getMetricValue = (entry: StatsRollupEntry, metric: StatsRollupMetric): number => {
  switch (metric) {
    case 'winRate':
      return entry.winRate;
    case 'roundWinRate':
      return entry.roundWinRate;
    case 'totalDebates':
      return entry.totalDebates;
    case 'roundsWon':
      return entry.roundsWon;
    default:
      return 0;
  }
};

const isPercentMetric = (metric: StatsRollupMetric): boolean => (
  metric === 'winRate' || metric === 'roundWinRate'
);

export const useStatsRollups = (level: StatsRollupLevel) => {
  const { theme } = useTheme();
  const { stats, history } = useDebateStats();

  const providerRollups = useMemo(
    () => buildDebateStatsRollups(stats, history, 'provider'),
    [stats, history]
  );
  const modelRollups = useMemo(
    () => buildDebateStatsRollups(stats, history, 'model'),
    [stats, history]
  );
  const entries = level === 'provider' ? providerRollups : modelRollups;

  const summary = useMemo(
    () => buildStatsRollupSummary(providerRollups, modelRollups, history, entries),
    [entries, history, modelRollups, providerRollups]
  );

  const insights = useMemo(
    () => buildStatsInsights(entries, level),
    [entries, level]
  );

  const getEntryColor = useCallback((entry: StatsRollupEntry, index = 0): string => {
    if (level === 'provider') {
      return getStatsProviderColor(entry.providerId, theme.colors.primary[500]);
    }

    return MODEL_PALETTE[index % MODEL_PALETTE.length]
      || getStatsProviderColor(entry.providerId, theme.colors.primary[500]);
  }, [level, theme.colors.primary]);

  const entriesWithColors = useMemo(
    () => entries.map((entry, index) => ({
      ...entry,
      color: getEntryColor(entry, index),
    })),
    [entries, getEntryColor]
  );

  const getBarData = useCallback((metric: StatsRollupMetric, limit = 6): { bars: RollupBarData[]; maxValue: number } => {
    const bars = entriesWithColors
      .map((entry) => ({
        id: entry.id,
        value: getMetricValue(entry, metric),
        color: entry.color,
        label: entry.shortLabel,
      }))
      .filter((bar) => bar.value > 0 || metric === 'winRate' || metric === 'roundWinRate')
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    return {
      bars,
      maxValue: isPercentMetric(metric)
        ? 100
        : Math.max(...bars.map((bar) => bar.value), 1),
    };
  }, [entriesWithColors]);

  const getTrendData = useCallback((period: StatsTrendPeriod): RollupTrendLineData[] => {
    const colorByEntryId = new Map(entriesWithColors.map((entry) => [entry.id, entry.color]));
    return buildRollupTrendLines(history, entries, level, period).map((line) => ({
      ...line,
      color: colorByEntryId.get(line.id) || theme.colors.primary[500],
    }));
  }, [entries, entriesWithColors, history, level, theme.colors.primary]);

  return {
    entries,
    entriesWithColors,
    providerRollups,
    modelRollups,
    summary,
    insights,
    getBarData,
    getTrendData,
    hasRollups: entries.length > 0,
  };
};
