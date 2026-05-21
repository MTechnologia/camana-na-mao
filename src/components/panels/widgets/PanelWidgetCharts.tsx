import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePanelWidgetAnalytics } from '@/hooks/usePanelWidgetAnalytics';
import {
  CHART_COLORS,
  chartTooltipStyle,
  formatChartNumber,
} from '@/components/admin/analytics/chartTheme';
import { metricLabel } from '@/lib/analyticsLabels';
import type { AnalyticsMetric, ChartBarPoint, DrillGrain } from '@/types/analyticsDrill';
import type { PanelWidget } from '@/types/customPanel';

function MiniChart({ tall, children }: { tall?: boolean; children: ReactNode }) {
  return <div className={tall ? 'h-[280px] w-full' : 'h-[220px] w-full'}>{children}</div>;
}

export function WidgetKpiQuad({ widget }: { widget: PanelWidget }) {
  const { kpis } = usePanelWidgetAnalytics(widget);
  const items = [
    { label: 'Volume', value: formatChartNumber(kpis.volume), hint: 'relatos' },
    { label: 'Resposta média', value: `${kpis.responseHours}h`, hint: 'no período' },
    { label: 'Sentimento +', value: `${kpis.sentimentPct}%`, hint: 'positivo' },
    { label: 'Padrões', value: formatChartNumber(kpis.patterns), hint: 'temas ativos' },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-border bg-muted/30 px-3 py-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.hint}</p>
        </div>
      ))}
    </div>
  );
}

export function WidgetKpiSingle({ widget }: { widget: PanelWidget }) {
  const metric = widget.filters.metric ?? 'volume';
  const { kpis } = usePanelWidgetAnalytics(widget);
  const valueMap: Record<AnalyticsMetric, string> = {
    volume: formatChartNumber(kpis.volume),
    response_time: `${kpis.responseHours} h`,
    sentiment: `${kpis.sentimentPct}%`,
    patterns: formatChartNumber(kpis.patterns),
  };
  return (
    <div className="flex h-full min-h-[120px] flex-col justify-center rounded-lg border border-border bg-muted/20 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {metricLabel(metric)}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{valueMap[metric]}</p>
    </div>
  );
}

export function WidgetBarDrill({ widget }: { widget: PanelWidget }) {
  const metric = widget.filters.metric ?? 'volume';
  const enableDrill = widget.filters.enableDrill !== false;
  const { chartSeries } = usePanelWidgetAnalytics(widget);
  const [grain, setGrain] = useState<DrillGrain>('overview');
  const [activeRegion, setActiveRegion] = useState<string | undefined>();
  const [activeDistrict, setActiveDistrict] = useState<string | undefined>();

  const data = useMemo(
    () => chartSeries(grain, metric, activeRegion, activeDistrict),
    [chartSeries, grain, metric, activeRegion, activeDistrict],
  );

  const onBarClick = useCallback(
    (point: ChartBarPoint) => {
      if (!enableDrill) return;
      if (grain === 'overview' && point.filterKey === 'region') {
        setGrain('region');
        setActiveRegion(point.filterValue);
      } else if (grain === 'region' && point.filterKey === 'district') {
        setActiveDistrict(point.filterValue);
        setGrain('street');
      }
    },
    [enableDrill, grain],
  );

  const drillUp = () => {
    if (grain === 'street') {
      setGrain('region');
      setActiveDistrict(undefined);
    } else if (grain === 'region') {
      setGrain('overview');
      setActiveRegion(undefined);
    }
  };

  return (
    <div className="space-y-2">
      {enableDrill && grain !== 'overview' ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={drillUp}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar nível
        </Button>
      ) : null}
      <MiniChart tall>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: data.length > 5 ? 48 : 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={data.length > 5 ? -28 : 0}
              textAnchor={data.length > 5 ? 'end' : 'middle'}
              height={data.length > 5 ? 56 : 32}
            />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v) => formatChartNumber(Number(v))}
            />
            <Bar
              dataKey="value"
              name={metricLabel(metric)}
              fill={CHART_COLORS[0]}
              radius={[4, 4, 0, 0]}
              cursor={enableDrill ? 'pointer' : 'default'}
              onClick={(_, index) => {
                const point = data[index];
                if (point) onBarClick(point);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </MiniChart>
      {enableDrill ? (
        <p className="text-[11px] text-muted-foreground">
          Clique nas barras para drill-down no território.
        </p>
      ) : null}
    </div>
  );
}

