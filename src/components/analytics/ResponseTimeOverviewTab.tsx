import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  Gauge,
  MapPin,
  RefreshCw,
  Tag,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartCard } from "@/components/analytics/ChartCard";
import { KPICard } from "@/components/analytics/KPICard";
import { FilterDatePicker } from "@/components/filters/FilterDatePicker";
import { VolumeFilters } from "@/components/analytics/VolumeFilters";
import { EMPTY_VOLUME_FILTERS, type VolumeFiltersValue } from "@/components/analytics/volumeFiltersConstants";
import type { DateRangeValue } from "@/components/filters/types";
import { cn } from "@/lib/utils";
import { useUrlSyncedState, dateRangeSerializer } from "@/hooks/useUrlSyncedState";
import {
  useResponseTimeAnalytics,
  type ResponseTimeFilters,
} from "@/hooks/useResponseTimeAnalytics";

/**
 * Aba "Eficiência" do dashboard administrativo de relatos (HU-1.2).
 *
 * Estrutura:
 *   - Filtro de período (presets + range customizado).
 *   - KPI principal: tempo médio de resolução (atual) + delta vs. período anterior.
 *   - KPIs auxiliares: total resolvidos, mediana.
 *   - Gráfico de linha: tempo médio por dia.
 *   - 4 painéis de breakdown lado a lado (categoria, severidade, tipo, região/zona).
 */

