import { useMemo, useState, useCallback } from "react";
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
  Calendar,
  Clock,
  Megaphone,
  RefreshCw,
  Tag,
  TrendingUp,
  Users,
  Building2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/analytics/ChartCard";
import { KPICard } from "@/components/analytics/KPICard";
import { AnalyticsLiveBadge } from "@/components/analytics/AnalyticsLiveBadge";
import { AnalyticsFiltersBar } from "@/components/analytics/AnalyticsFiltersBar";
import { AudienciasFacetPicker } from "@/components/analytics/facets/AudienciasFacetPicker";
import { EMPTY_VOLUME_FILTERS, type VolumeFiltersValue } from "@/components/analytics/volumeFiltersConstants";
import type { DateRangeValue } from "@/components/filters/types";
import { cn } from "@/lib/utils";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";
import { useUrlSyncedState, dateRangeSerializer } from "@/hooks/useUrlSyncedState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFacetUrlState } from "@/hooks/useFacetUrlState";
import {
  EMPTY_AUDIENCIAS_FACET,
  countActiveAudienciasFacet,
  type AudienciasFacet,
} from "@/lib/analyticsFilters";
import {
  useAudienciasAnalytics,
  type AudienciasFilters,
  type AudienciaRanking,
} from "@/hooks/useAudienciasAnalytics";

