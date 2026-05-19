import { useEffect, useMemo, useState } from 'react';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
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
  const { period, region, category } = useGlobalFilters();
  const filters = useMemo(
    () => globalFiltersToReportsAnalytics(period, region, category),
    [period, region, category],
  );
  const { stats } = useReportsAnalytics(filters);
  const [extras, setExtras] = useState(emptyExtras);

  useEffect(() => {
    let cancelled = false;
    void fetchSectionChartExtras(period, region, category).then((data) => {
      if (!cancelled) setExtras(data);
    });
    return () => {
      cancelled = true;
    };
  }, [period, region, category]);

  return useMemo(
    () => ({
      volumeTimeSeries: buildVolumeSeriesFromStats(stats),
      volumeByCategory: (stats?.categories ?? []).map((c) => ({
        label: c.category,
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
      metricTrends:
        extras.metricTrends.length > 0
          ? extras.metricTrends
          : buildVolumeSeriesFromStats(stats).map((p) => ({
              label: p.label,
              volume: Number(p.volume),
              response: 0,
              sentiment: stats?.demographics?.byRegion?.[0]?.sentiment ?? 50,
              patterns: stats?.criticality?.patterns?.length ?? 0,
            })),
      ...extras,
    }),
    [stats, extras],
  );
}