const COLOR_PALETTE = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-5))",
];

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} d`;
}

const TYPE_LABEL: Record<"urbano" | "transporte" | "encaminhamento", string> = {
  urbano: "Urbanos",
  transporte: "Transporte",
  encaminhamento: "Encaminhamentos",
};

export function ResponseTimeOverviewTab() {
  // HU-3.3 — período sincronizado com URL
  const [periodState, setPeriodState] = useUrlSyncedState<{ p: { startDate?: string; endDate?: string } | null }>({
    prefix: "eff",
    defaults: { p: null },
    serializers: { p: dateRangeSerializer() },
  });
  const period: DateRangeValue | undefined = periodState.p ? { startDate: periodState.p.startDate, endDate: periodState.p.endDate } : undefined;
  const setPeriod = (next: DateRangeValue | undefined) => setPeriodState({ p: next ? { startDate: next.startDate, endDate: next.endDate } : null });

  // HU-5.2 — Filtros granulares (categorias, bairros, zonas)
  const [granularFilters, setGranularFilters] = useState<VolumeFiltersValue>(EMPTY_VOLUME_FILTERS);

  const filters: ResponseTimeFilters = useMemo(
    () => ({
      startDate: period?.from,
      endDate: period?.to,
      categories: granularFilters.categories,
      regions: granularFilters.regions,
      zones: granularFilters.zones,
    }),
    [period, granularFilters],
  );

  const { stats, isLoading, error, refresh } = useResponseTimeAnalytics(filters);

  const trendData = useMemo(
    () =>
      stats.trend.map((d) => ({
        ...d,
        label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
      })),
    [stats.trend],
  );

  const typeData = useMemo(
    () =>
      stats.byType.map((t) => ({
        label: TYPE_LABEL[t.source] ?? t.source,
        avgHours: t.avgHours,
        count: t.count,
      })),
    [stats.byType],
  );

  const directionLabel: Record<typeof stats.direction, string> = {
    melhorou: "Mais rápido",
    piorou: "Mais lento",
    estavel: "Estável",
  };

  const directionColor: Record<typeof stats.direction, string> = {
    melhorou: "text-green-600 dark:text-green-400",
    piorou: "text-destructive",
    estavel: "text-muted-foreground",
  };

  const DirectionIcon =
    stats.direction === "melhorou"
      ? ArrowDownRight
      : stats.direction === "piorou"
        ? ArrowUpRight
        : ArrowRight;

  if (error) {
    return (
      <Card className="p-6 flex flex-col items-center gap-3 border-destructive/30 bg-destructive/5">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-destructive text-center">{error}</p>
        <Button onClick={() => void refresh()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="rounded-lg border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>Período de análise</span>
        </div>
        <FilterDatePicker
          value={period}
          onChange={setPeriod}
          placeholder="Todos os períodos"
        />
        {(period?.from || period?.to) && (
          <span className="text-xs text-muted-foreground">
            Comparação automática com período anterior de mesma duração.
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Tempo médio até resolução
              </p>
              <p className="text-3xl font-semibold text-foreground">
                {formatHours(stats.avgHours)}
              </p>
              {stats.avgHoursPrevious > 0 && (
                <div
                  className={cn(
                    "mt-2 flex items-center gap-1.5 text-xs font-medium",
                    directionColor[stats.direction],
                  )}
                >
                  <DirectionIcon className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {directionLabel[stats.direction]} —{" "}
                    {Math.abs(stats.deltaPct).toFixed(1)}% vs. {formatHours(stats.avgHoursPrevious)}{" "}
                    no período anterior
                  </span>
                </div>
              )}
            </div>
            <Gauge className="h-8 w-8 text-primary opacity-60" aria-hidden="true" />
          </div>
        </Card>

        <KPICard
          title="Mediana"
          subtitle="Metade resolveu até este tempo"
          value={formatHours(stats.medianHours)}
          icon={Clock}
        />
        <KPICard
          title="Total resolvidos"
          subtitle="No período selecionado"
          value={stats.count}
          icon={BarChart3}
        />
      </div>

      {/* Trend de tempo médio */}
      <ChartCard
        title="Tendência do tempo de resolução"
        subtitle="Tempo médio por dia (em horas)"
      >
        <div className="h-72">
          {isLoading && trendData.length === 0 ? (
            <div className="h-full w-full bg-muted/40 rounded animate-pulse" />
          ) : trendData.length === 0 ? (
            <EmptyState message="Nenhum relato resolvido no período selecionado." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickMargin={6}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v: number) =>
                    v >= 24 ? `${(v / 24).toFixed(0)}d` : `${v.toFixed(0)}h`
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, _name, item) => [
                    formatHours(value),
                    `${item.payload.count} relatos`,
                  ]}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="avgHours"
                  name="Tempo médio"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      {/* Breakdowns 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BreakdownPanel
          title="Por tipo"
          subtitle="Tempo médio por origem do relato"
          icon={<TrendingUp className="h-4 w-4" />}
          items={typeData}
          isLoading={isLoading}
        />
        <BreakdownPanel
          title="Por severidade"
          subtitle="Tempo médio por nível de criticidade"
          icon={<AlertTriangle className="h-4 w-4" />}
          items={stats.bySeverity.map((s) => ({
            label: s.label,
            avgHours: s.avgHours,
            count: s.count,
          }))}
          isLoading={isLoading}
        />
        <BreakdownPanel
          title="Por categoria"
          subtitle="Top 10 categorias"
          icon={<Tag className="h-4 w-4" />}
          items={stats.byCategory.slice(0, 10).map((s) => ({
            label: s.label,
            avgHours: s.avgHours,
            count: s.count,
          }))}
          isLoading={isLoading}
        />
        <BreakdownPanel
          title="Por região"
          subtitle="Tempo médio por zona da cidade"
          icon={<MapPin className="h-4 w-4" />}
          items={stats.byRegion.map((s) => ({
            label: s.label,
            avgHours: s.avgHours,
            count: s.count,
          }))}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

interface BreakdownPanelProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: Array<{ label: string; avgHours: number; count: number }>;
  isLoading: boolean;
}

function BreakdownPanel({ title, subtitle, items, isLoading }: BreakdownPanelProps) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="h-72">
        {isLoading && items.length === 0 ? (
          <div className="h-full w-full bg-muted/40 rounded animate-pulse" />
        ) : items.length === 0 ? (
          <EmptyState message="Sem dados para esse corte no período." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={items}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v: number) =>
                  v >= 24 ? `${(v / 24).toFixed(0)}d` : `${v.toFixed(0)}h`
                }
              />
              <YAxis
                type="category"
                dataKey="label"
                width={130}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, _name, item) => [
                  formatHours(value),
                  `${item.payload.count} relatos`,
                ]}
              />
              <Bar dataKey="avgHours" radius={[0, 4, 4, 0]}>
                {items.map((_, i) => (
                  <Cell key={`bd-cell-${i}`} fill={COLOR_PALETTE[i % COLOR_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <Clock className="h-8 w-8" />
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}
