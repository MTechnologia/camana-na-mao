import type { ReportsTrendPayload } from '@/hooks/useReportsTrend';
import type { TrendChartRow } from '@/lib/buildTrendChartRows';
import type { TrendsSummary } from '@/components/admin/trends/TrendsSummaryStrip';

function granularityLabel(granularity?: string): string {
  if (granularity === 'week') return 'Semanal';
  if (granularity === 'month') return 'Mensal';
  return 'Diária';
}

export function buildTrendSummary(
  data: ReportsTrendPayload | null,
  rows: TrendChartRow[],
  categoryKeys: string[],
): TrendsSummary {
  const empty: TrendsSummary = {
    total: 0,
    categories: 0,
    peakLabel: '—',
    peakValue: 0,
    granularityLabel: granularityLabel(data?.granularity),
  };

  if (!data?.points.length) return empty;

  const total = data.points.reduce((sum, p) => sum + p.count, 0);
  const categories = categoryKeys.length;

  let peakValue = 0;
  let peakLabel = '—';
  for (const row of rows) {
    const rowTotal = categoryKeys.reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
    if (rowTotal > peakValue) {
      peakValue = rowTotal;
      peakLabel = row.bucketLabel;
    }
  }

  return {
    total,
    categories,
    peakLabel,
    peakValue,
    granularityLabel: granularityLabel(data.granularity),
  };
}
