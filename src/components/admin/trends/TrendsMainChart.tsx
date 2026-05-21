import { AlertTriangle } from 'lucide-react';
import { ChartCard } from '@/components/admin/analytics/ChartCard';
import { TrendCategoryLineChart } from '@/components/admin/TrendCategoryLineChart';
import { Skeleton } from '@/components/ui/skeleton';
import { SECTION_CHART_LEGENDS } from '@/lib/analyticsParameterLegends';
import type { TrendChartRow } from '@/lib/buildTrendChartRows';

type TrendsMainChartProps = {
  rows: TrendChartRow[];
  categoryKeys: string[];
  isLoading: boolean;
  error: string | null;
  granularity?: string;
  startAt?: string;
};

function granularityLabel(granularity?: string): string {
  if (granularity === 'week') return 'por semana';
  if (granularity === 'month') return 'por mês';
  return 'por dia';
}

export function TrendsMainChart({
  rows,
  categoryKeys,
  isLoading,
  error,
  granularity,
  startAt,
}: TrendsMainChartProps) {
  return (
    <ChartCard
      title="Evolução por categoria"
      subtitle="Série temporal conforme tipo, linha e período selecionados"
      legend={SECTION_CHART_LEGENDS.trendByCategory}
      className="border-border/80 shadow-sm"
      contentClassName="pb-4"
    >
      {error ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      {isLoading && !rows.length ? (
        <Skeleton className="h-[300px] w-full rounded-lg" />
      ) : (
        <TrendCategoryLineChart data={rows} categoryKeys={categoryKeys} />
      )}

      {!isLoading && rows.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Agregação {granularityLabel(granularity)}.
          {startAt ? ` A partir de ${new Date(startAt).toLocaleString('pt-BR')}.` : ''}
        </p>
      ) : null}
    </ChartCard>
  );
}
