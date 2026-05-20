import type { ReactNode } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { useAnalyticsChartData } from '@/hooks/useAnalyticsChartData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CHART_COLORS,
  chartTooltipStyle,
  formatChartNumber,
} from '@/components/admin/analytics/chartTheme';
import { ParameterLegend } from '@/components/admin/analytics/ParameterLegend';
import { PatternsByRegionList } from '@/components/admin/analytics/PatternsByRegionList';
import { SentimentPolarityPiesGrid } from '@/components/admin/analytics/SentimentPolarityPiesGrid';
import { SENTIMENT_POLARITY_PREPEND_SECTION } from '@/lib/analyticsParameterLegends';
import { CHART_PARAMETER_LEGENDS } from '@/lib/analyticsParameterLegends';
import type { ParameterLegendItem } from '@/lib/analyticsParameterLegends';
import { buildAiInsightsFromStats } from '@/lib/reportsAnalyticsAggregates';
import { useReportsAnalytics } from '@/hooks/useReportsAnalytics';
import { useGlobalFilters } from '@/contexts/AnalyticsFiltersContext';
import { globalFiltersToReportsAnalytics } from '@/lib/globalFiltersToAnalytics';
import { useMemo } from 'react';

function ChartCard({
  title,
  subtitle,
  legend,
  legendTitle,
  legendVariant = 'collapsible',
  showSentimentPolarity = false,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  legend?: ParameterLegendItem[];
  legendTitle?: string;
  legendVariant?: 'collapsible' | 'always';
  /** Exibe positivo, neutro e negativo sempre visíveis (gráficos de sentimento). */
  showSentimentPolarity?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
        {legend?.length || showSentimentPolarity ? (
          <ParameterLegend
            items={legend ?? []}
            prependSection={showSentimentPolarity ? SENTIMENT_POLARITY_PREPEND_SECTION : undefined}
            title={legendTitle ?? 'Parâmetros'}
            variant={legendVariant}
            className="mt-3"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ChartHeight({ children }: { children: ReactNode }) {
  return <div className="h-[260px] w-full">{children}</div>;
}

export function VolumeTabPanel() {
  const { volumeTimeSeries, volumeByCategory, statusBreakdown, isLoading } = useAnalyticsChartData();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Evolução do volume"
        subtitle="Novos relatos e resolvidos no período"
        legend={CHART_PARAMETER_LEGENDS.volumeTimeSeries}
        className="lg:col-span-2"
      >
        <ChartHeight>
          {!isLoading && volumeTimeSeries.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem relatos urbanos no período selecionado.
            </p>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={volumeTimeSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={volumeTimeSeries.length > 14 ? 'preserveStartEnd' : 0}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="volume"
                name="Novos relatos"
                fill={CHART_COLORS[0]}
                fillOpacity={0.15}
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name="Resolvidos"
                stroke={CHART_COLORS[4]}
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          )}
        </ChartHeight>
      </ChartCard>

      <ChartCard
        title="Volume por categoria"
        subtitle="Distribuição no recorte atual"
        legend={CHART_PARAMETER_LEGENDS.volumeByCategory}
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeByCategory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v) => [formatChartNumber(Number(v)), 'Relatos']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {volumeByCategory.map((entry, i) => (
                  <Cell key={entry.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>

      <ChartCard
        title="Pipeline de status"
        subtitle="Relatos por etapa do fluxo"
        legend={CHART_PARAMETER_LEGENDS.statusPipeline}
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={statusBreakdown}
              margin={{ top: 8, right: 16, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={96}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v) => [formatChartNumber(Number(v)), 'Quantidade']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {statusBreakdown.map((entry, i) => (
                  <Cell key={entry.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>
    </div>
  );
}

export function SentimentTabPanel() {
  const { sentimentByRegion } = useAnalyticsChartData();

  return (
    <ChartCard
      title="Polaridade por região"
      subtitle="Positivo, neutro e negativo em cada zona do recorte (%)"
      showSentimentPolarity
      legend={CHART_PARAMETER_LEGENDS.sentimentByRegion}
    >
      <SentimentPolarityPiesGrid items={sentimentByRegion} />
    </ChartCard>
  );
}

export function PatternsTabPanel() {
  const { topPatterns, patternsByRegion, isLoading } = useAnalyticsChartData();
  const chartData = topPatterns.map((p) => ({ ...p, name: p.label }));

  return (
    <ChartCard
      title="Padrões recorrentes"
      subtitle="Ranking geral no recorte e detalhamento por zona"
      legend={[
        ...CHART_PARAMETER_LEGENDS.patternsRanking,
        ...CHART_PARAMETER_LEGENDS.patternsByRegion,
      ]}
    >
        <ChartHeight>
          {!isLoading && chartData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Nenhum padrão ou categoria recorrente no recorte.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 8, right: 16, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(v) => [formatChartNumber(Number(v)), 'Ocorrências']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill={CHART_COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartHeight>

      <PatternsByRegionList
        items={patternsByRegion}
        className="mt-4 border-t border-border/80 pt-4"
      />
    </ChartCard>
  );
}

export function CorrelationTabPanel() {
  const { correlationPoints } = useAnalyticsChartData();

  return (
    <div className="grid gap-4">
      <ChartCard
        title="Volume × tempo de resposta"
        subtitle="Cada ponto é uma região no recorte; tamanho da bolha = sentimento (%)"
        showSentimentPolarity
        legend={CHART_PARAMETER_LEGENDS.correlationScatter}
        className="w-full"
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                type="number"
                dataKey="volume"
                name="Volume"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Volume de relatos', position: 'insideBottom', offset: -4, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="responseHours"
                name="Horas"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                unit=" h"
                label={{ value: 'Tempo médio (h)', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <ZAxis type="number" dataKey="sentimentPct" range={[80, 400]} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => {
                  if (name === 'responseHours') return [`${value} h`, 'Tempo médio'];
                  if (name === 'sentimentPct') return [`${value}%`, 'Sentimento'];
                  return [formatChartNumber(Number(value)), 'Volume'];
                }}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as { label?: string } | undefined;
                  return row?.label ?? '';
                }}
              />
              <Scatter data={correlationPoints} fill={CHART_COLORS[0]}>
                {correlationPoints.map((entry, i) => (
                  <Cell key={entry.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {correlationPoints.map((p, i) => (
          <div
            key={p.id}
            className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm"
          >
            <p className="font-medium text-foreground">{p.label}</p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Volume</dt>
                <dd className="font-semibold tabular-nums">{formatChartNumber(p.volume)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Resposta</dt>
                <dd className="font-semibold tabular-nums">{p.responseHours} h</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sentimento</dt>
                <dd className="font-semibold tabular-nums">{p.sentimentPct}%</dd>
              </div>
            </dl>
            <Badge variant="outline" className="mt-2 text-[10px]">
              Região {i + 1}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TerritoryTabPanel() {
  const { territoryIntensity } = useAnalyticsChartData();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Intensidade por território"
        subtitle="Mapa de calor simplificado"
        legend={CHART_PARAMETER_LEGENDS.territoryHeatmap}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {territoryIntensity.map((t) => (
            <div
              key={t.id}
              className="flex min-h-[88px] flex-col justify-between rounded-xl border border-border p-3 transition-colors"
              style={{
                background: `hsl(var(--chart-1) / ${0.12 + (t.intensity / 100) * 0.55})`,
              }}
            >
              <span className="text-xs font-medium text-foreground">{t.label}</span>
              <div>
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {formatChartNumber(t.volume)}
                </span>
                <span className="ml-1 text-[10px] text-muted-foreground">relatos</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Intensidade {t.intensity}%</span>
            </div>
          ))}
          {territoryIntensity.length < 5 ? (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-3 text-center text-[10px] text-muted-foreground">
              Recorte em região única — selecione &quot;Todas&quot; para comparar zonas
            </div>
          ) : null}
        </div>
      </ChartCard>

      <ChartCard
        title="Ranking territorial"
        subtitle="Volume absoluto no período"
        legend={CHART_PARAMETER_LEGENDS.territoryRanking}
      >
        <ChartHeight>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={territoryIntensity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v) => [formatChartNumber(Number(v)), 'Relatos']}
              />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {territoryIntensity.map((entry, i) => (
                  <Cell key={entry.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartHeight>
      </ChartCard>
    </div>
  );
}

const AI_INSIGHT_KIND_LABELS: Record<string, string> = {
  pattern: 'Padrão',
  anomaly: 'Anomalia',
  forecast: 'Tendência',
};

export function AiInsightsPanel() {
  const { topPatterns, kpis, isLoading } = useAnalyticsChartData();
  const { period, region, category } = useGlobalFilters();
  const filters = useMemo(
    () => globalFiltersToReportsAnalytics(period, region, category),
    [period, region, category],
  );
  const { stats } = useReportsAnalytics(filters);
  const insights = useMemo(() => buildAiInsightsFromStats(stats), [stats]);
  const top = topPatterns[0];

  return (
    <div className="space-y-4">
      <ParameterLegend items={CHART_PARAMETER_LEGENDS.aiSummaryCards} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-primary/20 bg-accent p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Volume (recorte)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{kpis.volume.toLocaleString('pt-BR')}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Padrão em destaque</p>
          <p className="mt-1 text-sm font-medium leading-snug">{top?.label ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Origem dos dados</p>
          <p className="mt-1 text-xs text-muted-foreground">
            urban_reports, report_patterns e RPC demografia
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-primary/20 bg-accent p-4">
        <p className="text-sm font-medium text-accent-foreground">Análise assistida por IA</p>
        <p className="text-sm text-muted-foreground">
          Insights derivados dos agregados do recorte ativo (RN-IA-001).
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando insights…</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem insights suficientes para o período. Amplie o recorte ou aguarde mais relatos.
          </p>
        ) : (
          <ul className="space-y-2 text-sm text-foreground/90">
            {insights.map((item) => (
              <li
                key={`${item.kind}-${item.title}`}
                className="rounded-lg border border-border/60 bg-background/60 px-3 py-2"
              >
                <strong className="text-foreground">
                  {AI_INSIGHT_KIND_LABELS[item.kind] ?? item.kind}:
                </strong>{' '}
                {item.title}
                <span className="mt-1 block text-xs text-muted-foreground">{item.detail}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">Fonte: {item.source}</span>
              </li>
            ))}
          </ul>
        )}
        <ParameterLegend items={CHART_PARAMETER_LEGENDS.aiInsights} className="mt-3 bg-background/50" />
      </div>
    </div>
  );
}