export function WidgetLineVolume({ widget }: { widget: PanelWidget }) {
  const { bundle } = usePanelWidgetAnalytics(widget);
  const data = bundle.volumeTimeSeries;
  return (
    <MiniChart>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Line
            type="monotone"
            dataKey="volume"
            name="Volume"
            stroke={CHART_COLORS[0]}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="resolved"
            name="Resolvidos"
            stroke={CHART_COLORS[4]}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </MiniChart>
  );
}

export function WidgetPieStatus({ widget }: { widget: PanelWidget }) {
  const { bundle } = usePanelWidgetAnalytics(widget);
  const data = bundle.statusBreakdown;
  return (
    <MiniChart>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={80}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </MiniChart>
  );
}

export function WidgetPieSentiment({ widget }: { widget: PanelWidget }) {
  const { sentimentPolarity } = usePanelWidgetAnalytics(widget);
  const regions = useMemo(() => sentimentPolarity('overview'), [sentimentPolarity]);
  const slices = regions[0]?.slices ?? [];
  return (
    <MiniChart>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={72}
          >
            {slices.map((s, i) => (
              <Cell key={s.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </MiniChart>
  );
}

export function WidgetPatternsTop({ widget }: { widget: PanelWidget }) {
  const { bundle } = usePanelWidgetAnalytics(widget);
  const topN = widget.filters.topN ?? 8;
  const rows = useMemo(() => bundle.topPatterns.slice(0, topN), [bundle.topPatterns, topN]);
  return (
    <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
      {rows.map((row, i) => (
        <li
          key={row.id}
          className="flex items-center justify-between gap-2 rounded-md border border-border/80 bg-muted/20 px-3 py-2 text-sm"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span className="truncate font-medium text-foreground">{row.label}</span>
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {formatChartNumber(row.count)}
            <span className={row.trendPct >= 0 ? ' text-green-600' : ' text-destructive'}>
              {' '}
              {row.trendPct >= 0 ? '+' : ''}
              {row.trendPct}%
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function WidgetPatternsRegion({ widget }: { widget: PanelWidget }) {
  const { bundle } = usePanelWidgetAnalytics(widget);
  const rows = bundle.patternsByRegion;
  return (
    <ul className="max-h-[300px] space-y-2 overflow-y-auto">
      {rows.map((row) => (
        <li
          key={row.regionId}
          className="rounded-md border border-border/80 bg-muted/20 px-3 py-2.5 text-sm"
        >
          <p className="font-medium text-foreground">{row.regionLabel}</p>
          <p className="mt-0.5 text-foreground">{row.primaryPattern}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatChartNumber(row.count)} ocorrências · tendência {row.trendPct >= 0 ? '+' : ''}
            {row.trendPct}%
          </p>
        </li>
      ))}
    </ul>
  );
}

export function WidgetScatterCorrelation({ widget }: { widget: PanelWidget }) {
  const { bundle } = usePanelWidgetAnalytics(widget);
  const data = bundle.correlationPoints;
  return (
    <MiniChart tall>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis type="number" dataKey="volume" name="Volume" tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="responseHours" name="Horas" tick={{ fontSize: 10 }} />
          <ZAxis type="number" dataKey="sentimentPct" range={[60, 400]} />
          <Tooltip contentStyle={chartTooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={CHART_COLORS[2]} />
        </ScatterChart>
      </ResponsiveContainer>
    </MiniChart>
  );
}

export function WidgetTerritoryIntensity({ widget }: { widget: PanelWidget }) {
  const { bundle } = usePanelWidgetAnalytics(widget);
  const data = bundle.territoryIntensity;
  return (
    <MiniChart tall>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 72, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={68} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Bar dataKey="intensity" name="Intensidade" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </MiniChart>
  );
}
