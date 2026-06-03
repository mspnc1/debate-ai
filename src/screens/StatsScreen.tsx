import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResponsiveContainer } from '../components/atoms';
import { Header, StatsEmptyState } from '../components/organisms';
import { ChartLegend, LineChart } from '@/components/molecules/charts';
import { SegmentedControl, Typography } from '@/components/molecules';
import { useDebateStats, useStatsRollups } from '@/hooks/stats';
import { useTheme } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import {
  getStatsModelName,
  getStatsProviderColor,
  getStatsProviderName,
  resolveStatsProviderId,
  type StatsRollupEntry,
  type StatsRollupLevel,
  type StatsRollupMetric,
  type StatsRollupSummary,
  type StatsTrendPeriod,
} from '@/services/stats';
import type { DebateRound } from '@/types/stats';

interface StatsScreenProps {
  navigation: {
    goBack: () => void;
  };
}

type ColoredRollupEntry = StatsRollupEntry & { color: string };

const LEVEL_OPTIONS = [
  { label: 'Providers', value: 'provider' as const },
  { label: 'Models', value: 'model' as const },
];

const METRIC_OPTIONS: { label: string; value: StatsRollupMetric }[] = [
  { label: 'Win Rate', value: 'winRate' },
  { label: 'Round Rate', value: 'roundWinRate' },
  { label: 'Entries', value: 'totalDebates' },
  { label: 'Rounds Won', value: 'roundsWon' },
];

const PERIOD_OPTIONS = [
  { label: 'Daily', value: 'day' as const },
  { label: 'Weekly', value: 'week' as const },
  { label: 'Monthly', value: 'month' as const },
];

const formatPercent = (value: number): string => `${Math.round(value)}%`;

const formatNumber = (value: number): string => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
};

const formatMetricValue = (value: number, metric: StatsRollupMetric): string => {
  if (metric === 'winRate' || metric === 'roundWinRate') {
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
  }

  return formatNumber(value);
};

const getMetricDescription = (metric: StatsRollupMetric): string => {
  switch (metric) {
    case 'winRate':
      return 'Final ballot win rate';
    case 'roundWinRate':
      return 'Judged round win rate';
    case 'totalDebates':
      return 'Debate entries';
    case 'roundsWon':
      return 'Rounds won';
    default:
      return '';
  }
};

const getTrendLabels = (period: StatsTrendPeriod): string[] => {
  const suffix = period === 'day' ? 'd' : period === 'week' ? 'w' : 'm';
  return [`5${suffix}`, `4${suffix}`, `3${suffix}`, `2${suffix}`, `1${suffix}`, 'Now'];
};

const getLevelNoun = (level: StatsRollupLevel): string => (
  level === 'provider' ? 'provider' : 'model'
);

const getRecentWinnerLabel = (debate: DebateRound, level: StatsRollupLevel): string | null => {
  const winnerIds = debate.overallWinners && debate.overallWinners.length > 0
    ? debate.overallWinners
    : debate.overallWinner ? [debate.overallWinner] : [];

  if (winnerIds.length === 0) return null;

  return winnerIds.map((winnerId) => {
    const details = debate.participantDetails?.[winnerId];
    const providerId = resolveStatsProviderId(details?.provider)
      || resolveStatsProviderId(winnerId);
    const providerName = getStatsProviderName(providerId);

    if (level === 'model') {
      return `${providerName} / ${getStatsModelName(providerId, details?.model)}`;
    }

    return providerName;
  }).join(' + ');
};

const SummaryCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  color: string;
}> = ({ icon, label, value, detail, color }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.summaryText}>
        <Typography variant="caption" color="secondary" numberOfLines={1}>
          {label}
        </Typography>
        <Typography variant="title" weight="bold" style={styles.tabularText}>
          {value}
        </Typography>
        <Typography variant="caption" color="secondary" numberOfLines={2}>
          {detail}
        </Typography>
      </View>
    </View>
  );
};

