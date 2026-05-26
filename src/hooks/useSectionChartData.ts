import { useEffect, useMemo, useState } from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { PERIOD_COMPARE_VALUE } from '@/lib/globalFilterOptions';
import { useOptionalGlobalReportsAnalytics } from '@/contexts/GlobalReportsAnalyticsContext';
import { formatReportCategoryLabel } from '@/lib/reportCategoryLabels';
import { buildMetricTrendsFromStats } from '@/lib/reportsAnalyticsAggregates';
import {
  buildVolumeSeriesFromStats,
  fetchSectionChartExtras,
} from '@/lib/sectionChartData';
import type { LabeledValue, SeriesPoint } from '@/lib/chartTypes';

const emptyExtras = {
  classificationByCategory: [] as LabeledValue[],
  classificationTrend: [] as LabeledValue[],
  referralFunnel: [] as LabeledValue[],
  referralTimeline: [] as SeriesPoint[],
  commissionByTheme: [] as LabeledValue[],
  councilMemberQueue: [] as LabeledValue[],
  notificationStats: [] as SeriesPoint[],
  exportActivity: { byFormat: [] as LabeledValue[], timeline: [] as SeriesPoint[] },
  correctionsByStatus: [] as LabeledValue[],
  widgetUsage: [] as LabeledValue[],
  savedPanelsTrend: [] as LabeledValue[],
  panelBuilderFunnel: [] as LabeledValue[],
  accessibilityAdoption: [] as LabeledValue[],
  moduleAccess: [] as LabeledValue[],
  auditByDay: [] as LabeledValue[],
  usersByRole: [] as LabeledValue[],
  heatmapByTerritory: (_metric: string) => [] as LabeledValue[],
  metricTrends: [] as SeriesPoint[],
};

/** Gráficos de seção do painel admin — dados reais (Supabase + analytics). */
export function useSectionChartData() {
  const { period, region, category, periodCompare, compareActive } = useGlobalFilters();
  const globalAnalytics = useOptionalGlobalReportsAnalytics();
  const stats = globalAnalytics?.stats ?? null;
  const lastUpdate = globalAnalytics?.lastUpdate ?? null;
  const [extras, setExtras] = useState(emptyExtras);

  useEffect(() => {
    let cancelled = false;
    const periodCompareInput =
      period === PERIOD_COMPARE_VALUE && compareActive
        ? { periodA: periodCompare.periodA }
        : undefined;
    void fetchSectionChartExtras(period, region, category, periodCompareInput).then((data) => {
      if (!cancelled) setExtras(data);
    });
    return () => {
      cancelled = true;
    };
  }, [period, region, category, periodCompare.periodA, compareActive, lastUpdate]);

  return useMemo(() => {
    const metricTrends =
      extras.metricTrends.length > 0
        ? extras.metricTrends
        : buildMetricTrendsFromStats(stats);

    return {
      ...extras,
      volumeTimeSeries: buildVolumeSeriesFromStats(stats),
      volumeByCategory: (stats?.categories ?? []).map((c) => ({
        label: formatReportCategoryLabel(c.category),
        value: c.count,
      })),
      statusBreakdown: (stats?.byStatus ?? []).map((s) => ({
        label: s.status,
        value: s.count,
      })),
      territoryIntensity: (stats?.demographics?.byRegion ?? []).map((r) => ({
        label: r.region,
        value: r.count,
      })),
      metricTrends,
    };
  }, [stats, extras]);
}