/**
 * Aba "Audiências" do dashboard administrativo (HU-1.4).
 *
 * Estrutura:
 *   - Filtro de período (sobre audiencias.data).
 *   - 4 KPIs: inscrições, ocupação média, % audiências com inscritos, usuários únicos.
 *   - 4 painéis de breakdown (comissão, tema, zona, timeline).
 *   - 3 listas operacionais (top, zero inscritos, baixa ocupação).
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

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM", { locale: ptBR });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateLong(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return iso.slice(0, 10);
  }
}

export function AudienciasAnalyticsTab() {
  // HU-3.3 — período sincronizado com URL.
  const [periodState, setPeriodState] = useUrlSyncedState<{
    p: { startDate?: string; endDate?: string } | null;
  }>({
    prefix: "aud",
    defaults: { p: null },
    serializers: { p: dateRangeSerializer() },
  });
  const period: DateRangeValue | undefined = useMemo(
    () =>
      periodState.p
        ? {
            from: parseLocalDate(periodState.p.startDate),
            to: parseLocalDate(periodState.p.endDate),
          }
        : undefined,
    [periodState.p?.startDate, periodState.p?.endDate],
  );
  const setPeriod = useCallback(
    (next: DateRangeValue | undefined) =>
      setPeriodState({
        p: next
          ? {
              startDate: formatLocalDate(next.from),
              endDate: formatLocalDate(next.to),
            }
          : null,
      }),
    [setPeriodState],
  );

  // VolumeFilters precisa de granularFilters mesmo que o tab oculte categorias/regiões/zonas
  // — mantemos o objeto cheio pra preservar a API do componente.
  const [granularFilters, setGranularFilters] = useState<VolumeFiltersValue>(EMPTY_VOLUME_FILTERS);

  // HU-14.5 — Facet da aba Audiências (comissões + status) sincronizado com URL.
  const [audFacet, setAudFacet] = useFacetUrlState<AudienciasFacet>(
    "aud",
    EMPTY_AUDIENCIAS_FACET,
  );
  const debouncedAudFacet = useDebouncedValue(audFacet, 300);
  const facetActiveCount = countActiveAudienciasFacet(audFacet);

  const filters: AudienciasFilters = useMemo(
    () => ({
      startDate: period?.from,
      endDate: period?.to,
      facet: debouncedAudFacet,
    }),
    [period, debouncedAudFacet],
  );

  const { stats, isLoading, error, refresh, lastUpdate } = useAudienciasAnalytics(filters);

  // Lista de comissões para o picker (derivada do agregado byComissao).
  const availableComissoes = useMemo(
    () =>
      Array.from(
        new Set(
          stats.byComissao
            .map((c) => c.label)
            .filter((l) => !!l && l !== "Sem comissão"),
        ),
      ).sort(),
    [stats.byComissao],
  );

  const timelineData = useMemo(
    () =>
      stats.timeline.map((d) => ({
        ...d,
        label: formatDate(d.date),
      })),
    [stats.timeline],
  );

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
      {/* HU-5.3 — Indicador "ao vivo" + refresh manual */}
      <div className="flex justify-end -mb-2">
        <AnalyticsLiveBadge
          lastUpdates={[lastUpdate]}
          onRefresh={() => void refresh()}
          refreshing={isLoading}
        />
      </div>

      {/* HU-14.5 — Tronco (período) + facet Audiências (comissões + status). */}
      <AnalyticsFiltersBar
        volumeProps={{
          value: { ...granularFilters, period },
          onChange: (next) => {
            setPeriod(next.period);
            setGranularFilters({ ...next, period: next.period });
          },
          availableCategories: [],
          availableRegions: [],
          loading: isLoading,
          title: "Filtros de audiências",
          ariaLabel: "Filtros de audiências",
          showCategory: false,
          showRegions: false,
          showZones: false,
        }}
        facetLabel="Comissões & status"
        facetHint="Filtros específicos da aba Audiências — filtra por comissão legislativa pautadora e estado atual da audiência. Aplicam-se apenas a este corte."
        facetActiveCount={facetActiveCount}
        facet={
          <AudienciasFacetPicker
            value={audFacet}
            onChange={setAudFacet}
            availableComissoes={availableComissoes}
            disabled={isLoading}
          />
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Engajamentos totais"
          subtitle={
            stats.totalInscricoes > 0
              ? `${stats.totalLembretes} lembr. + ${stats.totalVideoconferencias} vídeo + ${stats.totalEscritas} escr.`
              : "Lembretes + videoconf. + escritas"
          }
          value={stats.totalInscricoes}
          icon={Megaphone}
        />
        <KPICard
          title="Ocupação média"
          subtitle="Engajamentos / vagas"
          value={`${stats.ocupacaoMediaPct}%`}
          icon={TrendingUp}
        />
        <KPICard
          title="Audiências com engajamento"
          subtitle={
            stats.totalAudiencias > 0
              ? `${stats.audienciasComInscricoes} de ${stats.totalAudiencias}`
              : undefined
          }
          value={`${stats.pctComInscricoes}%`}
          icon={Calendar}
        />
        <KPICard
          title="Usuários únicos"
          subtitle="Engajados no período"
          value={stats.usuariosUnicos}
          icon={Users}
        />
      </div>

      {/* Timeline */}
      <ChartCard
        title="Tendência de inscrições"
        subtitle="Inscritos por dia (data da audiência)"
      >
        <div className="h-72">
          {isLoading && timelineData.length === 0 ? (
            <div className="h-full w-full bg-muted/40 rounded animate-pulse" />
          ) : timelineData.length === 0 ? (
            <EmptyState message="Nenhuma audiência no período selecionado." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timelineData}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="inscricoes"
                  name="Inscrições"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="audiencias"
                  name="Audiências"
                  stroke="hsl(var(--chart-4))"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BreakdownPanel
          title="Por comissão"
          subtitle="Inscrições por comissão"
          icon={<Building2 className="h-4 w-4" />}
          items={stats.byComissao}
          isLoading={isLoading}
        />
        <BreakdownPanel
          title="Por tema"
          subtitle="Top 10 temas com mais inscrições"
          icon={<Tag className="h-4 w-4" />}
          items={stats.byTema}
          isLoading={isLoading}
        />
        <BreakdownPanel
          title="Por zona"
          subtitle="Inscrições por zona da cidade"
          icon={<MapPin className="h-4 w-4" />}
          items={stats.byZona}
          isLoading={isLoading}
        />
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Top 10 audiências</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Audiências com mais inscrições no período
          </p>
          {isLoading && stats.topAudiencias.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : stats.topAudiencias.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma audiência com inscrições no período.
            </p>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {stats.topAudiencias.map((a, i) => (
                <AudienciaRow key={a.id} audiencia={a} rank={i + 1} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Listas operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-lg font-semibold">
              Sem inscritos a &lt; {7} dias
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Próximas audiências sem nenhuma inscrição registrada — ação prioritária de divulgação
          </p>
          {stats.zeroInscritosProximas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              ✓ Todas as próximas audiências têm pelo menos 1 inscrito.
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {stats.zeroInscritosProximas.map((a) => (
                <AudienciaRow key={a.id} audiencia={a} highlight="danger" />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-lg font-semibold">
              Baixa ocupação a &lt; 7 dias
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Próximas audiências com menos de 25% das vagas preenchidas
          </p>
          {stats.baixaOcupacaoProximas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              ✓ Nenhuma audiência próxima com baixa ocupação.
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {stats.baixaOcupacaoProximas.map((a) => (
                <AudienciaRow key={a.id} audiencia={a} highlight="warning" />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface BreakdownPanelProps {
  title: string;
  subtitle: string;
  // O ícone é meramente decorativo no header do card; ChartCard não aceita ícone,
  // então usamos diretamente no título ao invés de prop separada.
  icon?: React.ReactNode;
  items: { label: string; count: number }[];
  isLoading: boolean;
}

function BreakdownPanel({ title, subtitle, items, isLoading }: BreakdownPanelProps) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="h-72">
        {isLoading && items.length === 0 ? (
          <div className="h-full w-full bg-muted/40 rounded animate-pulse" />
        ) : items.length === 0 ? (
          <EmptyState message="Sem dados nesse corte." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={items}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                type="number"
                allowDecimals={false}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
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
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {items.map((_, i) => (
                  <Cell key={`bd-${i}`} fill={COLOR_PALETTE[i % COLOR_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
}

function AudienciaRow({
  audiencia,
  rank,
  highlight,
}: {
  audiencia: AudienciaRanking;
  rank?: number;
  highlight?: "danger" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border p-3 hover:bg-muted/30 transition-colors",
        highlight === "danger" && "border-destructive/30",
        highlight === "warning" && "border-amber-500/30",
      )}
    >
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold tabular-nums shrink-0">
            {rank}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-snug truncate">{audiencia.titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {audiencia.comissao || "Sem comissão"} • {formatDateLong(audiencia.data)} • {audiencia.zona}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="secondary" className="tabular-nums text-xs">
            {audiencia.inscricoes} inscrito{audiencia.inscricoes === 1 ? "" : "s"}
          </Badge>
          {audiencia.ocupacaoPct !== null && (
            <span
              className={cn(
                "text-[10px] tabular-nums",
                audiencia.ocupacaoPct >= 75
                  ? "text-green-600 dark:text-green-400"
                  : audiencia.ocupacaoPct >= 25
                    ? "text-muted-foreground"
                    : "text-amber-600 dark:text-amber-400",
              )}
            >
              {audiencia.ocupacaoPct}% das vagas
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <Megaphone className="h-8 w-8" />
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}