const OverviewSection: React.FC<{
  summary: StatsRollupSummary;
  level: StatsRollupLevel;
}> = ({ summary, level }) => {
  const { theme } = useTheme();
  const activeCount = level === 'provider' ? summary.providerCount : summary.modelCount;
  const topName = summary.topPerformer?.shortLabel || 'No leader yet';
  const roundLeaderName = summary.roundLeader?.shortLabel || 'No round leader yet';

  return (
    <View style={styles.summaryGrid}>
      <SummaryCard
        icon="chatbubbles-outline"
        label="Debates"
        value={formatNumber(summary.totalDebates)}
        detail={`${formatNumber(summary.totalEntries)} recorded entries`}
        color={theme.colors.primary[500]}
      />
      <SummaryCard
        icon={level === 'provider' ? 'business-outline' : 'hardware-chip-outline'}
        label={level === 'provider' ? 'Providers' : 'Models'}
        value={formatNumber(activeCount)}
        detail="With completed debates"
        color={theme.colors.info[500]}
      />
      <SummaryCard
        icon="trophy-outline"
        label="Top Win Rate"
        value={summary.topPerformer ? formatPercent(summary.topPerformer.winRate) : '0%'}
        detail={topName}
        color={theme.colors.success[500]}
      />
      <SummaryCard
        icon="analytics-outline"
        label="Round Leader"
        value={summary.roundLeader ? formatPercent(summary.roundLeader.roundWinRate) : '0%'}
        detail={roundLeaderName}
        color={theme.colors.warning[500]}
      />
    </View>
  );
};

