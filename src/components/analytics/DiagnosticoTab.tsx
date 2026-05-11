import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Frown,
  Gauge,
  MapPin,
  RefreshCw,
  Sparkles,
  Tag,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/analytics/KPICard";
import { AIInsightsCard } from "@/components/analytics/AIInsightsCard";
import { VolumeFilters } from "@/components/analytics/VolumeFilters";
import { AnalyticsLiveBadge } from "@/components/analytics/AnalyticsLiveBadge";
import { EMPTY_VOLUME_FILTERS, type VolumeFiltersValue } from "@/components/analytics/volumeFiltersConstants";
import type { DateRangeValue } from "@/components/filters/types";
import { cn } from "@/lib/utils";
import { parseLocalDate, formatLocalDate } from "@/lib/dateUtils";
import { useUrlSyncedState, dateRangeSerializer } from "@/hooks/useUrlSyncedState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useDiagnosticoCriticidade,
  type CategoryDiagnostic,
  type RegionDiagnostic,
  type PatternEntry,
  type ScoreBreakdown,
} from "@/hooks/useDiagnosticoCriticidade";
import { useSentimentAnalytics } from "@/hooks/useSentimentAnalytics";

/**
 * Aba "Diagnóstico" do dashboard administrativo de relatos (HU-1.3).
 *
 * Consolida sentimento + padrões + criticidade num ranking acionável:
 *   - KPIs globais: score de criticidade, total de relatos, % negativos, # padrões.
 *   - Top categorias e top regiões com score combinado e breakdown visual.
 *   - Lista de padrões ativos (top 10) com ações sugeridas.
 *   - Insights de IA (reaproveitando AIInsightsCard) do hook de sentimento.
 */

function scoreColor(score: number): string {
  if (score >= 70) return "bg-destructive text-destructive-foreground";
  if (score >= 40) return "bg-amber-500 text-white";
  return "bg-muted text-muted-foreground";
}

function scoreLabel(score: number): string {
  if (score >= 70) return "Alto";
  if (score >= 40) return "Moderado";
  return "Baixo";
}

export function DiagnosticoTab() {
  // HU-3.3 — período sincronizado com URL
  const [periodState, setPeriodState] = useUrlSyncedState<{ p: { startDate?: string; endDate?: string } | null }>({
    prefix: "dia",
    defaults: { p: null },
    serializers: { p: dateRangeSerializer() },
  });
  // HU-5.2 fix — URL state guarda strings "YYYY-MM-DD"; DateRangeValue exige Dates locais.
  // IMPORTANTE: usar componentes locais (Y/M/D) para evitar bug do D-1: `new Date("2026-05-11")`
  // é interpretado como UTC e em -03:00 vira 10/maio 21:00. E `toISOString().slice(0,10)` em
  // -03:00 também pode adiantar/atrasar o dia. Usamos parsing/formatação puramente local.
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
  const setPeriod = (next: DateRangeValue | undefined) =>
    setPeriodState({
      p: next
        ? {
            startDate: formatLocalDate(next.from),
            endDate: formatLocalDate(next.to),
          }
        : null,
    });

  // HU-5.2 — Filtros granulares (categorias, bairros, zonas)
  const [granularFilters, setGranularFilters] = useState<VolumeFiltersValue>(EMPTY_VOLUME_FILTERS);
  // HU-5.3 — Debounce de 300ms nas seleções rápidas (multisseleção em sequência)
  // pra evitar disparar fetchData a cada checkbox marcado. O período não entra no
  // debounce porque o usuário escolhe e fecha o popover de uma vez.
  const debouncedGranularFilters = useDebouncedValue(granularFilters, 300);

  const filters = useMemo(
    () => ({
      startDate: period?.from,
      endDate: period?.to,
      categories: debouncedGranularFilters.categories,
      regions: debouncedGranularFilters.regions,
      zones: debouncedGranularFilters.zones,
    }),
    [period, debouncedGranularFilters],
  );

  const { stats, isLoading, error, refresh, lastUpdate } = useDiagnosticoCriticidade(filters);

  // Reaproveita insights da IA já gerados pelo hook de sentimento.
  const { stats: sentimentStats } = useSentimentAnalytics({
    startDate: period?.from instanceof Date ? period.from.toISOString() : undefined,
    endDate: period?.to instanceof Date ? period.to.toISOString() : undefined,
  });

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

  const insights = sentimentStats?.insights ?? [];

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

      {/* HU-5.2 — Filtros granulares: período + categorias + bairros + zonas */}
      <VolumeFilters
        value={{ ...granularFilters, period }}
        onChange={(next) => {
          setPeriod(next.period);
          setGranularFilters({ ...next, period: next.period });
        }}
        availableCategories={stats.availableCategories ?? []}
        availableRegions={stats.availableRegions ?? []}
        loading={isLoading}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Score global de criticidade
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-foreground">
                  {stats.globalScore}
                </p>
                <Badge className={cn("text-xs", scoreColor(stats.globalScore))}>
                  {scoreLabel(stats.globalScore)}
                </Badge>
              </div>
            </div>
            <Gauge className="h-7 w-7 text-primary opacity-60" aria-hidden="true" />
          </div>
        </Card>

        <KPICard
          title="Total de relatos"
          value={stats.totalRecords}
          icon={AlertCircle}
        />
        <KPICard
          title="Sentimento negativo"
          subtitle={
            stats.totalRecords > 0
              ? `${Math.round((stats.totalNegative / stats.totalRecords) * 100)}% do total`
              : undefined
          }
          value={stats.totalNegative}
          icon={Frown}
        />
        <KPICard
          title="Padrões ativos"
          subtitle="Detectados pelo sistema"
          value={stats.totalPatterns}
          icon={TrendingUp}
        />
      </div>

      {/* Rankings: categorias e regiões */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankingCard
          title="Top categorias críticas"
          subtitle="Ranqueadas pelo score combinado"
          icon={<Tag className="h-4 w-4" />}
          items={stats.topCategories}
          isLoading={isLoading}
          renderItem={(item, index) => (
            <CategoryRow key={item.category} item={item} index={index} />
          )}
          emptyMessage="Nenhuma categoria com sinais de criticidade no período."
        />
        <RankingCard
          title="Top regiões críticas"
          subtitle="Por zona da cidade"
          icon={<MapPin className="h-4 w-4" />}
          items={stats.topRegions}
          isLoading={isLoading}
          renderItem={(item, index) => (
            <RegionRow key={item.zone} item={item} index={index} />
          )}
          emptyMessage="Nenhuma região com sinais de criticidade no período."
        />
      </div>

      {/* Padrões recorrentes */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Padrões recorrentes</h3>
          <Badge variant="secondary" className="ml-2">
            {stats.totalPatterns} ativo{stats.totalPatterns === 1 ? "" : "s"}
          </Badge>
        </div>
        {isLoading && stats.topPatterns.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full bg-muted/40 rounded animate-pulse" />
            ))}
          </div>
        ) : stats.topPatterns.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum padrão recorrente ativo identificado pelo sistema.
          </p>
        ) : (
          <div className="space-y-3">
            {stats.topPatterns.map((p) => (
              <PatternRow key={p.id} pattern={p} />
            ))}
          </div>
        )}
      </Card>

      {/* Insights da IA (reaproveitando) */}
      {insights.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Insights da IA</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <AIInsightsCard key={insight.id} insight={insight} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

interface RankingCardProps<T> {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: T[];
  isLoading: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage: string;
}

function RankingCard<T>({
  title,
  subtitle,
  icon,
  items,
  isLoading,
  renderItem,
  emptyMessage,
}: RankingCardProps<T>) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      {isLoading && items.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 w-full bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">{items.map((item, i) => renderItem(item, i))}</div>
      )}
    </Card>
  );
}

function ScoreBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  const bars: Array<{ label: string; value: number; color: string }> = [
    { label: "Volume", value: breakdown.volumeScore, color: "bg-chart-2" },
    { label: "Negativo", value: breakdown.negativeScore, color: "bg-chart-5" },
    { label: "Crítico", value: breakdown.criticalScore, color: "bg-destructive" },
    { label: "Padrões", value: breakdown.patternScore, color: "bg-chart-3" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {bars.map((b) => (
        <div key={b.label} className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {b.label}
            </span>
            <span className="text-[10px] font-medium tabular-nums">{b.value}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full", b.color)}
              style={{ width: `${b.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryRow({ item, index }: { item: CategoryDiagnostic; index: number }) {
  return (
    <div className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-bold tabular-nums">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.category}</p>
          <p className="text-xs text-muted-foreground">
            {item.total} relatos • {item.patternsActive} padrões ativos
          </p>
        </div>
        <Badge className={cn("text-xs tabular-nums", scoreColor(item.score))}>
          {item.score}
        </Badge>
      </div>
      <ScoreBars breakdown={item.breakdown} />
    </div>
  );
}

function RegionRow({ item, index }: { item: RegionDiagnostic; index: number }) {
  return (
    <div className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-bold tabular-nums">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.zone}</p>
          <p className="text-xs text-muted-foreground">
            {item.total} relatos • {item.patternsActive} padrões ativos
          </p>
        </div>
        <Badge className={cn("text-xs tabular-nums", scoreColor(item.score))}>
          {item.score}
        </Badge>
      </div>
      <ScoreBars breakdown={item.breakdown} />
    </div>
  );
}

function PatternRow({ pattern }: { pattern: PatternEntry }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sm leading-snug">{pattern.description}</p>
            <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
              {pattern.occurrenceCount}x
            </Badge>
          </div>
          {pattern.suggestedAction && (
            <p className="text-xs text-muted-foreground mt-1">
              <strong className="text-foreground">Ação sugerida:</strong> {pattern.suggestedAction}
            </p>
          )}
          {pattern.peakHours && pattern.peakHours.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              <strong className="text-foreground">Horários de pico:</strong>{" "}
              {pattern.peakHours.map((h) => `${h}h`).join(", ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
