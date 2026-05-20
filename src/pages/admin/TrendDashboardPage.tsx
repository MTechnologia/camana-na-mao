import { useMemo, useState } from 'react';
import { TrendsExploreLinks } from '@/components/admin/trends/TrendsExploreLinks';
import { TrendsLocalFilters } from '@/components/admin/trends/TrendsLocalFilters';
import { TrendsMainChart } from '@/components/admin/trends/TrendsMainChart';
import { TrendsPageHeader } from '@/components/admin/trends/TrendsPageHeader';
import { TrendsSummaryStrip } from '@/components/admin/trends/TrendsSummaryStrip';
import { buildTrendChartRows } from '@/lib/buildTrendChartRows';
import { buildTrendSummary } from '@/lib/buildTrendSummary';
import {
  useReportsTrend,
  type ReportsTrendPeriod,
  type ReportsTrendTypeFilter,
} from '@/hooks/useReportsTrend';
import { useTransportLines } from '@/hooks/useTransportLines';

export function TrendDashboardPage() {
  const [typeFilter, setTypeFilter] = useState<ReportsTrendTypeFilter>('all');
  const [lineId, setLineId] = useState<string | null>(null);
  const [period, setPeriod] = useState<ReportsTrendPeriod>('30d');

  const { lines, loading: linesLoading } = useTransportLines();
  const { data, isLoading, error, refresh } = useReportsTrend({
    typeFilter,
    lineId,
    period,
  });

  const { rows, categoryKeys } = useMemo(() => {
    if (!data?.points.length) return { rows: [], categoryKeys: [] as string[] };
    return buildTrendChartRows(data.points, data.granularity);
  }, [data]);

  const summary = useMemo(
    () => buildTrendSummary(data, rows, categoryKeys),
    [data, rows, categoryKeys],
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 lg:gap-8">
      <TrendsPageHeader isLoading={isLoading} onRefresh={refresh} />

      <TrendsLocalFilters
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        lineId={lineId}
        onLineIdChange={setLineId}
        period={period}
        onPeriodChange={setPeriod}
        lines={lines}
        linesLoading={linesLoading}
      />

      <TrendsSummaryStrip summary={summary} isLoading={isLoading && !data} />

      <TrendsMainChart
        rows={rows}
        categoryKeys={categoryKeys}
        isLoading={isLoading}
        error={error}
        granularity={data?.granularity}
        startAt={data?.start_at}
      />

      <TrendsExploreLinks />
    </div>
  );
}
