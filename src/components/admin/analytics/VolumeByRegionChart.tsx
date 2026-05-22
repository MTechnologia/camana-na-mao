import { useMemo } from 'react';
import { useGlobalReportsAnalytics } from '@/contexts/GlobalReportsAnalyticsContext';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExternalLink } from 'lucide-react';
import { useAnalyticsDrill } from '@/contexts/AnalyticsDrillContext';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { buildSentimentPolarityFromStats } from '@/lib/analyticsDrillFromStats';
import { metricLabel } from '@/lib/analyticsLabels';
import { cn } from '@/lib/utils';
import type { ChartBarPoint, RegionSentimentBreakdown } from '@/types/analyticsDrill';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartParametersHelp } from '@/components/admin/analytics/ChartParametersHelp';
import { SentimentPolarityPiesGrid } from '@/components/admin/analytics/SentimentPolarityPiesGrid';
import {
  CHART_PARAMETER_LEGENDS,
  SENTIMENT_POLARITY_PREPEND_SECTION,
} from '@/lib/analyticsParameterLegends';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function toDrillPoint(item: RegionSentimentBreakdown, filterKey: ChartBarPoint['filterKey']): ChartBarPoint {
  const positive = item.slices.find((s) => s.id === 'positive')?.value ?? 0;
  return {
    id: item.id,
    label: item.label,
    value: positive,
    filterKey,
    filterValue: item.id,
  };
}

type VolumeByRegionChartProps = {
  showLegend?: boolean;
  variant?: 'default' | 'executive';
};

export function VolumeByRegionChart({
  showLegend = true,
  variant = 'default',
}: VolumeByRegionChartProps) {
  const isExecutive = variant === 'executive';
  const { region, category } = useGlobalFilters();
  const { stats } = useGlobalReportsAnalytics();

  const {
    chartData,
    grain,
    metric,
    activeRegion,
    selectedBar,
    drillDown,
    openDrillThrough,
  } = useAnalyticsDrill();

  const isSentiment = metric === 'sentiment';

  const sentimentPies = useMemo(() => {
    if (!isSentiment) return [];
    return buildSentimentPolarityFromStats(stats, grain, activeRegion, category);
  }, [isSentiment, stats, grain, activeRegion, category]);

  const title = isSentiment
    ? grain === 'overview'
      ? 'Polaridade por região'
      : grain === 'region'
        ? 'Polaridade por distrito'
        : 'Polaridade por categoria'
    : grain === 'overview'
      ? 'Volume por região'
      : grain === 'region'
        ? 'Detalhe por distrito'
        : 'Distribuição por categoria';

  const subtitle = isSentiment
    ? 'Positivo, neutro e negativo (%) · Clique em uma zona para drill-down'
    : 'Clique em uma barra para drill-down · Selecione e use drill-through';

  const handleSentimentClick = (item: RegionSentimentBreakdown) => {
    if (grain === 'overview') drillDown(toDrillPoint(item, 'region'));
    else if (grain === 'region') drillDown(toDrillPoint(item, 'district'));
    else drillDown(toDrillPoint(item, 'category'));
  };

  const legendItems = isSentiment
    ? CHART_PARAMETER_LEGENDS.sentimentByRegion
    : [
        ...CHART_PARAMETER_LEGENDS.executiveChart,
        {
          term: 'Métrica ativa',
          description: `${metricLabel(metric)} — define o valor numérico de cada barra no gráfico.`,
        },
      ];

  return (
    <Card className={isExecutive ? 'border-border/80 shadow-sm' : undefined}>
      <CardContent className={cn('relative', isExecutive ? 'p-5 sm:p-6' : 'p-4')}>
        {showLegend ? (
          <ChartParametersHelp
            className="absolute right-3 top-3 z-10"
            items={legendItems}
            prependSection={isSentiment ? SENTIMENT_POLARITY_PREPEND_SECTION : undefined}
            chartTitle={title}
          />
        ) : null}

        {!isExecutive ? (
          <div
            className={cn(
              'mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
              showLegend && 'pr-9',
            )}
          >
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {metricLabel(metric)}
                <span className="mx-1.5 text-muted-foreground/50" aria-hidden>
                  ·
                </span>
                {subtitle}
              </p>
            </div>
            {selectedBar ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={openDrillThrough}
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Ver relatos ({selectedBar.label})
              </Button>
            ) : null}
          </div>
        ) : (
          <div
            className={cn(
              'mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2 sm:gap-3',
              showLegend && 'pr-9',
            )}
          >
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            </div>
            {selectedBar ? (
              <Button type="button" size="sm" className="gap-1.5 shadow-sm" onClick={openDrillThrough}>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Ver relatos — {selectedBar.label}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground/80">
                Nenhum território selecionado no gráfico
              </p>
            )}
          </div>
        )}

        {isSentiment ? (
          <SentimentPolarityPiesGrid
            items={sentimentPies}
            selectedId={selectedBar?.id}
            onItemClick={handleSentimentClick}
          />
        ) : (
          <div className={isExecutive ? 'h-[300px] w-full sm:h-[340px]' : 'h-[280px] w-full'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={chartData.length > 4 ? -25 : 0}
                  textAnchor={chartData.length > 4 ? 'end' : 'middle'}
                  height={chartData.length > 4 ? 56 : 32}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                  }}
                  formatter={(value) => [
                    typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value ?? ''),
                    'Valor',
                  ]}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(bar) => {
                    const payload = bar?.payload as ChartBarPoint | undefined;
                    if (payload) drillDown(payload);
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.id}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      stroke={selectedBar?.id === entry.id ? 'hsl(var(--primary))' : undefined}
                      strokeWidth={selectedBar?.id === entry.id ? 2 : 0}
                      opacity={selectedBar && selectedBar.id !== entry.id ? 0.45 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
