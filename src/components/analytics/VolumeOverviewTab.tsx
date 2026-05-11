import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, BarChart3, MapPin, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartCard } from "@/components/analytics/ChartCard";
import { KPICard } from "@/components/analytics/KPICard";
import { VolumeFilters } from "@/components/analytics/VolumeFilters";
import {
  EMPTY_VOLUME_FILTERS,
  type VolumeFiltersValue,
} from "@/components/analytics/volumeFiltersConstants";
import { useReportsVolume, type ReportsVolumeFilters } from "@/hooks/useReportsVolume";
import {
  PeriodComparePicker,
  type PeriodComparePickerValue,
} from "@/components/filters/PeriodComparePicker";
import { useReportsVolumeCompare } from "@/hooks/useReportsVolumeCompare";
import { VolumeCompareView } from "@/components/analytics/VolumeCompareView";

/**
 * Conteúdo da aba "Volume" do dashboard administrativo de relatos (HU-1.1).
 *
 * Combina o componente de filtros com 3 visualizações principais:
 *   1. Timeline (linha) — evolução do volume ao longo do tempo, separado por tipo
 *   2. Volume por categoria (barras horizontais) — top categorias no recorte
 *   3. Volume por região (barras + zonas) — top bairros e distribuição por zona
 *
 * Os filtros são autocontidos (state local), e o hook re-fetcha apenas quando o
 * período muda; categoria/bairro/zona são aplicados em memória.
 */

export function VolumeOverviewTab() {
  const [filters, setFilters] = useState<VolumeFiltersValue>(EMPTY_VOLUME_FILTERS);

  const hookFilters: ReportsVolumeFilters = useMemo(
    () => ({
      startDate: filters.period?.from,
      endDate: filters.period?.to,
      categories: filters.categories,
      regions: filters.regions,
      zones: filters.zones,
    }),
    [filters],
  );

  const { stats, isLoading, error, refresh } = useReportsVolume(hookFilters);

  // HU-5.1 — Estado de comparação A vs B (período secundário opcional)
  const [comparePeriods, setComparePeriods] = useState<PeriodComparePickerValue>({
    periodA: filters.period,
    periodB: null,
    preset: "previous",
  });

  // Sincroniza periodA quando o filtro de período muda
  useEffect(() => {
    setComparePeriods((prev) =>
      prev.periodA === filters.period ? prev : { ...prev, periodA: filters.period },
    );
  }, [filters.period]);

  const compareEnabled = comparePeriods.periodB !== null;

  const compare = useReportsVolumeCompare({
    baseFilters: {
      categories: filters.categories,
      regions: filters.regions,
      zones: filters.zones,
    },
    periodA: comparePeriods.periodA
      ? { startDate: comparePeriods.periodA.from, endDate: comparePeriods.periodA.to }
      : undefined,
    periodB:
      comparePeriods.periodB && comparePeriods.periodB.from && comparePeriods.periodB.to
        ? { startDate: comparePeriods.periodB.from, endDate: comparePeriods.periodB.to }
        : null,
  });

  const timelineData = useMemo(
    () =>
      stats.timeline.map((d) => ({
        ...d,
        label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
      })),
    [stats.timeline],
  );

  const topCategories = useMemo(() => stats.byCategory.slice(0, 10), [stats.byCategory]);
  const topRegions = useMemo(() => stats.byRegion.slice(0, 10), [stats.byRegion]);

  const colorPalette = [
    "hsl(var(--chart-2))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-6))",
    "hsl(var(--chart-7))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-1))",
    "hsl(var(--chart-8))",
    "hsl(var(--chart-5))",
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <Card className="p-6 flex flex-col items-center gap-3 border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-destructive text-center">{error}</p>
          <Button onClick={() => void refresh()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VolumeFilters
        value={filters}
        onChange={setFilters}
        availableCategories={stats.availableCategories}
        availableRegions={stats.availableRegions}
        loading={isLoading}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total de relatos"
          subtitle="No recorte selecionado"
          value={stats.total}
          icon={BarChart3}
        />
        <KPICard title="Urbanos" value={stats.urbano} icon={BarChart3} />
        <KPICard title="Transporte" value={stats.transporte} icon={BarChart3} />
        <KPICard title="Avaliações" value={stats.avaliacao} icon={BarChart3} />
      </div>

      {/* Timeline */}
      <ChartCard
        title="Volume por período"
        subtitle="Evolução diária — urbanos, transporte e avaliações"
      >
        <div className="h-72">
          {isLoading && timelineData.length === 0 ? (
            <div className="h-full w-full bg-muted/40 rounded animate-pulse" />
          ) : timelineData.length === 0 ? (
            <EmptyChartState message="Nenhum dado no período selecionado." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timelineData}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
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
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="urbano"
                  name="Urbanos"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="transporte"
                  name="Transporte"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="avaliacao"
                  name="Avaliações"
                  stroke="hsl(var(--chart-6))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      {/* Categoria + Região lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Volume por categoria"
          subtitle="Top 10 categorias no recorte"
        >
          <div className="h-80">
            {isLoading && topCategories.length === 0 ? (
              <div className="h-full w-full bg-muted/40 rounded animate-pulse" />
            ) : topCategories.length === 0 ? (
              <EmptyChartState
                message="Nenhuma categoria encontrada para os filtros atuais."
                icon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCategories}
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
                    allowDecimals={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
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
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {topCategories.map((_, i) => (
                      <Cell
                        key={`cat-cell-${i}`}
                        fill={colorPalette[i % colorPalette.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Volume por região"
          subtitle="Top 10 bairros + distribuição por zona"
        >
          <div className="h-80 flex flex-col gap-3">
            {isLoading && topRegions.length === 0 ? (
              <div className="h-full w-full bg-muted/40 rounded animate-pulse" />
            ) : topRegions.length === 0 ? (
              <EmptyChartState
                message="Nenhuma região encontrada para os filtros atuais."
                icon={<MapPin className="h-8 w-8 text-muted-foreground" />}
              />
            ) : (
              <>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topRegions}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                      />
                      <YAxis
                        type="category"
                        dataKey="region"
                        width={140}
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickFormatter={(v: string) =>
                          v.length > 20 ? `${v.slice(0, 20)}…` : v
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
                          value,
                          `${item.payload.zone}`,
                        ]}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {topRegions.map((_, i) => (
                          <Cell
                            key={`reg-cell-${i}`}
                            fill={colorPalette[i % colorPalette.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {stats.byZone.map((z) => (
                    <span
                      key={z.zone}
                      className="text-xs px-2 py-1 rounded-md bg-muted text-foreground"
                    >
                      <strong>{z.zone}:</strong> {z.count}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyChartState({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
      {icon ?? <BarChart3 className="h-8 w-8" />}
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}