const InsightSection: React.FC<{
  insights: ReturnType<typeof useStatsRollups>['insights'];
}> = ({ insights }) => {
  const { theme } = useTheme();

  if (insights.length === 0) return null;

  const toneColors = {
    success: theme.colors.success[500],
    warning: theme.colors.warning[500],
    info: theme.colors.info[500],
  };

  return (
    <View style={styles.section}>
      <Typography variant="subtitle" weight="semibold">
        Signals
      </Typography>
      <View style={styles.insightGrid}>
        {insights.map((insight) => {
          const color = toneColors[insight.tone];
          return (
            <View key={insight.id} style={[styles.insightCard, { backgroundColor: theme.colors.card, borderColor: `${color}66` }]}>
              <View style={[styles.insightIcon, { backgroundColor: `${color}22` }]}>
                <Ionicons
                  name={insight.tone === 'warning' ? 'alert-circle-outline' : insight.tone === 'success' ? 'trending-up-outline' : 'pulse-outline'}
                  size={18}
                  color={color}
                />
              </View>
              <View style={styles.insightCopy}>
                <Typography variant="body" weight="semibold" numberOfLines={2}>
                  {insight.title}
                </Typography>
                <Typography variant="caption" color="secondary">
                  {insight.detail}
                </Typography>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const MetricBarList: React.FC<{
  bars: Array<{ id: string; value: number; color: string; label: string }>;
  maxValue: number;
  metric: StatsRollupMetric;
}> = ({ bars, maxValue, metric }) => {
  const { theme } = useTheme();

  if (bars.length === 0) {
    return (
      <Typography variant="body" color="secondary" style={styles.emptyText}>
        Complete more debates to compare this metric.
      </Typography>
    );
  }

  return (
    <View style={styles.metricBars}>
      {bars.map((bar) => {
        const widthPercent = maxValue > 0 ? Math.max(4, Math.min(100, (bar.value / maxValue) * 100)) : 0;

        return (
          <View key={bar.id} style={styles.metricBarItem}>
            <View style={styles.metricBarHeader}>
              <Typography variant="caption" weight="semibold" numberOfLines={2} style={styles.metricBarLabel}>
                {bar.label}
              </Typography>
              <Typography variant="caption" weight="bold" style={[styles.tabularText, { color: theme.colors.text.primary }]}>
                {formatMetricValue(bar.value, metric)}
              </Typography>
            </View>
            <View style={[styles.track, { backgroundColor: theme.colors.gray[200] }]}>
              <View style={[styles.fill, { width: `${widthPercent}%`, backgroundColor: bar.color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const ComparisonSection: React.FC<{
  level: StatsRollupLevel;
  getBarData: ReturnType<typeof useStatsRollups>['getBarData'];
}> = ({ level, getBarData }) => {
  const { theme } = useTheme();
  const [metric, setMetric] = useState<StatsRollupMetric>('winRate');
  const { bars, maxValue } = getBarData(metric, level === 'provider' ? 8 : 6);

  return (
    <View style={[styles.cardSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleGroup}>
          <Typography variant="subtitle" weight="semibold">
            {level === 'provider' ? 'Provider Comparison' : 'Model Comparison'}
          </Typography>
          <Typography variant="caption" color="secondary">
            {getMetricDescription(metric)}
          </Typography>
        </View>
      </View>

      <View style={styles.metricChips}>
        {METRIC_OPTIONS.map((option) => {
          const selected = metric === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.metricChip,
                {
                  backgroundColor: selected ? theme.colors.primary[500] : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary[500] : theme.colors.border,
                },
              ]}
              onPress={() => setMetric(option.value)}
              activeOpacity={0.75}
            >
              <Typography
                variant="caption"
                weight={selected ? 'bold' : 'medium'}
                style={{ color: selected ? '#FFFFFF' : theme.colors.text.secondary }}
                numberOfLines={1}
              >
                {option.label}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </View>

      <MetricBarList bars={bars} maxValue={maxValue} metric={metric} />
    </View>
  );
};

const TrendSection: React.FC<{
  level: StatsRollupLevel;
  getTrendData: ReturnType<typeof useStatsRollups>['getTrendData'];
  chartWidth: number;
}> = ({ level, getTrendData, chartWidth }) => {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<StatsTrendPeriod>('week');
  const trendLines = getTrendData(period);
  const hasTrendData = trendLines.some((line) => line.points.filter((point) => point.y > 0).length >= 2);

  return (
    <View style={[styles.cardSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.sectionTitleGroup}>
        <Typography variant="subtitle" weight="semibold">
          {level === 'provider' ? 'Provider Trends' : 'Model Trends'}
        </Typography>
        <Typography variant="caption" color="secondary">
          Final win rate over time
        </Typography>
      </View>

      <SegmentedControl
        options={PERIOD_OPTIONS}
        value={period}
        onChange={setPeriod}
        fullWidth
      />

      {hasTrendData ? (
        <>
          <View style={styles.chartFrame}>
            <LineChart
              lines={trendLines.map((line) => ({
                points: line.points,
                color: line.color,
                label: line.label,
                strokeWidth: 2,
              }))}
              width={chartWidth}
              height={210}
              showGrid
              showDots
              showArea={false}
              xLabels={getTrendLabels(period)}
              yLabels={['100%', '75%', '50%', '25%', '0%']}
              animated={false}
            />
          </View>
          <ChartLegend
            items={trendLines.map((line) => ({
              color: line.color,
              label: line.label,
            }))}
            orientation="horizontal"
            showValues={false}
          />
        </>
      ) : (
        <View style={styles.noTrendBox}>
          <Ionicons name="time-outline" size={22} color={theme.colors.text.secondary} />
          <Typography variant="body" color="secondary" style={styles.emptyText}>
            Complete more debates across different dates to see trend lines.
          </Typography>
        </View>
      )}
    </View>
  );
};

const RollupEntryCard: React.FC<{
  entry: ColoredRollupEntry;
  rank: number;
}> = ({ entry, rank }) => {
  const { theme } = useTheme();
  const roundTotal = entry.roundsWon + entry.roundsLost;
  const winRateWidth = Math.max(4, Math.min(100, entry.winRate));
  const roundRateWidth = Math.max(4, Math.min(100, entry.roundWinRate));
  const sampleText = entry.uniqueDebates === entry.totalDebates
    ? `${entry.totalDebates} debates`
    : `${entry.totalDebates} entries / ${entry.uniqueDebates} debates`;

  return (
    <View style={[styles.rollupCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.rollupHeader}>
        <View style={[styles.rankBadge, { backgroundColor: `${entry.color}22`, borderColor: `${entry.color}66` }]}>
          <Typography variant="caption" weight="bold" style={[styles.tabularText, { color: entry.color }]}>
            {rank}
          </Typography>
        </View>
        <View style={styles.rollupTitle}>
          <Typography variant="body" weight="bold" numberOfLines={2}>
            {entry.shortLabel}
          </Typography>
          <Typography variant="caption" color="secondary" numberOfLines={2}>
            {entry.level === 'model' ? entry.providerName : sampleText}
          </Typography>
        </View>
        <View style={styles.rollupRate}>
          <Typography variant="title" weight="bold" style={[styles.tabularText, { color: entry.color }]}>
            {formatPercent(entry.winRate)}
          </Typography>
          <Typography variant="caption" color="secondary">
            win rate
          </Typography>
        </View>
      </View>

      {entry.level === 'model' && (
        <Typography variant="caption" color="secondary" numberOfLines={2}>
          {sampleText}
        </Typography>
      )}

      <View style={styles.profileBars}>
        <View style={styles.profileBarRow}>
          <Typography variant="caption" color="secondary" style={styles.profileBarLabel}>
            Final
          </Typography>
          <View style={[styles.track, styles.profileTrack, { backgroundColor: theme.colors.gray[200] }]}>
            <View style={[styles.fill, { width: `${winRateWidth}%`, backgroundColor: entry.color }]} />
          </View>
          <Typography variant="caption" weight="semibold" style={styles.profileBarValue}>
            {formatPercent(entry.winRate)}
          </Typography>
        </View>
        <View style={styles.profileBarRow}>
          <Typography variant="caption" color="secondary" style={styles.profileBarLabel}>
            Rounds
          </Typography>
          <View style={[styles.track, styles.profileTrack, { backgroundColor: theme.colors.gray[200] }]}>
            <View style={[styles.fill, { width: `${roundRateWidth}%`, backgroundColor: theme.colors.info[500] }]} />
          </View>
          <Typography variant="caption" weight="semibold" style={styles.profileBarValue}>
            {roundTotal > 0 ? formatPercent(entry.roundWinRate) : '0%'}
          </Typography>
        </View>
      </View>

      <View style={styles.traitGrid}>
        <View style={styles.traitColumn}>
          <Typography variant="caption" weight="bold" style={{ color: theme.colors.success[600] }}>
            Strengths
          </Typography>
          {entry.strengths.map((strength) => (
            <Typography key={strength} variant="caption" color="secondary">
              {strength}
            </Typography>
          ))}
        </View>
        <View style={styles.traitColumn}>
          <Typography variant="caption" weight="bold" style={{ color: theme.colors.warning[600] }}>
            Watch
          </Typography>
          {entry.weaknesses.length > 0 ? entry.weaknesses.map((weakness) => (
            <Typography key={weakness} variant="caption" color="secondary">
              {weakness}
            </Typography>
          )) : (
            <Typography variant="caption" color="secondary">
              No clear weakness yet
            </Typography>
          )}
        </View>
      </View>
    </View>
  );
};

const RollupDetailsSection: React.FC<{
  level: StatsRollupLevel;
  entries: ColoredRollupEntry[];
}> = ({ level, entries }) => {
  const displayEntries = entries.slice(0, level === 'provider' ? 8 : 10);

  if (displayEntries.length === 0) return null;

  return (
    <View style={styles.section}>
      <Typography variant="subtitle" weight="semibold">
        {level === 'provider' ? 'Provider Profiles' : 'Model Profiles'}
      </Typography>
      <View style={styles.rollupList}>
        {displayEntries.map((entry, index) => (
          <RollupEntryCard key={entry.id} entry={entry} rank={index + 1} />
        ))}
      </View>
    </View>
  );
};

const DeferredChartsPlaceholder: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.cardSection, styles.loadingPanel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <ActivityIndicator color={theme.colors.primary[500]} />
      <Typography variant="body" color="secondary" style={styles.emptyText}>
        Preparing charts
      </Typography>
    </View>
  );
};

const RecentOutcomesSection: React.FC<{
  history: DebateRound[];
  level: StatsRollupLevel;
}> = ({ history, level }) => {
  const { theme } = useTheme();
  const recentDebates = useMemo(() => history.slice(-5).reverse(), [history]);

  if (recentDebates.length === 0) return null;

  return (
    <View style={styles.section}>
      <Typography variant="subtitle" weight="semibold">
        Recent Outcomes
      </Typography>
      <View style={styles.recentList}>
        {recentDebates.map((debate) => {
          const winnerLabel = getRecentWinnerLabel(debate, level);
          const winnerColor = getStatsProviderColor(
            resolveStatsProviderId(debate.participantDetails?.[debate.overallWinner || '']?.provider)
              || resolveStatsProviderId(debate.overallWinner || ''),
            theme.colors.primary[500]
          );

          return (
            <View key={debate.debateId} style={[styles.recentItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Typography variant="caption" color="secondary">
                {new Date(debate.timestamp).toLocaleDateString()}
              </Typography>
              <Typography variant="caption" weight="medium" numberOfLines={2}>
                {debate.topic}
              </Typography>
              {winnerLabel && (
                <View style={styles.recentWinnerRow}>
                  <Ionicons name="trophy-outline" size={14} color={winnerColor} />
                  <Typography variant="caption" weight="bold" numberOfLines={1} style={{ color: winnerColor }}>
                    {winnerLabel}
                  </Typography>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const StatsScreen: React.FC<StatsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { isTablet, rs } = useResponsive();
  const { width } = useWindowDimensions();
  const { history } = useDebateStats();
  const [level, setLevel] = useState<StatsRollupLevel>('provider');
  const [chartsReady, setChartsReady] = useState(false);
  const {
    entriesWithColors,
    providerRollups,
    modelRollups,
    summary,
    insights,
    getBarData,
    getTrendData,
  } = useStatsRollups(level);

  const hasActiveStats = providerRollups.length > 0 || modelRollups.length > 0;
  const chartWidth = Math.max(280, Math.min(width - rs('md') * 4, isTablet ? 520 : 340));

  useEffect(() => {
    setChartsReady(false);
    const fallback = setTimeout(() => setChartsReady(true), 450);
    const animationFrame = requestAnimationFrame(() => {
      clearTimeout(fallback);
      setChartsReady(true);
    });

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(fallback);
    };
  }, [level]);

  const handleStartDebate = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
      <Header
        variant="gradient"
        slim
        title="Performance Stats"
        showBackButton
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { padding: rs('md') }]}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer maxWidth="xl" center>
          {!hasActiveStats && history.length === 0 ? (
            <StatsEmptyState
              title="No debates yet!"
              subtitle="Complete some debates to see provider and model performance statistics"
              emoji="📊"
              showCTA
              ctaText="Start Your First Debate"
              onCTAPress={handleStartDebate}
              showHelp
              helpText="Debates compare providers and models by final ballots, judged rounds, and trend lines."
            />
          ) : (
            <View style={styles.pageStack}>
              <SegmentedControl
                options={LEVEL_OPTIONS}
                value={level}
                onChange={setLevel}
                fullWidth
              />

              <OverviewSection summary={summary} level={level} />
              <InsightSection insights={insights} />

              <ComparisonSection level={level} getBarData={getBarData} />

              {chartsReady ? (
                <TrendSection
                  level={level}
                  getTrendData={getTrendData}
                  chartWidth={chartWidth}
                />
              ) : (
                <DeferredChartsPlaceholder />
              )}

              <RollupDetailsSection level={level} entries={entriesWithColors} />
              <RecentOutcomesSection history={history} level={level} />

              {entriesWithColors.length === 0 && (
                <View style={styles.emptyRollupFooter}>
                  <Typography variant="body" color="secondary" align="center">
                    No {getLevelNoun(level)} rollups are available yet.
                  </Typography>
                </View>
              )}
            </View>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 36,
  },
  pageStack: {
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitleGroup: {
    gap: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 116,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    gap: 2,
  },
  insightGrid: {
    gap: 10,
  },
  insightCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  insightIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCopy: {
    flex: 1,
    gap: 2,
  },
  cardSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 14,
  },
  metricChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 34,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBars: {
    gap: 12,
  },
  metricBarItem: {
    gap: 6,
  },
  metricBarHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricBarLabel: {
    flex: 1,
  },
  track: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  chartFrame: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  noTrendBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 120,
    padding: 16,
  },
  loadingPanel: {
    minHeight: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollupList: {
    gap: 10,
  },
  rollupCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  rollupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollupTitle: {
    flex: 1,
    gap: 2,
  },
  rollupRate: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  profileBars: {
    gap: 8,
  },
  profileBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBarLabel: {
    width: 48,
  },
  profileTrack: {
    flex: 1,
  },
  profileBarValue: {
    width: 42,
    textAlign: 'right',
  },
  traitGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  traitColumn: {
    flex: 1,
    gap: 4,
  },
  recentList: {
    gap: 8,
  },
  recentItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  recentWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  emptyRollupFooter: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
  },
  tabularText: {
    fontVariant: ['tabular-nums'],
  },
});

export default StatsScreen;
